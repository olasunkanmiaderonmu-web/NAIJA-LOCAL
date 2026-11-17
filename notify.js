// Vercel serverless function: /api/notify
// The database calls this whenever an in-app notification should also be emailed.
// Env vars (Vercel > Settings > Environment Variables):
//   NOTIFY_SECRET     long random text, same value as in the database (app_private.notify_secret)
//   BREVO_API_KEY     from Brevo > SMTP & API > API Keys
//   MAIL_FROM_EMAIL   a sender you have verified in Brevo, e.g. no-reply@yourdomain.ng
//   MAIL_FROM_NAME    optional, defaults to "Naija Local"
//   SITE_URL          your live address, no trailing slash
const crypto = require('crypto');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const same = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && crypto.timingSafeEqual(x, y); };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const secret = process.env.NOTIFY_SECRET, key = process.env.BREVO_API_KEY, from = process.env.MAIL_FROM_EMAIL;
  if (!secret || !same(req.headers['x-notify-secret'], secret)) return res.status(401).json({ error: 'unauthorized' });
  if (!key || !from) return res.status(500).json({ error: 'email service not configured' });
  const { to, name, title, message, link } = req.body || {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to || '')) || !title || !message) return res.status(400).json({ error: 'bad request' });
  const site = (process.env.SITE_URL || '').replace(/\/$/, '');
  const url = site + (typeof link === 'string' && link.startsWith('/') ? link : '/notifications.html');
  const subject = String(title).slice(0, 150);
  const html = `<div style="background:#FFF7E8;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#242424">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #f0e6d2">
    <div style="background:#14532D;padding:18px 24px;color:#fff;font-size:20px;font-weight:bold">Naija Local</div>
    <div style="padding:24px"><p style="margin:0 0 6px;color:#737373">Hello ${esc(String(name || 'there').split(' ')[0])},</p>
      <h2 style="margin:0 0 10px;color:#14532D;font-size:20px">${esc(subject)}</h2>
      <p style="margin:0 0 20px;line-height:1.5">${esc(String(message).slice(0, 600))}</p>
      <a href="${esc(url)}" style="display:inline-block;background:#F59E0B;color:#242424;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">Open Naija Local</a></div>
    <div style="padding:14px 24px;background:#faf6ec;color:#737373;font-size:12px">You get this email because of activity on your Naija Local account. You can turn emails off on your profile page.</div>
  </div></div>`;
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: process.env.MAIL_FROM_NAME || 'Naija Local', email: from }, to: [{ email: to }], subject, htmlContent: html, textContent: `${subject}\n\n${message}\n\n${url}` })
    });
    if (!r.ok) return res.status(502).json({ error: 'email provider refused' });
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(502).json({ error: 'email provider unreachable' }); }
};