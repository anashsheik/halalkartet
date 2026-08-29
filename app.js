const STATUS_ORDER = ['verifisert', 'delvis', 'uavklart'];
const STATUS = {
  'verifisert': { label: 'Verifisert halal', color: '#2E7D4F', pin: 'pin-verifisert' },
  'delvis':     { label: 'Delvis halal',     color: '#D98A1F', pin: 'pin-delvis'     },
  'uavklart':   { label: 'Uavklart',         color: '#8A8F98', pin: 'pin-uavklart'   }
};
const priceLabel = p => '$'.repeat(p);
const el = id => document.getElementById(id);

const map = L.map('map', { zoomControl: false, scrollWheelZoom: true }).setView([59.9139, 10.7522], 13.5);
L.control.zoom({ position: 'topright' }).addTo(map);
// --- Kartlag ---
// Standard er OpenStreetMap (gratis, ingen nokkel, virker med en gang).
// Vil du ha et renere kart der restaurantene far all oppmerksomheten og
// butikker og bygninger tones ned, bruk Stadia Alidade Smooth. Registrer
// domenet ditt gratis pa stadiamaps.com og sett PREMIUM_MAP = true under.
const PREMIUM_MAP = false;
if (PREMIUM_MAP) {
  L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap', maxZoom: 20
  }).addTo(map);
} else {
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap-bidragsytere', maxZoom: 19
  }).addTo(map);
}

let HALAL_SPOTS = [];
const markers = {};
let activeId = null;
let userLoc = null, userMarker = null;
const layerOn = { 'verifisert': true, 'delvis': true, 'uavklart': true };
const layerCollapsed = { 'verifisert': false, 'delvis': false, 'uavklart': false };
const byId = id => HALAL_SPOTS.find(s => s.id === id);

/* ---- Anonym hendelsessporing ----
   Virker automatisk med Plausible, Fathom eller Umami så snart du limer inn
   scriptet deres i <head>. Ingen cookies og ingen personopplysninger sendes –
   kun navnet på handlingen (+ evt. hvilken restaurant/bydel). Er ingen
   leverandor lastet, gjor funksjonen ingenting.
   NB: Cloudflare Web Analytics stotter ikke egne hendelser – vil du se disse i
   statistikken, velg Plausible, Fathom eller Umami. */
function track(name, props) {
  try {
    if (typeof window.plausible === 'function') window.plausible(name, props ? { props: props } : undefined);
    else if (window.umami && typeof window.umami.track === 'function') window.umami.track(name, props || {});
    else if (window.fathom && typeof window.fathom.trackEvent === 'function') window.fathom.trackEvent(name);
  } catch (e) { /* sporing skal aldri kunne knekke siden */ }
}

