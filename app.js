const STATUS_ORDER = ['verifisert', 'delvis', 'uavklart'];
const STATUS = {
  'verifisert': { label: 'Verifisert halal', color: '#2E7D4F', pin: 'pin-verifisert' },
  'delvis':     { label: 'Delvis halal',     color: '#D98A1F', pin: 'pin-delvis'     },
  'uavklart':   { label: 'Uavklart',         color: '#8A8F98', pin: 'pin-uavklart'   }
};
const priceLabel = p => '$'.repeat(p);
const el = id => document.getElementById(id);

/* All tekst fra spots.json settes inn via innerHTML. Escaping her gjor at et
   restaurantnavn med <, & eller " ikke kan bryte ut av markupen. */
const esc = v => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* Slipper bare gjennom http/https, slik at en feilskrevet eller ondsinnet
   website-verdi ikke blir en javascript:-lenke. */
function safeUrl(u) {
  if (!u) return null;
  try {
    const p = new URL(u, location.href);
    return (p.protocol === 'http:' || p.protocol === 'https:') ? p.href : null;
  } catch (e) { return null; }
}

/* hours er fritekst ("Stenger kl. 23", "Stengt na", "Midlertidig stengt").
   Vi flagger bare de tydelig stengte variantene - "Stenger" treffer ikke. */
const isClosed = s => /stengt/i.test(s.hours || '');

const map = L.map('map', { zoomControl: false, scrollWheelZoom: true }).setView([59.9139, 10.7522], 13.5);
L.control.zoom({ position: 'topright' }).addTo(map);
// --- Kartlag ---
// Stadia Alidade Smooth toner ned butikker og bygninger, slik at
// restaurantpinnene får all oppmerksomheten. Autentisering skjer på domenet
// (halalkartet.no er registrert på stadiamaps.com) – ingen nøkkel i koden.
// localhost og 127.0.0.1 virker uten oppsett, så lokal utvikling er uendret.
// Settes denne til false, faller kartet tilbake til vanlig OpenStreetMap.
const PREMIUM_MAP = true;
if (PREMIUM_MAP) {
  L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; OpenStreetMap-bidragsytere',
    // {r} over blir til @2x av seg selv pa skjermer med hoy pikseltetthet.
    // Ikke sett detectRetina her: Leaflet fyller {r} fra Browser.retina
    // uansett, og detectRetina ville i tillegg halvert flisstorrelsen og
    // okt zoomOffset – altsa fire ganger sa mange flisforesporsler pa feil
    // zoomniva.
    minZoom: 0,
    maxZoom: 20
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
let lastFocus = null;
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
  } catch (e) { showLoadError(e); return; }
  initApp();
})();

function showLoadError(err) {
  el('resultCount').textContent = 'Ingen data';
  // Skriv arsaken i konsollen – uten den star man igjen med en tilsynelatende
  // blank side og ingen pekepinn pa hva som feilet.
  if (err && window.console) console.error('Halalkartet: klarte ikke å laste spots.json –', err);
  // Meldingen legges bade i lista og over kartet. Pa mobil skjuler CSS-en
  // kartet sa lenge panelet er apent, sa et overlay alene ville vart usynlig.
  el('layers').innerHTML =
    '<div class="no-results"><b>Fant ikke dataene</b>' +
    'Kartet fikk ikke lastet <code>spots.json</code>. Prøv å laste siden på nytt.</div>';
  if (window.innerWidth <= 720) togglePanel(true);
  const overlay = document.createElement('div');
  overlay.className = 'map-overlay';
  overlay.innerHTML =
    '<div class="box"><h2>Kartet venter på data</h2>' +
    '<p>Appen fikk ikke lastet <code>spots.json</code>. Prøv å laste siden på nytt — hjelper ikke det, står det en teknisk årsak i nettleserkonsollen.</p>' +
    '<p>Utvikler du lokalt, husk at filen må serveres over http. Nettlesere blokkerer henting av lokale filer:</p>' +
    '<p><code>python3 -m http.server</code></p>' +
    '<p>Gå så til <code>http://localhost:8000</code>.</p></div>';
  el('map').appendChild(overlay);
}

