import fs from 'node:fs/promises';

const amazonUrl = 'https://www.amazon.com/-/es/gp/bestsellers/books?ref=books_dsk_sn_amazon-best-s-c4fd0';
const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; Bookly catalog import)' };
const genres = {
  '168281808X': 'Ficción, Romance', '1668032147': 'No ficción, Tecnología', '0143139789': 'Ficción, Misterio', '1668236516': 'Ficción, Romance', 'B0GZ6YK1L6': 'No ficción', '1426224389': 'No ficción', '1954118813': 'Ficción, Misterio', '1982177330': 'No ficción', '1639739130': 'Ficción, Romance', '153878405X': 'Ficción, Misterio', '1454961791': 'Misterio', '0063511630': 'Ficción, Misterio', '1541607821': 'No ficción', '059380421X': 'Ficción', '1668221403': 'No ficción, Tecnología', '1636416152': 'No ficción', '0399226907': 'Infantil', '1589255518': 'Infantil', '1523506148': 'Infantil', '1558585362': 'Infantil'
};

function decode(value = '') {
  return value.replace(/&#x27;/gi, "'").replace(/&quot;/gi, '"').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();
}

const page = await fetch(amazonUrl, { headers });
if (!page.ok) throw new Error(`Amazon ${page.status}`);
const html = await page.text();
const chunks = html.split(/(?=<div[^>]+data-asin=")/).filter((chunk) => /data-asin="[A-Z0-9]+"/.test(chunk));
const books = [];

for (const chunk of chunks) {
  if (books.length >= 20) break;
  const asin = chunk.match(/data-asin="([A-Z0-9]+)"/)?.[1];
  const rank = chunk.match(/zg-bdg-text">#(\d+)/)?.[1];
  const title = decode(chunk.match(/p13n-sc-css-line-clamp-[123][^>]*>([\s\S]*?)<\/div>/)?.[1]?.replace(/<[^>]+>/g, '') || '');
  const author = decode(chunk.match(/a-row a-size-small[^>]*>\s*<a[^>]*>\s*<div[^>]*>([^<]+)/)?.[1] || 'Autor no indicado');
  const priceText = decode(chunk.match(/p13n-sc-price[^>]*>([^<]+)/)?.[1] || '');
  const price = Number(priceText.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  const coverUrl = chunk.match(/<img[^>]+src="([^"]+)"/)?.[1] || null;
  if (!asin || !title || !price) continue;
  books.push({
    isbn: asin,
    title,
    author,
    description: `${title}, de ${author}. Libro incluido en la lista de bestsellers de Amazon.`,
    genre: genres[asin] || 'Bestsellers Amazon',
    language: 'en',
    price,
    currency: 'USD',
    stock: 10,
    cover_url: coverUrl,
    metadata: { source: 'Amazon bestsellers', amazon_asin: asin, amazon_rank: Number(rank) || books.length + 1, amazon_url: `https://www.amazon.com/dp/${asin}` }
  });
}

if (books.length < 20) throw new Error(`Solo se encontraron ${books.length} libros en Amazon`);

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');

const response = await fetch(`${supabaseUrl}/rest/v1/bookly_books?on_conflict=isbn`, {
  method: 'POST',
  headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify(books)
});
if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);

await fs.writeFile('/tmp/bookly-amazon-import.json', JSON.stringify(books, null, 2));
console.log(`Importados ${books.length} libros desde Amazon`);
