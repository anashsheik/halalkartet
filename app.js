const STATUS_ORDER = ['verifisert', 'delvis', 'uavklart'];
const TEGN = {
  verifisert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 12.5 10 17.5 19 7.5"/></svg>',
  delvis:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M6 12h12"/></svg>',
  uavklart:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8.6 8.8a3.5 3.5 0 016.8 1.1c0 2.3-3.4 2.9-3.4 5.1"/><circle cx="12" cy="19.2" r=".6" fill="currentColor"/></svg>'
};
const STATUS = {
  'verifisert': { label: 'Verifisert halal', color: '#2E7D4F', pin: 'pin-verifisert',
                  shape: '50%', kort: 'Verifisert', tegn: TEGN.verifisert },
  'delvis':     { label: 'Delvis halal',     color: '#D9600F', pin: 'pin-delvis',
                  shape: '50%', kort: 'Delvis',     tegn: TEGN.delvis },
  'uavklart':   { label: 'Uavklart',         color: '#636B67', pin: 'pin-uavklart',
                  shape: '6px', kort: 'Uavklart',   tegn: TEGN.uavklart }
};
const priceLabel = p => '<span class="price pris-' + p + '">' + '$'.repeat(p) + '</span>';
const el = id => document.getElementById(id);
const erMobil = () => window.innerWidth <= 720;

const esc = v => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function safeUrl(u) {
  if (!u) return null;
  try {
    const p = new URL(u, location.href);
    return (p.protocol === 'http:' || p.protocol === 'https:') ? p.href : null;
  } catch (e) { return null; }
}

// Åpningstid
function osloNow() {
  const p = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
  return { y: +p.year, m: +p.month, d: +p.day, min: (+p.hour % 24) * 60 + (+p.minute) };
}
function fmtClock(mins) {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
function fmtClose(mins) {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  const hh = (h < 10 ? '0' : '') + h;
  return m ? 'kl ' + hh + ':' + (m < 10 ? '0' : '') + m : 'kl ' + hh;
}
function clockMinutes(text) {
  const m = /kl\.?\s*(\d{1,2})(?::(\d{2}))?/i.exec(text || '') || /^(\d{1,2}):(\d{2})$/.exec(text || '');
  if (!m) return null;
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}
const NIGHT_CUTOFF = 6 * 60; // stengetid før 06 hører til natten før

function openState(s) {
  const raw = s.hours || '';
  if (/midlertidig stengt/i.test(raw)) return { state: 'closed', cls: 'os-closed', short: 'Stengt', label: 'Midlertidig stengt' };
  if (/stengt/i.test(raw)) return { state: 'closed', cls: 'os-closed', short: 'Stengt', label: 'Stengt' };

  const close = clockMinutes(raw);
  if (close === null) return { state: 'unknown', cls: 'os-unknown', short: '', label: raw };

  const now = osloNow().min;

  const open = s.opens ? clockMinutes(s.opens) : null;
  if (open !== null && now < open && !(close < NIGHT_CUTOFF && now < close)) {
    return { state: 'closed', cls: 'os-closed', short: 'Stengt', label: 'Åpner ' + fmtClose(open) };
  }

  let end = close;
  if (close < NIGHT_CUTOFF && now >= NIGHT_CUTOFF) end += 24 * 60;
  const left = end - now;

  if (left <= 0) return { state: 'closed', cls: 'os-closed', short: 'Stengt', label: 'Stengt' };
  if (left <= 60) return { state: 'soon', cls: 'os-soon', short: 'Stenger snart', label: 'Stenger snart' };
  const t = 'Stenger ' + fmtClose(close);
  return { state: 'open', cls: 'os-open', short: t, label: t };
}

// Utvalgte steder
const ROTATION_DAYS = 5;
const HIGHLIGHT_COUNT = 5;
const HIGHLIGHT_SEED = 20260829;

function seededOrder(list) {
  const a = list.slice();
  let s = HIGHLIGHT_SEED >>> 0;
  const rnd = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1)), t = a[i];
    a[i] = a[j]; a[j] = t;
  }
  return a;
}
function osloDayNumber() {
  const n = osloNow();
  return Math.floor(Date.UTC(n.y, n.m - 1, n.d) / 86400000);
}
function daysUntilRotation() { return ROTATION_DAYS - (osloDayNumber() % ROTATION_DAYS); }
function highlightPool() {
  return HALAL_SPOTS.filter(function (s) { return s.halalStatus === 'verifisert'; });
}
function currentHighlights() {
  const bekreftet = highlightPool();
  if (!bekreftet.length) return [];
  const pool = seededOrder(bekreftet);
  const n = Math.min(HIGHLIGHT_COUNT, pool.length);
  const start = (Math.floor(osloDayNumber() / ROTATION_DAYS) * n) % pool.length;
  const out = [];
  for (let i = 0; i < n; i++) out.push(pool[(start + i) % pool.length]);
  return out;
}

const map = L.map('map', { zoomControl: false, scrollWheelZoom: true }).setView([59.9139, 10.7522], 13.5);
L.control.zoom({ position: 'topright' }).addTo(map);

// Kartlag
// Stadia godkjenner domenet (halalkartet.no), så det trengs ingen API-nøkkel.
const flisUrl = tema => 'https://tiles.stadiamaps.com/tiles/' +
  (tema === 'dark' ? 'alidade_smooth_dark' : 'alidade_smooth') + '/{z}/{x}/{y}{r}.png';
const FLIS_KILDE = '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-bidragsytere';
const temaNa = () => (window.halalTema ? window.halalTema.na() : 'light');
const flislag = L.tileLayer(flisUrl(temaNa()), { attribution: FLIS_KILDE, maxZoom: 20 }).addTo(map);
window.addEventListener('temaendring', function () { flislag.setUrl(flisUrl(temaNa())); });

const TemaKontroll = L.Control.extend({
  options: { position: 'topright' },
  onAdd: function () {
    const k = L.DomUtil.create('div', 'leaflet-bar tema-bryter');
    const b = L.DomUtil.create('button', '', k);
    b.type = 'button';
    const tegn = function () {
      const mork = temaNa() === 'dark';
      b.setAttribute('aria-label', mork ? 'Bytt til lyst tema' : 'Bytt til mørkt tema');
      b.title = b.getAttribute('aria-label');
      b.setAttribute('aria-pressed', String(mork));
      b.innerHTML = mork
        ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
        : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
    };
    tegn();
    L.DomEvent.disableClickPropagation(k);
    L.DomEvent.on(b, 'click', function () {
      if (!window.halalTema) return;
      const t = window.halalTema.bytt();
      track('tema', { tema: t === 'dark' ? 'mørkt' : 'lyst' });
    });
    window.addEventListener('temaendring', tegn);
    return k;
  }
});
new TemaKontroll().addTo(map);

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function goTo(lat, lng, zoom) {
  if (reduceMotion) map.setView([lat, lng], zoom);
  else map.flyTo([lat, lng], zoom, { duration: .6 });
}

// Klynger
const klynge = L.markerClusterGroup({
  maxClusterRadius: 45,
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  chunkedLoading: true,
  animate: !reduceMotion,
  iconCreateFunction: function (c) {
    const n = c.getChildCount();
    return L.divIcon({
      className: '', iconSize: [n >= 10 ? 38 : 32, n >= 10 ? 38 : 32],
      html: '<div class="klynge' + (n >= 10 ? ' stor' : '') + '">' + n + '</div>'
    });
  }
});
map.addLayer(klynge);

let HALAL_SPOTS = [];
const markers = {};
let activeId = null;
let userLoc = null, userMarker = null;
let lastFocus = null;
// Strenghet
const STRICT_STEPS = [
  { label: 'Kun verifisert', tillat: ['verifisert'],
    note: 'Bare steder vi har bekreftet som helt halal.' },
  { label: '+ delvis',       tillat: ['verifisert', 'delvis'],
    note: 'Også steder der bare deler av menyen er halal.' },
  { label: '+ uavklart',     tillat: ['verifisert', 'delvis', 'uavklart'],
    note: 'Alt vi kjenner til, inkludert steder vi ikke har rukket å sjekke.' }
];
let strict = 2;
const layerOn = { 'verifisert': true, 'delvis': true, 'uavklart': true };
function applyStrict() {
  const t = STRICT_STEPS[strict].tillat;
  STATUS_ORDER.forEach(st => { layerOn[st] = t.indexOf(st) >= 0; });
}
const layerCollapsed = { 'verifisert': false, 'delvis': false, 'uavklart': true };
const byId = id => HALAL_SPOTS.find(s => s.id === id);