function initApp() {
  [...new Set(HALAL_SPOTS.map(s => s.bydel))].sort((a, b) => a.localeCompare(b, 'nb'))
    .forEach(b => el('fBydel').add(new Option(b, b)));
  [...new Set(HALAL_SPOTS.flatMap(s => s.cuisines))].sort((a, b) => a.localeCompare(b, 'nb'))
    .forEach(c => el('fCuisine').add(new Option(c, c)));

  HALAL_SPOTS.forEach(s => {
    const m = L.marker([s.lat, s.lng], { icon: makeIcon(s.halalStatus, false) })
      .bindPopup(popupHtml(s), { closeButton: true, minWidth: 236, maxWidth: 300 });
    m.on('click', () => setActive(s.id, false));
    m.on('popupclose', () => { if (activeId === s.id) setActive(null); });
    markers[s.id] = m;
  });

  ['search', 'fBydel', 'fCuisine', 'fPrice', 'fSort'].forEach(id => {
    const x = el(id);
    if (x) x.addEventListener('input', render);
  });
  el('fBydel').addEventListener('change', () => { if (el('fBydel').value) track('filter_bydel', { bydel: el('fBydel').value }); });
  el('fCuisine').addEventListener('change', () => { if (el('fCuisine').value) track('filter_kjokken', { kjokken: el('fCuisine').value }); });
  if (el('fPrice')) el('fPrice').addEventListener('change', () => { if (el('fPrice').value) track('filter_pris', { pris: el('fPrice').value }); });
  if (el('fSort')) el('fSort').addEventListener('change', () => {
    const v = el('fSort').value;
    if (v) track('sortering', { modus: v });
    // "Nærmest meg" gir ingen mening uten posisjon – be om den med en gang.
    if (v === 'avstand' && !userLoc) locateUser();
  });
  el('reset').addEventListener('click', () => {
    el('search').value = ''; el('fBydel').value = ''; el('fCuisine').value = '';
    if (el('fPrice')) el('fPrice').value = '';
    if (el('fSort')) el('fSort').value = '';
    render();
    el('search').focus();
  });
  el('collapse').addEventListener('click', () => togglePanel(true));
  el('reopen').addEventListener('click', () => togglePanel(false));
  wireNearMe();
  wireInfo();
  wireContactForm();
  wirePopupActions();
  wireShortcuts();
  el('feedback').addEventListener('click', function () { openInfo('kontakt'); });
  if (window.innerWidth <= 720) togglePanel(true);

  render();
  applyHash();
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

const POP_ICONS = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 010 18 15 15 0 010-18z"/>'
};
function iconRow(kind, inner) {
  return '<div class="pop-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6b63" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    POP_ICONS[kind] + '</svg>' + inner + '</div>';
}

function popupHtml(s) {
  const rows = [];
  if (s.hours) {
    rows.push(iconRow('clock', '<span>' + esc(s.hours) +
      (isClosed(s) ? ' <span class="pop-closed">Stengt</span>' : '') + '</span>'));
  }
  rows.push(iconRow('pin', '<span>' + esc(s.address) + ' · ' + esc(s.bydel) + '</span>'));
  if (s.phone) {
    rows.push(iconRow('phone', '<a class="pop-link" href="tel:' + esc(String(s.phone).replace(/\s+/g, '')) + '">' + esc(s.phone) + '</a>'));
  }
  const site = safeUrl(s.website);
  if (site) {
    rows.push(iconRow('globe', '<a class="pop-link" href="' + esc(site) + '" target="_blank" rel="noopener">Nettside ↗</a>'));
  }

  const dir = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(s.lat + ',' + s.lng);

  return '<div class="pop-name">' + esc(s.name) + '</div>' +
    '<div class="pop-meta">' + esc(s.cuisines.join(' · ')) + ' &nbsp;·&nbsp; ' + priceLabel(s.price) + '</div>' +
    '<div class="pop-badge" data-s="' + esc(s.halalStatus) + '"><span class="dotc"></span>' + STATUS[s.halalStatus].label + '</div>' +
    (s.description ? '<div class="pop-desc">' + esc(s.description) + '</div>' : '') +
    (s.verification ? '<div class="pop-verify">' + esc(s.verification) + '</div>' : '') +
    rows.join('') +
    '<div class="pop-actions">' +
      '<a class="pop-act primary" href="' + dir + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>Veibeskrivelse</a>' +
      '<button type="button" class="pop-act" data-act="del" data-id="' + esc(s.id) + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>Del</button>' +
    '</div>';
}

