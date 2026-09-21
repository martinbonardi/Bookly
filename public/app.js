const messagesEl = document.querySelector('#messages');
const traceEl = document.querySelector('#trace');
const input = document.querySelector('#chat-input');
const form = document.querySelector('#chat-form');
const reset = document.querySelector('#reset');
const promotionsList = document.querySelector('#promotions-list');
const promoPrev = document.querySelector('#promo-prev');
const promoNext = document.querySelector('#promo-next');
let messages = [];
let sessionId = `demo-${Date.now()}`;
let cart = JSON.parse(localStorage.getItem('bookly-cart') || '[]');
let language = 'es';
const copy = {
  es: { title: 'Bookly', assistant: 'Bookly Assistant', reset: 'Nueva conversación', selection: 'SELECCIÓN BOOKLY', promotions: 'Promociones y novedades', loading: 'Cargando libros...', prompt: ['Estado del pedido', 'Devolución', 'Buscar libros', 'Envíos'], values: ['¿Dónde está mi pedido?', 'Quiero devolver un libro', 'Busca libros', '¿Cuánto tarda el envío?'], input: 'Escribe tu pregunta...', hint: 'Prueba: “Buscar libros” para elegir una categoría, o pregunta por tu pedido.', greeting: 'Hola, soy el asistente de Bookly. Puedo buscar libros, consultar pedidos, gestionar devoluciones o responder preguntas sobre envíos. ¿Qué necesitas resolver?' },
  pt: { title: 'Bookly', assistant: 'Assistente Bookly', reset: 'Nova conversa', selection: 'SELEÇÃO BOOKLY', promotions: 'Promoções e novidades', loading: 'Carregando livros...', prompt: ['Status do pedido', 'Devolução', 'Buscar livros', 'Envios'], values: ['Onde está meu pedido?', 'Quero devolver um livro', 'Buscar livros', 'Quanto demora o envio?'], input: 'Digite sua pergunta...', hint: 'Experimente “Buscar livros” para escolher uma categoria ou pergunte sobre seu pedido.', greeting: 'Olá, sou o assistente da Bookly. Posso buscar livros, consultar pedidos, gerenciar devoluções ou responder dúvidas sobre envios. O que você precisa resolver?' },
  en: { title: 'Bookly', assistant: 'Bookly Assistant', reset: 'New conversation', selection: 'BOOKLY SELECTION', promotions: 'Promotions and new releases', loading: 'Loading books...', prompt: ['Order status', 'Return', 'Search books', 'Shipping'], values: ['Where is my order?', 'I want to return a book', 'Search books', 'How long does shipping take?'], input: 'Type your question...', hint: 'Try “Search books” to choose a category, or ask about your order.', greeting: 'Hi, I’m the Bookly assistant. I can search for books, check orders, manage returns, or answer shipping questions. What do you need help with?' }
};
const pageText = {
  es: { eyebrow: 'LIBRERÍA ONLINE · CUSTOMER SUPPORT', heading: 'Una conversación que', headingEm: 'llega al siguiente capítulo.', traceKicker: 'AGENT TRACE', traceTitle: 'Cómo decide', live: 'live', demo: 'DATOS DE DEMO', demoLines: ['The Midnight Library', 'Designing Data-Intensive Applications'], footer: 'Bookly / SE take-home prototype' },
  pt: { eyebrow: 'LIVRARIA ONLINE · SUPORTE AO CLIENTE', heading: 'Uma conversa que', headingEm: 'chega ao próximo capítulo.', traceKicker: 'RASTRO DO AGENTE', traceTitle: 'Como decide', live: 'ao vivo', demo: 'DADOS DE DEMONSTRAÇÃO', demoLines: ['The Midnight Library', 'Designing Data-Intensive Applications'], footer: 'Bookly / protótipo SE' },
  en: { eyebrow: 'ONLINE BOOKSTORE · CUSTOMER SUPPORT', heading: 'A conversation that', headingEm: 'leads to the next chapter.', traceKicker: 'AGENT TRACE', traceTitle: 'How it decides', live: 'live', demo: 'DEMO DATA', demoLines: ['The Midnight Library', 'Designing Data-Intensive Applications'], footer: 'Bookly / SE take-home prototype' }
};
const traceCopy = {
  es: { intent: { order_status: 'Estado de pedido', return: 'Devolución', book_search: 'Búsqueda de libros', purchase: 'Compra y checkout', closing: 'Cierre', faq: 'Pregunta frecuente', unknown: 'Intención ambigua' }, intentLabel: 'INTENCIÓN', memory: 'MEMORIA', decision: 'DECISIÓN', data: 'DATOS', noOrder: 'Sin número de pedido', asks: 'Se solicita información', saved: 'Pedido guardado' },
  pt: { intent: { order_status: 'Status do pedido', return: 'Devolução', book_search: 'Busca de livros', purchase: 'Compra e checkout', closing: 'Encerramento', faq: 'Pergunta frequente', unknown: 'Intenção ambígua' }, intentLabel: 'INTENÇÃO', memory: 'MEMÓRIA', decision: 'DECISÃO', data: 'DADOS', noOrder: 'Sem número do pedido', asks: 'Solicitando informação', saved: 'Pedido salvo' },
  en: { intent: { order_status: 'Order status', return: 'Return', book_search: 'Book search', purchase: 'Purchase and checkout', closing: 'Closing', faq: 'Frequently asked question', unknown: 'Unclear intent' }, intentLabel: 'INTENT', memory: 'MEMORY', decision: 'DECISION', data: 'DATA', noOrder: 'No order number', asks: 'Information requested', saved: 'Saved order' }
};
const languagePicker = document.createElement('div');
languagePicker.className = 'app-language-picker';
languagePicker.setAttribute('aria-label', 'Idioma del asistente');
languagePicker.innerHTML = '<button type="button" class="app-language active" data-language="es" title="Español">🇪🇸</button><button type="button" class="app-language" data-language="pt" title="Português">🇵🇹</button><button type="button" class="app-language" data-language="en" title="English">🇬🇧</button>';
document.querySelector('.topbar').appendChild(languagePicker);
function setLanguage(next) { if (!copy[next]) return; language = next; const c = copy[language]; const p = pageText[language]; document.documentElement.lang = language; document.title = c.title; document.querySelector('.panel-head h2').textContent = c.assistant; document.querySelectorAll('.panel-head h2')[1].textContent = p.traceTitle; document.querySelector('#reset').textContent = c.reset; document.querySelector('.intro .eyebrow').textContent = p.eyebrow; document.querySelector('.intro h1').firstChild.textContent = `${p.heading} `; document.querySelector('.intro h1 em').textContent = p.headingEm; document.querySelectorAll('.panel-head .panel-kicker')[1].textContent = p.traceKicker; document.querySelector('.live-pill').lastChild.textContent = ` ${p.live}`; document.querySelector('.demo-data .panel-kicker').textContent = p.demo; document.querySelectorAll('.demo-data p:not(.panel-kicker)').forEach((line, index) => { line.innerHTML = `<b>${index === 0 ? 'BK-1042' : 'BK-2098'}</b> · ${p.demoLines[index]}`; }); document.querySelector('footer span').textContent = p.footer; document.querySelector('.promotions-head .panel-kicker').textContent = c.selection; document.querySelector('#promotions-title').textContent = c.promotions; document.querySelector('#chat-input').placeholder = c.input; document.querySelector('.hint').textContent = c.hint; document.querySelectorAll('.app-language').forEach((button) => button.classList.toggle('active', button.dataset.language === language)); document.querySelectorAll('[data-prompt]').forEach((button, index) => { button.textContent = c.prompt[index]; button.dataset.prompt = c.values[index]; }); if (messages.length === 1 && messages[0].role === 'assistant') { messages[0].content = c.greeting; const bubble = messagesEl.querySelector('.msg.assistant .bubble'); if (bubble) bubble.textContent = c.greeting; } }

