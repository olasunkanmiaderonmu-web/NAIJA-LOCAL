/* Shared helpers for every page. Load order: supabase-js CDN, config.js, app.js */
const CONFIGURED = typeof SUPABASE_URL === 'string' && /^https:\/\//.test(SUPABASE_URL) && !SUPABASE_ANON_KEY.startsWith('YOUR_');
// "Remember me" off => session lives only in this tab
const authStore = {
  _s: () => (localStorage.getItem('nl_remember') === '0' ? sessionStorage : localStorage),
  getItem(k){ return this._s().getItem(k); },
  setItem(k,v){ this._s().setItem(k,v); },
  removeItem(k){ localStorage.removeItem(k); sessionStorage.removeItem(k); }
};
const sb = CONFIGURED ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY,
  { auth: { storage: authStore, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = id => document.getElementById(id);

/* Nigerian phone numbers: 0803..., 803..., 234803..., +234 803... => +234803XXXXXXX */
function normalizePhone(v){
  const d = String(v || '').replace(/\D/g, ''); let n = null;
  if (/^234\d{10}$/.test(d)) n = d; else if (/^0\d{10}$/.test(d)) n = '234' + d.slice(1); else if (/^\d{10}$/.test(d)) n = '234' + d;
  return n && /^234[789][01]\d{8}$/.test(n) ? '+' + n : null;
}
function pwScore(p){ let s = 0; if (p.length >= 8) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++; return s; }
function bindPwStrength(input, bar, label){
  const cols = ['#dc3545','#dc3545','#F59E0B','#198754','#14532D'], names = ['Too weak','Weak','Fair','Good','Strong'];
  input.addEventListener('input', () => { const s = input.value ? pwScore(input.value) : 0;
    bar.style.width = (s * 25) + '%'; bar.style.background = cols[s]; label.textContent = input.value ? names[s] : ''; });
}
function bindPwToggles(){
  document.querySelectorAll('[data-toggle-pw]').forEach(b => b.addEventListener('click', () => {
    const i = $(b.dataset.togglePw), show = i.type === 'password'; i.type = show ? 'text' : 'password';
    b.innerHTML = `<i class="bi bi-eye${show ? '-slash' : ''}"></i>`; b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); }));
}
function mark(el, ok){ el.classList.toggle('is-invalid', !ok); el.classList.toggle('is-valid', ok); return ok; }
function showAlert(id, type, msg){ const el = $(id); el.className = `alert alert-${type}`; el.textContent = msg; el.scrollIntoView({block:'nearest'}); }
function setBusy(btn, busy, text){ if (busy){ btn.dataset.t = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${text || 'Please wait...'}`; } else { btn.disabled = false; btn.innerHTML = btn.dataset.t; } }
function friendlyError(e){
  const m = (e && (e.message || e.error_description) || '').toLowerCase();
  if (m.includes('row-level security')) return 'You are not allowed to do that. Sign in again, or check the listing is still available.';
  if (m.includes('invalid login')) return 'Wrong email or password. Check them and try again.';
  if (m.includes('email not confirmed')) return 'Verify your email first. Open the link we sent you, then sign in.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'This email already has an account. Sign in instead.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a few minutes and try again.';
  if (m.includes('same password') || m.includes('different from the old')) return 'Choose a password you have not used on this account before.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'No connection. Check your data or Wi-Fi and try again.';
  return (e && e.message) || 'Something went wrong. Please try again.';
}
function ensureConfigured(alertId){
  if (CONFIGURED) return true;
  showAlert(alertId, 'warning', 'Supabase is not connected yet. Add your project URL and anon key to js/config.js.'); return false;
}
async function requireAuth(){
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { goSignin(); return null; }
  return session;
}

/* Shared navbar + footer for inner pages (index.html keeps its own markup but calls updateAuthLinks) */
function renderNav(active){
  const L = [['index.html','Home'],['explore.html','Explore Products'],['categories.html','Categories'],['add-product.html','Sell a Product'],['about.html','About Us'],['contact.html','Contact Us']];
  $('site-nav').innerHTML = `<nav class="navbar navbar-expand-lg sticky-top" aria-label="Main navigation"><div class="container">
  <a class="navbar-brand brand" href="index.html"><i class="bi bi-shop-window"></i> Naija Local</a>
  <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav" aria-controls="nav" aria-expanded="false" aria-label="Toggle navigation"><span class="navbar-toggler-icon"></span></button>
  <div class="collapse navbar-collapse" id="nav"><ul class="navbar-nav mx-lg-auto mb-2 mb-lg-0">
  ${L.map(([h,t]) => `<li class="nav-item"><a class="nav-link${h === active ? ' active' : ''}" href="${h}">${t}</a></li>`).join('')}</ul>
  <div id="authLinks" class="d-flex gap-2"><a class="btn btn-outline-light btn-sm" href="signin.html">Sign In</a><a class="btn btn-gold btn-sm" href="signup.html">Sign Up</a></div></div></div></nav><div class="stripe"></div>`;
  updateAuthLinks(); applySettings();
}
function renderFooter(){
  $('site-footer').innerHTML = `<footer class="site-footer mt-5"><div class="container d-flex flex-wrap justify-content-between gap-2">
  <span>&copy; ${new Date().getFullYear()} Naija Local. Naija Local does not guarantee transactions between buyers and sellers.</span>
  <span class="d-flex gap-3"><a href="safety.html">Safety Guidelines</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></span></div></footer>`;
}
async function updateAuthLinks(){
  const box = $('authLinks'); if (!box || !sb) return;
  const { data: { session } } = await sb.auth.getSession(); if (!session) return;
  const { data: p } = await sb.from('profiles').select('full_name,profile_image,role').eq('id', session.user.id).maybeSingle();
  const name = (p && p.full_name) || 'Account';
  const { count: unread } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false);
  box.innerHTML = `<div class="dropdown"><button class="btn btn-sm text-white d-flex align-items-center gap-2" data-bs-toggle="dropdown" aria-expanded="false">
   ${p && p.profile_image ? `<img src="${esc(p.profile_image)}" class="avatar-sm" alt="">` : '<i class="bi bi-person-circle fs-4"></i>'}
   <span>${esc(name.split(' ')[0])}</span></button>
   <ul class="dropdown-menu dropdown-menu-end">
   <li><a class="dropdown-item" href="profile.html"><i class="bi bi-person"></i> My Profile</a></li>
   <li><a class="dropdown-item" href="dashboard.html"><i class="bi bi-speedometer2"></i> Dashboard</a></li>
   <li><a class="dropdown-item" href="favourites.html"><i class="bi bi-heart"></i> My Favourites</a></li>
   <li><a class="dropdown-item" href="notifications.html"><i class="bi bi-bell"></i> Notifications${unread ? ` <span class="badge text-bg-warning">${unread}</span>` : ''}</a></li>
   ${p && p.role === 'admin' ? '<li><a class="dropdown-item" href="admin.html"><i class="bi bi-shield-lock"></i> Admin</a></li>' : ''}
   <li><hr class="dropdown-divider"></li><li><button class="dropdown-item" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Log out</button></li></ul></div>`;
  $('logoutBtn').onclick = async () => { await sb.auth.signOut(); location.href = 'index.html'; };
}

/* ---------- Phase 3 helpers ---------- */
const PRODUCT_COLS = 'id,seller_id,category_id,product_name,description,price,negotiable,condition,quantity,status,primary_image,state,lga,public_location,contact_phone,whatsapp_number,contact_email,created_at';
const fmtNaira = n => '₦' + Number(n).toLocaleString('en-NG');
const NO_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23e9e2d0'/%3E%3Ctext x='200' y='160' font-size='20' text-anchor='middle' fill='%23737373' font-family='sans-serif'%3ENo image%3C/text%3E%3C/svg%3E";
function waLink(number, text){ return 'https://wa.me/' + String(number).replace(/\D/g, '') + '?text=' + encodeURIComponent(text); }
function timeAgo(d){ const s = (Date.now() - new Date(d)) / 1000; if (s < 3600) return Math.max(1, Math.floor(s / 60)) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' hr ago'; if (s < 2592000) return Math.floor(s / 86400) + ' days ago'; return new Date(d).toLocaleDateString('en-NG'); }
/* Shrinks a photo to max 1280px JPEG before upload (saves data for Nigerian mobile users) */
async function compressImage(file, maxSide = 1280, quality = 0.8){
  const bmp = await createImageBitmap(file), r = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, 'image/jpeg', quality));
}
function confirmBox(title, body, okText = 'Confirm'){
  return new Promise(resolve => {
    let m = $('confirmModal');
    if (!m) { document.body.insertAdjacentHTML('beforeend', `<div class="modal fade" id="confirmModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h2 class="modal-title h5" id="cmTitle"></h2><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body" id="cmBody"></div><div class="modal-footer"><button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button class="btn btn-market" id="cmOk"></button></div></div></div></div>`); m = $('confirmModal'); }
    $('cmTitle').textContent = title; $('cmBody').textContent = body; $('cmOk').textContent = okText;
    const modal = bootstrap.Modal.getOrCreateInstance(m); let done = false;
    $('cmOk').onclick = () => { done = true; modal.hide(); };
    m.addEventListener('hidden.bs.modal', () => resolve(done), { once: true }); modal.show();
  });
}

/* ---------- Phase 4 helpers ---------- */
const CATEGORY_META = [["phones-and-electronics","phone","Phones and Electronics"],["computers-and-accessories","laptop","Computers and Accessories"],["fashion-and-clothing","bag-heart","Fashion and Clothing"],["shoes-and-bags","handbag","Shoes and Bags"],["food-and-groceries","basket","Food and Groceries"],["drinks-and-beverages","cup-straw","Drinks and Beverages"],["home-and-furniture","house-door","Home and Furniture"],["kitchen-appliances","cup-hot","Kitchen Appliances"],["beauty-and-personal-care","flower1","Beauty and Personal Care"],["vehicles-and-automobile","car-front","Vehicles and Automobile"],["building-materials","bricks","Building Materials"],["agriculture-and-farm-products","tree","Agriculture and Farm Products"],["sports-and-fitness","bicycle","Sports and Fitness"],["books-and-educational-materials","book","Books and Educational Materials"],["baby-and-childrens-products","balloon","Baby and Children's Products"],["services","tools","Services"],["others","grid","Others"]];
const catIcon = slug => (CATEGORY_META.find(c => c[0] === slug) || [0, 'grid'])[1];
function categoryCard(c){ return `<a class="cat-card" href="explore.html?category=${esc(c.slug)}"><i class="bi bi-${catIcon(c.slug)}"></i><span>${esc(c.name)}</span></a>`; }
/* one product card, used on the homepage and Explore (row shape = nearby_products) */
function productCard(p){
  return `<article class="pcard"><div class="position-relative"><img class="pi" src="${esc(p.primary_image || NO_IMG)}" alt="${esc(p.product_name)}" loading="lazy">
   <span class="badge ${p.negotiable ? 'badge-neg' : 'badge-fix'} position-absolute top-0 start-0 m-2">${p.negotiable ? 'Negotiable' : 'Fixed price'}</span>
   <button type="button" class="fav-btn" data-fav="${p.id}" aria-label="Save to favourites" aria-pressed="false"><i class="bi bi-heart"></i></button></div>
   <div class="p-3 d-flex flex-column flex-grow-1"><h3 class="h6 mb-1 ptitle">${esc(p.product_name)}</h3><div class="price">${fmtNaira(p.price)}</div>
   <div class="pmeta mb-1">${esc(p.condition)} &middot; ${p.status && p.status !== 'active' ? esc(p.status.charAt(0).toUpperCase() + p.status.slice(1)) : 'Available'}</div>
   <div class="pmeta mb-1">${esc(p.seller_name || 'Seller')}${p.public_location ? ', ' + esc(p.public_location) : ''}</div>
   ${p.distance_km != null ? `<div class="dist mb-2"><i class="bi bi-geo-alt"></i> ${p.distance_km} km away</div>` : ''}
   <a href="product.html?id=${p.id}" class="btn btn-market btn-sm mt-auto">View Product</a></div></article>`;
}
function miniRow(p){
  return `<a href="product.html?id=${p.id}" class="d-flex align-items-center gap-3 p-2 rounded-3 text-decoration-none" style="background:var(--cream);color:var(--charcoal)">
   <img src="${esc(p.primary_image || NO_IMG)}" alt="" width="56" height="56" class="rounded-3" style="object-fit:cover" loading="lazy">
   <span class="flex-grow-1"><strong>${esc(p.product_name)}</strong><br><span class="pmeta">${esc(p.public_location || '')}</span></span><span class="price fs-6">${fmtNaira(p.price)}</span></a>`;
}


/* ---------- Phase 5: favourites, sidebar, sign-in redirect ---------- */
function goSignin(){ location.href = 'signin.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search); }
const FAVS = new Set();
function refreshHearts(){
  document.querySelectorAll('[data-fav]').forEach(b => { const on = FAVS.has(b.dataset.fav); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    const i = b.querySelector('i'); if (i) i.className = 'bi bi-heart' + (on ? '-fill' : ''); });
}
async function loadFavs(){
  if (!sb) return; const { data: { session } } = await sb.auth.getSession(); if (!session) return;
  const { data } = await sb.from('favourites').select('product_id'); (data || []).forEach(r => FAVS.add(r.product_id)); refreshHearts();
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-fav]'); if (!b || !sb) return; e.preventDefault();
  const { data: { session } } = await sb.auth.getSession(); if (!session) return goSignin();
  const id = b.dataset.fav; b.disabled = true;
  if (FAVS.has(id)) {
    const { error } = await sb.from('favourites').delete().eq('user_id', session.user.id).eq('product_id', id);
    if (!error) { FAVS.delete(id); const it = b.closest('[data-fav-item]'); if (it) it.remove(); }
  } else {
    const { error } = await sb.from('favourites').insert({ user_id: session.user.id, product_id: id });
    if (!error || error.code === '23505') FAVS.add(id);
  }
  b.disabled = false; refreshHearts();
});
new MutationObserver(refreshHearts).observe(document.documentElement, { childList: true, subtree: true });
loadFavs();

function renderSidebar(active){
  const L = [['dashboard.html','Overview','speedometer2'],['my-products.html','My Products','box-seam'],['add-product.html','Add New Product','plus-circle'],['my-products.html?status=active','Active Listings','check-circle'],['my-products.html?status=draft','Draft Products','pencil-square'],['my-products.html?status=sold','Sold Products','bag-check'],['favourites.html','Favourites','heart'],['enquiries.html','Enquiries','chat-dots'],['profile.html','My Profile and Settings','person-gear']];
  $('sidebar').innerHTML = `<button class="btn btn-outline-success d-lg-none w-100 mb-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#sideMenu"><i class="bi bi-list"></i> Dashboard menu</button>
  <div class="offcanvas-lg offcanvas-start" tabindex="-1" id="sideMenu"><div class="offcanvas-header"><h2 class="offcanvas-title h5">Menu</h2><button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#sideMenu" aria-label="Close"></button></div>
  <div class="offcanvas-body"><nav class="side-nav w-100" aria-label="Dashboard">${L.map(([h, t, i]) => `<a href="${h}" class="${h === active ? 'active' : ''}"><i class="bi bi-${i}"></i> ${t}</a>`).join('')}<button id="sideLogout"><i class="bi bi-box-arrow-right"></i> Logout</button></nav></div></div>`;
  $('sideLogout').onclick = async () => { await sb.auth.signOut(); location.href = 'index.html'; };
}

/* ---------- Phase 6: admin + platform settings ---------- */
async function requireAdmin(){
  const s = await requireAuth(); if (!s) return null;
  const { data: p } = await sb.from('profiles').select('role,is_suspended').eq('id', s.user.id).maybeSingle();
  if (!p || p.role !== 'admin' || p.is_suspended) {
    document.querySelector('main').innerHTML = '<div class="container py-5 text-center"><i class="bi bi-shield-lock fs-1 text-danger"></i><h1 class="h3 mt-2">Administrators only</h1><p class="text-muted-2">You do not have permission to view this page.</p><a class="btn btn-market" href="index.html">Back to home</a></div>';
    return null;
  }
  return s;
}
function renderAdminSidebar(active){
  const L = [['admin.html','Overview','speedometer2'],['admin-users.html','Users','people'],['admin-products.html','Products','box-seam'],['admin-reports.html','Reports','flag'],['admin-categories.html','Categories','tags'],['admin-settings.html','Platform settings','gear'],['index.html','Back to marketplace','shop']];
  $('sidebar').innerHTML = `<button class="btn btn-outline-success d-lg-none w-100 mb-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#sideMenu"><i class="bi bi-list"></i> Admin menu</button>
  <div class="offcanvas-lg offcanvas-start" tabindex="-1" id="sideMenu"><div class="offcanvas-header"><h2 class="offcanvas-title h5">Admin</h2><button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#sideMenu" aria-label="Close"></button></div>
  <div class="offcanvas-body"><nav class="side-nav w-100" aria-label="Admin">${L.map(([h, t, i]) => `<a href="${h}" class="${h === active ? 'active' : ''}"><i class="bi bi-${i}"></i> ${t}</a>`).join('')}</nav></div></div>`;
}
async function applySettings(){
  if (!sb) return;
  const { data } = await sb.from('platform_settings').select('key,value'); const m = {}; (data || []).forEach(r => m[r.key] = r.value);
  if (m.announcement && !document.querySelector('.announce')) {
    const nav = document.querySelector('nav.navbar'); if (nav) nav.insertAdjacentHTML('afterend', `<div class="announce" role="status">${esc(m.announcement)}</div>`);
  }
  const wa = normalizePhone(m.contact_whatsapp);
  if (wa) document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a => a.href = 'https://wa.me/' + wa.replace('+', ''));
  if (m.contact_email) document.querySelectorAll('a[href^="mailto:"]').forEach(a => { a.href = 'mailto:' + m.contact_email; if (a.textContent.includes('@')) a.innerHTML = '<i class="bi bi-envelope"></i> ' + esc(m.contact_email); });
}