// Sporing
function track(name, props) {
  try {
    if (typeof window.gtag === 'function') window.gtag('event', name, props || {});
    else if (typeof window.plausible === 'function') window.plausible(name, props ? { props: props } : undefined);
    else if (window.umami && typeof window.umami.track === 'function') window.umami.track(name, props || {});
    else if (window.fathom && typeof window.fathom.trackEvent === 'function') window.fathom.trackEvent(name);
  } catch (e) {}
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
  if (err && window.console) console.error('Halalkartet: klarte ikke å laste spots.json –', err);
  el('layers').innerHTML =
    '<div class="no-results"><b>Fant ikke dataene</b>' +
    'Kartet fikk ikke lastet <code>spots.json</code>. Prøv å laste siden på nytt.</div>';
  const overlay = document.createElement('div');
  overlay.className = 'map-overlay';
  overlay.innerHTML =
    '<div class="box"><h2>Kartet venter på data</h2>' +
    '<p>Appen fikk ikke lastet <code>spots.json</code>. Prøv å laste siden på nytt. Hjelper ikke det, står feilen i nettleserkonsollen.</p>' +
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
    const m = L.marker([s.lat, s.lng], { icon: makeIcon(s.halalStatus, false) });
    m.on('click', () => {
      setActive(s.id, false);
      if (erMobil()) etterKortet(function () { holdPunktFritt(s.id); });
    });
    m.on('popupclose', () => { if (activeId === s.id) setActive(null); });
    markers[s.id] = m;
  });
  kobleKort();

  ['search', 'fBydel', 'fCuisine', 'fPrice', 'fOpen', 'fAlcohol', 'fSort'].forEach(id => {
    const x = el(id);
    if (x) x.addEventListener('input', render);
  });
  ['fBydel', 'fCuisine', 'fPrice', 'fOpen', 'fAlcohol'].forEach(function (id) {
    const x = el(id);
    if (x) x.addEventListener('change', foelgFilter);
  });
  let sokPause = null;
  el('search').addEventListener('input', function () {
    clearTimeout(sokPause);
    sokPause = setTimeout(foelgFilter, 650);
  });
  el('fBydel').addEventListener('change', () => { if (el('fBydel').value) track('filter_bydel', { bydel: el('fBydel').value }); });
  el('fCuisine').addEventListener('change', () => { if (el('fCuisine').value) track('filter_kjokken', { kjokken: el('fCuisine').value }); });
  if (el('fPrice')) el('fPrice').addEventListener('change', () => { if (el('fPrice').value) track('filter_pris', { pris: el('fPrice').value }); });
  if (el('fOpen')) el('fOpen').addEventListener('change', () => { if (el('fOpen').value) track('filter_apent', { status: el('fOpen').value }); });
  if (el('fAlcohol')) el('fAlcohol').addEventListener('change', () => { if (el('fAlcohol').value) track('filter_alkohol', { alkohol: el('fAlcohol').value }); });
  if (el('fSort')) el('fSort').addEventListener('change', () => {
    const v = el('fSort').value;
    if (v) track('sortering', { modus: v });
    if (v === 'avstand' && !userLoc) locateUser();
  });
  el('reset').addEventListener('click', () => {
    el('search').value = ''; el('fBydel').value = ''; el('fCuisine').value = '';
    if (el('fPrice')) el('fPrice').value = '';
    if (el('fOpen')) el('fOpen').value = '';
    if (el('fAlcohol')) el('fAlcohol').value = '';
    if (el('fSort')) el('fSort').value = '';
    strict = 2; applyStrict();
    render();
    el('search').focus();
  });
  el('collapse').addEventListener('click', () => togglePanel(true));
  el('reopen').addEventListener('click', () => togglePanel(false));
  wireMobilskall();
  wireMobil();
  wireTipsHint();
  wireNearMe();
  wireInfo();
  wireContactForm();
  wireTipsForm();
  merkSkjemaUtenMottak();
  wirePopupActions();
  wireShortcuts();
  wireSheets();
  el('feedback').addEventListener('click', function () { openInfo('kontakt'); });
  render();
  const deepLinked = applyHash();

  if (!deepLinked) setTimeout(function () { openSheet('tips', true); }, 600);

  setInterval(refreshOpenStates, 60000);
}

function togglePanel(collapse) {
  const panel = el('panel');
  const hadFokus = panel.contains(document.activeElement);
  panel.classList.toggle('collapsed', collapse);
  document.body.classList.toggle('panel-collapsed', collapse);
  panel.inert = collapse;
  if (collapse && hadFokus) el('reopen').focus();
  else if (!collapse && document.activeElement === el('reopen')) el('collapse').focus();
  setTimeout(() => map.invalidateSize(), 320);
}

function makeIcon(status, big, navn) {
  const st = STATUS[status];
  const d = big ? 28 : 22;
  return L.divIcon({
    className: '', iconSize: [d, d], iconAnchor: [d / 2, d / 2],
    popupAnchor: [0, -(d / 2 + 4)],
    html: '<div class="pin ' + st.pin + (big ? ' big' : '') + '" style="border-radius:' + st.shape + '">' + st.tegn + '</div>' +
      (navn ? '<span class="pin-navn">' + esc(navn) + '</span>' : '')
  });
}

const POP_ICONS = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 010 18 15 15 0 010-18z"/>'
};
function iconRow(kind, inner) {
  return '<div class="pop-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    POP_ICONS[kind] + '</svg>' + inner + '</div>';
}

// Verifisering
const BEVIS = {
  bekreftet: { kls: 'v-ok',   form: '50%'             },
  delvis:    { kls: 'v-mid',  form: '50% 50% 50% 4px' },
  uavklart:  { kls: 'v-open', form: '3px'             }
};
const MND = ['januar','februar','mars','april','mai','juni',
             'juli','august','september','oktober','november','desember'];
function fmtDato(iso) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return d ? (+d[3]) + '. ' + MND[+d[2] - 1] + ' ' + d[1] : '';
}
function dagerSiden(iso) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!d) return null;
  const da = Date.UTC(+d[1], +d[2] - 1, +d[3]);
  const n = osloNow();
  return Math.floor((Date.UTC(n.y, n.m - 1, n.d) - da) / 86400000);
}
function verifiseringHtml(s) {
  const liste = Array.isArray(s.verification) ? s.verification
    : (s.verification ? [{ type: 'uavklart', tekst: s.verification }] : []);
  if (!liste.length) return '';
  const rader = liste.map(function (v) {
    const b = BEVIS[v.type] || BEVIS.uavklart;
    const naar = v.dato ? fmtDato(v.dato) : '';
    return '<div class="v-row">' +
      '<span class="v-mark ' + b.kls + '" aria-hidden="true" style="border-radius:' + b.form + '"></span>' +
      '<span class="v-txt">' + esc(v.tekst || '') +
        (v.kilde ? '<span class="v-src">' + esc(v.kilde) + '</span>' : '') + '</span>' +
      (naar ? '<span class="v-when">' + esc(naar) + '</span>' : '') +
    '</div>';
  }).join('');

  const d = dagerSiden(s.lastVerified);
  let fersk;
  if (d === null) {
    fersk = '<span class="v-age v-open">Ikke bekreftet med dato ennå</span>';
  } else if (d > 180) {
    fersk = '<span class="v-age v-mid">Sist bekreftet ' + fmtDato(s.lastVerified) +
            ', over et halvår siden</span>';
  } else {
    fersk = '<span class="v-age v-ok">Sist bekreftet ' + fmtDato(s.lastVerified) + '</span>';
  }
  return '<div class="pop-verify">' + rader +
    '<div class="v-foot">' + fersk +
    '<span class="v-disc">Halalkartet sertifiserer ikke selv. Vi viser kilden, datoen og hvem som sa det.</span>' +
    '</div></div>';
}

function popupHtml(s) {
  const rows = [];
  if (s.hours) {
    const st = openState(s);
    rows.push(iconRow('clock', '<span class="os ' + st.cls + '">' + esc(st.label) + '</span>'));
  }
  rows.push(iconRow('pin', '<span>' + esc(s.address) + ' · ' + esc(s.bydel) + '</span>'));
  if (s.phone) {
    rows.push(iconRow('phone', '<a class="pop-link" href="tel:' + esc(String(s.phone).replace(/\s+/g, '')) + '">' + esc(s.phone) + '</a>'));
  }
  const site = safeUrl(s.website);
  if (site) {
    rows.push(iconRow('globe', '<a class="pop-link" href="' + esc(site) + '" target="_blank" rel="noopener">Nettside ↗</a>'));
  }

  const dir = ruteUrl(s);

  return '<div class="pop-name">' + esc(s.name) + '</div>' +
    '<div class="pop-meta">' + esc(s.cuisines.join(' · ')) + ' &nbsp;·&nbsp; ' + priceLabel(s.price) + '</div>' +
    '<div class="pop-badge" data-s="' + esc(s.halalStatus) + '"><span class="dotc" aria-hidden="true">' +
      STATUS[s.halalStatus].tegn + '</span>' + STATUS[s.halalStatus].label + '</div>' +
    (s.description ? '<div class="pop-desc">' + esc(s.description) + '</div>' : '') +
    verifiseringHtml(s) +
    (s.alcohol ? '<div class="pop-note">Serverer halal mat, men også alkoholholdig drikke.</div>' : '') +
    rows.join('') +
    '<div class="pop-actions">' +
      '<a class="pop-act primary" href="' + dir + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>Veibeskrivelse</a>' +
      '<button type="button" class="pop-act" data-act="del" data-id="' + esc(s.id) + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>Del</button>' +
    '</div>';
}

function foldeTegn(t) {
  return t.toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/aa/g, 'a');
}