function addMessage(role, content) {
  messages.push({ role, content });
  const row = document.createElement('div'); row.className = `msg ${role}`;
  row.innerHTML = `<div class="avatar">${role === 'user' ? 'Tú' : 'B'}</div><div class="bubble"></div>`;
  row.querySelector('.bubble').textContent = content; messagesEl.appendChild(row); messagesEl.scrollTop = messagesEl.scrollHeight;
}
function renderTrace(result) {
  const t = traceCopy[language];
  const intentName = t.intent[result.intent] || t.intent.unknown;
  const history = language === 'en' ? ' + history saved' : language === 'pt' ? ' + histórico salvo' : ' + histórico guardado';
  const items = [[`01 · ${t.intentLabel}`, `<b>${intentName}</b>`], [`02 · ${t.memory}`, result.state?.orderId ? `${t.saved}: <b>${result.state.orderId}</b>` : `<b>${t.noOrder}</b>`], [`03 · ${t.decision}`, result.tool ? `Se ejecuta <b>${result.tool.tool}</b>` : `<b>${t.asks}</b>`], [`04 · ${t.data}`, `<b>${result.dataSource || 'mock'}</b>${result.persisted ? history : ''}`]];
  traceEl.innerHTML = items.map(([label, value]) => `<div class="trace-item"><div class="trace-label">${label}</div><div class="trace-value">${value}</div></div>`).join('');
}
async function send(content) {
  if (!content.trim()) return;
  addMessage('user', content); input.value = '';
  const typing = document.createElement('div'); typing.className = 'msg assistant'; typing.innerHTML = '<div class="avatar">B</div><div class="bubble">Escribiendo...</div>'; messagesEl.appendChild(typing);
  try { const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, sessionId, cart, language }) }); const result = await response.json(); if (!response.ok || result.error) throw new Error(result.error || 'agent_error'); if (result.language) setLanguage(result.language); typing.remove(); addMessage('assistant', result.reply || 'No pude generar una respuesta.'); if (result.categories) renderCategories(result.categories); if (result.tool?.tool === 'search_books') renderBookResults(result.tool.result || []); renderTrace(result); }
  catch { typing.remove(); addMessage('assistant', language === 'en' ? 'I could not process that request. Please try again.' : language === 'pt' ? 'Não consegui processar essa solicitação. Tente novamente.' : 'No pude procesar esa consulta. Intenta nuevamente o busca el libro por un título más corto.'); }
}
function renderBookResults(books) {
  if (!books.length) return;
  const list = document.createElement('div'); list.className = 'book-results';
  books.forEach((book) => { const card = document.createElement('div'); card.className = 'book-result-card'; card.innerHTML = `<img src="${book.cover_url || ''}" alt="Portada de ${book.title}" /><span class="book-result-info"><strong>${book.title}</strong><small>${book.author}</small><b>${money(book)}</b></span><button class="buy-button" type="button">Comprar</button>`; card.querySelector('.buy-button').addEventListener('click', () => { addToCart(book); send(`Quiero comprar ${book.title}`); }); list.appendChild(card); });
  messagesEl.appendChild(list); messagesEl.scrollTop = messagesEl.scrollHeight;
}
function addToCart(book) {
  const existing = cart.find((item) => item.isbn === book.isbn);
  if (existing) existing.quantity += 1;
  else cart.push({ ...book, quantity: 1 });
  localStorage.setItem('bookly-cart', JSON.stringify(cart)); renderCart();
}
function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const toggle = document.querySelector('#cart-toggle'); if (toggle) toggle.innerHTML = `🛒 Carrito <span>${count}</span>`;
  const panel = document.querySelector('#cart-panel'); if (!panel) return;
  panel.innerHTML = `<div class="cart-panel-head"><strong>Tu carrito</strong><button type="button" id="cart-close" aria-label="Cerrar carrito">×</button></div><div class="cart-lines">${cart.length ? cart.map((item) => `<div class="cart-line"><img src="${item.cover_url || ''}" alt="" /><span class="cart-line-info"><strong>${item.title}</strong><small>${item.quantity} × ${money(item)}</small></span><b class="cart-line-price">${(Number(item.price) * item.quantity).toFixed(2)} USD</b></div>`).join('') : '<p class="promo-loading">Tu carrito está vacío.</p>'}</div><div class="cart-total"><span>Total</span><b>USD ${cartTotal().toFixed(2)}</b></div><button class="checkout-button" id="checkout-button" type="button" ${cart.length ? '' : 'disabled'}>Continuar compra</button>`;
  panel.querySelector('#cart-close').addEventListener('click', () => { panel.hidden = true; });
  panel.querySelector('#checkout-button').addEventListener('click', () => { panel.hidden = true; send('Quiero finalizar mi compra'); });
}
function cartTotal() { return cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0); }
function setupCommerce() {
  const resetButton = document.querySelector('#reset'); const toggle = document.createElement('button'); toggle.id = 'cart-toggle'; toggle.className = 'cart-toggle'; resetButton.before(toggle);
  const promotions = document.querySelector('.promotions'); const panel = document.createElement('section'); panel.id = 'cart-panel'; panel.className = 'cart-panel'; panel.hidden = true; promotions.after(panel);
  toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; }); renderCart();
}
function renderCategories(categories) {
  const choices = document.createElement('div'); choices.className = 'category-choices';
  categories.forEach((category) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = category; button.addEventListener('click', () => send(`Busca libros de ${category}`)); choices.appendChild(button); });
  messagesEl.appendChild(choices); messagesEl.scrollTop = messagesEl.scrollHeight;
}
function money(book) { return `${book.currency || 'USD'} ${Number(book.price || 0).toFixed(2)}`; }
function renderPromotions(books) {
  if (!books.length) { promotionsList.innerHTML = '<p class="promo-loading">No hay promociones disponibles.</p>'; return; }
  promotionsList.innerHTML = books.map((book) => `<button class="promo-card" data-book-title="${encodeURIComponent(book.title)}" data-book-isbn="${book.isbn || ''}" aria-label="Ver información de ${book.title}"><img src="${book.cover_url || ''}" alt="Portada de ${book.title}" loading="lazy" /><span class="promo-card-body"><strong>${book.title}</strong><small>${book.author}</small><b>${money(book)}</b></span></button>`).join('');
  promotionsList.querySelectorAll('.promo-card').forEach((card) => card.addEventListener('click', () => { const title = decodeURIComponent(card.dataset.bookTitle); send(`Quiero información del libro ${title} (ISBN ${card.dataset.bookIsbn})`); }));
}
async function loadPromotions() {
  try { const response = await fetch('/api/promotions'); const books = await response.json(); renderPromotions(Array.isArray(books) ? books : []); }
  catch { promotionsList.innerHTML = '<p class="promo-loading">No pudimos cargar las promociones.</p>'; }
}
promoPrev.addEventListener('click', () => promotionsList.scrollBy({ left: -220, behavior: 'smooth' }));
promoNext.addEventListener('click', () => promotionsList.scrollBy({ left: 220, behavior: 'smooth' }));
function start() { messages = []; sessionId = `demo-${Date.now()}`; messagesEl.innerHTML = ''; traceEl.innerHTML = ''; addMessage('assistant', copy[language].greeting); }
form.addEventListener('submit', (event) => { event.preventDefault(); send(input.value); });
document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => send(button.dataset.prompt)));
reset.addEventListener('click', start);
document.querySelectorAll('.app-language').forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.language)));
start();
setupCommerce();
loadPromotions();