(async function boot() {
  try {
    const res = await fetch('spots.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    HALAL_SPOTS = await res.json();
    if (!Array.isArray(HALAL_SPOTS) || !HALAL_SPOTS.length) throw new Error('tomt');
  } catch (e) { showLoadError(); return; }
  initApp();
})();

function showLoadError() {
  el('resultCount').textContent = 'Ingen data';
  const overlay = document.createElement('div');
  overlay.className = 'map-overlay';
  overlay.innerHTML =
    '<div class="box"><h2>Kartet venter på data</h2>' +
    '<p>Appen fant ikke <code>spots.json</code>. Det skjer bare når du åpner filen rett fra disk — nettlesere blokkerer lokal filhenting.</p>' +
    '<p>Kjør en liten server i prosjektmappen:</p><p><code>python3 -m http.server</code></p>' +
    '<p>Gå så til <code>http://localhost:8000</code>. Publisert side fungerer uten noe ekstra.</p></div>';
  el('map').appendChild(overlay);
}

function initApp() {
  [...new Set(HALAL_SPOTS.map(s => s.bydel))].sort().forEach(b => el('fBydel').add(new Option(b, b)));
  [...new Set(HALAL_SPOTS.flatMap(s => s.cuisines))].sort().forEach(c => el('fCuisine').add(new Option(c, c)));

  HALAL_SPOTS.forEach(s => {
    const m = L.marker([s.lat, s.lng], { icon: makeIcon(s.halalStatus, false) })
      .bindPopup(popupHtml(s), { closeButton: true });
    m.on('click', () => setActive(s.id, false));
    m.on('popupclose', () => { if (activeId === s.id) setActive(null); });
    markers[s.id] = m;
  });

  [el('search'), el('fBydel'), el('fCuisine')].forEach(x => x.addEventListener('input', render));
  el('fBydel').addEventListener('change', () => { if (el('fBydel').value) track('filter_bydel', { bydel: el('fBydel').value }); });
  el('fCuisine').addEventListener('change', () => { if (el('fCuisine').value) track('filter_kjokken', { kjokken: el('fCuisine').value }); });
  el('reset').addEventListener('click', () => {
    el('search').value = ''; el('fBydel').value = ''; el('fCuisine').value = ''; render();
  });
  el('collapse').addEventListener('click', () => togglePanel(true));
  el('reopen').addEventListener('click', () => togglePanel(false));
  wireNearMe();
  wireInfo();
  wireContactForm();
  el('feedback').addEventListener('click', function () { openInfo('kontakt'); });
  if (window.innerWidth <= 720) togglePanel(true);

  render();
}

function togglePanel(collapse) {
  el('panel').classList.toggle('collapsed', collapse);
  document.body.classList.toggle('panel-collapsed', collapse);
  setTimeout(() => map.invalidateSize(), 320);
}

function makeIcon(status, big) {
  return L.divIcon({
    className: '', iconSize: big ? [23,23] : [17,17], iconAnchor: big ? [11,11] : [8,8],
    popupAnchor: [0,-11], html: '<div class="pin ' + STATUS[status].pin + (big ? ' big' : '') + '"></div>'
  });
}
function iconRow(kind, text) {
  const icons = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    phone: '<path d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>'
  };
  return '<div class="pop-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6b63" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + icons[kind] + '</svg><span>' + text + '</span></div>';
}
function popupHtml(s) {
  const rows = [];
  if (s.hours) rows.push(iconRow('clock', s.hours));
  rows.push(iconRow('pin', s.address + ' · ' + s.bydel));
  if (s.phone) rows.push(iconRow('phone', s.phone));
  if (s.website) rows.push('<div class="pop-row"><a href="' + s.website + '" target="_blank" rel="noopener" style="color:#0E3D2C;font-weight:600;text-decoration:none">Nettside ↗</a></div>');
  return '<div class="pop-name">' + s.name + '</div>' +
    '<div class="pop-meta">' + s.cuisines.join(' · ') + ' &nbsp;·&nbsp; ' + priceLabel(s.price) + '</div>' +
    '<div class="pop-badge" data-s="' + s.halalStatus + '"><span class="dotc"></span>' + STATUS[s.halalStatus].label + '</div>' +
    '<div class="pop-desc">' + s.description + '</div>' +
    (s.verification ? '<div class="pop-verify">' + s.verification + '</div>' : '') +
    rows.join('');
}

function currentFilters() {
  return { q: el('search').value.trim().toLowerCase(), bydel: el('fBydel').value, cuisine: el('fCuisine').value };
}
function passes(s, f) {
  if (f.bydel && s.bydel !== f.bydel) return false;
  if (f.cuisine && !s.cuisines.includes(f.cuisine)) return false;
  if (f.q) {
    const hay = (s.name + ' ' + s.cuisines.join(' ') + ' ' + s.bydel).toLowerCase();
    if (!hay.includes(f.q)) return false;
  }
  return true;
}

