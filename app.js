const STATUS_ORDER = ['verifisert', 'delvis', 'uavklart'];
const TEGN = {
  verifisert: '<span class="tegn-ar">حلال</span>',
  delvis:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"><path d="M12 5v8.5"/><circle cx="12" cy="19" r=".5"/></svg>',
  uavklart:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8.6 8.8a3.5 3.5 0 016.8 1.1c0 2.3-3.4 2.9-3.4 5.1"/><circle cx="12" cy="19.2" r=".6" fill="currentColor"/></svg>'
};
const STATUS = {
  'verifisert': { label: 'Verifisert halal', color: '#2E7D4F', pin: 'pin-verifisert',
                  shape: '50%', kort: 'Verifisert', tegn: TEGN.verifisert },
  'delvis':     { label: 'Delvis halal',     color: '#D9600F', pin: 'pin-delvis',
                  shape: '50%', kort: 'Delvis',     tegn: TEGN.delvis },
  'uavklart':   { label: 'Uavklart',         color: '#636B67', pin: 'pin-uavklart',
                  shape: '50%', kort: 'Uavklart',   tegn: TEGN.uavklart }
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
// Stadia godkjenner domenet (halalkartet.no). Virker ikke det, lim inn en API-nøkkel fra Stadia her.
const STADIA_NOKKEL = '1907df04-d41e-4675-bd5c-291804b5dc1f';
const flisUrl = () => 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png' +
  (STADIA_NOKKEL ? '?api_key=' + encodeURIComponent(STADIA_NOKKEL) : '');
const FLIS_KILDE = '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const flislag = L.tileLayer(flisUrl(), { attribution: FLIS_KILDE, maxZoom: 20 }).addTo(map);
map.attributionControl.setPrefix('<a href="https://leafletjs.com/" target="_blank" rel="noopener">Leaflet</a> ·');

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
      className: '', iconSize: [36, 48], iconAnchor: [18, 47],
      html: '<div class="klynge' + (n >= 10 ? ' stor' : '') + '">' + DRAAPE + '<span>' + n + '</span></div>'
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
    note: 'Alt vi kjenner til, også steder vi ikke har rukket å sjekke ennå.' }
];
let strict = 2;
const layerOn = { 'verifisert': true, 'delvis': true, 'uavklart': true };
function applyStrict() {
  const t = STRICT_STEPS[strict].tillat;
  STATUS_ORDER.forEach(st => { layerOn[st] = t.indexOf(st) >= 0; });
}
// PC slår statusene av og på hver for seg; -1 betyr et utvalg som ikke er ett av trinnene
function synkStrict() {
  const paa = STATUS_ORDER.filter(st => layerOn[st]).join(',');
  strict = STRICT_STEPS.findIndex(steg => steg.tillat.join(',') === paa);
}
const alleStatuser = () => STATUS_ORDER.every(st => layerOn[st]);
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
    const alle = await res.json();
    if (!Array.isArray(alle)) throw new Error('ikke en liste');
    // et sted uten koordinater ville stoppet hele kartet
    HALAL_SPOTS = alle.filter(s => s && Number.isFinite(s.lat) && Number.isFinite(s.lng));
    if (HALAL_SPOTS.length < alle.length) console.warn('Halalkartet: hopper over ' + (alle.length - HALAL_SPOTS.length) + ' steder uten koordinater');
    if (!HALAL_SPOTS.length) throw new Error('tomt');
  } catch (e) { showLoadError(e); return; }
  initApp();
})();

function showLoadError(err) {
  if (err && window.console) console.error('Halalkartet: klarte ikke å laste spots.json –', err);
  el('bunnTall').textContent = '0';
  el('bunnTekst').textContent = 'Fant ikke dataene';
  const overlay = document.createElement('div');
  overlay.className = 'map-overlay';
  overlay.innerHTML =
    '<div class="box"><h2>Kartet venter på data</h2>' +
    '<p>Appen fikk ikke lastet <code>spots.json</code>. Prøv å laste siden på nytt. Hjelper ikke det, står feilen i nettleserkonsollen.</p>' +
    '<p>Utvikler du lokalt, husk at filen må serveres over http. Nettlesere blokkerer henting av lokale filer:</p>' +
    '<p><code>python3 -m http.server</code></p>' +
    '<p>Gå så til <code>http://localhost:8000</code>.</p></div>';
  el('map').appendChild(overlay);
  if (el('pcListeInnhold')) el('pcListeInnhold').innerHTML = '<div class="pc-tom"><b>Fant ikke dataene</b>Prøv å laste siden på nytt.</div>';
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
  wireMobilskall();
  wirePc();
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
  render();
  const deepLinked = applyHash();
  window.addEventListener('hashchange', function () { if (location.hash.slice(1) !== encodeURIComponent(activeId || '')) applyHash(); });

  if (!deepLinked && erMobil()) setTimeout(function () { openSheet('tips', true); }, 600);

  setInterval(refreshOpenStates, 60000);
}

function nullstill() {
  el('search').value = '';
  FILTERFELT.concat('fSort').forEach(function (id) { el(id).value = ''; });
  pcGruppe = true; el('pcSort').value = 'bydel';
  pcVisLagret = false;
  strict = 2; applyStrict();
  render();
  el('search').focus();
}

const DRAAPE = '<svg class="pin-form" viewBox="0 0 30 40" aria-hidden="true"><path d="M15 38.5S2 24.4 2 15a13 13 0 0126 0c0 9.4-13 23.5-13 23.5z"/></svg>';

