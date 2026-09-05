const STATUS_ORDER = ['verifisert', 'delvis', 'uavklart'];
/* Gronn for halal, oransje for delvis, rod for uavklart. Formen folger med -
   sirkel, avkuttet firkant, firkant - slik at nivaet fortsatt kan leses av en
   som ikke skiller fargene. */
const STATUS = {
  'verifisert': { label: 'Verifisert halal', color: '#2E7D4F', pin: 'pin-verifisert',
                  shape: '50%',             kort: 'Verifisert' },
  'delvis':     { label: 'Delvis halal',     color: '#D9600F', pin: 'pin-delvis',
                  shape: '50% 50% 50% 5px', kort: 'Delvis'     },
  'uavklart':   { label: 'Uavklart',         color: '#C62828', pin: 'pin-uavklart',
                  shape: '5px',             kort: 'Uavklart'   }
};
const priceLabel = p => '<span class="price pris-' + p + '">' + '$'.repeat(p) + '</span>';
const el = id => document.getElementById(id);
const erMobil = () => window.innerWidth <= 720;

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

/* ---- Apningstid ----
   Norge har én tidssone for hele landet, men den veksler mellom vinter- og
   sommertid. Vi spor derfor aldri brukerens egen klokke: Intl gir oss
   veggklokka i Oslo, og handterer overgangen selv. */
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
/* Hel time skrives kort ("kl 23", "kl 03"), ellers med minutter ("kl 22:45"). */
function fmtClose(mins) {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  const hh = (h < 10 ? '0' : '') + h;
  return m ? 'kl ' + hh + ':' + (m < 10 ? '0' : '') + m : 'kl ' + hh;
}
/* "Stenger kl. 23" og "Stenger kl. 22:45" -> minutter etter midnatt. */
function clockMinutes(text) {
  const m = /kl\.?\s*(\d{1,2})(?::(\d{2}))?/i.exec(text || '') || /^(\d{1,2}):(\d{2})$/.exec(text || '');
  if (!m) return null;
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}
const NIGHT_CUTOFF = 6 * 60; // stengetid for kl. 06 horer til natt til neste dag

/* Returnerer apen/stenger snart/stengt, med tekst til bade liste og popup. */
function openState(s) {
  const raw = s.hours || '';
  if (/midlertidig stengt/i.test(raw)) return { state: 'closed', cls: 'os-closed', short: 'Stengt', label: 'Midlertidig stengt' };
  if (/stengt/i.test(raw)) return { state: 'closed', cls: 'os-closed', short: 'Stengt', label: 'Stengt' };

  const close = clockMinutes(raw);
  if (close === null) return { state: 'unknown', cls: 'os-unknown', short: '', label: raw };

  const now = osloNow().min;

  // Valgfritt felt: har stedet "opens": "11:00", slutter vi a pasta at det er
  // apent for det faktisk har apnet. Uten feltet kjenner vi bare stengetiden.
  const open = s.opens ? clockMinutes(s.opens) : null;
  if (open !== null && now < open && !(close < NIGHT_CUTOFF && now < close)) {
    return { state: 'closed', cls: 'os-closed', short: 'Stengt', label: 'Åpner ' + fmtClose(open) };
  }

  let end = close;
  if (close < NIGHT_CUTOFF && now >= NIGHT_CUTOFF) end += 24 * 60;
  const left = end - now;

  // Den siste timen for stengetid regnes som "snart": kl. 22:00 mot stenging
  // kl. 23 er noyaktig 60 minutter, og skal vaere gult.
  if (left <= 0) return { state: 'closed', cls: 'os-closed', short: 'Stengt', label: 'Stengt' };
  if (left <= 60) return { state: 'soon', cls: 'os-soon', short: 'Stenger snart', label: 'Stenger snart' };
  const t = 'Stenger ' + fmtClose(close);
  return { state: 'open', cls: 'os-open', short: t, label: t };
}

/* ---- Utvalgte steder ----
   Fem steder om gangen, byttet ut hver femte dag. Utvalget er utledet av
   datoen, ikke tilfeldig per bruker, sa alle ser det samme. Rekkefolgen
   stokkes med fast fro én gang, og vinduet flytter seg fem plasser per
   periode.

   Bare bekreftede steder er med: a fremheve et sted vi ikke har sjekket
   er a gi det en anbefaling det ikke har fortjent. */
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

/* Et kart som flyr av gårde er nettopp det som gir ubehag ved vestibulær
   sensitivitet. Da hopper vi rett dit i stedet. */
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function goTo(lat, lng, zoom) {
  if (reduceMotion) map.setView([lat, lng], zoom);
  else map.flyTo([lat, lng], zoom, { duration: .6 });
}