function currentFilters() {
  return {
    q: el('search').value.trim().toLowerCase(),
    bydel: el('fBydel').value,
    cuisine: el('fCuisine').value,
    price: el('fPrice') ? el('fPrice').value : '',
    open: el('fOpen') ? el('fOpen').value : '',
    alcohol: el('fAlcohol') ? el('fAlcohol').value : '',
    sort: el('fSort') ? el('fSort').value : ''
  };
}
function passes(s, f) {
  if (f.bydel && s.bydel !== f.bydel) return false;
  if (f.cuisine && !s.cuisines.includes(f.cuisine)) return false;
  if (f.price && String(s.price) !== f.price) return false;
  if (f.open === 'naa') { const st = openState(s).state; if (st !== 'open' && st !== 'soon') return false; }
  else if (f.open && openState(s).state !== f.open) return false;
  if (f.alcohol === 'ja' && !s.alcohol) return false;
  if (f.alcohol === 'nei' && s.alcohol) return false;
  if (f.q) {
    const raa = s.name + ' ' + s.cuisines.join(' ') + ' ' + s.bydel + ' ' + (s.address || '');
    const bokstavrett = /[æøå]/.test(f.q);
    const hay = bokstavrett ? raa.toLowerCase() : foldeTegn(raa);
    if (!hay.includes(bokstavrett ? f.q : foldeTegn(f.q))) return false;
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

  const paaKart = HALAL_SPOTS.filter(s => shown.has(s.id) && layerOn[s.halalStatus]);
  klynge.clearLayers();
  klynge.addLayers(paaKart.map(s => markers[s.id]));

  renderStrict(filtered);

  const box = el('layers');
  box.innerHTML = '';
  const anyFilter = !!(f.q || f.bydel || f.cuisine || f.price || f.open || f.alcohol || f.sort || strict < 2);

  if (filtered.length === 0) {
    box.innerHTML = '<div class="no-results"><b>Ingen treff</b>Prøv å fjerne et filter eller søk på noe annet.</div>';
  } else {
    STATUS_ORDER.filter(st => layerOn[st]).forEach(st => {
      const items = sortItems(filtered.filter(s => s.halalStatus === st), f.sort);
      const layer = document.createElement('div');
      layer.className = 'layer' + (layerCollapsed[st] ? ' collapsed' : '') + (layerOn[st] ? '' : ' off');
      layer.dataset.s = st;

      const row = document.createElement('div');
      row.className = 'layer-row';

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'layer-head';
      head.setAttribute('aria-expanded', String(!layerCollapsed[st]));
      head.innerHTML =
        '<span class="layer-dot" aria-hidden="true" style="border-radius:' + STATUS[st].shape + '"></span>' +
        '<span class="layer-name">' + STATUS[st].label + '</span>' +
        '<span class="layer-count">' + items.length + '</span>' +
        '<svg class="layer-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
      head.addEventListener('click', () => { layerCollapsed[st] = !layerCollapsed[st]; render(); });

      row.appendChild(head);
      layer.appendChild(row);

      const list = document.createElement('div');
      list.className = 'layer-items';
      if (items.length === 0) {
        list.innerHTML = '<div class="layer-empty">Ingen steder her ennå.</div>';
      } else {
        grupperKjeder(items).forEach(function (rad) {
          list.appendChild(rad.type === 'kjede' ? kjedeEl(rad) : itemEl(rad.sted));
        });
      }
      layer.appendChild(list);
      box.appendChild(layer);
    });
  }

  const visibleCount = filtered.filter(s => layerOn[s.halalStatus]).length;
  el('resultCount').textContent = visibleCount + ' av ' + HALAL_SPOTS.length + ' steder';
  if (el('reopenTall')) el('reopenTall').textContent = visibleCount;
  el('reset').disabled = !anyFilter;
  visAktiveFiltre();
  tegnMobil();
}

// Mobil: toppfelt og hurtigbrikker

function plasserSok() {
  const sok = document.querySelector('.search-wrap');
  const kort = el('sokekort'), hode = document.querySelector('.panel-head');
  if (!sok || !kort || !hode) return;
  if (erMobil()) { if (sok.parentElement !== kort) kort.insertBefore(sok, el('filterknapp')); }
  else if (sok.parentElement !== hode) hode.insertBefore(sok, hode.querySelector('.mini-filters'));
  el('search').placeholder = erMobil() ? 'Søk sted eller kjøkken' : 'Søk på navn, kjøkken eller adresse…';
  const t = el('toppfelt');
  if (t && erMobil()) document.documentElement.style.setProperty('--toppfelt-h', Math.round(t.getBoundingClientRect().height + 6) + 'px');
}

function antallAktive() {
  return FILTERFELT.filter(function (id) { return el(id) && el(id).value; }).length + (strict < 2 ? 1 : 0);
}

const IKON = {
  klokke: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  hake:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 12.5 10 17.5 19 7.5"/></svg>',
  pil:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  x:      '<svg class="x" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};

function byggHurtigrad() {
  const rad = el('hurtigrad');
  if (!rad) return;
  const brikke = function (html, valg) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hbrikke' + (valg.satt ? ' satt' : '');
    if (valg.trykket !== undefined) b.setAttribute('aria-pressed', String(valg.trykket));
    if (valg.etikett) b.setAttribute('aria-label', valg.etikett);
    b.dataset.hurtig = valg.hurtig;
    b.innerHTML = html;
    b.addEventListener('click', valg.klikk);
    rad.appendChild(b);
  };
  const scroll = rad.scrollLeft;
  rad.innerHTML = '';

  const apent = el('fOpen').value === 'naa';
  brikke(IKON.klokke + 'Åpent nå', { hurtig: 'apent', trykket: apent, klikk: function () {
    el('fOpen').value = apent ? '' : 'naa'; track('hurtigfilter', { filter: 'apent' }); render(); foelgFilter();
  } });
  brikke(IKON.hake + 'Kun verifisert', { hurtig: 'verifisert', trykket: strict === 0, klikk: function () {
    strict = strict === 0 ? 2 : 0; applyStrict(); track('hurtigfilter', { filter: 'kun_verifisert' }); render();
  } });
  const felt = [['fCuisine', 'Kjøkken', 'kjokken'], ['fBydel', 'Område', 'omrade'], ['fPrice', 'Pris', 'pris'], ['fAlcohol', 'Alkohol', 'alkohol']];
  felt.filter(function (d) { return el(d[0]).value; }).concat(felt.filter(function (d) { return !el(d[0]).value; }))
    .forEach(function (d) {
      const x = el(d[0]);
      if (x.value) {
        const tekst = x.options[x.selectedIndex].text;
        brikke(esc(tekst) + IKON.x, { hurtig: d[2], satt: true, etikett: 'Fjern filteret ' + tekst, klikk: function () {
          x.value = ''; track('filter_fjernet', { filter: d[0] }); render();
        } });
      } else if (d[0] !== 'fAlcohol') {
        brikke(d[1] + IKON.pil, { hurtig: d[2], etikett: d[1] + ', åpner filtrene', klikk: function () { apneFilterark(d[2]); } });
      }
    });
  rad.scrollLeft = scroll;
}

function oppdaterSkall() {
  const f = currentFilters();
  const n = HALAL_SPOTS.filter(function (s) { return passes(s, f) && layerOn[s.halalStatus]; }).length;
  const omrade = el('fBydel').value;
  el('bunnTall').textContent = n;
  el('bunnTekst').textContent = (n === 1 ? 'sted' : 'steder') + (omrade ? ' i ' + omrade : '');
  const a = antallAktive(), t = el('filterTeller');
  if (t) { t.hidden = !a; t.textContent = a; }
  if (el('filterknapp')) el('filterknapp').setAttribute('aria-label', a ? 'Åpne filtrene, ' + a + ' på' : 'Åpne filtrene');
  byggHurtigrad();
  maalToppfelt();
  if (el('filterark') && !el('filterark').hidden) tegnFilterark(n);
}

// Filterarket
const BAKGRUNN = ['map', 'panel', 'toppfelt', 'nearme', 'feedback', 'tipsBtn', 'hiliteBtn', 'bunnark', 'liste', 'visKart', 'fane', 'kartforklaring'];
let faApnetFra = null, faVisAlle = { kjokken: false, omrade: false };

function velgEn(id, verdi) {
  const x = el(id);
  x.value = x.value === verdi ? '' : verdi;
  track('filter_ark', { filter: id });
  render();
}

function tegnFilterark(antall) {
  const k = el('faKropp');
  const segment = function (navn, valg, aktiv, klikk) {
    return '<div class="segment" role="radiogroup" aria-label="' + navn + '">' + valg.map(function (v) {
      return '<button type="button" role="radio" aria-checked="' + (v[0] === aktiv) + '" data-v="' + esc(v[0]) + '" data-seg="' + klikk + '">' + esc(v[1]) + '</button>';
    }).join('') + '</div>';
  };
  const brikker = function (id, del, verdier) {
    const valgt = el(id).value;
    const vis = faVisAlle[del] ? verdier : verdier.slice(0, 9);
    if (valgt && vis.indexOf(valgt) < 0) vis.push(valgt);
    return '<div class="fa-brikker">' + vis.map(function (v) {
      return '<button type="button" aria-pressed="' + (v === valgt) + '" data-velg="' + id + '" data-v="' + esc(v) + '">' + esc(v) + '</button>';
    }).join('') + (verdier.length > 9 ? '<button type="button" class="fa-flere" data-flere="' + del + '">' +
      (faVisAlle[del] ? 'Vis færre' : 'Vis alle ' + verdier.length) + '</button>' : '') + '</div>';
  };
  const telling = function (felt) {
    const c = {};
    HALAL_SPOTS.forEach(function (s) { (felt === 'cuisines' ? s.cuisines : [s[felt]]).forEach(function (v) { c[v] = (c[v] || 0) + 1; }); });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b, 'nb'); });
  };
  const utenTid = HALAL_SPOTS.filter(function (s) { return openState(s).state === 'unknown'; }).length;

  const f = document.activeElement, nokkel = f && k.contains(f)
    ? ['velg', 'seg', 'bryter', 'flere'].filter(function (a) { return f.dataset[a] !== undefined; })
        .map(function (a) { return '[data-' + a + '="' + CSS.escape(f.dataset[a]) + '"]'; }).join('') +
      (f.dataset.v !== undefined ? '[data-v="' + CSS.escape(f.dataset.v) + '"]' : '')
    : null;
  const rull = k.scrollTop;

  k.innerHTML =
    '<section class="fa-del" data-del="status"><h3>Halal-status</h3>' +
      segment('Halal-status', [['0', 'Verifisert'], ['1', '+ Delvis'], ['2', 'Alle']], String(strict), 'strict') +
      '<p class="fa-note">' + esc(STRICT_STEPS[strict].note) + '</p></section>' +
    '<section class="fa-del" data-del="apent"><div class="fa-rad"><div><h3>Åpent nå</h3>' +
      '<p>Skjuler stengte steder og de ' + utenTid + ' vi ikke kjenner åpningstiden til.</p></div>' +
      '<button type="button" class="bryter" role="switch" aria-label="Åpent nå" aria-checked="' + (el('fOpen').value === 'naa') + '" data-bryter="apent"></button></div></section>' +
    '<section class="fa-del" data-del="kjokken"><h3>Kjøkken</h3>' + brikker('fCuisine', 'kjokken', telling('cuisines')) + '</section>' +
    '<section class="fa-del" data-del="omrade"><h3>Område</h3>' + brikker('fBydel', 'omrade', telling('bydel')) + '</section>' +
    '<section class="fa-del" data-del="pris"><h3>Pris</h3><div class="fa-pris">' + ['1', '2', '3'].map(function (v) {
      return '<button type="button" aria-pressed="' + (el('fPrice').value === v) + '" data-velg="fPrice" data-v="' + v + '" aria-label="' +
        ['Rimelig', 'Middels', 'Dyrere'][v - 1] + '">' + '$'.repeat(+v) + '</button>'; }).join('') + '</div></section>' +
    '<section class="fa-del" data-del="alkohol"><h3>Alkohol</h3>' +
      segment('Alkohol', [['', 'Alle steder'], ['nei', 'Ingen kjent'], ['ja', 'Serverer']], el('fAlcohol').value, 'fAlcohol') +
      '<p class="fa-note">«Ingen kjent» betyr at vi ikke vet om stedet serverer alkohol.</p></section>' +
    '<section class="fa-del" data-del="sorter"><h3>Sortering</h3>' +
      segment('Sortering', [['', 'Standard'], ['avstand', 'Nærmest'], ['navn', 'A–Å'], ['pris', 'Pris']], el('fSort').value, 'fSort') + '</section>';

  k.scrollTop = rull;
  if (nokkel) {
    let ny = null;
    try { ny = k.querySelector(nokkel); } catch (err) {}
    if (ny) ny.focus({ preventScroll: true });
  }

  const a = antallAktive();
  el('faNull').disabled = !a;
  el('faVis').textContent = antall ? 'Vis ' + antall + (antall === 1 ? ' sted' : ' steder') : 'Ingen steder passer';
  el('faVis').disabled = !antall;
}