function render() {
  const f = currentFilters();
  const filtered = HALAL_SPOTS.filter(s => passes(s, f));

  HALAL_SPOTS.forEach(s => {
    const show = filtered.includes(s) && layerOn[s.halalStatus];
    if (show && !map.hasLayer(markers[s.id])) markers[s.id].addTo(map);
    if (!show && map.hasLayer(markers[s.id])) map.removeLayer(markers[s.id]);
  });

  const box = el('layers');
  box.innerHTML = '';
  const anyFilter = f.q || f.bydel || f.cuisine;

  if (filtered.length === 0) {
    box.innerHTML = '<div class="no-results"><b>Ingen treff</b>Prøv å fjerne et filter eller søk på noe annet.</div>';
  } else {
    STATUS_ORDER.forEach(st => {
      let items = filtered.filter(s => s.halalStatus === st);
      if (userLoc) items = items.slice().sort((a, b) => dist(a) - dist(b));
      const layer = document.createElement('div');
      layer.className = 'layer' + (layerCollapsed[st] ? ' collapsed' : '') + (layerOn[st] ? '' : ' off');

      const head = document.createElement('div');
      head.className = 'layer-head';
      head.innerHTML =
        '<span class="layer-check ' + (layerOn[st] ? 'on' : '') + '" data-s="' + st + '" role="checkbox" aria-checked="' + layerOn[st] + '" tabindex="0">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</span>' +
        '<span class="layer-dot" style="background:' + STATUS[st].color + '"></span>' +
        '<span class="layer-name">' + STATUS[st].label + '</span>' +
        '<span class="layer-count">' + items.length + '</span>' +
        '<svg class="layer-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';

      const check = head.querySelector('.layer-check');
      const toggleLayer = e => { e.stopPropagation(); layerOn[st] = !layerOn[st]; render(); };
      check.addEventListener('click', toggleLayer);
      check.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLayer(e); } });
      head.addEventListener('click', () => { layerCollapsed[st] = !layerCollapsed[st]; render(); });

      layer.appendChild(head);

      const list = document.createElement('div');
      list.className = 'layer-items';
      if (items.length === 0) {
        list.innerHTML = '<div class="layer-empty">Ingen steder her ennå.</div>';
      } else {
        items.forEach(s => list.appendChild(itemEl(s)));
      }
      layer.appendChild(list);
      box.appendChild(layer);
    });
  }

  const visibleCount = filtered.filter(s => layerOn[s.halalStatus]).length;
  el('resultCount').textContent = visibleCount + ' av ' + HALAL_SPOTS.length + ' steder';
  el('reset').disabled = !anyFilter;
}

function itemEl(s) {
  const b = document.createElement('button');
  b.className = 'item' + (s.id === activeId ? ' active' : '');
  b.dataset.s = s.halalStatus; b.dataset.id = s.id;
  b.innerHTML =
    '<div class="item-name">' + s.name + '</div>' +
    '<div class="item-meta">' + (userLoc ? '<span class="dist">' + fmtDist(dist(s)) + '</span> · ' : '') + s.bydel + ' · ' + s.cuisines.join(', ') + ' · <span class="price">' + priceLabel(s.price) + '</span></div>';
  b.addEventListener('click', () => setActive(s.id, true));
  return b;
}

function setActive(id, fromList) {
  if (activeId && markers[activeId]) markers[activeId].setIcon(makeIcon(byId(activeId).halalStatus, false));
  activeId = id;
  document.querySelectorAll('.item').forEach(c => c.classList.toggle('active', c.dataset.id === id));
  if (id) {
    const s = byId(id);
    track('restaurant_klikk', { navn: s.name, bydel: s.bydel, status: s.halalStatus });
    markers[id].setIcon(makeIcon(s.halalStatus, true));
    if (fromList) {
      if (window.innerWidth <= 720) togglePanel(true);
      map.flyTo([s.lat, s.lng], 15, { duration: .6 });
      markers[id].openPopup();
    }
  }
}