function makeIcon(status, big, navn) {
  const st = STATUS[status];
  const etikett = navn ? '<span class="pin-navn">' + esc(navn) + '</span>' : '';
  if (big && !erMobil()) return L.divIcon({
    className: '', iconSize: [40, 53], iconAnchor: [20, 52],
    html: '<div class="pin draape stor ' + st.pin + '">' + DRAAPE + '<span class="pin-tegn">' + st.tegn + '</span></div>' +
      (navn ? '<span class="pin-navn under">' + esc(navn) + '</span>' : '')
  });
  if (big) return L.divIcon({
    className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -18],
    html: '<div class="pin ' + st.pin + ' big" style="border-radius:' + st.shape + '">' + st.tegn + '</div>' + etikett
  });
  // spissen står på stedet
  return L.divIcon({
    className: '', iconSize: [30, 40], iconAnchor: [15, 39],
    html: '<div class="pin draape ' + st.pin + '">' + DRAAPE + '<span class="pin-tegn">' + st.tegn + '</span></div>' + etikett
  });
}

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
  // det valgte stedet står utenfor klyngene, så det alltid synes
  klynge.addLayers(paaKart.filter(s => s.id !== activeId).map(s => markers[s.id]));

  oppdaterSkall();
  tegnMobil();
  tegnPc();
}

// Mobil: toppfelt og hurtigbrikker

function plasserSok() {
  const sok = document.querySelector('.search-wrap');
  const kort = el('sokekort'), pc = el('pcSok');
  if (!sok || !kort || !pc) return;
  if (erMobil()) { if (sok.parentElement !== kort) kort.appendChild(sok); }
  else if (sok.parentElement !== pc) pc.insertBefore(sok, pc.firstChild);
  el('search').placeholder = erMobil() ? 'Søk' : 'Hva har du lyst på? Søk sted, kjøkken eller adresse';
  const t = el('toppfelt');
  if (t && erMobil()) document.documentElement.style.setProperty('--toppfelt-h', Math.round(t.getBoundingClientRect().height + 6) + 'px');
}

function antallAktive() {
  return FILTERFELT.filter(function (id) { return el(id) && el(id).value; }).length + (alleStatuser() ? 0 : 1);
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
  const felt = [['fCuisine', 'Kjøkken', 'kjokken'], ['fPrice', 'Pris', 'pris'], ['fBydel', 'Område', 'omrade'], ['fAlcohol', 'Alkohol', 'alkohol']];
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

function filterTekst() {
  const deler = [];
  const sok = el('search').value.trim();
  if (sok) deler.push('«' + sok + '»');
  if (el('fOpen').value) deler.push(el('fOpen').options[el('fOpen').selectedIndex].text.toLowerCase());
  if (!alleStatuser()) deler.push(strict === 0 ? 'kun verifisert' : strict === 1 ? 'uten uavklarte' : 'utvalgte statuser');
  if (el('fCuisine').value) deler.push(el('fCuisine').value.toLowerCase());
  if (el('fBydel').value) deler.push(el('fBydel').value);
  if (el('fPrice').value) deler.push('$'.repeat(+el('fPrice').value));
  if (el('fAlcohol').value) deler.push(el('fAlcohol').value === 'ja' ? 'serverer alkohol' : 'uten kjent alkohol');
  if (!deler.length) return '';
  return ' · ' + (deler.length === 1 ? deler[0] : deler.length + ' filtre');
}

function oppdaterSkall() {
  const f = currentFilters();
  const n = HALAL_SPOTS.filter(function (s) { return passes(s, f) && layerOn[s.halalStatus]; }).length;
  el('bunnTall').textContent = n;
  el('bunnTekst').textContent = n < HALAL_SPOTS.length
    ? 'av ' + HALAL_SPOTS.length + ' steder' + filterTekst() : (n === 1 ? 'sted' : 'steder');
  tegnBunnHode();
  const a = antallAktive(), t = el('filterTeller');
  if (t) { t.hidden = !a; t.textContent = a; }
  if (el('filterknapp')) el('filterknapp').setAttribute('aria-label', a ? 'Åpne filtrene, ' + a + ' på' : 'Åpne filtrene');
  byggHurtigrad();
  maalToppfelt();
  if (el('filterark') && !el('filterark').hidden) tegnFilterark(n);
}

// Filterarket
const BAKGRUNN = ['map', 'pcTopp', 'pcFilter', 'pcListe', 'pcKartinfo', 'toppfelt', 'nearme', 'bunnark', 'liste', 'visKart', 'fane'];
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

  const f = document.activeElement, nokkel = f && k.contains(f)
    ? ['velg', 'seg', 'bryter', 'flere'].filter(function (a) { return f.dataset[a] !== undefined; })
        .map(function (a) { return '[data-' + a + '="' + CSS.escape(f.dataset[a]) + '"]'; }).join('') +
      (f.dataset.v !== undefined ? '[data-v="' + CSS.escape(f.dataset.v) + '"]' : '')
    : null;
  const rull = k.scrollTop;

  k.innerHTML =
    '<section class="fa-del" data-del="status"><h3>Halal-status</h3>' +
      segment('Halal-status', [['0', 'Verifisert'], ['1', '+ Delvis'], ['2', 'Alle']], String(strict), 'strict') +
      '<p class="fa-note">' + esc(strict >= 0 ? STRICT_STEPS[strict].note : 'Et eget utvalg av statuser.') + '</p></section>' +
    '<section class="fa-del" data-del="apent"><div class="fa-rad"><div><h3>Åpent nå</h3>' +
      '<p>Skjul steder som er stengt</p></div>' +
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
  el('faVis').innerHTML = '<span>' + (!antall ? 'Ingen steder passer' : antall === HALAL_SPOTS.length ? 'Vis alle ' + antall + ' steder'
    : 'Vis ' + antall + (antall === 1 ? ' sted' : ' steder')) + '</span>' + (antall ? IKON2.pil : '');
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
  el('faNull').addEventListener('click', function () { nullstill(); el('faLukk').focus(); });
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
  glass:   SVG(22, '<path d="M8 3h8l-1 7a3 3 0 01-6 0L8 3zM12 13v8M9 21h6"/>'),
  pil:     SVG(18, '<path d="M5 12h14M13 6l6 6-6 6"/>'),
  utpil:   SVG(16, '<path d="M7 17L17 7M9 7h8v8"/>')
};

let visning = 'kart', fane = 'utforsk', kortModus = null;
let detaljFra = null, detaljKart = null, merFra = null;