let HALAL_SPOTS = [];
const markers = {};
let activeId = null;
let userLoc = null, userMarker = null;
let lastFocus = null;
/* ---- Strenghet ----
   Ett valg i stedet for tre avkrysningsbokser. Trinnet bestemmer hvor mye
   usikkerhet du godtar, og bade kartet og listen folger med. Standard er
   apent: vi skjuler ikke noe for folk som ikke har valgt. */
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
// Uavklart starter sammenslatt: besokende skal mote de bekreftede stedene
// forst, men kan folde ut gruppen selv.
const layerCollapsed = { 'verifisert': false, 'delvis': false, 'uavklart': true };
const byId = id => HALAL_SPOTS.find(s => s.id === id);

/* ---- Anonym hendelsessporing ----
   Sender navnet på handlingen (+ evt. hvilken restaurant, bydel eller filter)
   til Google Analytics. Ingen personopplysninger, og oppsettet i analytics.js
   ber gtag droppe cookiene. Er ingen leverandor lastet – for eksempel fordi
   noen kjorer annonseblokkering – gjor funksjonen ingenting.
   Plausible, Fathom og Umami star igjen som alternativer: bytter du tilbake,
   virker hendelsene uten at noe her ma endres. Husk da a apne for domenet
   deres i script-src og connect-src i _headers. */
function track(name, props) {
  try {
    // GA4 tar egendefinerte parametere som et flatt objekt, ikke nostet.
    if (typeof window.gtag === 'function') window.gtag('event', name, props || {});
    else if (typeof window.plausible === 'function') window.plausible(name, props ? { props: props } : undefined);
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
      // autoPanPaddingBottomRight holder kortet klar av bunnarket pa mobil;
      // uten den apner popupen bak arket og ser ut som ingenting skjedde.
      .bindPopup(popupHtml(s), {
        closeButton: true, minWidth: 236, maxWidth: 300,
        autoPanPaddingTopLeft: L.point(12, 64),
        autoPanPaddingBottomRight: L.point(12, erMobil() ? 336 : 24)
      });
    m.on('click', () => setActive(s.id, false));
    m.on('popupclose', () => { if (activeId === s.id) setActive(null); });
    markers[s.id] = m;
  });

  ['search', 'fBydel', 'fCuisine', 'fPrice', 'fOpen', 'fAlcohol', 'fSort'].forEach(id => {
    const x = el(id);
    if (x) x.addEventListener('input', render);
  });
  el('fBydel').addEventListener('change', () => { if (el('fBydel').value) track('filter_bydel', { bydel: el('fBydel').value }); });
  el('fCuisine').addEventListener('change', () => { if (el('fCuisine').value) track('filter_kjokken', { kjokken: el('fCuisine').value }); });
  if (el('fPrice')) el('fPrice').addEventListener('change', () => { if (el('fPrice').value) track('filter_pris', { pris: el('fPrice').value }); });
  if (el('fOpen')) el('fOpen').addEventListener('change', () => { if (el('fOpen').value) track('filter_apent', { status: el('fOpen').value }); });
  if (el('fAlcohol')) el('fAlcohol').addEventListener('change', () => { if (el('fAlcohol').value) track('filter_alkohol', { alkohol: el('fAlcohol').value }); });
  if (el('fSort')) el('fSort').addEventListener('change', () => {
    const v = el('fSort').value;
    if (v) track('sortering', { modus: v });
    // "Nærmest meg" gir ingen mening uten posisjon – be om den med en gang.
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
  wireSheet();
  wireTipsHint();
  wireNearMe();
  wireInfo();
  wireContactForm();
  wireTipsForm();
  wirePopupActions();
  wireShortcuts();
  wireSheets();
  el('feedback').addEventListener('click', function () { openInfo('kontakt'); });
  if (window.innerWidth <= 720) togglePanel(true);

  render();
  const deepLinked = applyHash();

  // Apner brukeren en delt lenke, er det stedet de kom for – da skal ikke
  // kortet legge seg over popupen. I oppstartsfasen er det tipsboksen som
  // moter besokende; Utvalgte apnes med sin egen knapp.
  if (!deepLinked) setTimeout(function () { openSheet('tips', true); }, 600);

  // Ett minutt er fint nok: "stenger om 45 min" trenger ikke sekundpresisjon.
  setInterval(refreshOpenStates, 60000);
}

function togglePanel(collapse) {
  // Pa mobil er dette trinn 1 eller 2 av tre; settArk eier tilstanden slik at
  // handtaket og knappene under aldri kommer i utakt med panelet.
  if (erMobil()) { settArk(collapse ? 1 : 2); return; }
  el('panel').classList.toggle('collapsed', collapse);
  document.body.classList.toggle('panel-collapsed', collapse);
  const g = el('sheetGrab');
  if (g) g.setAttribute('aria-expanded', String(!collapse));
  setTimeout(() => map.invalidateSize(), 320);
}

/* ---- Bunnarket pa mobil: tre trinn ----
   0 kompakt (til og med «Alt vi kjenner …») · 1 hvile · 2 full.
   Handtaket kan bade trykkes og dras. Under draget folger arket fingeren via
   en ren transform, sa ingenting regnes om per ramme; ved slipp bestemmer
   retning og lengde hvilket trinn det snapper til. */
let arkTrinn = 1;

function px(navn, fallback) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(navn));
  return isNaN(v) ? fallback : v;
}

