// Vercel serverless function: /p/<product-id>
// WhatsApp, Facebook and Google do not run JavaScript, so this page gives them the product's
// title, price and photo (Open Graph tags). People are sent straight on to the real product page.
// Needs env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL (optional)
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  const id = String(req.query.id || '');
  if (!UUID.test(id)) { res.writeHead(302, { Location: '/explore.html' }); return res.end(); }
  const site = (process.env.SITE_URL || 'https://' + req.headers.host).replace(/\/$/, '');
  const target = `/product.html?id=${id}`;
  let p = null;
  try {
    const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
    const r = await fetch(`${base}/rest/v1/products?id=eq.${id}&select=product_name,description,price,primary_image,public_location,status`, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
    const j = await r.json(); p = Array.isArray(j) && j[0] ? j[0] : null;
  } catch (e) {}
  const title = p ? `${p.product_name} - ₦${Number(p.price).toLocaleString('en-NG')} | Naija Local` : 'Naija Local | Your Neighbourhood Market, Now Online';
  const desc = p ? `${p.public_location ? p.public_location + '. ' : ''}${String(p.description || '').replace(/\s+/g, ' ').slice(0, 150)}` : 'Discover products around you. Buy locally, sell easily and connect directly with sellers in your community.';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="Naija Local"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(site + '/p/' + id)}">
${p && p.primary_image ? `<meta property="og:image" content="${esc(p.primary_image)}"><meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
<link rel="canonical" href="${esc(site + '/p/' + id)}"><meta http-equiv="refresh" content="0;url=${target}"></head>
<body><p>Opening <a href="${target}">${esc(p ? p.product_name : 'the product')}</a>...</p><script>location.replace(${JSON.stringify(target)});</script></body></html>`);
};