/* Location helpers. Load after app.js. Saved location lives in localStorage key "naija_loc" */
const STATE_COORDS = {"Abia":[5.5265,7.4906],"Adamawa":[9.2035,12.4954],"Akwa Ibom":[5.0377,7.9128],"Anambra":[6.2105,7.0720],"Bauchi":[10.3158,9.8442],"Bayelsa":[4.9267,6.2676],"Benue":[7.7337,8.5214],"Borno":[11.8333,13.15],"Cross River":[4.9757,8.3417],"Delta":[6.1980,6.7350],"Ebonyi":[6.3249,8.1137],"Edo":[6.3350,5.6037],"Ekiti":[7.6210,5.2210],"Enugu":[6.4584,7.5464],"FCT Abuja":[9.0765,7.3986],"Gombe":[10.2897,11.1673],"Imo":[5.4836,7.0333],"Jigawa":[11.7561,9.3389],"Kaduna":[10.5105,7.4165],"Kano":[12.0022,8.5920],"Katsina":[12.9908,7.6018],"Kebbi":[12.4539,4.1975],"Kogi":[7.8023,6.7333],"Kwara":[8.4966,4.5421],"Lagos":[6.6018,3.3515],"Nasarawa":[8.4833,8.5167],"Niger":[9.6139,6.5569],"Ogun":[7.1475,3.3619],"Ondo":[7.2526,5.1931],"Osun":[7.7827,4.5418],"Oyo":[7.3775,3.9470],"Plateau":[9.8965,8.8583],"Rivers":[4.8156,7.0498],"Sokoto":[13.0059,5.2476],"Taraba":[8.8833,11.3667],"Yobe":[11.7470,11.9608],"Zamfara":[12.1704,6.6641]};
function getSavedLoc(){ try { const l = JSON.parse(localStorage.getItem('naija_loc')); if (l && typeof l.lat === 'number' && typeof l.lng === 'number') return l; } catch (e) {} return null; }
function saveLoc(l){ try { localStorage.setItem('naija_loc', JSON.stringify(l)); } catch (e) {} }
function stateLoc(name){ const c = STATE_COORDS[name]; return c ? { lat: c[0], lng: c[1], label: name } : null; }
function gpsLoc(){
  return new Promise((res, rej) => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'your location' }), rej, { timeout: 10000 })
    : rej(new Error('unsupported')));
}
async function geocodePlace(q){   // OpenStreetMap Nominatim: free, no key, light use only
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q=' + encodeURIComponent(q));
  const j = await r.json(); return j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null;
}
/* saved location, else the signed-in user's saved preference, else their profile state */
async function initialLoc(){
  const s = getSavedLoc(); if (s) return s; if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession(); if (!session) return null;
  const { data: p } = await sb.from('profiles').select('pref_latitude,pref_longitude,state').eq('id', session.user.id).maybeSingle();
  if (p && p.pref_latitude != null) return { lat: p.pref_latitude, lng: p.pref_longitude, label: 'your saved location' };
  return p && p.state ? stateLoc(p.state) : null;
}
function openLocationModal(onApply){
  if (!$('locModal')) {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal fade" id="locModal" tabindex="-1" aria-labelledby="locTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
     <div class="modal-header"><h2 class="modal-title h5" id="locTitle">Set your location</h2><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
     <div class="modal-body vstack gap-3"><button class="btn btn-market" id="lmGps" type="button"><i class="bi bi-geo-alt-fill"></i> Use my current location</button>
      <div class="text-center text-muted-2 small">or choose an area</div>
      <div><label class="form-label" for="lmState">State</label><select id="lmState" class="form-select"><option value="">Select state</option></select></div>
      <div><label class="form-label" for="lmPlace">LGA, town or neighbourhood (optional)</label><input id="lmPlace" class="form-control" placeholder="e.g. Ikeja or Bodija"></div>
      <button class="btn btn-outline-success" id="lmGo" type="button">Use this area</button><div id="lmMsg" class="small text-muted-2" role="status"></div></div></div></div></div>`);
    STATES.forEach(s => $('lmState').add(new Option(s, s)));
  }
  const modal = bootstrap.Modal.getOrCreateInstance($('locModal')), msg = t => $('lmMsg').textContent = t; msg('');
  const done = l => { saveLoc(l); modal.hide(); onApply(l); };
  $('lmGps').onclick = async () => { msg('Finding your location...'); try { done(await gpsLoc()); } catch (e) { msg('Location is blocked. Allow it in your browser settings, or choose an area below.'); } };
  $('lmGo').onclick = async () => {
    const st = $('lmState').value, place = $('lmPlace').value.trim();
    if (!st) return msg('Choose a state first.');
    if (!place) return done(stateLoc(st));
    msg('Searching...');
    try { const g = await geocodePlace(`${place}, ${st}, Nigeria`); if (g) return done({ ...g, label: `${place}, ${st}` }); } catch (e) {}
    msg("We couldn't find that place. Try a bigger town, or leave it blank to use the whole state.");
  };
  modal.show();
}