function currentFilters() {
  return {
    q: el('search').value.trim().toLowerCase(),
    bydel: el('fBydel').value,
    cuisine: el('fCuisine').value,
    price: el('fPrice') ? el('fPrice').value : '',
    sort: el('fSort') ? el('fSort').value : ''
  };
}
function passes(s, f) {
  if (f.bydel && s.bydel !== f.bydel) return false;
  if (f.cuisine && !s.cuisines.includes(f.cuisine)) return false;
  if (f.price && String(s.price) !== f.price) return false;
  if (f.q) {
    // Adressen er med, slik at "Grønland 5" eller "Torggata" gir treff.
    const hay = (s.name + ' ' + s.cuisines.join(' ') + ' ' + s.bydel + ' ' + (s.address || '')).toLowerCase();
    if (!hay.includes(f.q)) return false;
  }
  return true;
}

function sortItems(items, mode) {
  const arr = items.slice();
  const byName = (a, b) => a.name.localeCompare(b.name, 'nb');
  if (mode === 'avstand' && userLoc) return arr.sort((a, b) => dist(a) - dist(b));
  if (mode === 'navn') return arr.sort(byName);
  if (mode === 'pris') return arr.sort((a, b) => a.price - b.price || byName(a, b));
  if (userLoc) return arr.sort((a, b) => dist(a) - dist(b));
  return arr;
}

