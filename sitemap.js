// Vercel serverless function: /sitemap.xml (rewritten in vercel.json). Lists real, active listings.
// Needs env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL (optional, e.g. https://naijalocal.vercel.app)
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

module.exports = async (req, res) => {
  const site = (process.env.SITE_URL || 'https://' + req.headers.host).replace(/\/$/, '');
  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  const urls = ['index.html', 'explore.html', 'categories.html', 'about.html', 'contact.html', 'safety.html', 'privacy.html', 'terms.html'].map(p => ({ loc: `${site}/${p}` }));
  if (base && key) {
    const h = { apikey: key, Authorization: 'Bearer ' + key };
    try {
      const [prods, cats] = await Promise.all([
        fetch(`${base}/rest/v1/products?select=id,updated_at&status=eq.active&order=updated_at.desc&limit=2000`, { headers: h }).then(r => r.json()),
        fetch(`${base}/rest/v1/categories?select=slug&is_active=eq.true`, { headers: h }).then(r => r.json())]);
      (Array.isArray(cats) ? cats : []).forEach(c => urls.push({ loc: `${site}/explore.html?category=${encodeURIComponent(c.slug)}` }));
      (Array.isArray(prods) ? prods : []).forEach(p => urls.push({ loc: `${site}/p/${p.id}`, lastmod: String(p.updated_at).slice(0, 10) }));
    } catch (e) { /* serve the static pages if the database is unreachable */ }
  }
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`);
};