function apneFilterark(del) {
  const ark = el('filterark');
  faApnetFra = document.activeElement;
  ark.hidden = false;
  oppdaterSkall();
  BAKGRUNN.forEach(function (id) { if (el(id)) el(id).inert = true; });
  requestAnimationFrame(function () {
    ark.classList.add('apen');
    const kropp = el('faKropp');
    const mal = del && kropp.querySelector('[data-del="' + del + '"]');
    kropp.scrollTop = mal ? mal.offsetTop - kropp.offsetTop : 0;
    el('faLukk').focus({ preventScroll: true });
  });
  track('filterark_apnet', { fra: del || 'knapp' });
}

function lukkFilterark() {
  const ark = el('filterark');
  if (ark.hidden) return;
  ark.classList.remove('apen');
  BAKGRUNN.forEach(function (id) { if (el(id)) el(id).inert = false; });
  if (el('panel') && !erMobil()) el('panel').inert = el('panel').classList.contains('collapsed');
  setTimeout(function () { if (!ark.classList.contains('apen')) ark.hidden = true; }, reduceMotion ? 220 : 360);
  if (faApnetFra && faApnetFra.focus && document.contains(faApnetFra)) faApnetFra.focus();
  else el('filterknapp').focus();
  foelgFilter();
}

function wireMobilskall() {
  plasserSok();
  window.addEventListener('resize', plasserSok);
  el('filterknapp').addEventListener('click', function () { apneFilterark(); });
  el('faLukk').addEventListener('click', lukkFilterark);
  el('faVis').addEventListener('click', lukkFilterark);
  el('faNull').addEventListener('click', function () { el('reset').click(); el('faLukk').focus(); });
  el('faKropp').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.velg) velgEn(b.dataset.velg, b.dataset.v);
    else if (b.dataset.flere) { faVisAlle[b.dataset.flere] = !faVisAlle[b.dataset.flere]; oppdaterSkall(); }
    else if (b.dataset.bryter === 'apent') { el('fOpen').value = el('fOpen').value === 'naa' ? '' : 'naa'; render(); }
    else if (b.dataset.seg === 'strict') { strict = +b.dataset.v; applyStrict(); track('strenghet', { trinn: STRICT_STEPS[strict].label }); render(); }
    else if (b.dataset.seg) {
      el(b.dataset.seg).value = b.dataset.v;
      if (b.dataset.seg === 'fSort' && b.dataset.v === 'avstand' && !userLoc) locateUser();
      render();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (el('filterark').hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); lukkFilterark(); return; }
    if (e.key !== 'Tab') return;
    if (!el('filterark').contains(document.activeElement)) { e.preventDefault(); el('faLukk').focus(); return; }
    const f = [...el('filterark').querySelectorAll('button:not([disabled])')];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  el('search').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && erMobil()) { e.preventDefault(); el('search').blur(); settVisning('liste'); }
  });
}