function render() {
  const f = currentFilters();
  const filtered = HALAL_SPOTS.filter(s => passes(s, f));
  const shown = new Set(filtered.map(s => s.id));

  HALAL_SPOTS.forEach(s => {
    const show = shown.has(s.id) && layerOn[s.halalStatus];
    if (show && !map.hasLayer(markers[s.id])) markers[s.id].addTo(map);
    if (!show && map.hasLayer(markers[s.id])) map.removeLayer(markers[s.id]);
  });

  const box = el('layers');
  box.innerHTML = '';
  const anyFilter = !!(f.q || f.bydel || f.cuisine || f.price || f.sort);

  if (filtered.length === 0) {
    box.innerHTML = '<div class="no-results"><b>Ingen treff</b>Prøv å fjerne et filter eller søk på noe annet.</div>';
  } else {
    STATUS_ORDER.forEach(st => {
      const items = sortItems(filtered.filter(s => s.halalStatus === st), f.sort);
      const layer = document.createElement('div');
      layer.className = 'layer' + (layerCollapsed[st] ? ' collapsed' : '') + (layerOn[st] ? '' : ' off');

      // Checkbox (vis/skjul på kartet) og head (fold ut/inn) er to separate
      // kontroller, ikke nostede – begge kan nås med tastatur.
      const row = document.createElement('div');
      row.className = 'layer-row';

      const check = document.createElement('span');
      check.className = 'layer-check' + (layerOn[st] ? ' on' : '');
      check.dataset.s = st;
      check.setAttribute('role', 'checkbox');
      check.setAttribute('aria-checked', String(layerOn[st]));
      check.setAttribute('aria-label', 'Vis ' + STATUS[st].label + ' på kartet');
      check.tabIndex = 0;
      check.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      const toggleLayer = e => { e.preventDefault(); e.stopPropagation(); layerOn[st] = !layerOn[st]; render(); };
      check.addEventListener('click', toggleLayer);
      check.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleLayer(e); });

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'layer-head';
      head.setAttribute('aria-expanded', String(!layerCollapsed[st]));
      head.innerHTML =
        '<span class="layer-dot" style="background:' + STATUS[st].color + '"></span>' +
        '<span class="layer-name">' + STATUS[st].label + '</span>' +
        '<span class="layer-count">' + items.length + '</span>' +
        '<svg class="layer-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
      head.addEventListener('click', () => { layerCollapsed[st] = !layerCollapsed[st]; render(); });

      row.appendChild(check);
      row.appendChild(head);
      layer.appendChild(row);

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
  b.type = 'button';
  b.className = 'item' + (s.id === activeId ? ' active' : '');
  b.dataset.s = s.halalStatus; b.dataset.id = s.id;
  const meta = [];
  if (userLoc) meta.push('<span class="dist">' + fmtDist(dist(s)) + '</span>');
  meta.push(esc(s.bydel));
  meta.push(esc(s.cuisines.join(', ')));
  meta.push('<span class="price">' + priceLabel(s.price) + '</span>');
  b.innerHTML =
    '<div class="item-name">' + esc(s.name) +
      (isClosed(s) ? '<span class="chip-closed">Stengt</span>' : '') + '</div>' +
    '<div class="item-meta">' + meta.join(' · ') + '</div>';
  b.addEventListener('click', () => setActive(s.id, true));
  return b;
}

function setActive(id, fromList) {
  if (activeId && markers[activeId] && byId(activeId)) {
    markers[activeId].setIcon(makeIcon(byId(activeId).halalStatus, false));
  }
  activeId = id;
  document.querySelectorAll('.item').forEach(c => c.classList.toggle('active', c.dataset.id === id));
  if (id) {
    const s = byId(id);
    if (!s) return;
    track('restaurant_klikk', { navn: s.name, bydel: s.bydel, status: s.halalStatus });
    markers[id].setIcon(makeIcon(s.halalStatus, true));
    // Delbar lenke rett til stedet. replaceState brukes for a ikke fylle
    // historikken med ett steg per markor brukeren apner.
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + encodeURIComponent(id));
    if (fromList) {
      if (window.innerWidth <= 720) togglePanel(true);
      map.flyTo([s.lat, s.lng], 15, { duration: .6 });
      markers[id].openPopup();
    }
  } else if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

/* Apner stedet en delt lenke peker pa (halalkartet.no/#safari-restaurant-oslo). */
function applyHash() {
  let id = '';
  try { id = decodeURIComponent((location.hash || '').replace(/^#/, '')); } catch (e) { return; }
  if (id && byId(id)) setActive(id, true);
}

/* ---- dele-knapp i popup ---- */
function wirePopupActions() {
  document.addEventListener('click', function (e) {
    const b = e.target.closest && e.target.closest('[data-act]');
    if (!b) return;
    const s = byId(b.dataset.id);
    if (!s) return;
    if (b.dataset.act === 'del') { e.preventDefault(); shareSpot(s); }
    else if (b.dataset.act === 'rute') track('veibeskrivelse', { navn: s.name });
  });
}
function shareSpot(s) {
  const url = location.origin + location.pathname + '#' + encodeURIComponent(s.id);
  track('del_sted', { navn: s.name });
  if (navigator.share) {
    navigator.share({ title: s.name, text: s.name + ' – ' + STATUS[s.halalStatus].label, url: url })
      .catch(function () { /* brukeren avbrot */ });
    return;
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url)
      .then(function () { toast('Lenke kopiert'); }, function () { toast('Kunne ikke kopiere lenken'); });
  } else {
    toast('Kopier lenken fra adressefeltet');
  }
}

let toastTimer = null;
function toast(msg) {
  let t = el('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

/* ---- tastatursnarveier ---- */
function wireShortcuts() {
  document.addEventListener('keydown', function (e) {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
    if (e.key === '/') {
      e.preventDefault();
      if (document.body.classList.contains('panel-collapsed')) togglePanel(false);
      el('search').focus();
    }
  });
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
  if (!navigator.geolocation) { toast('Nettleseren din støtter ikke posisjon.'); return; }
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
    if (el('fSort') && !el('fSort').value) el('fSort').value = 'avstand';
    if (window.innerWidth <= 720) togglePanel(true);
    render();
  }, () => {
    btn.classList.remove('loading');
    track('naer_meg_avslag');
    if (el('fSort') && el('fSort').value === 'avstand') el('fSort').value = '';
    toast('Fant ikke posisjonen din. Sjekk at nettleseren har tilgang til posisjon.');
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
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeInfo(); return; }
    if (e.key === 'Tab') trapFocus(e);
  });
}
function openInfo(section) {
  lastFocus = document.activeElement;
  track('apnet_side', { side: section });
  el('infoScrim').classList.add('open');
  showInfo(section);
  el('infoClose').focus();
}
function closeInfo() {
  const scrim = el('infoScrim');
  if (!scrim.classList.contains('open')) return;
  scrim.classList.remove('open');
  // Send fokus tilbake dit brukeren kom fra, ellers havner det pa <body>.
  if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  lastFocus = null;
}
function showInfo(section) {
  document.querySelectorAll('.info-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === section));
  document.querySelectorAll('.info-section').forEach(x => x.classList.toggle('active', x.dataset.section === section));
  el('infoBody').scrollTop = 0;
}
/* Holder tabbing inne i dialogen sa lenge den er apen. */
function trapFocus(e) {
  const scrim = el('infoScrim');
  if (!scrim.classList.contains('open')) return;
  const f = [...scrim.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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
        toast('Beklager, noe gikk galt. Prøv igjen om litt.');
      });
  });
}