/* Nedtrekt tilstand slutter rett under «Alt vi kjenner …». Hoyden males her
   i stedet for a gjettes, slik at den treffer ogsa nar linja brytes over to
   linjer pa en smal skjerm eller teksten endres. */
function oppdaterKompakt() {
  const panel = el('panel'), note = document.querySelector('.strict-note');
  if (!panel || !note) return;
  const h = Math.round(note.getBoundingClientRect().bottom - panel.getBoundingClientRect().top) + 12;
  if (h > 60) document.documentElement.style.setProperty('--kompakt', h + 'px');
}

function settArk(trinn) {
  arkTrinn = Math.max(0, Math.min(2, trinn));
  const panel = el('panel'), hank = el('sheetGrab');
  oppdaterKompakt();
  panel.classList.toggle('collapsed', arkTrinn < 2);
  panel.classList.toggle('kompakt', arkTrinn === 0);
  document.body.classList.toggle('panel-collapsed', arkTrinn < 2);
  document.body.classList.toggle('ark-kompakt', arkTrinn === 0);
  if (hank) {
    hank.setAttribute('aria-expanded', String(arkTrinn === 2));
    hank.setAttribute('aria-label', arkTrinn === 0 ? 'Dra opp for stedene'
      : arkTrinn === 1 ? 'Dra opp for hele listen' : 'Legg ned listen');
  }
  setTimeout(function () { map.invalidateSize(); }, 320);
}

function wireSheet() {
  const hank = el('sheetGrab'), panel = el('panel');
  if (!hank || !panel) return;
  let y0 = null, dy = 0, start = false, flyttet = false;

  const hoyde = () => panel.getBoundingClientRect().height;
  // Hvor langt arket er forskjovet ved hvert trinn.
  const forskyv = t => t === 2 ? 0
    : t === 1 ? hoyde() - px('--peek', 340)
    : hoyde() - px('--kompakt', 170);

  hank.addEventListener('pointerdown', function (e) {
    if (!erMobil()) return;
    y0 = e.clientY; dy = 0; start = true; flyttet = false;
    panel.style.transition = 'none';
    hank.setPointerCapture(e.pointerId);
  });
  hank.addEventListener('pointermove', function (e) {
    if (!start) return;
    dy = e.clientY - y0;
    if (Math.abs(dy) > 3) flyttet = true;
    // Litt motstand utenfor endepunktene, slik at arket ikke kan dras vekk.
    const y = Math.max(-24, Math.min(forskyv(0) + 24, forskyv(arkTrinn) + dy));
    panel.style.transform = 'translateY(' + y + 'px)';
  });
  const veksel = () => settArk(arkTrinn === 0 ? 1 : arkTrinn === 1 ? 2 : 1);
  let sistPeker = 0;

  const slipp = function (e) {
    if (!start) return;
    start = false;
    sistPeker = Date.now();
    panel.style.transition = '';
    panel.style.transform = '';
    if (e && e.pointerId != null && hank.hasPointerCapture(e.pointerId)) hank.releasePointerCapture(e.pointerId);
    // Trykk uten drag: fra kompakt til hvile, ellers veksler det hvile/full.
    if (!flyttet) { veksel(); return; }
    // Over 60 px flytter ett trinn i dragretningen; kortere faller tilbake.
    if (dy < -60) settArk(arkTrinn + 1);
    else if (dy > 60) settArk(arkTrinn - 1);
    else settArk(arkTrinn);
  };
  hank.addEventListener('pointerup', slipp);
  hank.addEventListener('pointercancel', slipp);
  hank.addEventListener('click', function () {
    if (Date.now() - sistPeker < 600) return;
    veksel();
  });
  hank.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); settArk(arkTrinn === 2 ? 1 : arkTrinn + 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); settArk(arkTrinn + 1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); settArk(arkTrinn - 1); }
  });
}