// Mobil: kart, liste, lagret og detaljer
const SVG = (w, sti, ekstra) => '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (ekstra || '') + '>' + sti + '</svg>';
const IKON2 = {
  kniv:    w => SVG(w, '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 005 0V3M7 11v10"/><path d="M17 21V3c-2.2 1.2-3.5 3.8-3.5 7.5 0 1.8 1 3 3.5 3"/>'),
  hjerte:  SVG(22, '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z"/>'),
  rute:    SVG(20, '<path d="M3 11l19-9-9 19-2-8-8-2z"/>'),
  liste:   SVG(20, '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="3"/>'),
  kart:    SVG(20, '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
  telefon: SVG(22, '<path d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>'),
  globus:  SVG(22, '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z"/>'),
  del:     SVG(20, '<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/>'),
  tilbake: SVG(22, '<polyline points="15 18 9 12 15 6"/>'),
  skjold:  SVG(22, '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/><polyline points="9 12 11 14 15 10"/>'),
  sted:    SVG(22, '<path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  klokke:  SVG(22, '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  glass:   SVG(22, '<path d="M8 3h8l-1 7a3 3 0 01-6 0L8 3zM12 13v8M9 21h6"/>')
};

let visning = 'kart', fane = 'utforsk', kortModus = null;
let detaljFra = null, detaljKart = null, merFra = null;

function kobleKort() {
  const mobil = erMobil();
  if (mobil === kortModus) return;
  kortModus = mobil;
  const aktiv = activeId;
  map.closePopup();
  HALAL_SPOTS.forEach(function (s) {
    const m = markers[s.id];
    if (mobil) m.unbindPopup();
    else m.bindPopup(popupHtml(s), { closeButton: true, minWidth: 236, maxWidth: 300, autoPan: false });
  });
  if (!mobil) { visning = 'kart'; fane = 'utforsk'; document.body.classList.remove('vis-liste', 'fane-lagret'); }
  if (aktiv) {
    setActive(aktiv, false);
    if (!mobil && markers[aktiv].getElement()) markers[aktiv].openPopup();
  }
}

function ruteUrl(s) {
  return 'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent(s.address ? s.name + ', ' + s.address : s.lat + ',' + s.lng);
}
function kartAppUrl(s) {
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios ? 'https://maps.apple.com/?q=' + encodeURIComponent(s.name) + '&ll=' + s.lat + ',' + s.lng
    : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + (s.address ? ', ' + s.address : ''));
}

function statusMerke(s) {
  return '<span class="smerke" data-s="' + esc(s.halalStatus) + '">' + STATUS[s.halalStatus].tegn + STATUS[s.halalStatus].label + '</span>';
}
function apentLinje(s) {
  const st = openState(s);
  if (st.state === 'open') return { cls: 'os-open', tekst: 'Åpent · ' + st.label.toLowerCase() };
  if (st.state === 'soon') {
    const t = clockMinutes(s.hours);
    return { cls: 'os-soon', tekst: 'Stenger snart' + (t === null ? '' : ' · ' + fmtClose(t)) };
  }
  if (st.state === 'closed') return { cls: 'os-closed', tekst: st.label };
  return null;
}
function metaTekst(s) {
  const deler = [];
  if (userLoc) deler.push(fmtDist(dist(s)));
  deler.push(s.cuisines.slice(0, 2).join(', '), s.bydel);
  return deler.map(esc).join(' · ') + ' · ' + priceLabel(s.price);
}

// Lagret
const LAGRET_NOKKEL = 'halalkartet-lagret';
function lagrede() {
  try { const v = JSON.parse(localStorage.getItem(LAGRET_NOKKEL)); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function erLagret(id) { return lagrede().indexOf(id) >= 0; }
function hjerte(s, kls) {
  const p = erLagret(s.id);
  return '<button type="button" class="hjerte ' + (kls || '') + '" data-lagre="' + esc(s.id) + '" aria-pressed="' + p +
    '" aria-label="' + (p ? 'Fjern ' + esc(s.name) + ' fra Lagret' : 'Lagre ' + esc(s.name)) + '">' + IKON2.hjerte + '</button>';
}
function oppdaterHjerte(b) {
  const s = byId(b.dataset.lagre);
  if (!s) return;
  const p = erLagret(s.id);
  b.setAttribute('aria-pressed', String(p));
  if (b.dataset.tekst) b.querySelector('span').textContent = p ? 'Lagret' : 'Lagre';
  else b.setAttribute('aria-label', p ? 'Fjern ' + s.name + ' fra Lagret' : 'Lagre ' + s.name);
}
function byttLagret(id) {
  const l = lagrede(), i = l.indexOf(id), s = byId(id);
  if (i >= 0) l.splice(i, 1); else l.push(id);
  try { localStorage.setItem(LAGRET_NOKKEL, JSON.stringify(l)); }
  catch (e) { toast('Kunne ikke lagre på denne enheten'); return; }
  toast(i >= 0 ? 'Fjernet fra Lagret' : 'Lagret på denne enheten');
  track(i >= 0 ? 'lagret_fjernet' : 'lagret', { navn: s ? s.name : id });
  document.querySelectorAll('[data-lagre]').forEach(function (b) { if (b.dataset.lagre === id) oppdaterHjerte(b); });
  if (fane === 'lagret') tegnListe();
}

// Liste
function synligeSteder() {
  const f = currentFilters();
  return HALAL_SPOTS.filter(function (s) { return passes(s, f) && layerOn[s.halalStatus]; });
}
function anbefalt(liste, mode) {
  if (mode || userLoc) return sortItems(liste, mode);
  return STATUS_ORDER.flatMap(function (st) { return liste.filter(function (s) { return s.halalStatus === st; }); });
}
function listekortHtml(s) {
  const ap = apentLinje(s);
  return '<article class="lkort" data-id="' + esc(s.id) + '">' +
    '<span class="flis" aria-hidden="true">' + IKON2.kniv(26) + '</span>' +
    '<div class="lkort-tekst">' +
      '<h3><button type="button" class="lkort-navn" data-detalj="' + esc(s.id) + '">' + esc(s.name) + '</button></h3>' +
      '<p class="lkort-meta">' + metaTekst(s) + '</p>' +
      statusMerke(s) +
      (ap ? '<p class="apent ' + ap.cls + '">' + esc(ap.tekst) + '</p>' : '') +
    '</div>' + hjerte(s) + '</article>';
}
function tegnListe() {
  const boks = el('listeKort');
  if (!boks) return;
  const lagretVis = fane === 'lagret';
  const liste = lagretVis ? lagrede().map(byId).filter(Boolean) : anbefalt(synligeSteder(), el('fSort').value);
  el('listeTall').textContent = lagretVis ? 'Lagret' : liste.length + (liste.length === 1 ? ' sted' : ' steder');
  el('listeSorter').hidden = lagretVis;
  el('listeSort').value = el('fSort').value;
  if (!liste.length) {
    boks.innerHTML = lagretVis
      ? '<div class="tom"><b>Ingen lagrede steder ennå</b>Trykk på hjertet ved et sted for å lagre det. Lagrede steder ligger bare på denne enheten.</div>'
      : '<div class="tom"><b>Ingen treff</b>Prøv å fjerne et filter eller søk på noe annet.</div>';
    return;
  }
  boks.innerHTML = liste.map(listekortHtml).join('');
}

// Kortet i bunnarket
function bunnTopp() {
  const b = el('bunnark');
  if (b && b.getClientRects().length) return Math.round(window.innerHeight - b.getBoundingClientRect().top);
  const f = el('fane');
  return f && f.getClientRects().length ? Math.round(window.innerHeight - f.getBoundingClientRect().top) : 0;
}
function etterKortet(fn) {
  requestAnimationFrame(function () {
    document.documentElement.style.setProperty('--bunn-topp', bunnTopp() + 'px');
    if (fn) fn();
  });
}
function holdPunktFritt(id) {
  const m = markers[id];
  if (!m || !erMobil()) return;
  const p = map.latLngToContainerPoint(m.getLatLng()), o = trygtOmrade();
  const topp = o.topp + 44, bunn = o.bunn - 20;
  let dx = 0, dy = 0;
  if (p.y < topp) dy = p.y - topp; else if (p.y > bunn) dy = p.y - bunn;
  if (p.x < o.venstre + 60) dx = p.x - (o.venstre + 60); else if (p.x > o.hoyre - 60) dx = p.x - (o.hoyre - 60);
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) map.panBy([Math.round(dx), Math.round(dy)], { animate: !reduceMotion, duration: .25 });
}
function tegnValgt() {
  const boks = el('valgt');
  if (!boks) return;
  const s = erMobil() && activeId ? byId(activeId) : null;
  boks.hidden = !s;
  if (!s) { boks.innerHTML = ''; etterKortet(); return; }
  const ap = apentLinje(s);
  boks.innerHTML =
    '<article class="vkort" aria-labelledby="valgtNavn">' +
      '<span class="flis" aria-hidden="true">' + IKON2.kniv(26) + '</span>' +
      '<div class="lkort-tekst">' +
        '<h3 id="valgtNavn">' + esc(s.name) + '</h3>' +
        '<p class="lkort-meta">' + metaTekst(s) + '</p>' +
        statusMerke(s) +
        (ap ? '<p class="apent ' + ap.cls + '">' + esc(ap.tekst) + '</p>' : '') +
      '</div>' + hjerte(s) +
      '<div class="vkort-knapper">' +
        '<a class="knapp primar" href="' + esc(ruteUrl(s)) + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' + IKON2.rute + 'Veibeskrivelse</a>' +
        '<button type="button" class="knapp" data-detalj="' + esc(s.id) + '">Se detaljer</button>' +
      '</div>' +
    '</article>';
  etterKortet();
}
function tegnMobil() {
  if (!erMobil() || !el('bunnark')) return;
  if (document.body.classList.contains('vis-liste')) tegnListe();
  tegnValgt();
}

function maalToppfelt() {
  const t = el('toppfelt');
  if (t && erMobil()) document.documentElement.style.setProperty('--toppfelt-h', Math.round(t.getBoundingClientRect().height + 6) + 'px');
}
function oppdaterVisning() {
  const liste = fane === 'lagret' || visning === 'liste';
  document.body.classList.toggle('vis-liste', liste);
  document.body.classList.toggle('fane-lagret', fane === 'lagret');
  document.querySelectorAll('#fane [data-fane]').forEach(function (b) {
    if (b.dataset.fane === fane) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (liste) tegnListe();
  requestAnimationFrame(function () { maalToppfelt(); etterKortet(); if (!liste) map.invalidateSize(); });
}
function settVisning(v) {
  if (!erMobil()) return;
  visning = v; fane = 'utforsk';
  oppdaterVisning();
  track('visning', { visning: v });
}
function settFane(f) {
  fane = f;
  oppdaterVisning();
  if (f === 'lagret') el('liste').scrollTop = 0;
  track('fane', { fane: f });
}

// Detaljsiden
function bevisHtml(s) {
  const tittel = { verifisert: 'Verifisert halal', delvis: 'Delvis halal', uavklart: 'Ikke bekreftet ennå' }[s.halalStatus];
  const liste = Array.isArray(s.verification) ? s.verification : (s.verification ? [{ tekst: s.verification }] : []);
  const tekst = liste.map(function (v) {
    return '<p>' + esc(v.tekst || '') + (v.kilde ? ' <span class="d-kilde">' + esc(v.kilde) + '</span>' : '') + '</p>';
  }).join('');
  const d = dagerSiden(s.lastVerified);
  const naar = d === null ? 'Ikke bekreftet med dato ennå' : 'Sist bekreftet ' + fmtDato(s.lastVerified) + (d > 180 ? ', over et halvår siden' : '');
  return '<section class="d-boks d-bevis" data-s="' + esc(s.halalStatus) + '">' +
    '<span class="d-skjold" aria-hidden="true">' + IKON2.skjold + '</span><div>' +
    '<h3>' + tittel + '</h3>' + (tekst || '<p>Vi har ikke skrevet ned hvordan statusen er bekreftet ennå.</p>') +
    '<p class="d-naar">' + naar + '. Halalkartet sertifiserer ikke selv.</p>' +
    '<button type="button" class="d-lenke" data-faq>Hva betyr statusene?</button></div></section>';
}
function detaljHtml(s) {
  const ap = apentLinje(s), lagret = erLagret(s.id);
  const tel = s.phone ? String(s.phone).replace(/\s+/g, '') : '';
  const site = safeUrl(s.website);
  const knapper = [
    '<a class="dknapp primar" href="' + esc(ruteUrl(s)) + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' + IKON2.rute + '<span>Veibeskrivelse</span></a>',
    tel ? '<a class="dknapp" href="tel:' + esc(tel) + '">' + IKON2.telefon + '<span>Ring</span></a>' : '',
    site ? '<a class="dknapp" href="' + esc(site) + '" target="_blank" rel="noopener">' + IKON2.globus + '<span>Nettside</span></a>' : '',
    '<button type="button" class="dknapp" data-lagre="' + esc(s.id) + '" data-tekst="1" aria-pressed="' + lagret + '">' + IKON2.hjerte + '<span>' + (lagret ? 'Lagret' : 'Lagre') + '</span></button>'
  ].filter(Boolean);
  const rad = function (ikon, innhold) { return '<li>' + ikon + '<span>' + innhold + '</span></li>'; };
  const rader = [
    rad(IKON2.sted, esc(s.address ? s.address + ', ' + s.bydel : s.bydel)),
    rad(IKON2.klokke, esc(ap ? ap.tekst : (s.hours || 'Åpningstid ukjent'))),
    rad(IKON2.glass, s.alcohol ? 'Serverer alkoholholdig drikke' : 'Ingen kjent alkoholservering')
  ];
  if (tel) rader.push(rad(IKON2.telefon, '<a href="tel:' + esc(tel) + '">' + esc(s.phone) + '</a>'));
  return '<div class="d-topp">' +
      '<button type="button" class="d-rund" id="detaljTilbake" aria-label="Tilbake">' + IKON2.tilbake + '</button>' +
      '<span class="d-luft"></span>' +
      '<button type="button" class="d-rund" data-act="del" data-id="' + esc(s.id) + '" aria-label="Del ' + esc(s.name) + '">' + IKON2.del + '</button>' +
      hjerte(s, 'd-rund') +
    '</div>' +
    '<div class="d-hero" aria-hidden="true">' + IKON2.kniv(64) + '</div>' +
    '<div class="d-kropp">' +
      statusMerke(s) +
      '<h2 id="detaljNavn">' + esc(s.name) + '</h2>' +
      '<p class="d-meta">' + esc(s.cuisines.join(', ')) + ' · ' + esc(s.bydel) + ' · ' + priceLabel(s.price) + '</p>' +
      (ap ? '<p class="d-apent ' + ap.cls + '">' + esc(ap.tekst) + '</p>' : '') +
      (s.description ? '<p class="d-beskr">' + esc(s.description) + '</p>' : '') +
      '<div class="d-knapper" style="grid-template-columns:repeat(' + knapper.length + ',1fr)">' + knapper.join('') + '</div>' +
      bevisHtml(s) +
      '<ul class="d-boks d-info">' + rader.join('') + '</ul>' +
      '<div class="d-boks d-kartboks"><div class="d-kart" id="detaljKart"></div>' +
        '<a class="d-kartlenke" href="' + esc(kartAppUrl(s)) + '" target="_blank" rel="noopener">Åpne i Kart-appen</a></div>' +
    '</div>';
}
function tegnDetaljKart(s) {
  const boks = el('detaljKart');
  if (!boks) return;
  detaljKart = L.map(boks, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
    boxZoom: false, keyboard: false, touchZoom: false, tap: false }).setView([s.lat, s.lng], 16);
  detaljKart.attributionControl.setPrefix(false);
  L.tileLayer(flisUrl(temaNa()), { maxZoom: 20, attribution: '&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap' }).addTo(detaljKart);
  L.marker([s.lat, s.lng], { icon: makeIcon(s.halalStatus, true), keyboard: false, interactive: false }).addTo(detaljKart);
}
function apneDetalj(id) {
  const s = byId(id), d = el('detalj');
  if (!s || !d) return;
  if (detaljKart) { detaljKart.remove(); detaljKart = null; }
  if (d.hidden) detaljFra = document.activeElement;
  d.innerHTML = detaljHtml(s);
  d.hidden = false;
  d.scrollTop = 0;
  BAKGRUNN.forEach(function (x) { if (el(x)) el(x).inert = true; });
  if (!(history.state && history.state.detalj)) history.pushState({ detalj: id }, '', '#' + encodeURIComponent(id));
  else history.replaceState({ detalj: id }, '', '#' + encodeURIComponent(id));
  void d.offsetWidth;
  d.classList.add('apen');
  el('detaljTilbake').focus({ preventScroll: true });
  requestAnimationFrame(function () { tegnDetaljKart(s); });
  track('detaljer_apnet', { navn: s.name });
}
function lukkDetalj(fraHistorikk) {
  const d = el('detalj');
  if (!d || d.hidden) return;
  if (!fraHistorikk && history.state && history.state.detalj) { history.back(); return; }
  d.classList.remove('apen');
  d.hidden = true;
  if (detaljKart) { detaljKart.remove(); detaljKart = null; }
  BAKGRUNN.forEach(function (x) { if (el(x)) el(x).inert = false; });
  if (detaljFra && document.contains(detaljFra) && detaljFra.getClientRects().length) detaljFra.focus({ preventScroll: true });
  detaljFra = null;
}

// Mer
function apneMer() {
  const m = el('mer');
  merFra = document.activeElement;
  m.hidden = false;
  BAKGRUNN.forEach(function (x) { if (el(x)) el(x).inert = true; });
  oppdaterMerTema();
  void m.offsetWidth;
  m.classList.add('apen');
  el('merLukk').focus({ preventScroll: true });
  track('mer_apnet');
}
function lukkMer() {
  const m = el('mer');
  if (!m || m.hidden) return;
  m.classList.remove('apen');
  m.hidden = true;
  BAKGRUNN.forEach(function (x) { if (el(x)) el(x).inert = false; });
  if (merFra && document.contains(merFra)) merFra.focus({ preventScroll: true });
}
function oppdaterMerTema() {
  const b = el('merTema');
  if (b && window.halalTema) b.setAttribute('aria-checked', String(window.halalTema.na() === 'dark'));
}

function fangTab(e, boks) {
  if (e.key !== 'Tab') return;
  const f = [...boks.querySelectorAll('a[href], button:not([disabled]), select')].filter(function (x) { return x.getClientRects().length; });
  if (!f.length) return;
  if (!boks.contains(document.activeElement)) { e.preventDefault(); f[0].focus(); return; }
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
}

function wireMobil() {
  window.addEventListener('resize', function () { kobleKort(); tegnMobil(); maalToppfelt(); etterKortet(); });
  map.on('click', function () { if (erMobil() && activeId) setActive(null); });

  el('visListe').addEventListener('click', function () { settVisning('liste'); });
  el('visKart').addEventListener('click', function () { settVisning('kart'); });
  el('listeSort').addEventListener('change', function () {
    el('fSort').value = el('listeSort').value;
    el('fSort').dispatchEvent(new Event('change'));
    render();
  });

  el('fane').addEventListener('click', function (e) {
    const b = e.target.closest('[data-fane]');
    if (!b) return;
    const f = b.dataset.fane;
    if (f === 'tips') openSheet('tips', false);
    else if (f === 'mer') apneMer();
    else if (f === 'lagret') settFane('lagret');
    else settFane('utforsk');
  });

  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target : null;
    if (!t) return;
    const lagre = t.closest('[data-lagre]');
    if (lagre) { e.preventDefault(); byttLagret(lagre.dataset.lagre); return; }
    const det = t.closest('[data-detalj]');
    if (det) { e.preventDefault(); apneDetalj(det.dataset.detalj); return; }
    if (t.closest('#detaljTilbake')) { lukkDetalj(); return; }
    if (t.closest('[data-faq]')) { lukkDetalj(); setTimeout(function () { openInfo('faq'); }, 60); }
  });
  window.addEventListener('popstate', function () {
    if (!el('detalj').hidden && !(history.state && history.state.detalj)) lukkDetalj(true);
  });

  const bunn = el('bunnark');
  let y0 = null;
  bunn.addEventListener('pointerdown', function (e) { if (!e.target.closest('a, button')) y0 = e.clientY; });
  bunn.addEventListener('pointerup', function (e) {
    if (y0 === null) return;
    const dy = e.clientY - y0;
    y0 = null;
    if (dy < -40) settVisning('liste');
    else if (dy > 40 && activeId) setActive(null);
  });
  bunn.addEventListener('pointercancel', function () { y0 = null; });

  el('merLukk').addEventListener('click', lukkMer);
  el('mer').addEventListener('click', function (e) {
    if (e.target === el('mer')) { lukkMer(); return; }
    const b = e.target.closest('[data-mer]');
    if (!b) return;
    lukkMer();
    el('faneMer').focus({ preventScroll: true });
    if (b.dataset.mer === 'hilite') openSheet('hilite', false);
    else openInfo(b.dataset.mer);
  });
  el('merTema').addEventListener('click', function () { if (window.halalTema) window.halalTema.bytt(); oppdaterMerTema(); });
  window.addEventListener('temaendring', oppdaterMerTema);

  document.addEventListener('keydown', function (e) {
    const d = el('detalj'), m = el('mer');
    if (!d.hidden) { if (e.key === 'Escape') { e.preventDefault(); lukkDetalj(); } else fangTab(e, d); return; }
    if (!m.hidden) { if (e.key === 'Escape') { e.preventDefault(); lukkMer(); } else fangTab(e, m); return; }
    if (e.key === 'Escape' && erMobil() && activeId) setActive(null);
  });

  oppdaterVisning();
}

// Kartet følger filteret
function foelgFilter() {
  const f = currentFilters();
  const treff = HALAL_SPOTS.filter(function (s) { return passes(s, f) && layerOn[s.halalStatus]; });
  if (!treff.length || treff.length === HALAL_SPOTS.length) return;
  const bb = map.getBounds();
  const synlige = treff.filter(function (s) { return bb.contains([s.lat, s.lng]); }).length;
  if (synlige >= Math.ceil(treff.length / 2)) return;
  const o = trygtOmrade();
  map.fitBounds(L.latLngBounds(treff.map(function (s) { return [s.lat, s.lng]; })), {
    paddingTopLeft: [o.venstre + 16, o.topp + 16],
    paddingBottomRight: [window.innerWidth - o.hoyre + 16, window.innerHeight - o.bunn + 16],
    maxZoom: 15,
    animate: !reduceMotion
  });
  track('kart_fulgte_filter', { treff: treff.length });
}

// Aktive filtre
const FILTERFELT = ['fBydel', 'fCuisine', 'fPrice', 'fOpen', 'fAlcohol'];

function visAktiveFiltre() {
  const aktive = [];
  FILTERFELT.forEach(function (id) {
    const x = el(id);
    if (!x) return;
    x.classList.toggle('paa', !!x.value);
    if (x.value) aktive.push({ id: id, tekst: x.options[x.selectedIndex].text });
  });
  if (el('fSort')) el('fSort').classList.toggle('paa', !!el('fSort').value);

  const n = aktive.length;
  el('reset').textContent = n ? 'Nullstill (' + n + ')' : 'Nullstill';

  oppdaterSkall();
}

function renderStrict(filtered) {
  const wrap = el('strict');
  if (!wrap) return;
  const passer = filtered.filter(s => layerOn[s.halalStatus]).length;
  const steps = STRICT_STEPS.map(function (steg, i) {
    const paa = i <= strict, valgt = i === strict;
    return '<button type="button" class="strict-step' + (paa ? ' on' : '') + (valgt ? ' sel' : '') +
      '" role="radio" aria-checked="' + valgt + '" data-i="' + i + '">' +
      '<span class="strict-bar"></span><span class="strict-label">' + steg.label + '</span></button>';
  }).join('');
  wrap.innerHTML =
    '<div class="strict-head"><b>' + passer + '</b> av ' + filtered.length + ' steder passer</div>' +
    '<div class="strict-steps" role="radiogroup" aria-label="Hvor strengt">' + steps + '</div>' +
    '<p class="strict-note">' + STRICT_STEPS[strict].note + '</p>';
  wrap.querySelectorAll('.strict-step').forEach(function (b) {
    b.addEventListener('click', function () {
      strict = +b.dataset.i;
      applyStrict();
      track('strenghet', { trinn: STRICT_STEPS[strict].label });
      render();
    });
  });
}

// Kjeder
const kjedeApen = {};

function grupperKjeder(items) {
  const ut = [], sett = {};
  items.forEach(function (s) {
    if (!s.chain) { ut.push({ type: 'sted', sted: s }); return; }
    if (sett[s.chain]) { sett[s.chain].filialer.push(s); return; }
    const g = { type: 'kjede', navn: s.chain, filialer: [s] };
    sett[s.chain] = g;
    ut.push(g);
  });
  return ut.map(function (x) {
    return (x.type === 'kjede' && x.filialer.length === 1)
      ? { type: 'sted', sted: x.filialer[0] } : x;
  });
}

function kjedeEl(g) {
  const wrap = document.createElement('div');
  const aktivInni = g.filialer.some(function (s) { return s.id === activeId; });
  const apen = !!kjedeApen[g.navn] || aktivInni;
  wrap.className = 'kjede' + (apen ? ' apen' : '');
  wrap.dataset.s = g.filialer[0].halalStatus;

  const meta = [];
  if (userLoc) meta.push('<span class="dist">' + fmtDist(Math.min.apply(null, g.filialer.map(dist))) + '</span>');
  meta.push(g.filialer.length + ' steder');
  const omrader = [...new Set(g.filialer.map(function (s) { return s.bydel; }))];
  meta.push(esc(omrader.length <= 2 ? omrader.join(', ') : omrader.length + ' områder'));

  const hode = document.createElement('button');
  hode.type = 'button';
  hode.className = 'item kjede-hode';
  hode.setAttribute('aria-expanded', String(apen));
  hode.innerHTML =
    '<span class="item-mark" aria-hidden="true" style="border-radius:' +
      STATUS[g.filialer[0].halalStatus].shape + '"></span>' +
    '<div class="item-name">' + esc(g.navn) + '</div>' +
    '<div class="item-meta"><span class="item-meta-txt">' + meta.join(' · ') + '</span>' +
      '<svg class="kjede-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
    '</div>';
  hode.addEventListener('click', function () {
    kjedeApen[g.navn] = !apen;
    track('kjede_apnet', { kjede: g.navn });
    render();
  });
  wrap.appendChild(hode);

  const inni = document.createElement('div');
  inni.className = 'kjede-filialer';
  g.filialer.forEach(function (s) { inni.appendChild(itemEl(s)); });
  wrap.appendChild(inni);
  return wrap;
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
  meta.push(priceLabel(s.price));
  const st = openState(s);
  b.innerHTML =
    '<span class="item-mark" aria-hidden="true" style="border-radius:' +
      STATUS[s.halalStatus].shape + '"></span>' +
    '<div class="item-name">' + esc(s.name) + '</div>' +
    '<div class="item-meta">' +
      '<span class="item-meta-txt">' + meta.join(' · ') + '</span>' +
      (st.short ? '<span class="os ' + st.cls + '">' + esc(st.short) + '</span>' : '') +
    '</div>';
  b.addEventListener('click', () => setActive(s.id, true));
  return b;
}

function setActive(id, fromList) {
  if (activeId && markers[activeId] && byId(activeId)) {
    markers[activeId].setIcon(makeIcon(byId(activeId).halalStatus, false));
    markers[activeId].setZIndexOffset(0);
  }
  activeId = id;
  document.querySelectorAll('.item').forEach(c => c.classList.toggle('active', c.dataset.id === id));
  if (id) {
    const s = byId(id);
    if (!s) return;
    track('restaurant_klikk', { navn: s.name, bydel: s.bydel, status: s.halalStatus });
    markers[id].setIcon(makeIcon(s.halalStatus, true, erMobil() ? s.name : ''));
    markers[id].setZIndexOffset(1000);
    if (location.hash !== '#' + id) history.replaceState(history.state, '', '#' + encodeURIComponent(id));
    if (fromList) {
      if (erMobil()) settVisning('kart');
      let apnet = false;
      const naar = function () {
        if (apnet) return; apnet = true;
        visPopup(id, erMobil() ? function () { etterKortet(function () { holdPunktFritt(id); }); } : null);
      };
      map.once('moveend', naar);
      goTo(s.lat, s.lng, 15);
      setTimeout(naar, 900); // ingen moveend hvis kartet allerede står der
    }
  } else if (location.hash && !(history.state && history.state.detalj)) {
    history.replaceState(null, '', location.pathname + location.search);
  }
  tegnValgt();
}

// Plassering av kortet
function trygtOmrade() {
  const W = window.innerWidth, H = window.innerHeight;
  if (erMobil()) {
    const t = el('toppfelt');
    // over bunnarket og fargeforklaringen
    return { venstre: 10, hoyre: W - 10, topp: (t ? t.getBoundingClientRect().bottom : 0) + 10,
             bunn: H - bunnTopp() - 90 };
  }
  const panel = el('panel');
  const apent = panel && !panel.classList.contains('collapsed');
  return { venstre: (apent ? panel.getBoundingClientRect().right : 0) + 14,
           hoyre: W - 58, topp: 16, bunn: H - 100 };
}
function holdKortetFritt() {
  const e = document.querySelector('.leaflet-popup');
  if (!e) return;
  const r = e.getBoundingClientRect(), o = trygtOmrade();
  let dx = 0, dy = 0;
  if (r.right > o.hoyre) dx = r.right - o.hoyre;
  if (r.left - dx < o.venstre) dx = r.left - o.venstre;
  if (r.bottom > o.bunn) dy = r.bottom - o.bunn;
  if (r.top - dy < o.topp) dy = r.top - o.topp;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) map.panBy([Math.round(dx), Math.round(dy)], { animate: !reduceMotion, duration: .25 });
}
map.on('popupopen', function () { requestAnimationFrame(holdKortetFritt); });

