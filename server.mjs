import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const port = Number(process.env.PORT || 3000);

const orders = {
  'BK-1042': { id: 'BK-1042', name: 'The Midnight Library', status: 'En camino', eta: 'jueves 24 de septiembre', carrier: 'DHL', tracking: 'DHL-884210', eligibleReturn: true },
  'BK-2098': { id: 'BK-2098', name: 'Designing Data-Intensive Applications', status: 'Entregado', delivered: 'lunes 14 de septiembre', carrier: 'UPS', tracking: 'UPS-552901', eligibleReturn: true },
};

const sessions = new Map();
function normalize(value = '') { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function lastUserMessage(messages = []) { return [...messages].reverse().find((m) => m.role === 'user')?.content || ''; }
function findOrder(text) { return Object.keys(orders).find((id) => normalize(text).includes(normalize(id))) || String(text).match(/[A-Z]{2,5}-\d{3,}/i)?.[0]?.toUpperCase(); }

const books = [
  { id: 'demo-1', isbn: '9780525559474', title: 'The Midnight Library', author: 'Matt Haig', description: 'Una novela sobre decisiones, posibilidades y las vidas que podemos imaginar.', genre: 'Ficción', price: 18.99, currency: 'USD', stock: 7 },
  { id: 'demo-2', isbn: '9781455586691', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', description: 'Principios para construir sistemas de datos fiables, escalables y mantenibles.', genre: 'Tecnología', price: 42.5, currency: 'USD', stock: 3 },
  { id: 'demo-3', isbn: '9780140283334', title: 'The Alchemist', author: 'Paulo Coelho', description: 'Una fábula sobre seguir una vocación y encontrar el propio camino.', genre: 'Ficción', price: 15.25, currency: 'USD', stock: 12 },
];

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
function supabaseIsReady() { return supabaseConfigured; }
async function supabaseRequest(table, options = {}) {
  if (!supabaseConfigured) return null;
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, { ...options, headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function mapSupabaseOrder(row) {
  return { id: row.order_number, name: row.metadata?.book_title || 'tu pedido', status: row.status, eta: row.estimated_delivery || null, delivered: row.delivered_at ? new Date(row.delivered_at).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }) : null, carrier: row.carrier, tracking: row.tracking_number, eligibleReturn: row.return_eligible, source: 'supabase', raw: row };
}

async function toolSearchBooks(query) {
  const isbnMatch = String(query).match(/\b(?:isbn|asin)\s*([A-Z0-9]+)/i);
  const queryTerm = String(query).replace(/^(busca|buscar|quiero|necesito|recomiendame|recomienda)\s+/i, '').replace(/^(informacion|información)\s+(del|de la|sobre el|sobre la)?\s*(libro|libros)?\s*/i, '').replace(/^(libros?|un libro)(\s+de)?\s+/i, '').trim() || String(query);
  const safeQueryTerm = queryTerm.split(/[:(),]/)[0].replace(/[^\p{L}\p{N} -]/gu, ' ').replace(/\s+/g, ' ').trim() || queryTerm;
  if (supabaseConfigured) {
    const params = new URLSearchParams(isbnMatch ? { select: 'id,isbn,title,author,description,genre,price,currency,stock,cover_url', limit: '1', isbn: `eq.${isbnMatch[1]}` } : { select: 'id,isbn,title,author,description,genre,price,currency,stock,cover_url', limit: '5', or: `(title.ilike.*${safeQueryTerm}*,author.ilike.*${safeQueryTerm}*,description.ilike.*${safeQueryTerm}*,genre.ilike.*${safeQueryTerm}*)` });
    let result = await supabaseRequest(`bookly_books?${params}`);
    if (!result?.length && /ficci[oó]n|novela|bestseller/i.test(queryTerm)) {
      const fallbackParams = new URLSearchParams({ select: 'id,isbn,title,author,description,genre,price,currency,stock,cover_url', limit: '5', order: 'created_at.desc' });
      result = await supabaseRequest(`bookly_books?${fallbackParams}`);
    }
    return { tool: 'search_books', ok: true, result: result || [], source: 'supabase' };
  }
  const q = normalize(queryTerm);
  const result = books.filter((book) => normalize(`${book.title} ${book.author} ${book.description} ${book.genre}`).includes(q)).slice(0, 5);
  return { tool: 'search_books', ok: true, result, source: 'mock' };
}

async function toolGetOrderStatus(orderId) {
  if (supabaseConfigured) {
    const params = new URLSearchParams({ select: '*', order_number: `eq.${orderId}`, limit: '1' });
    const result = await supabaseRequest(`bookly_orders?${params}`);
    if (result?.[0]) return { tool: 'get_order_status', ok: true, result: mapSupabaseOrder(result[0]), source: 'supabase' };
    return { tool: 'get_order_status', ok: false, error: 'order_not_found', source: 'supabase' };
  }
  const order = orders[orderId];
  return order ? { tool: 'get_order_status', ok: true, result: { ...order, source: 'mock' }, source: 'mock' } : { tool: 'get_order_status', ok: false, error: 'order_not_found', source: supabaseConfigured ? 'supabase' : 'mock' };
}
async function toolCreateReturn(orderId, reason) {
  if (supabaseConfigured) {
    const current = await toolGetOrderStatus(orderId);
    if (!current.ok || !current.result.eligibleReturn) return { tool: 'create_return', ok: false, error: 'not_eligible', source: 'supabase' };
    const caseId = `RET-${orderId.replace(/[^A-Z0-9]/gi, '')}-${Date.now().toString().slice(-6)}`;
    await supabaseRequest(`bookly_orders?order_number=eq.${encodeURIComponent(orderId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ return_status: 'requested', return_reason: reason, metadata: { ...(current.result.raw?.metadata || {}), return_case_id: caseId }, updated_at: new Date().toISOString() }) });
    return { tool: 'create_return', ok: true, result: { caseId, orderId, reason, next: 'Te enviaremos una etiqueta de devolución por email.' }, source: 'supabase' };
  }
  const order = orders[orderId];
  if (!order || !order.eligibleReturn) return { tool: 'create_return', ok: false, error: 'not_eligible' };
  const caseId = `RET-${orderId.slice(3)}-${String(reason).length}`;
  return { tool: 'create_return', ok: true, result: { caseId, orderId, reason, next: 'Te enviaremos una etiqueta de devolución por email.' }, source: 'mock' };
}
function classify(text) {
  const t = normalize(text);
  if (/(gracias|muchas gracias|eso es todo|listo|adios|hasta luego|no necesito mas)/.test(t)) return 'closing';
  if (/(compr|carrito|checkout|pagar|adquirir|buy|purchase|cart|checkout|pay)/.test(t)) return 'purchase';
  if (/(devol|reembol|refund|return)/.test(t)) return 'return';
  if (/(donde|estado|rastrea|tracking|llego|entrega|pedido|order|track|delivery|my order)/.test(t)) return 'order_status';
  if (/(libro|libros|autor|novela|catalogo|isbn|busca|busco|recomiend|book|books|author|novel|catalog|search|find|recommend|livro|livros|buscar|procuro|recomenda)/.test(t)) return 'book_search';
  if (/(envio|shipping|cuanto tarda|politica|password|contrasena|clave|horario)/.test(t)) return 'faq';
  return 'unknown';
}
function detectLanguage(text = '') {
  const t = normalize(text);
  if (/(^|\s)(in english|english please|speak english|talk in english|change to english|switch to english|can we talk in english|cambia.*ingles|habla.*ingles|responde.*ingles|quiero.*ingles)/.test(t)) return 'en';
  if (/(^|\s)(em portugues|em portuguese|portugues por favor|falar em portugues|mudar para portugues|trocar para portugues|cambia.*portugues|fala.*portugues|quero.*portugues)/.test(t)) return 'pt';
  if (/(^|\s)(en espanol|en castellano|espanol por favor|habla en espanol|cambia.*espanol|cambiar a espanol|quiero.*espanol)/.test(t)) return 'es';
  return null;
}
function faqAnswer(text) {
  const t = normalize(text);
  if (t.includes('password') || t.includes('contrasena') || t.includes('clave')) return 'Puedes restablecer tu contraseña desde “Mi cuenta” > “Seguridad”. Si no recibes el email en 5 minutos, revisa spam y dime qué correo usas para escalarlo.';
  if (t.includes('envio') || t.includes('shipping') || t.includes('cuanto tarda')) return 'El envío estándar tarda entre 3 y 5 días laborables. Cuando tu pedido sale del almacén, enviamos el enlace de tracking al email de compra.';
  return 'Puedo ayudarte con el estado de un pedido, una devolución o preguntas sobre envíos y cuenta. ¿Qué necesitas resolver?';
}

async function callModel(messages, context) {
  if (!process.env.OPENAI_API_KEY) return null;
  const languageName = { es: 'español', en: 'inglés', pt: 'portugués' }[context.language] || 'español';
  const instructions = `Eres el motor cognitivo de Bookly, un asistente de soporte y compras de una librería. Responde siempre en ${languageName}, con tono claro y cálido. Usa únicamente el contexto verificado que recibes. No inventes precios, stock, pedidos, estados, checkout ni datos de clientes. No contradigas la respuesta determinista ni vuelvas a pedir datos que ya estén en el contexto. Si falta un dato necesario, formula una sola pregunta concreta. Mantén listas y saltos de línea cuando el contexto los incluya. Contexto verificado: ${JSON.stringify(context)}`;
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', instructions, input: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })), temperature: 0.2 }) });
  if (!response.ok) { console.error(`OpenAI request failed: ${response.status} ${await response.text()}`); return null; }
  const data = await response.json();
  return data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text || null;
}

async function persistConversation(sessionId, messages, result, customerEmail) {
  if (!supabaseConfigured) return false;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const rows = [];
  const row = (values) => ({ session_id: sessionId, customer_email: customerEmail || null, role: null, content: '', intent: null, tool_name: null, tool_input: null, tool_output: null, metadata: {}, ...values });
  if (lastUser) rows.push(row({ role: 'user', content: lastUser.content, intent: result.intent, metadata: { source: 'bookly-agent' } }));
  if (result.tool) rows.push(row({ role: 'tool', content: JSON.stringify(result.tool.result || { error: result.tool.error }), intent: result.intent, tool_name: result.tool.tool, tool_input: { order_id: result.state?.orderId }, tool_output: result.tool, metadata: { source: result.tool.source || 'unknown' } }));
  rows.push(row({ role: 'assistant', content: result.reply, intent: result.intent, tool_name: result.tool?.tool || null, metadata: { source: result.llm ? 'llm' : 'deterministic' } }));
  await supabaseRequest('bookly_conversation_history', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
  return true;
}

function cartTotal(cart = []) { return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0); }
async function persistCheckout(sessionId, state, cart) {
  if (!supabaseConfigured) return { ok: false, error: 'supabase_not_configured' };
  const userPayload = { full_name: state.customerName, email: state.customerEmail, shipping_address: { text: state.shippingAddress }, metadata: { source: 'bookly-chat' } };
  const userRows = await supabaseRequest('bookly_users?on_conflict=email', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(userPayload) });
  const userId = userRows?.[0]?.id || null;
  const checkoutNumber = `CHK-${Date.now().toString(36).toUpperCase()}`;
  const total = cartTotal(cart);
  const checkoutRows = await supabaseRequest('bookly_checkouts', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ checkout_number: checkoutNumber, session_id: sessionId, user_id: userId, status: 'payment_pending', customer_name: state.customerName, customer_email: state.customerEmail, shipping_address: { text: state.shippingAddress }, payment_method: state.paymentMethod, subtotal: total, total_amount: total, currency: 'USD', metadata: { source: 'bookly-chat', item_count: cart.length } }) });
  const checkoutId = checkoutRows?.[0]?.id;
  if (checkoutId) {
    const items = cart.map((item) => ({ checkout_id: checkoutId, book_id: item.id || null, isbn: item.isbn || null, title: item.title, author: item.author || null, quantity: item.quantity || 1, unit_price: Number(item.price) || 0, metadata: { cover_url: item.cover_url || null } }));
    await supabaseRequest('bookly_checkout_items', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(items) });
  }
  return { ok: true, checkoutNumber, total };
}

function formatBookResults(result) {
  if (!result.length) return 'No encontré libros con ese criterio. ¿Quieres probar con otro título, autor o género?';
  return `Encontré ${result.length} ${result.length === 1 ? 'opción' : 'opciones'}:\n\n${result.map((book, index) => `${index + 1}. ${book.title}\n   Autor: ${book.author}\n   Precio: ${book.price ? `${book.currency || 'USD'} ${Number(book.price).toFixed(2)}` : 'No disponible'}\n   Estado: ${book.stock > 0 ? 'Disponible' : 'Sin stock'}\n   Descripción: ${book.description || 'Sin descripción disponible.'}`).join('\n\n')}`;
}
const bookCategories = ['Ficción', 'Romance', 'Misterio', 'No ficción', 'Infantil', 'Tecnología'];

async function orchestrate(messages, sessionId, customerEmail, cart = [], language = 'es') {
  const text = lastUserMessage(messages);
  const state = sessions.get(sessionId) || {};
  const changedLanguage = detectLanguage(text);
  const activeLanguage = changedLanguage || language || state.language || 'es';
  const detectedIntent = classify(text);
  const intent = detectedIntent !== 'unknown' ? detectedIntent : (state.intent || 'unknown');
  const orderId = findOrder(text) || state.orderId;
  const lower = normalize(text);
  let tool = null;
  let reply = '';
  let categories = null;
  let nextState = { ...state, intent, orderId, language: activeLanguage };
  if (changedLanguage) {
    reply = { es: 'Perfecto, continuaré en español.', en: 'Perfect, I will continue in English.', pt: 'Perfeito, continuarei em português.' }[activeLanguage];
    nextState = { ...nextState, awaiting: null };
  } else if (intent === 'closing') {
    reply = '¡Gracias a ti! Tu solicitud quedó registrada. Cuando necesites algo más, aquí estaré.';
    nextState = { ...nextState, awaiting: null };
  } else if (intent === 'unknown') {
    reply = '¿Necesitas conocer el estado de un pedido, iniciar una devolución o resolver una pregunta sobre envíos o tu cuenta?';
    nextState = { ...nextState, awaiting: 'intent' };
  } else if (intent === 'order_status') {
    if (!orderId) { reply = 'Claro. ¿Me compartes tu número de pedido? Tiene un formato como BK-1042.'; nextState = { ...nextState, awaiting: 'order_id' }; }
    else {
      tool = await toolGetOrderStatus(orderId);
      if (tool.ok) { const o = tool.result; const delivered = o.status === 'Entregado' || o.status === 'delivered'; reply = delivered ? `Tu pedido ${o.id} de “${o.name}” aparece como entregado${o.delivered ? ` el ${o.delivered}` : ''}. Lo transportó ${o.carrier || 'el transportista'}${o.tracking ? ` con tracking ${o.tracking}` : ''}.` : `Tu pedido ${o.id} de “${o.name}” va en camino. La entrega estimada es el ${o.eta || 'la fecha indicada en tu cuenta'}. Puedes seguirlo${o.carrier ? ` con ${o.carrier}` : ''}${o.tracking ? `: ${o.tracking}` : '.'}`; nextState = { ...nextState, awaiting: null }; }
      else { reply = 'No encuentro ese pedido. ¿Puedes revisar el número y enviarlo de nuevo?'; nextState = { ...nextState, awaiting: 'order_id' }; }
    }
  } else if (intent === 'return') {
    if (!orderId) { reply = 'Puedo ayudarte con la devolución. Primero necesito el número de pedido, por ejemplo BK-2098.'; nextState = { ...nextState, awaiting: 'return_order_id' }; }
    else if (state.awaiting === 'return_reason') { const reason = text; tool = await toolCreateReturn(orderId, reason); reply = tool.ok ? `Listo. Abrí el caso ${tool.result.caseId} para ${orderId}. ${tool.result.next}` : 'Ese pedido no aparece como elegible para devolución. Puedo escalarlo a una persona si quieres.'; nextState = { ...nextState, awaiting: null, reason: null }; }
    else if (!state.reason && !lower.includes('motivo') && !lower.includes('porque') && !lower.includes('roto') && !lower.includes('danado') && !lower.includes('no lo quiero')) { reply = `Gracias. ¿Cuál es el motivo de la devolución del pedido ${orderId}?`; nextState = { ...nextState, awaiting: 'return_reason' }; }
    else { const reason = state.reason || text; tool = await toolCreateReturn(orderId, reason); reply = tool.ok ? `Listo. Abrí el caso ${tool.result.caseId} para ${orderId}. ${tool.result.next}` : 'Ese pedido no aparece como elegible para devolución. Puedo escalarlo a una persona si quieres.'; nextState = { ...nextState, awaiting: null, reason: null }; }
  } else if (intent === 'purchase') {
    nextState = { ...nextState, cart: Array.isArray(cart) ? cart : state.cart || [] };
    if (!nextState.cart.length) {
      reply = 'Agrega un libro al carrito desde los resultados y luego te ayudo a completar la compra.';
      nextState = { ...nextState, awaiting: 'cart' };
    } else if (state.awaiting === 'customer_name') {
      nextState = { ...nextState, customerName: text, awaiting: 'customer_email' };
      reply = 'Gracias. ¿Cuál es tu correo electrónico para registrar la compra?';
    } else if (state.awaiting === 'customer_email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) reply = 'Necesito un correo válido, por ejemplo nombre@correo.com.';
      else { nextState = { ...nextState, customerEmail: text, awaiting: 'shipping_address' }; reply = '¿A qué dirección debemos enviar tu pedido?'; }
    } else if (state.awaiting === 'shipping_address') {
      nextState = { ...nextState, shippingAddress: text, awaiting: 'payment_method' };
      reply = '¿Qué método de pago prefieres? Por ahora aceptamos tarjeta, PayPal o transferencia.';
    } else if (state.awaiting === 'payment_method') {
      nextState = { ...nextState, paymentMethod: text, awaiting: null };
      const checkout = await persistCheckout(sessionId, nextState, nextState.cart);
      if (checkout.ok) reply = `Listo, registré tu checkout ${checkout.checkoutNumber}. Total: USD ${checkout.total.toFixed(2)}. El pago quedó pendiente de confirmación.`;
      else { reply = 'Tengo todos tus datos, pero no pude guardar el checkout todavía. Verifica que las tablas de comercio estén aplicadas en Supabase.'; nextState = { ...nextState, awaiting: 'payment_method' }; }
    } else {
      nextState = { ...nextState, awaiting: 'customer_name' };
      reply = `Perfecto. Tengo ${nextState.cart.length} ${nextState.cart.length === 1 ? 'libro' : 'libros'} en tu carrito. Para comenzar, ¿cuál es tu nombre completo?`;
    }
  } else if (intent === 'book_search') {
    if (normalize(text).match(/^(busca|buscar|busco|quiero|necesito|recomiendame|recomienda|search|find|look for|browse|buy|books?|livros?|buscar|procurar|encontrar)?\s*(libros?|un libro|books?|a book|livros?|um livro)?\s*$/)) {
      reply = 'Elige una categoría para buscar libros:';
      categories = bookCategories;
      nextState = { ...nextState, awaiting: 'book_query' };
    } else {
      tool = await toolSearchBooks(text);
      reply = formatBookResults(tool.result);
      nextState = { ...nextState, awaiting: null };
    }
  } else if (intent === 'faq') { reply = faqAnswer(text); nextState = { ...nextState, awaiting: null }; }
  const modelReply = await callModel(messages, { intent, orderId, tool, language: activeLanguage, deterministicReply: reply });
  if (modelReply) reply = modelReply;
  sessions.set(sessionId, nextState);
  const result = { reply, intent, tool, categories, language: activeLanguage, state: nextState, llm: Boolean(modelReply), dataSource: tool?.source || (supabaseConfigured ? 'supabase' : 'mock'), persisted: false };
  try { result.persisted = await persistConversation(sessionId, messages, result, customerEmail); } catch (error) { result.persistenceError = error.message; }
  return result;
}

async function serveFile(res, filePath, type) { try { const data = await fs.readFile(filePath); res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store, no-cache, must-revalidate' }); res.end(data); } catch { res.writeHead(404); res.end('Not found'); } }
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') { let body = ''; for await (const chunk of req) body += chunk; try { const payload = JSON.parse(body); const result = await orchestrate(payload.messages || [], payload.sessionId || 'demo', payload.customerEmail, payload.cart || [], payload.language || 'es'); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result)); } catch (error) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); } return; }
  if (req.method === 'GET' && req.url === '/api/promotions') { try { const params = new URLSearchParams({ select: 'id,isbn,title,author,description,genre,price,currency,stock,cover_url,metadata', 'metadata->>source': 'eq.Amazon bestsellers', limit: '10' }); const result = await supabaseRequest(`bookly_books?${params}`); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result || [])); } catch (error) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); } return; }
  if (req.method === 'GET' && req.url.startsWith('/api/image?')) { try { const target = new URLSearchParams(req.url.split('?')[1]).get('url'); const imageUrl = new URL(target); if (!['images-na.ssl-images-amazon.com', 'm.media-amazon.com'].includes(imageUrl.hostname)) { res.writeHead(400); res.end('Image host not allowed'); return; } const image = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!image.ok) throw new Error(`Image ${image.status}`); res.writeHead(200, { 'Content-Type': image.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' }); res.end(Buffer.from(await image.arrayBuffer())); } catch { res.writeHead(302, { Location: '/book-fallback.svg' }); res.end(); } return; }
  if (req.url === '/api/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, supabase: supabaseIsReady(), openai: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || 'gpt-4.1-mini' })); return; }
  if (req.url === '/' || req.url === '/index.html') return serveFile(res, path.join(publicDir, 'index.html'), 'text/html; charset=utf-8');
  if (req.url === '/styles.css') return serveFile(res, path.join(publicDir, 'styles.css'), 'text/css; charset=utf-8');
  if (req.url === '/promotions.css') return serveFile(res, path.join(publicDir, 'promotions.css'), 'text/css; charset=utf-8');
  if (req.url === '/commerce.css') return serveFile(res, path.join(publicDir, 'commerce.css'), 'text/css; charset=utf-8');
  if (req.url === '/app-language.css') return serveFile(res, path.join(publicDir, 'app-language.css'), 'text/css; charset=utf-8');
  if (req.url === '/landing' || req.url === '/landing/') return serveFile(res, path.join(publicDir, 'landing.html'), 'text/html; charset=utf-8');
  if (req.url === '/landing.css') return serveFile(res, path.join(publicDir, 'landing.css'), 'text/css; charset=utf-8');
  if (req.url === '/landing-extra.css') return serveFile(res, path.join(publicDir, 'landing-extra.css'), 'text/css; charset=utf-8');
  if (req.url === '/landing-thumb.css') return serveFile(res, path.join(publicDir, 'landing-thumb.css'), 'text/css; charset=utf-8');
  if (req.url === '/landing.js') return serveFile(res, path.join(publicDir, 'landing.js'), 'text/javascript; charset=utf-8');
  if (req.url === '/landing-hero.png') return serveFile(res, path.join(publicDir, 'landing-hero.png'), 'image/png');
  if (req.url === '/book-fallback.svg') return serveFile(res, path.join(publicDir, 'book-fallback.svg'), 'image/svg+xml');
  if (req.url === '/app.js') return serveFile(res, path.join(publicDir, 'app.js'), 'text/javascript; charset=utf-8');
  res.writeHead(404); res.end('Not found');
});
export function startServer() { server.listen(port, () => console.log(`Bookly agent running at http://localhost:${port}`)); }
export { orchestrate, toolGetOrderStatus, toolCreateReturn };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}