/* ---- geolocation: near me ---- */
function haversine(la1, lo1, la2, lo2) {
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLa = toR(la2 - la1), dLo = toR(lo2 - lo1);
  const a = Math.sin(dLa/2)**2 + Math.cos(toR(la1)) * Math.cos(toR(la2)) * Math.sin(dLo/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function dist(s) { return userLoc ? haversine(userLoc.lat, userLoc.lng, s.lat, s.lng) : 0; }
function fmtDist(km) { return km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km'; }
function wireNearMe() { el('nearme').addEventListener('click', locateUser); }
function locateUser() {
  const btn = el('nearme');
  track('naer_meg');
  if (!navigator.geolocation) { alert('Nettleseren din støtter ikke posisjon.'); return; }
  btn.classList.add('loading');
  navigator.geolocation.getCurrentPosition(pos => {
    userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([userLoc.lat, userLoc.lng], {
      icon: L.divIcon({ className: '', html: '<div class="userloc"></div>', iconSize: [16,16], iconAnchor: [8,8] }),
      zIndexOffset: 1000
    }).addTo(map);
    map.flyTo([userLoc.lat, userLoc.lng], 14.5, { duration: .6 });
    btn.classList.remove('loading');
    if (window.innerWidth <= 720) togglePanel(true);
    render();
  }, () => {
    btn.classList.remove('loading');
    track('naer_meg_avslag');
    alert('Fant ikke posisjonen din. Sjekk at nettleseren har fått tilgang til posisjon.');
  }, { enableHighAccuracy: true, timeout: 10000 });
}

/* ---- info modal ---- */
function wireInfo() {
  document.querySelectorAll('[data-info]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); openInfo(a.dataset.info); }));
  document.querySelectorAll('.info-tab').forEach(t =>
    t.addEventListener('click', () => showInfo(t.dataset.tab)));
  el('infoClose').addEventListener('click', closeInfo);
  el('infoScrim').addEventListener('click', e => { if (e.target === el('infoScrim')) closeInfo(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeInfo(); });
}
function openInfo(section) { track('apnet_side', { side: section }); el('infoScrim').classList.add('open'); showInfo(section); }
function closeInfo() { el('infoScrim').classList.remove('open'); }
function showInfo(section) {
  document.querySelectorAll('.info-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === section));
  document.querySelectorAll('.info-section').forEach(x => x.classList.toggle('active', x.dataset.section === section));
  el('infoBody').scrollTop = 0;
}

/* ---- kontaktskjema (Netlify Forms, sendes uten sideomlasting) ---- */
function wireContactForm() {
  const f = document.getElementById('kontaktForm');
  if (!f) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    // Kontaktfeltet er frivillig, men hvis det er fylt ut må det være en
    // gyldig e-post (én @ og et punktum etter) eller et telefonnummer.
    const kEl = el('kfKontakt');
    const errEl = el('kfKontaktErr');
    if (errEl) errEl.hidden = true;
    if (kEl && kEl.value.trim()) {
      const v = kEl.value.trim();
      const emailOk = /^[a-zA-Z0-9_%+-]+(?:\.[a-zA-Z0-9_%+-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(v);
      const phoneOk = /^[+()\d\s-]{6,}$/.test(v);
      const ok = v.indexOf('@') !== -1 ? emailOk : phoneOk;
      if (!ok) { if (errEl) errEl.hidden = false; kEl.focus(); return; }
    }
    const btn = f.querySelector('.kf-send');
    const body = new URLSearchParams(new FormData(f)).toString();
    btn.disabled = true; btn.textContent = 'Sender';
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .then(function (r) {
        if (!r.ok) throw new Error('feil');
        track('kontakt_sendt');
        f.reset();
        btn.disabled = false; btn.textContent = 'Send inn';
        el('kontaktOk').hidden = false;
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'Send inn';
        alert('Beklager, noe gikk galt. Prov igjen om litt.');
      });
  });
}