function makeIcon(status, big) {
  const st = STATUS[status];
  return L.divIcon({
    className: '', iconSize: big ? [23,23] : [17,17], iconAnchor: big ? [11,11] : [8,8],
    popupAnchor: [0,-13],
    html: '<div class="pin ' + st.pin + (big ? ' big' : '') + '" style="border-radius:' + st.shape + '"></div>'
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

/* ---- Verifisering ----
   Vi sertifiserer ikke selv. Kortet skal derfor vise hvem som sa hva og nar,
   ikke bare en pastand. Feltet er en liste, slik at et sted kan ha bade et
   sertifikat og en eierbekreftelse med hver sin dato. Eldre data der
   verification var en enkelt streng vises fortsatt. */
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

  // Ferskheten er det viktigste tallet pa hele kortet: en gronn pin som ble
  // sjekket for to ar siden er ikke verdt mye. Star det ingen dato, sier vi
  // det rett ut i stedet for a la fravaeret se ut som noe positivt.
  const d = dagerSiden(s.lastVerified);
  let fersk;
  if (d === null) {
    fersk = '<span class="v-age v-open">Ikke bekreftet med dato ennå</span>';
  } else if (d > 180) {
    fersk = '<span class="v-age v-mid">Sist bekreftet ' + fmtDato(s.lastVerified) +
            ' — det er over et halvår siden</span>';
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

  // Navn + adresse gir Google noe å kjenne igjen, så ruten ender ved inngangen
  // og ikke på et punkt midt i kvartalet. Mangler adressen, faller vi tilbake
  // på koordinatene – de er alltid der.
  const dir = 'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent(s.address ? s.name + ', ' + s.address : s.lat + ',' + s.lng);

  return '<div class="pop-name">' + esc(s.name) + '</div>' +
    '<div class="pop-meta">' + esc(s.cuisines.join(' · ')) + ' &nbsp;·&nbsp; ' + priceLabel(s.price) + '</div>' +
    '<div class="pop-badge" data-s="' + esc(s.halalStatus) + '"><span class="dotc" aria-hidden="true" style="border-radius:' +
      STATUS[s.halalStatus].shape + '"></span>' + STATUS[s.halalStatus].label + '</div>' +
    (s.description ? '<div class="pop-desc">' + esc(s.description) + '</div>' : '') +
    verifiseringHtml(s) +
    // Alkohol som drikke diskvalifiserer ikke maten, men det skal sta.
    (s.alcohol ? '<div class="pop-note">Serverer halal mat, men også alkoholholdig drikke.</div>' : '') +
    rows.join('') +
    '<div class="pop-actions">' +
      '<a class="pop-act primary" href="' + dir + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>Veibeskrivelse</a>' +
      '<button type="button" class="pop-act" data-act="del" data-id="' + esc(s.id) + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>Del</button>' +
    '</div>';
}

/* Norske tegn foldes bort for sok. Folk skriver «gronland» eller «groenland»
   pa et mobiltastatur, og begge skal finne Gronland. Bade sokestrengen og
   teksten kjores gjennom samme funksjon, sa de moter hverandre pa halvveien. */
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
  // Steder uten lesbart klokkeslett har state "unknown" og faller ut av
  // alle apningsfiltre – vi vet rett og slett ikke om de er apne.
  if (f.open && openState(s).state !== f.open) return false;
  // «nei» betyr «ingen kjent alkoholservering». Feltet settes kun når vi vet
  // at stedet skjenker, så et sted uten feltet havner her.
  if (f.alcohol === 'ja' && !s.alcohol) return false;
  if (f.alcohol === 'nei' && s.alcohol) return false;
  if (f.q) {
    // Adressen er med, slik at "Grønland 5" eller "Torggata" gir treff.
    // Skriver du æøå selv, soker vi bokstavrett – da mener du dem. Skriver du
    // «gronland» eller «groenland», folder vi begge sider i stedet.
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

  HALAL_SPOTS.forEach(s => {
    const show = shown.has(s.id) && layerOn[s.halalStatus];
    if (show && !map.hasLayer(markers[s.id])) markers[s.id].addTo(map);
    if (!show && map.hasLayer(markers[s.id])) map.removeLayer(markers[s.id]);
  });

  renderStrict(filtered);
  // Teksten under skiven bytter hoyde med trinnet, sa malet ma folge med.
  if (erMobil()) requestAnimationFrame(oppdaterKompakt);

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

      // Avkrysningsboksen er borte: strenghetsskiven over eier na hva som vises
      // pa kartet. Overskriften folder bare gruppen ut og inn.
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

/* Skiven tegnes pa nytt ved hver render, slik at tellingen folger sokefeltet
   og de andre filtrene og ikke bare det totale antallet. */
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
      goTo(s.lat, s.lng, 15);
      markers[id].openPopup();
    }
  } else if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

/* Apner stedet en delt lenke peker pa (halalkartet.no/#safari-restaurant-oslo). */
function applyHash() {
  let id = '';
  try { id = decodeURIComponent((location.hash || '').replace(/^#/, '')); } catch (e) { return false; }
  if (id && byId(id)) { setActive(id, true); return true; }
  return false;
}

/* ---- Kortene midt i skjermen ----
   To kort deler oppforsel: vis, tell ned, lukk. Nedtellingen drives av
   stolinjas animasjon, sa et musepeker-stopp (CSS pauser den) ogsa utsetter
   lukkingen. Varigheten star i CSS per kort. */
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
  // Bare ett kort om gangen midt i skjermen.
  Object.keys(SHEETS).forEach(function (k) { if (k !== key) closeSheet(k); });
  if (cfg.foer) cfg.foer();
  box.hidden = false;
  box.classList.add('open');
  // Hoydene er 0 mens boksen er skjult, sa hintet ma regnes ut etter at den vises.
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
    void box.offsetWidth; // start animasjonen pa nytt
    box.classList.add('counting');
  }
}

/* Begynner noen a fylle ut skjemaet, stopper nedtellingen helt. Et kort som
   forsvinner midt i utfyllingen er verre enn ett som blir staende. */
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

/* Statusene eldes mens siden star apen. Vi oppdaterer bare merkelappene,
   ikke hele lista, sa verken rulling eller fokus gar tapt. */
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
    goTo(userLoc.lat, userLoc.lng, 14.5);
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

/* ---- Netlify Forms, sendt uten sideomlasting ----
   Begge skjemaene postes urlencodet til /, som er det Netlify forventer. */
/* Skjemaene postes til «/», som Netlify fanger opp. Ligger siden pa en ren
   statisk vert uten skjemamottak, svarer den 404, 405 eller 501 - og da er
   det ikke en forbigaende feil som gar over av seg selv. Vi skiller de to,
   sa loggen sier hva som faktisk er galt i stedet for a se ut som ustabilt
   nett. Teksten i skjemaet star igjen uansett; vi nullstiller kun ved svar. */
function sendNetlifyForm(f, btn, onOk) {
  const opprinnelig = btn.textContent;
  const body = new URLSearchParams(new FormData(f)).toString();
  btn.disabled = true; btn.textContent = 'Sender';
  fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
    .then(function (r) {
      if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      f.reset();
      onOk();
    })
    .catch(function (e) {
      const utenMottak = e && (e.status === 404 || e.status === 405 || e.status === 501);
      if (utenMottak) {
        console.error('[Halalkartet] Skjemaet ble avvist med HTTP ' + e.status +
          '. Verten tar ikke imot skjemaposter — Netlify Forms virker ikke her. ' +
          'Innsendingen er tapt.');
        toast('Vi får dessverre ikke tatt imot skjemaer akkurat nå. Teksten din står igjen.');
      } else {
        console.error('[Halalkartet] Innsending feilet:', e);
        toast('Beklager, noe gikk galt. Prøv igjen om litt.');
      }
    })
    .then(function () { btn.disabled = false; btn.textContent = opprinnelig; });
}

/* ---- tipsskjema: besokende foreslar en restaurant ---- */
/* Setter flagg for om det finnes mer over eller under i tipsskjemaet, slik at
   kantene kan tones og pila vises. Kjores ved rulling, ved apning og nar
   vinduet endrer storrelse - alle tre kan endre hvor mye som far plass. */
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
  window.addEventListener('resize', oppdaterKompakt);
  oppdaterTipsHint();
}

function wireTipsForm() {
  const f = el('tipsForm');
  if (!f) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    stopCountdown('tips');
    sendNetlifyForm(f, el('tipsSend'), function () {
      track('tips_sendt');
      el('tipsForm').hidden = true;
      el('tipsSend').hidden = true;
      el('tipsOk').hidden = false;
    });
  });
}

/* ---- kontaktskjema ---- */
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
    sendNetlifyForm(f, f.querySelector('.kf-send'), function () {
      track('kontakt_sendt');
      el('kontaktOk').hidden = false;
    });
  });
}