function kobleKort() {
  const mobil = erMobil();
  if (mobil === kortModus) return;
  kortModus = mobil;
  const aktiv = activeId;
  if (!mobil) { visning = 'kart'; fane = 'utforsk'; document.body.classList.remove('vis-liste', 'fane-lagret'); }
  plasserTips();
  if (aktiv) setActive(aktiv, false);
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

const SKJOLD = SVG(20, '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/>');
function skjold(s, medTekst) {
  const st = STATUS[s.halalStatus];
  return '<span class="skjold" data-s="' + esc(s.halalStatus) + '"' + (medTekst ? '' : ' role="img" aria-label="' + st.label + '"') + '>' +
    SKJOLD + '<span class="skjold-tegn" aria-hidden="true">' + st.tegn + '</span></span>' + (medTekst ? '<span class="skjold-tekst">' + st.label + '</span>' : '');
}
function monogram(s, i) {
  const m = /[A-Za-zÀ-ÿÆØÅæøå0-9]/.exec(s.name);
  let h = i;
  if (h === undefined) { h = 0; for (const c of s.id) h = (h * 31 + c.charCodeAt(0)) >>> 0; }
  return '<span class="mono ' + (h % 2 ? 'mono-lys' : 'mono-mork') + '" aria-hidden="true">' + (m ? m[0].toUpperCase() : '?') + '</span>';
}
function tidNa(s) {
  const st = openState(s), stenger = clockMinutes(s.hours), apner = s.opens ? clockMinutes(s.opens) : null;
  return { state: st.state, cls: st.cls, label: st.label,
           stenger: stenger === null ? '' : fmtClock(stenger), apner: apner === null ? '' : fmtClock(apner) };
}
function kortTid(s) {
  const t = tidNa(s);
  if (t.state === 'open' || t.state === 'soon') return { cls: t.cls, tekst: 'til ' + t.stenger };
  if (t.state === 'closed') return { cls: t.cls, tekst: /^Åpner/.test(t.label) && t.apner ? 'åpner ' + t.apner : t.label };
  return null;
}
function apentLinje(s) {
  const st = openState(s);
  const stenger = clockMinutes(s.hours);
  if (st.state === 'open') return { cls: 'os-open', tekst: 'Åpent til ' + fmtClock(stenger) };
  if (st.state === 'soon') return { cls: 'os-soon', tekst: 'Stenger ' + fmtClock(stenger) };
  if (st.state === 'closed') {
    const apner = s.opens ? clockMinutes(s.opens) : null;
    return { cls: 'os-closed', tekst: /^Åpner/.test(st.label) && apner !== null ? 'Stengt, åpner ' + fmtClock(apner) : st.label };
  }
  return null;
}
function metaTekst(s, skille) {
  const sk = '<span class="skraa">' + (skille || ' / ') + '</span>';
  const deler = [];
  if (userLoc) deler.push(fmtDist(dist(s)));
  deler.push(s.cuisines.slice(0, 2).join(', '), s.bydel);
  return deler.map(esc).join(sk) + sk + priceLabel(s.price);
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
  if (!erMobil()) tegnPc();
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
function listekortHtml(s, i) {
  const t = kortTid(s);
  return '<article class="lkort" data-id="' + esc(s.id) + '">' + monogram(s, i) +
    '<div class="lkort-tekst">' +
      '<h3><button type="button" class="lkort-navn" data-detalj="' + esc(s.id) + '">' + esc(s.name) + '</button></h3>' +
      '<p class="lkort-meta">' + skjold(s) + '<span>' + metaTekst(s, ' · ') +
        (t ? '<span class="skraa"> · </span><span class="apent ' + t.cls + '">' + esc(t.tekst) + '</span>' : '') + '</span></p>' +
    '</div>' + hjerte(s) + '</article>';
}
function tegnListe() {
  const boks = el('listeKort');
  if (!boks) return;
  const lagretVis = fane === 'lagret';
  const liste = lagretVis ? lagrede().map(byId).filter(Boolean) : anbefalt(synligeSteder(), el('fSort').value);
  el('listeTall').innerHTML = lagretVis ? 'Lagret' : '<b>' + liste.length + '</b> ' + (liste.length === 1 ? 'sted' : 'steder');
  el('listeSorter').hidden = lagretVis;
  el('listeSort').value = el('fSort').value;
  if (!liste.length) {
    boks.innerHTML = lagretVis
      ? '<div class="tom"><b>Ingen lagrede steder ennå</b>Trykk på hjertet ved et sted for å lagre det. Lagrede steder ligger bare på denne enheten.</div>'
      : '<div class="tom"><b>Ingen treff</b>Prøv å fjerne et filter eller søk på noe annet.</div>';
    return;
  }
  boks.innerHTML = liste.map(function (s, i) { return listekortHtml(s, i); }).join('');
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
  tegnBunnHode();
  if (!s) { boks.innerHTML = ''; etterKortet(); return; }
  const ap = apentLinje(s);
  boks.innerHTML =
    '<article class="vkort" aria-labelledby="valgtNavn">' + monogram(s) +
      '<div class="lkort-tekst">' +
        '<h3 id="valgtNavn">' + esc(s.name) + '</h3>' +
        '<p class="lkort-meta">' + metaTekst(s) + '</p>' +
      '</div>' +
      '<p class="vkort-status">' + skjold(s, true) + (ap ? '<span class="skille" aria-hidden="true"></span><span class="apent ' + ap.cls + '">' + esc(ap.tekst) + '</span>' : '') + '</p>' +
      '<div class="vkort-knapper">' +
        '<a class="knapp primar" href="' + esc(ruteUrl(s)) + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' + IKON2.rute + 'Veibeskrivelse</a>' +
        '<button type="button" class="knapp" data-detalj="' + esc(s.id) + '">Se stedet</button>' +
        hjerte(s, 'knapp-hjerte') +
      '</div>' +
    '</article>';
  etterKortet();
}
function tegnBunnHode() {
  const valgt = erMobil() && !!activeId;
  const b = el('bunnark');
  if (!b) return;
  b.classList.toggle('har-valgt', valgt);
  el('visListe').innerHTML = (valgt ? 'Alle ' + el('bunnTall').textContent + ' steder' : 'Vis liste') + IKON2.pil;
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
function dagensTid(s) {
  const t = tidNa(s);
  let hoved, rest = '';
  if (t.state === 'open') { hoved = 'Åpent nå'; rest = 'til ' + t.stenger; }
  else if (t.state === 'soon') { hoved = 'Stenger snart'; rest = 'kl ' + t.stenger; }
  else if (t.state === 'closed') { hoved = t.label === 'Midlertidig stengt' ? t.label : 'Stengt'; rest = /^Åpner/.test(t.label) && t.apner ? 'åpner ' + t.apner : ''; }
  else return '';
  return '<p class="d-apent ' + t.cls + '"><b>' + hoved + '</b>' + (rest ? ' <span>' + rest + '</span>' : '') + '</p>';
}
function adresseLinjer(s) {
  if (!s.address) return esc(s.bydel);
  const deler = s.address.split(',');
  const gate = deler[0].trim();
  const by = deler.length > 1 ? deler[deler.length - 1].replace(/\d+/g, '').trim() : '';
  const linje2 = !by || by === s.bydel ? s.bydel : s.bydel + ', ' + by;
  return esc(gate) + '<br>' + esc(linje2);
}
function detaljHtml(s) {
  const tel = s.phone ? String(s.phone).replace(/\s+/g, '') : '';
  const site = safeUrl(s.website);
  const knapper = [
    '<a class="dknapp primar" href="' + esc(ruteUrl(s)) + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' + IKON2.rute + '<span>Veibeskrivelse</span></a>',
    tel ? '<a class="dknapp" href="tel:' + esc(tel) + '">' + IKON2.telefon + '<span>Ring</span></a>' : '',
    site ? '<a class="dknapp" href="' + esc(site) + '" target="_blank" rel="noopener">' + IKON2.globus + '<span>Nett</span></a>' : ''
  ].filter(Boolean);

  const liste = Array.isArray(s.verification) ? s.verification : (s.verification ? [{ tekst: s.verification }] : []);
  const bevis = liste.map(function (v) {
    return '<p>' + esc(v.tekst || '') + (v.kilde ? ' <span class="d-kilde">' + esc(v.kilde) + '</span>' : '') + '</p>';
  }).join('') || '<p>Vi har ikke skrevet ned hvordan statusen er bekreftet ennå.</p>';
  const d = dagerSiden(s.lastVerified);
  const naar = d === null ? 'Ikke bekreftet med dato' : 'Sist bekreftet ' + fmtDato(s.lastVerified) + (d > 180 ? ', over et halvår siden' : '');

  const stenger = clockMinutes(s.hours), apner = s.opens ? clockMinutes(s.opens) : null;
  const idag = stenger === null ? (s.hours || 'Ukjent')
    : (apner !== null ? fmtClock(apner) + ' – ' + fmtClock(stenger) : 'Stenger ' + fmtClock(stenger));
  const rad = function (navn, verdi) { return '<div><dt>' + navn + '</dt><dd>' + verdi + '</dd></div>'; };
  const rader = [
    rad('Adresse', adresseLinjer(s)),
    rad('I dag', esc(idag)),
    rad('Alkohol', s.alcohol ? 'Serveres' : 'Ingen kjent servering')
  ];
  if (tel) rader.push(rad('Telefon', '<a href="tel:' + esc(tel) + '">' + esc(s.phone) + '</a>'));

  return '<div class="d-topp">' +
      '<button type="button" class="d-rund" id="detaljTilbake" aria-label="Tilbake">' + IKON2.tilbake + '</button>' +
      '<span class="d-luft"></span>' +
      '<button type="button" class="d-rund" data-act="del" data-id="' + esc(s.id) + '" aria-label="Del ' + esc(s.name) + '">' + IKON2.del + '</button>' +
      hjerte(s, 'd-rund') +
    '</div>' +
    '<header class="d-hero">' +
      '<p class="d-oy" data-s="' + esc(s.halalStatus) + '">' + skjold(s, true) + '</p>' +
      '<h2 id="detaljNavn">' + esc(s.name) + '</h2>' +
      '<p class="d-meta">' + metaTekst(s) + '</p>' +
    '</header>' +
    '<div class="d-kropp">' +
      '<div class="d-tidrad">' + (dagensTid(s) || '<p class="d-apent"><span>Åpningstid ukjent</span></p>') +
        '<a class="d-alletider" href="' + esc(kartAppUrl(s)) + '" target="_blank" rel="noopener" aria-label="Alle åpningstider for ' + esc(s.name) + ', i kart-appen">Alle tider</a></div>' +
      (s.description ? '<p class="d-beskr">' + esc(s.description) + '</p>' : '') +
      '<div class="d-knapper k' + knapper.length + '">' + knapper.join('') + '</div>' +
      '<section class="d-om" aria-labelledby="dOmTittel">' +
        '<div class="d-om-hode"><h3 id="dOmTittel">Om halal-statusen</h3><span class="d-ar" aria-hidden="true">حلال</span></div>' +
        bevis +
        '<p class="d-forbehold">Halalkartet sertifiserer ikke selv.</p>' +
        '<div class="d-om-fot"><span class="d-naar">' + naar + '</span><button type="button" class="d-lenke" data-faq>Hva betyr statusene?</button></div>' +
      '</section>' +
      '<dl class="d-info">' + rader.join('') + '</dl>' +
      '<div class="d-kartboks"><div class="d-kart" id="detaljKart"></div>' +
        '<a class="d-kartlenke" href="' + esc(kartAppUrl(s)) + '" target="_blank" rel="noopener">Åpne i kart-appen' + IKON2.utpil + '</a></div>' +
      '<div class="d-feil"><div><h3>Ser du noe som er feil?</h3><p>Si ifra, så sjekker vi stedet på nytt.</p></div>' +
        '<button type="button" class="knapp" data-sifra="' + esc(s.id) + '">Si ifra</button></div>' +
    '</div>';
}
function tegnDetaljKart(s) {
  const boks = el('detaljKart');
  if (!boks) return;
  detaljKart = L.map(boks, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
    boxZoom: false, keyboard: false, touchZoom: false, tap: false }).setView([s.lat, s.lng], 16);
  detaljKart.attributionControl.setPrefix(false);
  L.tileLayer(flisUrl(), { maxZoom: 20, attribution: '&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap' }).addTo(detaljKart);
  L.marker([s.lat, s.lng], { icon: makeIcon(s.halalStatus, true), keyboard: false, interactive: false }).addTo(detaljKart);
}
function apneDetalj(id) {
  const s = byId(id), d = el('detalj');
  if (!s || !d) return;
  if (detaljKart) { detaljKart.remove(); detaljKart = null; }
  if (d.hidden) detaljFra = document.activeElement;
  d.innerHTML = detaljHtml(s);
  d.hidden = false;
  if (!erMobil()) { el('pcSkjerm').hidden = false; el('pcSkjerm').classList.add('apen'); }
  d.scrollTop = 0;
  d.classList.remove('rullet');
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
  if (el('pcSkuff').hidden) { el('pcSkjerm').classList.remove('apen'); el('pcSkjerm').hidden = true; }
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
    if (t.closest('[data-faq]')) { lukkDetalj(); setTimeout(function () { openInfo('faq'); }, 60); return; }
    const sifra = t.closest('[data-sifra]');
    if (sifra) {
      const sted = byId(sifra.dataset.sifra);
      lukkDetalj();
      setTimeout(function () {
        openInfo('feil');
        const felt = document.querySelector('#kontaktForm textarea[name="melding"]');
        if (felt && sted && !felt.value) felt.value = 'Om ' + sted.name + ': ';
      }, 60);
    }
  });
  el('detalj').addEventListener('scroll', function () {
    const d = el('detalj'), hero = d.querySelector('.d-hero');
    d.classList.toggle('rullet', !!hero && d.scrollTop > hero.offsetHeight - 70);
  }, { passive: true });
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


// Kjeder
const kjedeApen = {};

function grupperKjeder(items, nokkel) {
  const ut = [], sett = {};
  items.forEach(function (s) {
    if (!s.chain) { ut.push({ type: 'sted', sted: s }); return; }
    const k = nokkel ? nokkel(s) : s.chain;
    if (sett[k]) { sett[k].filialer.push(s); return; }
    const g = { type: 'kjede', navn: s.chain, filialer: [s] };
    sett[k] = g;
    ut.push(g);
  });
  return ut.map(function (x) {
    return (x.type === 'kjede' && x.filialer.length === 1)
      ? { type: 'sted', sted: x.filialer[0] } : x;
  });
}

function vises(s) { return passes(s, currentFilters()) && layerOn[s.halalStatus]; }
function setActive(id, fromList) {
  const forrige = activeId && byId(activeId);
  if (forrige && markers[forrige.id]) {
    const m = markers[forrige.id];
    m.setIcon(makeIcon(forrige.halalStatus, false));
    m.setZIndexOffset(0);
    if (forrige.id !== id) { map.removeLayer(m); if (vises(forrige)) klynge.addLayer(m); }
  }
  activeId = id;
  if (id && markers[id] && byId(id)) { klynge.removeLayer(markers[id]); markers[id].addTo(map); }
  if (id) {
    const s = byId(id);
    if (!s) return;
    track('restaurant_klikk', { navn: s.name, bydel: s.bydel, status: s.halalStatus });
    markers[id].setIcon(makeIcon(s.halalStatus, true, s.name));
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
  if (!erMobil()) {
    const fraListe = el('pcListe').contains(document.activeElement);
    tegnPcListe(); rullTilValgt();
    const k = document.querySelector('#pcListeInnhold .pc-valgt');
    if (fraListe && k) k.focus({ preventScroll: true });
  }
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
  // regnet fra kartkortets hjørne: «I kartet nå» øverst til venstre, zoom til høyre
  return { venstre: 0, hoyre: W - 60, topp: 100, bunn: H - 30 };
}
function visPopup(id, ferdig) {
  const m = markers[id];
  if (!m) return;
  const apne = ferdig || function () {};
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
  tips:   { box: 'tips',   bar: 'tipsBar',   lukk: 'tipsLukk',   ms: 5000, hendelse: 'tips_apnet' },
  hilite: { box: 'hilite', bar: 'hiliteBar', lukk: 'hiliteLukk', ms: 3000, hendelse: 'utvalgte_apnet', foer: renderHighlights }
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
  if (key === 'tips' && !erMobil()) { openInfo('tips'); return; }
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
  if (el('hilite') && el('hilite').classList.contains('open')) renderHighlights();
  if (erMobil()) tegnMobil();
  else tegnPc();
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
  const knapper = [el('nearme'), el('pcNaer')].filter(Boolean);
  const laster = paa => knapper.forEach(k => k.classList.toggle('loading', paa));
  track('naer_meg');
  if (!navigator.geolocation) { toast('Nettleseren din støtter ikke posisjon.'); return; }
  laster(true);
  // svarer man aldri på spørsmålet om posisjon, skal knappen ikke bli stående låst
  const slipp = setTimeout(() => laster(false), 15000);
  navigator.geolocation.getCurrentPosition(pos => {
    clearTimeout(slipp);
    userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([userLoc.lat, userLoc.lng], {
      icon: L.divIcon({ className: '', html: '<div class="userloc"></div>', iconSize: [16,16], iconAnchor: [8,8] }),
      zIndexOffset: 1000
    }).addTo(map);
    goTo(userLoc.lat, userLoc.lng, 14.5);
    laster(false);
    if (el('fSort') && !el('fSort').value) {
      el('fSort').value = 'avstand';
      pcGruppe = false; el('pcSort').value = 'avstand';
    }
    render();
  }, () => {
    clearTimeout(slipp);
    laster(false);
    track('naer_meg_avslag');
    if (el('fSort') && el('fSort').value === 'avstand') {
      el('fSort').value = '';
      pcGruppe = true; el('pcSort').value = 'bydel';
    }
    toast('Fant ikke posisjonen din. Sjekk at nettleseren har tilgang til posisjon.');
  }, { enableHighAccuracy: true, timeout: 10000 });
}

// Infovinduet
function wireInfo() {
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
  const feil = section === 'feil';
  if (feil) section = 'kontakt';
  if (el('kontaktTittel')) {
    el('kontaktTittel').textContent = feil ? 'Si ifra om feil' : 'Kontakt oss';
    el('kontaktIntro').textContent = feil
      ? 'Ser du noe som er feil på et sted? Skriv hvilket sted det gjelder og hva som er feil, så sjekker vi det.'
      : 'Har du et tips om et sted, funnet en feil, eller vil du bare si hva du synes, så hører vi gjerne fra deg. Fyll ut skjemaet under.';
  }
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
const SKJEMA_ENDEPUNKT = 'https://formspree.io/f/meaeqdlj';
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
    d.forEach(function (v, k) { if (k.charAt(0) !== '_' && k !== 'form-name' && v) linjer.push(k + ': ' + v); });
    location.href = 'mailto:' + SKJEMA_EPOST +
      '?subject=' + encodeURIComponent('Halalkartet – ' + (f.name || 'skjema')) +
      '&body=' + encodeURIComponent(linjer.join('\n'));
    onOk();
    return;
  }

  const opprinnelig = btn.textContent;
  const data = new FormData(f);
  const kontakt = String(data.get('kontakt') || '').trim();
  // da kan vi svare rett fra e-posten
  if (kontakt.indexOf('@') > 0) data.set('_replyto', kontakt);
  const body = new URLSearchParams(data).toString();
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

// PC: topplinje, filterlinje, liste og meny
let pcApen = null, pcGruppe = true, pcVisLagret = false, skuffFra = null;
const PC_VALG = [
  { del: 'kjokken', id: 'fCuisine', navn: 'Kjøkken', alle: 'Alle kjøkken' },
  { del: 'omrade', id: 'fBydel', navn: 'Område', alle: 'Alle områder' },
  { del: 'pris', id: 'fPrice', navn: 'Pris', alle: 'Alle priser' }
];
const CHEV = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

function skjoldFor(st) {
  return '<span class="skjold" data-s="' + st + '" aria-hidden="true">' + SKJOLD + '<span class="skjold-tegn">' + STATUS[st].tegn + '</span></span>';
}

function tegnPc() {
  if (erMobil() || !el('pcFilter') || !HALAL_SPOTS.length) return;
  tegnPcFilter();
  tegnPcKartinfo();
  tegnPcListe();
  const n = lagrede().filter(byId).length, t = el('pcLagretTall');
  t.hidden = !n; t.textContent = n;
  el('pcLagret').setAttribute('aria-pressed', String(pcVisLagret));
}

function tegnPcFilter() {
  const boks = el('pcFilter');
  const f = currentFilters();
  const passer = HALAL_SPOTS.filter(function (s) { return passes(s, f); });
  const fokus = document.activeElement && boks.contains(document.activeElement)
    ? ['status', 'valg', 'v', 'pc'].map(function (a) { return document.activeElement.dataset[a]; }) : null;

  const status = STATUS_ORDER.map(function (st) {
    const n = passer.filter(function (s) { return s.halalStatus === st; }).length;
    return '<button type="button" class="pc-status" data-status="' + st + '" aria-pressed="' + layerOn[st] + '" aria-label="' + STATUS[st].label + ', ' + n + ' steder">' +
      skjoldFor(st) + '<span class="pc-st-navn">' + STATUS[st].kort + '</span><span class="pc-st-tall">' + n + '</span></button>';
  }).join('');

  const apent = el('fOpen').value === 'naa';
  const valg = PC_VALG.map(function (v) {
    const x = el(v.id), satt = !!x.value;
    const tekst = satt ? (v.id === 'fPrice' ? '$'.repeat(+x.value) : x.value) : v.navn;
    let meny = '';
    if (pcApen === v.del) {
      meny = '<div class="pc-nedtrekk" role="menu" aria-label="' + v.navn + '">' + [...x.options].map(function (o) {
        const n = o.value ? passer.filter(function (s) {
          return v.id === 'fCuisine' ? s.cuisines.includes(o.value) : v.id === 'fBydel' ? s.bydel === o.value : String(s.price) === o.value;
        }).length : null;
        return '<button type="button" role="menuitemradio" aria-checked="' + (o.value === x.value) + '" data-pc="velg" data-valg="' + v.del + '" data-v="' + esc(o.value) + '">' +
          '<span>' + esc(o.value ? o.text : v.alle) + '</span>' + (n !== null ? '<small>' + n + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    }
    return '<div class="pc-valg">' +
      '<button type="button" class="pc-valgknapp' + (satt ? ' satt' : '') + '" data-valg="' + v.del + '" aria-haspopup="menu" aria-expanded="' + (pcApen === v.del) + '">' +
      '<span>' + esc(tekst) + '</span>' + CHEV + '</button>' + meny + '</div>';
  }).join('');

  boks.innerHTML =
    '<div class="pc-statusgruppe" role="group" aria-label="Halal-status">' + status + '</div>' +
    '<span class="pc-skille" aria-hidden="true"></span>' +
    '<div class="pc-valggruppe">' +
      '<button type="button" class="pc-valgknapp" data-pc="apent" aria-pressed="' + apent + '"><span>Åpent nå</span></button>' +
      valg +
    '</div>' +
    '<button type="button" class="pc-nullstill" data-pc="nullstill"' + (antallAktive() || f.q ? '' : ' disabled') + '>Nullstill</button>';

  if (fokus) {
    const [st, vg, v, pc] = fokus;
    let sel = st ? '[data-status="' + st + '"]' : pc ? '[data-pc="' + pc + '"]' : vg ? '.pc-valgknapp[data-valg="' + vg + '"]' : null;
    if (pc === 'velg') sel = '[data-pc="velg"][data-valg="' + vg + '"][data-v="' + CSS.escape(v || '') + '"]';
    const ny = sel && boks.querySelector(sel);
    if (ny) ny.focus({ preventScroll: true });
  }
}

function tegnPcKartinfo() {
  const f = currentFilters();
  const n = HALAL_SPOTS.filter(function (s) { return passes(s, f) && layerOn[s.halalStatus]; }).length, alle = HALAL_SPOTS.length;
  const bareApent = f.open === 'naa' && antallAktive() === 1 && !f.q;
  el('pcKiTall').textContent = n;
  el('pcKiTekst').textContent = n === alle ? (n === 1 ? 'sted' : 'steder')
    : 'av ' + alle + ' steder ' + (bareApent ? (n === 1 ? 'er åpent' : 'er åpne') : 'passer');
}

function pcRad(s) {
  const t = kortTid(s);
  return '<button type="button" class="pc-rad" data-pcvelg="' + esc(s.id) + '">' + skjold(s) +
    '<span class="pc-rad-tekst"><span class="pc-rad-navn">' + esc(s.name) + '</span>' +
    '<span class="pc-rad-meta">' + esc(s.cuisines[0] || '') + ' · ' + '$'.repeat(s.price) + '</span></span>' +
    '<span class="pc-rad-tid ' + (t ? t.cls : '') + '">' + (t ? esc(t.tekst) : '') + '</span></button>';
}

function pcValgtKort(s) {
  const tel = s.phone ? String(s.phone).replace(/\s+/g, '') : '';
  const gate = s.address ? s.address.split(',')[0].trim() : s.bydel;
  const meta = [esc(s.cuisines[0] || ''), '$'.repeat(s.price)];
  const apent = apentLinje(s);
  if (apent) meta.push(esc(apent.tekst));
  return '<article class="pc-valgt" tabindex="-1" data-id="' + esc(s.id) + '" aria-label="' + esc(s.name) + '">' +
    '<div class="pc-valgt-topp">' + skjold(s) + hjerte(s, 'pc-valgt-hjerte') + '</div>' +
    '<h3>' + esc(s.name) + '</h3>' +
    '<p class="pc-valgt-meta">' + meta.join(' · ') + '</p>' +
    '<dl class="pc-valgt-info"><div><dt>Adresse</dt><dd>' + esc(gate) + '</dd></div>' +
      (tel ? '<div><dt>Telefon</dt><dd><a href="tel:' + esc(tel) + '">' + esc(s.phone) + '</a></dd></div>' : '') + '</dl>' +
    '<div class="pc-valgt-knapper">' +
      '<a class="primar" href="' + esc(ruteUrl(s)) + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' + IKON2.rute + 'Veibeskrivelse</a>' +
      '<button type="button" data-detalj="' + esc(s.id) + '">Se hele siden</button>' +
    '</div></article>';
}

function pcKjede(g) {
  const apen = !!kjedeApen[kjedeNokkel(g)] || g.filialer.some(function (s) { return s.id === activeId; });
  const omrader = [...new Set(g.filialer.map(function (s) { return s.bydel; }))];
  const tider = [...new Set(g.filialer.map(function (s) { const t = kortTid(s); return t ? t.tekst : ''; }))];
  return '<div class="pc-kjede' + (apen ? ' apen' : '') + '">' +
    '<button type="button" class="pc-rad" data-pckjede="' + esc(kjedeNokkel(g)) + '" data-antall="' + g.filialer.length + '" aria-expanded="' + apen + '">' + skjold(g.filialer[0]) +
      '<span class="pc-rad-tekst"><span class="pc-rad-navn">' + esc(g.navn) + '</span>' +
      '<span class="pc-rad-meta">' + g.filialer.length + ' steder · ' + esc(omrader.length <= 2 ? omrader.join(' og ') : omrader.length + ' områder') + '</span></span>' +
      '<span class="pc-rad-tid">' + (tider.length === 1 ? esc(tider[0]) : '') + '</span></button>' +
    (apen ? '<div class="pc-filialer">' + g.filialer.map(function (s) { return s.id === activeId ? pcValgtKort(s) : pcRad(s); }).join('') + '</div>' : '') +
  '</div>';
}

// kjeder samles per status, så skjoldet på raden stemmer for alle filialene
const pcKjeder = liste => grupperKjeder(liste, function (s) { return s.chain + '|' + s.halalStatus; });
const kjedeNokkel = g => g.navn + '|' + g.filialer[0].halalStatus;
function pcRader(liste) {
  return pcKjeder(liste).map(function (x) {
    return x.type === 'kjede' ? pcKjede(x) : x.sted.id === activeId ? pcValgtKort(x.sted) : pcRad(x.sted);
  }).join('');
}

function tegnPcListe() {
  const boks = el('pcListeInnhold');
  if (!boks || erMobil() || !HALAL_SPOTS.length) return;
  const f = currentFilters();
  let liste = sortItems(HALAL_SPOTS.filter(function (s) { return passes(s, f) && layerOn[s.halalStatus]; }), f.sort);
  if (pcVisLagret) {
    const lagret = lagrede();
    liste = HALAL_SPOTS.filter(function (s) { return lagret.indexOf(s.id) >= 0; });
  }
  el('pcListeTittel').textContent = pcVisLagret ? 'Lagret' : 'Steder' + (f.bydel ? ' i ' + f.bydel : '');
  el('pcSort').closest('.pc-sorter').hidden = pcVisLagret;
  const rull = boks.scrollTop;

  let html = '';
  if (pcVisLagret) {
    html = '<button type="button" class="pc-tilbake" data-pc="alle">' + IKON2.tilbake + 'Alle steder</button>' +
      (liste.length ? pcRader(liste) : '<div class="pc-tom"><b>Ingen lagrede steder ennå</b>Trykk på hjertet på et sted for å lagre det her.</div>');
  } else if (!liste.length) {
    html = '<div class="pc-tom"><b>Ingen treff</b>Prøv å fjerne et filter eller søk på noe annet.' +
      '<button type="button" class="pc-nullstill" data-pc="nullstill">Nullstill</button></div>';
  } else if (pcGruppe) {
    const grupper = {};
    pcKjeder(liste).forEach(function (x) {
      const b = (x.type === 'kjede' ? x.filialer[0] : x.sted).bydel;
      (grupper[b] = grupper[b] || []).push(x);
    });
    html = Object.keys(grupper).sort(function (a, b) {
      return grupper[b].length - grupper[a].length || a.localeCompare(b, 'nb');
    }).map(function (b) {
      const rader = grupper[b];
      return '<section class="pc-gruppe"><div class="pc-gruppe-hode"><h3>' + esc(b) + '</h3>' +
        '<span class="pc-gruppe-tall">' + rader.length + (rader.length === 1 ? ' sted' : ' steder') + '</span></div>' +
        rader.map(function (x) {
          return x.type === 'kjede' ? pcKjede(x) : x.sted.id === activeId ? pcValgtKort(x.sted) : pcRad(x.sted);
        }).join('') + '</section>';
    }).join('');
  } else {
    html = pcRader(liste);
  }
  boks.innerHTML = html;
  boks.scrollTop = rull;
}

function rullTilValgt() {
  const k = document.querySelector('#pcListeInnhold .pc-valgt');
  if (k) k.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
}

function apneSkuff() {
  const sk = el('pcSkuff'), sj = el('pcSkjerm');
  skuffFra = document.activeElement;
  sk.hidden = false; sj.hidden = false;
  ['pcTopp', 'pcFilter', 'pcListe', 'pcKartinfo', 'map'].forEach(function (id) { el(id).inert = true; });
  void sk.offsetWidth;
  sk.classList.add('apen'); sj.classList.add('apen');
  el('pcMenyknapp').setAttribute('aria-expanded', 'true');
  sk.querySelector('[data-side]').focus({ preventScroll: true });
  track('meny_apnet');
}
function lukkSkuff() {
  const sk = el('pcSkuff'), sj = el('pcSkjerm');
  if (sk.hidden) return;
  sk.classList.remove('apen');
  if (el('detalj').hidden) sj.classList.remove('apen');
  ['pcTopp', 'pcFilter', 'pcListe', 'pcKartinfo', 'map'].forEach(function (id) { el(id).inert = false; });
  el('pcMenyknapp').setAttribute('aria-expanded', 'false');
  setTimeout(function () {
    if (sk.classList.contains('apen')) return;
    sk.hidden = true;
    if (el('detalj').hidden) sj.hidden = true;
  }, reduceMotion ? 0 : 320);
  if (skuffFra && document.contains(skuffFra)) skuffFra.focus({ preventScroll: true });
}

// Tipsskjemaet står i tipsboksen på mobil og i et vindu på PC
let tipsHjem = null;
function plasserTips() {
  const form = el('tipsForm'), send = el('tipsSend'), ok = el('tipsOk'), regler = document.querySelector('.tips-rules');
  const plass = el('pcTipsplass');
  if (!form || !plass) return;
  if (!tipsHjem) tipsHjem = { kropp: el('tipsBody'), fot: send.parentElement };
  if (erMobil()) {
    if (form.parentElement === tipsHjem.kropp) return;
    tipsHjem.kropp.prepend(form, ok, regler);
    tipsHjem.fot.prepend(send);
  } else if (form.parentElement !== plass) {
    plass.append(form, send, ok, regler);
  }
}

function wirePc() {
  el('pcMenyknapp').addEventListener('click', apneSkuff);
  el('pcSkuffLukk').addEventListener('click', lukkSkuff);
  el('pcSkjerm').addEventListener('click', function () { if (el('detalj').hidden) lukkSkuff(); else lukkDetalj(); });
  el('pcSkuff').addEventListener('click', function (e) {
    const b = e.target.closest('[data-side]');
    if (b) openInfo(b.dataset.side);
  });
  el('pcNaer').addEventListener('click', locateUser);
  el('pcTips').addEventListener('click', function () { openInfo('tips'); });
  el('pcLagret').addEventListener('click', function () {
    pcVisLagret = !pcVisLagret;
    track('lagret_pc', { vis: pcVisLagret });
    tegnPc();
  });
  el('pcSok').addEventListener('submit', function (e) {
    e.preventDefault();
    pcVisLagret = false;
    render();
    foelgFilter();
    el('search').blur();
  });
  el('pcSort').addEventListener('change', function () {
    const v = el('pcSort').value;
    pcGruppe = v === 'bydel';
    el('fSort').value = pcGruppe ? '' : v;
    el('fSort').dispatchEvent(new Event('change'));
    render();
  });

  el('pcFilter').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.status) {
      layerOn[b.dataset.status] = !layerOn[b.dataset.status];
      synkStrict();
      track('status_pc', { status: b.dataset.status, paa: layerOn[b.dataset.status] });
      render(); foelgFilter();
    } else if (b.dataset.pc === 'apent') {
      el('fOpen').value = el('fOpen').value === 'naa' ? '' : 'naa';
      el('fOpen').dispatchEvent(new Event('change'));
      render();
    } else if (b.dataset.pc === 'velg') {
      const v = PC_VALG.find(function (x) { return x.del === b.dataset.valg; });
      el(v.id).value = b.dataset.v;
      pcApen = null;
      el(v.id).dispatchEvent(new Event('change'));
      render();
      const k = el('pcFilter').querySelector('.pc-valgknapp[data-valg="' + v.del + '"]');
      if (k) k.focus({ preventScroll: true });
    } else if (b.dataset.valg) {
      pcApen = pcApen === b.dataset.valg ? null : b.dataset.valg;
      tegnPcFilter();
      const forste = el('pcFilter').querySelector('.pc-nedtrekk [aria-checked="true"]');
      if (forste) forste.focus({ preventScroll: true });
    }
  });
  el('pcListe').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pcvelg) setActive(b.dataset.pcvelg, true);
    else if (b.dataset.pckjede) { kjedeApen[b.dataset.pckjede] = !kjedeApen[b.dataset.pckjede]; tegnPcListe(); }
    else if (b.dataset.pc === 'alle') { pcVisLagret = false; tegnPc(); }
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-pc="nullstill"]')) { nullstill(); return; }
    if (pcApen && !(e.target.closest && e.target.closest('.pc-valg'))) { pcApen = null; tegnPcFilter(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || erMobil()) return;
    if (el('infoScrim').classList.contains('open') || !el('detalj').hidden) return;
    if (pcApen) {
      const del = pcApen;
      pcApen = null; tegnPcFilter();
      el('pcFilter').querySelector('.pc-valgknapp[data-valg="' + del + '"]').focus();
    } else if (!el('pcSkuff').hidden) lukkSkuff();
  });
  window.addEventListener('resize', function () { plasserTips(); if (!erMobil()) tegnPc(); else lukkSkuff(); });
  plasserTips();
}