function visPopup(id, ferdig) {
  const m = markers[id];
  if (!m) return;
  const apne = ferdig || function () { m.openPopup(); };
  if (m.getElement() || !klynge.hasLayer(m)) { apne(); return; }

  const forsok = function (igjen) {
    if (m.getElement()) { apne(); return; }
    const forelder = klynge.getVisibleParent(m);
    if (!forelder) {
      if (igjen <= 0) { apne(); return; }
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 15));
      setTimeout(function () { forsok(igjen - 1); }, 340);
      return;
    }
    if (forelder === m) { apne(); return; }
    if (igjen > 0 && map.getZoom() < map.getMaxZoom()) {
      const mal = forelder.getChildCount() <= 10
        ? map.getMaxZoom() : Math.min(map.getZoom() + 2, map.getMaxZoom());
      map.setView(m.getLatLng(), mal);
      setTimeout(function () { forsok(igjen - 1); }, 340);
      return;
    }
    if (forelder.spiderfy) { forelder.spiderfy(); setTimeout(apne, 300); }
    else apne();
  };
  forsok(4);
}

function applyHash() {
  let id = '';
  try { id = decodeURIComponent((location.hash || '').replace(/^#/, '')); } catch (e) { return false; }
  if (id && byId(id)) { setActive(id, true); return true; }
  return false;
}

// Utvalgte og tipsboksen
const SHEETS = {
  tips:   { box: 'tips',   bar: 'tipsBar',   lukk: 'tipsLukk',   knapp: 'tipsBtn',   ms: 5000, hendelse: 'tips_apnet' },
  hilite: { box: 'hilite', bar: 'hiliteBar', lukk: 'hiliteLukk', knapp: 'hiliteBtn', ms: 3000, hendelse: 'utvalgte_apnet', foer: renderHighlights }
};
const sheetTimer = {};

function renderHighlights() {
  const list = el('hiliteList');
  if (!list) return;
  list.innerHTML = '';
  currentHighlights().forEach(function (s) {
    const st = openState(s);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hrow';
    b.innerHTML =
      '<span class="hdot" data-s="' + esc(s.halalStatus) + '"></span>' +
      '<span class="hmain">' +
        '<span class="hname">' + esc(s.name) + '</span>' +
        '<span class="hmeta">' + esc(s.bydel) + ' · ' + esc(s.cuisines.join(', ')) + ' · ' + priceLabel(s.price) + '</span>' +
      '</span>' +
      (st.short ? '<span class="os ' + st.cls + '">' + esc(st.short) + '</span>' : '');
    b.addEventListener('click', function () { closeSheet('hilite'); setActive(s.id, true); });
    list.appendChild(b);
  });
  const sub = el('hiliteSub');
  if (sub) {
    const d = daysUntilRotation();
    sub.textContent = 'Fem steder vi har bekreftet som helt halal. Nytt utvalg ' +
      (d === 1 ? 'i morgen' : 'om ' + d + ' dager') + '.';
  }
}

function openSheet(key, auto) {
  const cfg = SHEETS[key], box = el(cfg.box);
  if (!box) return;
  Object.keys(SHEETS).forEach(function (k) { if (k !== key) closeSheet(k); });
  if (cfg.foer) cfg.foer();
  box.hidden = false;
  void box.offsetWidth;
  box.classList.add('open');
  if (key === 'tips') requestAnimationFrame(oppdaterTipsHint);
  track(cfg.hendelse, { hvordan: auto ? 'automatisk' : 'knapp' });
  startCountdown(key);
}

function startCountdown(key) {
  const cfg = SHEETS[key], box = el(cfg.box);
  clearTimeout(sheetTimer[key]);
  box.classList.remove('counting');
  if (reduceMotion) {
    sheetTimer[key] = setTimeout(function () { closeSheet(key); }, cfg.ms);
  } else {
    void box.offsetWidth;
    box.classList.add('counting');
  }
}

function stopCountdown(key) {
  const box = el(SHEETS[key].box);
  clearTimeout(sheetTimer[key]);
  if (box) box.classList.remove('counting');
}

function closeSheet(key) {
  const cfg = SHEETS[key], box = el(cfg.box);
  if (!box || !box.classList.contains('open')) return;
  clearTimeout(sheetTimer[key]);
  box.classList.remove('open', 'counting');
  setTimeout(function () { if (!box.classList.contains('open')) box.hidden = true; }, 260);
}

function wireSheets() {
  Object.keys(SHEETS).forEach(function (key) {
    const cfg = SHEETS[key], box = el(cfg.box);
    if (!box) return;
    const knapp = el(cfg.knapp);
    if (knapp) knapp.addEventListener('click', function () {
      if (box.classList.contains('open')) closeSheet(key); else openSheet(key, false);
    });
    const lukk = el(cfg.lukk);
    if (lukk) lukk.addEventListener('click', function () { closeSheet(key); });
    const bar = el(cfg.bar);
    if (bar) bar.addEventListener('animationend', function () { closeSheet(key); });
    ['focusin', 'input'].forEach(function (ev) {
      box.addEventListener(ev, function () { stopCountdown(key); });
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    Object.keys(SHEETS).forEach(function (k) { closeSheet(k); });
  });
}

function refreshOpenStates() {
  document.querySelectorAll('.item').forEach(function (b) {
    const s = byId(b.dataset.id);
    if (!s) return;
    const st = openState(s);
    let chip = b.querySelector('.item-meta .os');
    if (!st.short) { if (chip) chip.remove(); return; }
    if (!chip) {
      chip = document.createElement('span');
      b.querySelector('.item-meta').appendChild(chip);
    }
    chip.className = 'os ' + st.cls;
    chip.textContent = st.short;
  });
  if (el('hilite') && el('hilite').classList.contains('open')) renderHighlights();
  if (activeId && markers[activeId]) {
    const s = byId(activeId);
    if (s && markers[activeId].isPopupOpen()) markers[activeId].setPopupContent(popupHtml(s));
  }
  if (erMobil()) tegnMobil();
}

// Deling
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
      .catch(function () {});
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

// Tastatur
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

// Nær meg
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
    goTo(userLoc.lat, userLoc.lng, 14.5);
    btn.classList.remove('loading');
    if (el('fSort') && !el('fSort').value) el('fSort').value = 'avstand';
    render();
  }, () => {
    btn.classList.remove('loading');
    track('naer_meg_avslag');
    if (el('fSort') && el('fSort').value === 'avstand') el('fSort').value = '';
    toast('Fant ikke posisjonen din. Sjekk at nettleseren har tilgang til posisjon.');
  }, { enableHighAccuracy: true, timeout: 10000 });
}

// Infovinduet
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
  if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  lastFocus = null;
}
function showInfo(section) {
  document.querySelectorAll('.info-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === section));
  document.querySelectorAll('.info-section').forEach(x => x.classList.toggle('active', x.dataset.section === section));
  el('infoBody').scrollTop = 0;
}
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

// Skjemaer
const SKJEMA_ENDEPUNKT = '';
const SKJEMA_EPOST = '';

function skjemaVirker() { return !!(SKJEMA_ENDEPUNKT || SKJEMA_EPOST); }

function merkSkjemaUtenMottak() {
  if (skjemaVirker()) return;
  console.warn('[Halalkartet] Verken SKJEMA_ENDEPUNKT eller SKJEMA_EPOST er satt. ' +
    'GitHub Pages tar ikke imot skjemaposter, så tips- og kontaktskjemaet er avslått.');
  [['tipsForm', 'tipsSend'], ['kontaktForm', null]].forEach(function (par) {
    const f = el(par[0]);
    if (!f) return;
    const knapp = par[1] ? el(par[1]) : f.querySelector('.kf-send');
    if (knapp) { knapp.disabled = true; knapp.title = 'Innsending er ikke koblet til ennå'; }
    const note = document.createElement('p');
    note.className = 'kf-err skjema-av';
    note.hidden = false;
    note.textContent = 'Innsending er ikke koblet til ennå, så dette skjemaet kan ' +
      'dessverre ikke tas imot akkurat nå. Vi sier fra her når det er på plass.';
    f.parentNode.insertBefore(note, f);
  });
}

function sendSkjema(f, btn, onOk) {
  if (!skjemaVirker()) { toast('Innsending er ikke koblet til ennå.'); return; }

  if (!SKJEMA_ENDEPUNKT) {
    const d = new FormData(f);
    const linjer = [];
    d.forEach(function (v, k) { if (k !== 'form-name' && k !== 'bot-field' && v) linjer.push(k + ': ' + v); });
    location.href = 'mailto:' + SKJEMA_EPOST +
      '?subject=' + encodeURIComponent('Halalkartet – ' + (f.name || 'skjema')) +
      '&body=' + encodeURIComponent(linjer.join('\n'));
    onOk();
    return;
  }

  const opprinnelig = btn.textContent;
  const body = new URLSearchParams(new FormData(f)).toString();
  btn.disabled = true; btn.textContent = 'Sender';
  fetch(SKJEMA_ENDEPUNKT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: body
  })
    .then(function (r) {
      if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      f.reset();
      onOk();
    })
    .catch(function (e) {
      const utenMottak = e && (e.status === 404 || e.status === 405 || e.status === 501);
      if (utenMottak) {
        console.error('[Halalkartet] Skjemaet ble avvist med HTTP ' + e.status +
          '. Endepunktet ' + SKJEMA_ENDEPUNKT + ' tar ikke imot skjemaposter. ' +
          'Innsendingen er tapt.');
        toast('Vi får dessverre ikke tatt imot skjemaer akkurat nå. Teksten din står igjen.');
      } else {
        console.error('[Halalkartet] Innsending feilet. Er endepunktets domene lagt ' +
          'til i både connect-src og form-action i CSP-en?', e);
        toast('Beklager, noe gikk galt. Prøv igjen om litt.');
      }
    })
    .then(function () { btn.disabled = false; btn.textContent = opprinnelig; });
}

// Tipsskjema
function oppdaterTipsHint() {
  const kropp = el('tipsBody');
  if (!kropp) return;
  const wrap = kropp.parentElement;
  const rest = kropp.scrollHeight - kropp.clientHeight;
  wrap.dataset.topp = kropp.scrollTop > 6 ? 'ja' : 'nei';
  wrap.dataset.bunn = (rest > 6 && kropp.scrollTop < rest - 6) ? 'ja' : 'nei';
}

function wireTipsHint() {
  const kropp = el('tipsBody');
  if (!kropp) return;
  kropp.addEventListener('scroll', oppdaterTipsHint, { passive: true });
  window.addEventListener('resize', oppdaterTipsHint);
  oppdaterTipsHint();
}

function wireTipsForm() {
  const f = el('tipsForm');
  if (!f) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    stopCountdown('tips');
    sendSkjema(f, el('tipsSend'), function () {
      track('tips_sendt');
      el('tipsForm').hidden = true;
      el('tipsSend').hidden = true;
      el('tipsOk').hidden = false;
    });
  });
}

// Kontaktskjema
function wireContactForm() {
  const f = document.getElementById('kontaktForm');
  if (!f) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
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
    sendSkjema(f, f.querySelector('.kf-send'), function () {
      track('kontakt_sendt');
      el('kontaktOk').hidden = false;
    });
  });
}
