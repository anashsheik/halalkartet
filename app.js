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

// Språk: norsk er grunnspråket, engelsk slås opp her. Nøkkelen er den norske teksten.
const SPRAK_NOKKEL = 'halalkartet-sprak';
let sprak = (function () { try { return localStorage.getItem(SPRAK_NOKKEL) === 'en' ? 'en' : 'nb'; } catch (e) { return 'nb'; } })();
const MANGLER = new Set();
const ENGELSK = {
  // toppen, menyen og lista
  'Meny': 'Menu', 'Nær meg': 'Near me', 'Tips oss': 'Suggest a place', 'Tips oss (fane)': 'Suggest', 'Lagrede steder': 'Saved places', 'Søk': 'Search',
  'Finn halal nær deg': 'Find halal near you', 'Filtre': 'Filters', 'I kartet nå': 'On the map now', 'Sorter listen': 'Sort the list',
  'Etter bydel': 'By area', 'Anbefalt': 'Recommended', 'Nærmest': 'Nearest', 'Navn A–Å': 'Name A–Z', 'Pris lav–høy': 'Price low–high',
  'Lukk menyen': 'Close menu', 'Tips oss om et sted': 'Suggest a place', 'Si ifra om feil': 'Report an error', 'FAQ': 'FAQ',
  'Personvern': 'Privacy', 'Vilkår': 'Terms', 'Om oss': 'About us', 'Kontakt oss': 'Contact us', 'Kontakt': 'Contact',
  'Finn steder nær meg': 'Find places near me', 'Hva har du lyst på? Søk sted, kjøkken eller adresse': 'What are you craving? Search place, cuisine or address',
  'Halalkartet, start på nytt': 'Halalkartet, start over', 'Hurtigfiltre': 'Quick filters', 'Åpne filtrene': 'Open filters',
  'Åpne filtrene, {n} på': 'Open filters, {n} on', 'Lukk filtrene': 'Close filters', 'Nullstill': 'Reset', 'Vis steder': 'Show places',
  'Steder på kartet': 'Places on the map', 'Valgt sted': 'Selected place', 'Vis liste': 'Show list', 'Steder': 'Places', 'Steder i {b}': 'Places in {b}',
  'Sorter:': 'Sort:', 'Kart': 'Map', 'Hovedmeny': 'Main menu', 'Lagret': 'Saved', 'Mer': 'More', 'Lukk': 'Close', 'Informasjon': 'Information',
  'Si ifra eller kontakt oss': 'Report an error or contact us', 'Ofte stilte spørsmål': 'Frequently asked questions',
  'Utvalgte steder': 'Featured places', 'Fem utvalgte steder som vi mener du burde prøve.': 'Five featured places we think you should try.',
  'Fem steder vi har bekreftet som helt halal. Nytt utvalg i morgen.': 'Five places we have confirmed as fully halal. New selection tomorrow.',
  'Fem steder vi har bekreftet som helt halal. Nytt utvalg om {n} dager.': 'Five places we have confirmed as fully halal. New selection in {n} days.',
  'sted': 'place', 'steder': 'places', '1 sted': '1 place', '{n} steder': '{n} places', 'av {n} steder': 'of {n} places',
  'av {n} steder passer': 'of {n} places match', 'av {n} steder er åpne': 'of {n} places are open', 'av {n} steder er åpent': 'of {n} places is open',
  'Alle steder': 'All places', 'Alle {n} steder': 'All {n} places', '{n} steder · {o}': '{n} places · {o}', ' og ': ' and ', '{n} områder': '{n} areas',
  'Ingen treff': 'No results', 'Prøv å fjerne et filter eller søk på noe annet.': 'Try removing a filter or searching for something else.',
  'Ingen lagrede steder ennå': 'No saved places yet',
  'Trykk på hjertet ved et sted for å lagre det. Lagrede steder ligger bare på denne enheten.': 'Tap the heart on a place to save it. Saved places are only stored on this device.',
  'Trykk på hjertet på et sted for å lagre det her.': 'Tap the heart on a place to save it here.',
  'Fant ikke dataene': 'Could not load the data', 'Prøv å laste siden på nytt.': 'Try reloading the page.',
  'Kartet venter på data': 'The map is waiting for data',
  'Appen fikk ikke lastet {f}. Prøv å laste siden på nytt. Hjelper ikke det, står feilen i nettleserkonsollen.': 'The app could not load {f}. Try reloading the page. If that does not help, the error is shown in the browser console.',
  // status og filtre
  'Verifisert halal': 'Verified halal', 'Delvis halal': 'Partly halal', 'Uavklart': 'Unconfirmed', 'Verifisert': 'Verified', 'Delvis': 'Partly',
  'Halal-status': 'Halal status', 'Kun verifisert': 'Verified only', '+ delvis': '+ partly', '+ uavklart': '+ unconfirmed', '+ Delvis': '+ Partly', 'Alle': 'All',
  'Bare steder vi har bekreftet som helt halal.': 'Only places we have confirmed as fully halal.',
  'Også steder der bare deler av menyen er halal.': 'Also places where only part of the menu is halal.',
  'Alt vi kjenner til, også steder vi ikke har rukket å sjekke ennå.': 'Everything we know of, including places we have not checked yet.',
  'Et eget utvalg av statuser.': 'A custom selection of statuses.', '{s}, {n} steder': '{s}, {n} places',
  'Åpent nå': 'Open now', 'Skjul steder som er stengt': 'Hide places that are closed', 'Kjøkken': 'Cuisine', 'Pris': 'Price', 'Område': 'Area',
  'Alkohol': 'Alcohol', 'Rimelig': 'Inexpensive', 'Middels': 'Moderate', 'Dyrere': 'Pricier', 'Ingen kjent': 'None known', 'Serverer': 'Serves',
  '«Ingen kjent» betyr at vi ikke vet om stedet serverer alkohol.': '“None known” means we do not know whether the place serves alcohol.',
  'Sortering': 'Sorting', 'Standard': 'Default', 'A–Å': 'A–Z', 'Vis færre': 'Show fewer', 'Vis alle {n}': 'Show all {n}',
  'Ingen steder passer': 'No places match', 'Vis alle {n} steder': 'Show all {n} places', 'Vis {n} steder': 'Show {n} places', 'Vis 1 sted': 'Show 1 place',
  'Fjern filteret {t}': 'Remove filter {t}', '{t}, åpner filtrene': '{t}, opens filters', '{n} filtre': '{n} filters',
  'kun verifisert': 'verified only', 'uten uavklarte': 'without unconfirmed', 'utvalgte statuser': 'selected statuses',
  'serverer alkohol': 'serves alcohol', 'uten kjent alkohol': 'no known alcohol', 'åpent nå': 'open now', 'stenger snart': 'closing soon', 'stengt': 'closed',
  'Filtrer på område': 'Filter by area', 'Alle områder': 'All areas', 'Filtrer på kjøkken': 'Filter by cuisine', 'Alle kjøkken': 'All cuisines',
  'Filtrer på prisnivå': 'Filter by price', 'Alle priser': 'All prices', '$ · Rimelig': '$ · Inexpensive', '$$ · Middels': '$$ · Moderate', '$$$ · Dyrere': '$$$ · Pricier',
  'Filtrer på åpningstid': 'Filter by opening hours', 'Alle åpningstider': 'Any opening hours', 'Stenger snart': 'Closing soon', 'Stengt': 'Closed',
  'Filtrer på alkoholservering': 'Filter by alcohol', 'Alkohol: alle steder': 'Alcohol: all places', 'Halal mat, serverer alkohol': 'Halal food, serves alcohol',
  'Ingen kjent alkoholservering': 'No known alcohol', 'Sorter etter': 'Sort by', 'Nærmest meg': 'Nearest me',
  // steder og tider
  'til {t}': 'until {t}', 'åpner {t}': 'opens {t}', 'Åpent til {t}': 'Open until {t}', 'Stenger {t}': 'Closes {t}', 'Stengt, åpner {t}': 'Closed, opens {t}',
  'kl {t}': 'at {t}', '– kl. {t}': '– {t}', '– åpner kl. {t}': '– opens {t}', 'Åpner kl. {t}': 'Opens {t}', 'Åpent nå – kl. {t}': 'Open now – {t}',
  'Stenger snart – kl. {t}': 'Closing soon – {t}', 'Stengt – åpner kl. {t}': 'Closed – opens {t}', 'Cuisine': 'Cuisine',
  'Bare steder vi selv har sjekket.': 'Only places we have checked ourselves.',
  'Steder vi har sjekket, og steder der deler av menyen er halal.': 'Places we have checked, and places where part of the menu is halal.',
  'Vis 1 verifisert sted': 'Show 1 verified place', 'Vis {n} verifiserte steder': 'Show {n} verified places', 'kl. {t}': 'at {t}', 'til kl. {t}': 'until {t}', 'kl. {a} – kl. {b}': '{a} – {b}', 'Stenger kl. {t}': 'Closes {t}', 'Filter': 'Filters', 'Midlertidig stengt': 'Temporarily closed', 'Stengt nå': 'Closed now', 'Åpningstid ukjent': 'Opening hours unknown',
  'Alle åpningstider for {navn}, i kart-appen': 'All opening hours for {navn}, in the maps app', 'Alle tider': 'All hours',
  'Veibeskrivelse': 'Directions', 'Se stedet': 'View place', 'Se hele siden': 'View full page', 'Ring': 'Call', 'Nett': 'Website',
  'Fjern {navn} fra Lagret': 'Remove {navn} from Saved', 'Lagre {navn}': 'Save {navn}', 'Lagre': 'Save',
  'Kunne ikke lagre på denne enheten': 'Could not save on this device', 'Fjernet fra Lagret': 'Removed from Saved', 'Lagret på denne enheten': 'Saved on this device',
  'Vi har ikke skrevet ned hvordan statusen er bekreftet ennå.': 'We have not yet written down how the status was confirmed.',
  'Ikke bekreftet med dato': 'Not confirmed with a date', 'Sist bekreftet {d}': 'Last confirmed {d}', ', over et halvår siden': ', more than six months ago',
  'Ukjent': 'Unknown', 'Adresse': 'Address', 'I dag': 'Today', 'Telefon': 'Phone', 'Serveres': 'Served', 'Ingen kjent servering': 'None known',
  'Tilbake': 'Back', 'Del {navn}': 'Share {navn}', 'Om halal-statusen': 'About the halal status',
  'Halalkartet sertifiserer ikke selv.': 'Halalkartet does not certify places itself.', 'Hva betyr statusene?': 'What do the statuses mean?',
  'Åpne i kart-appen': 'Open in maps app', 'Ser du noe som er feil?': 'Something wrong?', 'Si ifra, så sjekker vi stedet på nytt.': 'Let us know, and we will check the place again.',
  'Si ifra': 'Report', 'Om {navn}: ': 'About {navn}: ',
  'Lenke kopiert': 'Link copied', 'Kunne ikke kopiere lenken': 'Could not copy the link', 'Kopier lenken fra adressefeltet': 'Copy the link from the address bar',
  'Nettleseren din støtter ikke posisjon.': 'Your browser does not support location.',
  'Fant ikke posisjonen din. Sjekk at nettleseren har tilgang til posisjon.': 'Could not find your location. Check that the browser has access to location.',
  // skjemaene
  'Tips oss om en restaurant': 'Suggest a restaurant', 'Kjenner du et sted?': 'Know a place?',
  'Vi er i startfasen og bygger kartet sammen med dere. Tips oss om en restaurant du mener er halal, så sjekker vi den.': 'We are just getting started and are building the map together with you. Tell us about a restaurant you believe is halal, and we will check it.',
  'Restaurantens navn': 'Name of the restaurant', 'påkrevd': 'required', 'frivillig': 'optional', 'Adresse eller by/bydel': 'Address or city/area',
  'F.eks. Oslo, Bergen, Trondheim eller Storgata 17': 'E.g. Oslo, Bergen, Trondheim or Storgata 17', 'Hva vet du om stedet?': 'What do you know about the place?',
  'Velg ett': 'Choose one', 'Helt halal': 'Fully halal', 'Halal mat, men serverer alkohol som drikke': 'Halal food, but serves alcoholic drinks',
  'Delvis halal – deler av menyen er ikke halal': 'Partly halal – parts of the menu are not halal', 'Serverer svinekjøtt': 'Serves pork',
  'Usikker – vil gjerne at dere sjekker': 'Not sure – please check', 'Hvordan vet du det?': 'How do you know?',
  'Sertifikat i lokalet, personalet har sagt det, eller du spiser der ofte …': 'A certificate on the wall, the staff told you, or you eat there often …',
  'Telefon eller e-post': 'Phone or email', 'Takk. Vi ser på stedet og legger det inn når vi har sjekket det.': 'Thank you. We will look into the place and add it once we have checked it.',
  'Send oss helst ikke steder som ikke har noe halal på menyen, eller rene vegetar- og veganrestauranter.': 'Please do not send us places with nothing halal on the menu, or purely vegetarian and vegan restaurants.',
  'Send inn tips': 'Send tip', 'Send inn': 'Send', 'Navn': 'Name', 'Hvor kommer du fra? By eller bydel': 'Where are you from? City or area', 'Meldingen din': 'Your message',
  'Har du et tips om et sted, funnet en feil, eller vil du bare si hva du synes, så hører vi gjerne fra deg. Fyll ut skjemaet under.': 'Do you have a tip about a place, found an error, or just want to tell us what you think? We would love to hear from you. Fill in the form below.',
  'Navn og hvor du kommer fra er frivillig, men det hjelper oss mye. Skriver du inn telefon eller e-post, kan vi komme tilbake til deg.': 'Name and where you are from are optional, but they help us a lot. If you leave a phone number or email, we can get back to you.',
  'Ser du noe som er feil på et sted? Skriv hvilket sted det gjelder og hva som er feil, så sjekker vi det.': 'Is something wrong about a place? Tell us which place and what is wrong, and we will check it.',
  'Skriv en gyldig e-post (med én @ og et punktum) eller et telefonnummer, eller la feltet stå tomt.': 'Enter a valid email (with one @ and a dot) or a phone number, or leave the field empty.',
  'Takk for at du sier fra. Meldingen din er sendt, og vi svarer så snart vi kan.': 'Thank you for letting us know. Your message has been sent, and we will reply as soon as we can.',
  'Støtt Halalkartet': 'Support Halalkartet', 'Støtt oss': 'Support us', 'Åpent – kl. {t}': 'Open – {t}', 'Velg beløp': 'Choose amount', 'Gi {b} kr med Vipps': 'Give {b} kr with Vipps',
  'Vipps er ikke koblet til ennå. Vi sier fra her når det er klart.': 'Vipps is not connected yet. We will say so here when it is ready.',
  'Sender': 'Sending', 'Vi får dessverre ikke tatt imot skjemaer akkurat nå. Teksten din står igjen.': 'Unfortunately we cannot receive forms right now. Your text is still here.',
  'Beklager, noe gikk galt. Prøv igjen om litt.': 'Sorry, something went wrong. Please try again shortly.',
  'Halalkartet · Finn halal mat i Oslo': 'Halalkartet · Find halal food in Oslo',
  // kjøkken
  'Arabisk': 'Arabic', 'Asiatisk': 'Asian', 'Bakeri': 'Bakery', 'Balkansk': 'Balkan', 'Dessert': 'Dessert', 'Falafel': 'Falafel', 'Gresk': 'Greek',
  'Grill': 'Grill', 'Hamburger': 'Burgers', 'Hurtigmat': 'Fast food', 'Indisk': 'Indian', 'Kafé': 'Café', 'Kebab': 'Kebab', 'Koreansk': 'Korean',
  'Kylling': 'Chicken', 'Libanesisk': 'Lebanese', 'Marokkansk': 'Moroccan', 'Meksikansk': 'Mexican', 'Middelhavsk': 'Mediterranean',
  'Midtøsten': 'Middle Eastern', 'Pakistansk': 'Pakistani', 'Pizza': 'Pizza', 'Punjabi': 'Punjabi', 'Restaurant': 'Restaurant', 'Sushi': 'Sushi',
  'Syrisk': 'Syrian', 'Takeaway': 'Takeaway', 'Thai': 'Thai', 'Tyrkisk': 'Turkish', 'Usbekisk': 'Uzbek', 'Vegansk': 'Vegan', 'Østafrikansk': 'East African',
  // hvordan statusen er bekreftet
  'Registrert som helt halal.': 'Registered as fully halal.', 'Halal-status er ikke bekreftet ennå.': 'Halal status not confirmed yet.',
  'Menyen er halal, men stedet serverer også svin.': 'The menu is halal, but the place also serves pork.', 'Deler av menyen er ikke halal.': 'Parts of the menu are not halal.',
  'Alt unntatt én rett er halal.': 'Everything except one dish is halal.', 'Alt er halal bortsett fra and og reinsdyr.': 'Everything is halal except duck and reindeer.',
  'Kun kylling og biff er halal.': 'Only chicken and beef are halal.', 'Halal-retter finnes, men spør i disken.': 'Halal dishes are available, but ask at the counter.',
  'Registrert som helt halal mat. Serverer alkoholholdig drikke.': 'Registered as fully halal food. Serves alcoholic drinks.',
  'Kun burgerne er halal.': 'Only the burgers are halal.', 'Må sjekkes – uavklart inntil videre.': 'Needs checking – unconfirmed for now.',
  'Alt er halal bortsett fra svinerettene.': 'Everything is halal except the pork dishes.',
  // beskrivelser
  'Klassisk indisk mat i flotte omgivelser.': 'Classic Indian food in lovely surroundings.', 'Restaurant med tradisjonell indisk mat.': 'Restaurant serving traditional Indian food.',
  'Indisk restaurant med tradisjonell mat.': 'Indian restaurant with traditional food.', 'Jemenittisk restaurant (mandi).': 'Yemeni restaurant (mandi).',
  'Stilig sted med vin og indiske retter.': 'Stylish place with wine and Indian dishes.', 'Klassisk thaimat i uformelle omgivelser.': 'Classic Thai food in a casual setting.',
  'Uformelt sted for indiske spesialiteter.': 'Casual place for Indian specialities.', 'Elegant restaurant for biff og vin.': 'Elegant restaurant for steak and wine.',
  'Trendy matområde med global mat og DJ-er.': 'Trendy food hall with global food and DJs.', 'Restaurant med tradisjonell koreansk mat.': 'Restaurant serving traditional Korean food.',
  'Restaurant med nordindiske spesialiteter.': 'Restaurant with North Indian specialities.'
};
// tekster med markup, slått opp med en egen nøkkel
const ENGELSK_HTML = {
  tipsLead: 'We would most like places in <strong>Oslo, Bergen, Trondheim and Stavanger</strong>. That is where most people look.'
};
function T(nb, verdier) {
  let s = nb;
  if (sprak === 'en') {
    if (ENGELSK[nb] !== undefined) s = ENGELSK[nb]; else MANGLER.add(nb);
  }
  return verdier ? s.replace(/\{(\w+)\}/g, function (m, k) { return verdier[k]; }) : s;
}
// openState lager norske etiketter som også sammenlignes i koden; de oversettes først når de vises
function visTid(t) {
  if (sprak !== 'en' || !t) return t;
  const m = /^(Stenger|Åpner) kl (\d{2})(?::(\d{2}))?$/.exec(t);
  if (m) return (m[1] === 'Stenger' ? 'Closes ' : 'Opens ') + m[2] + ':' + (m[3] || '00');
  return T(t);
}

// Teksten til et valg i de skjulte filterlistene. Områder er stedsnavn og står som de er.
function valgtTekst(x, o) {
  o = o || x.options[x.selectedIndex];
  return x.id === 'fBydel' ? o.text : T(o.text);
}
const GLOBUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z"/></svg>';
// Knappen viser språket du bytter til, og navnet står på det språket
function sprakknapp(kls, attr) {
  const til = sprak === 'en' ? { kort: 'NO', lang: 'no', navn: 'Bytt til norsk' } : { kort: 'EN', lang: 'en', navn: 'Switch to English' };
  return '<button type="button" class="' + kls + '" ' + attr + ' lang="' + til.lang + '">' + GLOBUS + '<span>' + til.kort + '</span><span class="vh">, ' + til.navn + '</span></button>';
}

// Faste tekster i index.html: data-t er teksten, data-ta lister attributter, data-th slår opp markup,
// og data-sprak="nb"/"en" er hele blokker som byttes ut (de lange infosidene)
function oversettStatisk() {
  const en = sprak === 'en';
  document.documentElement.lang = en ? 'en' : 'no';
  document.title = T('Halalkartet · Finn halal mat i Oslo');
  document.querySelectorAll('[data-t]').forEach(function (x) {
    if (x.dataset.nb === undefined) x.dataset.nb = x.textContent;
    // data-t="nøkkel" gir en egen oversettelse når samme norske ord trenger kortere engelsk
    x.textContent = en ? T(x.dataset.t || x.dataset.nb) : x.dataset.nb;
  });
  document.querySelectorAll('[data-ta]').forEach(function (x) {
    x.dataset.ta.split(',').forEach(function (a) {
      const k = 'nb' + a.replace(/(^|-)([a-z])/g, function (m, s, c) { return c.toUpperCase(); });
      if (x.dataset[k] === undefined) x.dataset[k] = x.getAttribute(a) || '';
      x.setAttribute(a, T(x.dataset[k]));
    });
  });
  document.querySelectorAll('[data-th]').forEach(function (x) {
    if (x.dataset.nbHtml === undefined) x.dataset.nbHtml = x.innerHTML;
    x.innerHTML = en && ENGELSK_HTML[x.dataset.th] ? ENGELSK_HTML[x.dataset.th] : x.dataset.nbHtml;
  });
  document.querySelectorAll('[data-sprak]').forEach(function (x) { x.hidden = x.dataset.sprak !== (en ? 'en' : 'nb'); });
  const sprakFane = el('faneSprak');
  if (sprakFane) sprakFane.outerHTML = sprakknapp('fane-sprak', 'data-fane="sprak" id="faneSprak"');
}

function byttSprak() {
  sprak = sprak === 'en' ? 'nb' : 'en';
  try { localStorage.setItem(SPRAK_NOKKEL, sprak); } catch (e) {}
  track('sprak', { sprak: sprak });
  const fokusFane = document.activeElement && document.activeElement.id === 'faneSprak';
  oversettStatisk();
  plasserSok();
  if (el('kontaktTittel')) showInfo(el('kontaktTittel').dataset.feil === 'ja' ? 'feil' : document.querySelector('.info-section.active').dataset.section);
  render();
  if (!el('detalj').hidden && detaljId && byId(detaljId)) {
    if (detaljKart) { detaljKart.remove(); detaljKart = null; }
    el('detalj').innerHTML = detaljHtml(byId(detaljId));
    tegnDetaljKart(byId(detaljId));
  }
  if (fokusFane) el('faneSprak').focus({ preventScroll: true });
}

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
// Å lage en ny formatterer for hvert sted tok over et halvt sekund på en treg telefon.
// Nå finnes det én, og svaret gjenbrukes i ett sekund.
const OSLO_TID = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Oslo', hour12: false,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit'
});
let osloSist = 0, osloSvar = null;
function osloNow() {
  const naa = Date.now();
  if (osloSvar && naa - osloSist < 1000 && naa >= osloSist) return osloSvar;
  const p = {};
  OSLO_TID.formatToParts(new Date(naa)).forEach(function (x) { p[x.type] = x.value; });
  osloSist = naa;
  osloSvar = { y: +p.year, m: +p.month, d: +p.day, min: (+p.hour % 24) * 60 + (+p.minute) };
  return osloSvar;
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

const map = L.map('map', { zoomControl: false, scrollWheelZoom: true, maxZoom: 20 }).setView([59.9139, 10.7522], 13.5);
L.control.zoom({ position: 'topright' }).addTo(map);

// Kartlag
// Bakgrunnskartet er vektorfliser fra OpenFreeMap: gratis, uten nøkkel og uten grense.
// MapLibre tegner dem og hentes først når pinnene står, så siden ikke venter på det.
// Lastes ikke MapLibre eller stilen, brukes OpenStreetMaps egne fliser i stedet.
const KART_STIL = 'https://tiles.openfreemap.org/styles/positron';
const MAPLIBRE = [
  ['link', 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.css', 'sha384-uTttxo/aOKbdE5RlD/SPzSDoDmNvGlUYPjONi2MN/b7c9HPSvW07OIuyP7uL6jxK'],
  ['script', 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js', 'sha384-5+cfbwT0iiub6VsQAdn6yz16nr6sDiQoHx6tm4O8OVYXHYOxcffFmCJBL0dgdvGp'],
  ['script', 'https://cdn.jsdelivr.net/npm/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js', 'sha384-tXYNKOHx4T02jMP7YYCtBxPIv1B5gaA5mcVPBzqMp6d7VzWzxJgI2aWF/nJLrQdS']
];
const KART_KILDE = '<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const RESERVE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const RESERVE_KILDE = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
// Varme farger i stedet for Positrons kalde grå. Bakgrunnen er den samme som #map har mens kartet lastes.
const KART_FARGER = {
  'background': ['background-color', '#EAE4D6'],
  'landuse_residential': ['fill-color', '#E5DFD1'],
  'building': ['fill-color', '#DFD8CA'],
  'park': ['fill-color', '#DCE3D0'],
  'landcover_wood': ['fill-color', '#D3DCC6'],
  'water': ['fill-color', '#C3D5DB'],
  'waterway': ['line-color', '#C3D5DB'],
  'road_area_pier': ['fill-color', '#EAE4D6'],
  'road_pier': ['line-color', '#EAE4D6']
};

let maplibreLastes = null;
function lastMaplibre() {
  if (!maplibreLastes) maplibreLastes = MAPLIBRE.reduce(function (forrige, [tag, url, sri]) {
    return forrige.then(function () {
      return new Promise(function (ok, feil) {
        const e = document.createElement(tag);
        if (tag === 'link') { e.rel = 'stylesheet'; e.href = url; } else e.src = url;
        e.integrity = sri; e.crossOrigin = 'anonymous';
        // stilarket trengs ikke for å tegne, så vi venter bare på skriptene
        if (tag === 'link') ok(); else { e.onload = ok; e.onerror = feil; }
        document.head.appendChild(e);
      });
    });
  }, Promise.resolve()).then(function () { if (!window.maplibregl || !L.maplibreGL) throw new Error('MapLibre mangler'); });
  return maplibreLastes;
}
// Varme farger, og stedsnavn på norsk der Positron ville vist de engelske
function fargelegg(gl) {
  Object.entries(KART_FARGER).forEach(function ([lag, [egenskap, farge]]) { if (gl.getLayer(lag)) gl.setPaintProperty(lag, egenskap, farge); });
  gl.getStyle().layers.forEach(function (l) {
    if (l.type === 'symbol' && /name_en/.test(JSON.stringify(gl.getLayoutProperty(l.id, 'text-field') || '')))
      gl.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name'], ['get', 'name:latin']]);
  });
}
function leggTilBakgrunn(kart) {
  const reserve = function () {
    if (kart.getContainer().isConnected) L.tileLayer(RESERVE_URL, { attribution: RESERVE_KILDE, maxZoom: 19 }).addTo(kart);
  };
  lastMaplibre().then(function () {
    if (!kart.getContainer().isConnected) return;
    let lag, klar = false;
    const gaOver = function () { if (klar) return; klar = true; clearTimeout(vakt); if (lag) kart.removeLayer(lag); reserve(); };
    const vakt = setTimeout(gaOver, 10000);
    try {
      lag = L.maplibreGL({ style: KART_STIL, attributionControl: { customAttribution: KART_KILDE } }).addTo(kart);
    } catch (e) { lag = null; gaOver(); return; }
    const gl = lag.getMaplibreMap();
    gl.once('style.load', function () { if (klar) return; klar = true; clearTimeout(vakt); fargelegg(gl); });
    gl.on('error', function () { if (!klar) gaOver(); });
  }).catch(reserve);
}
leggTilBakgrunn(map);
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
    // rund mørkegrønn sirkel med gullkant og tallet inni, uten bestikk
    return L.divIcon({ className: '', iconSize: [50, 50], iconAnchor: [25, 25],
      html: '<div class="rklynge' + (n >= 10 ? ' stor' : '') + '"><span>' + n + '</span></div>' });
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
    note: 'Bare steder vi selv har sjekket.' },
  { label: '+ delvis',       tillat: ['verifisert', 'delvis'],
    note: 'Steder vi har sjekket, og steder der deler av menyen er halal.' },
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
    const res = await fetch('spots.json', { cache: 'no-cache' });
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
  el('bunnTekst').textContent = T('Fant ikke dataene');
  const overlay = document.createElement('div');
  overlay.className = 'map-overlay';
  overlay.innerHTML =
    '<div class="box"><h2>' + T('Kartet venter på data') + '</h2>' +
    '<p>' + T('Appen fikk ikke lastet {f}. Prøv å laste siden på nytt. Hjelper ikke det, står feilen i nettleserkonsollen.', { f: '<code>spots.json</code>' }) + '</p>' +
    '<p>Utvikler du lokalt, husk at filen må serveres over http. Nettlesere blokkerer henting av lokale filer:</p>' +
    '<p><code>python3 -m http.server</code></p>' +
    '<p>Gå så til <code>http://localhost:8000</code>.</p></div>';
  el('map').appendChild(overlay);
  if (el('pcListeInnhold')) el('pcListeInnhold').innerHTML = '<div class="pc-tom"><b>' + T('Fant ikke dataene') + '</b>' + T('Prøv å laste siden på nytt.') + '</div>';
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

  ['search', 'fBydel', 'fCuisine', 'fPrice', 'fOpen', 'fSort'].forEach(id => {
    const x = el(id);
    if (x) x.addEventListener('input', render);
  });
  ['fBydel', 'fCuisine', 'fPrice', 'fOpen'].forEach(function (id) {
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
  if (el('fSort')) el('fSort').addEventListener('change', () => {
    const v = el('fSort').value;
    if (v) track('sortering', { modus: v });
    if (v === 'avstand' && !userLoc) locateUser();
  });
  oversettStatisk();
  document.addEventListener('touchstart', function () {}, { passive: true });
  wireMobilskall();
  wirePc();
  wireMobil();
  wireTipsHint();
  wireNearMe();
  wireInfo();
  wireContactForm();
  wireStott();
  wireTipsForm();
  merkSkjemaUtenMottak();
  wirePopupActions();
  wireShortcuts();
  wireSheets();
  render();
  applyHash();
  window.addEventListener('hashchange', function () { if (location.hash.slice(1) !== encodeURIComponent(activeId || '')) applyHash(); });


  setInterval(refreshOpenStates, 60000);
}

// Nullstill tar alt tilbake til start uten å laste siden på nytt; kartet blir stående der det er
function nullstill() {
  el('search').value = '';
  FILTERFELT.concat('fSort').forEach(function (id) { el(id).value = ''; });
  pcGruppe = true; el('pcSort').value = 'bydel';
  pcVisLagret = false; pcApen = null;
  Object.keys(kjedeApen).forEach(function (k) { delete kjedeApen[k]; });
  faVisAlle = { kjokken: false, omrade: false };
  strict = 2; applyStrict();
  if (activeId) setActive(null);
  render();
  if (el('pcListeInnhold')) el('pcListeInnhold').scrollTop = 0;
  if (el('listeKort')) el('liste').scrollTop = 0;
  track('nullstill');
  el('search').focus();
}

const BESTIKK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v8M4.5 3v5a2.5 2.5 0 005 0V3M7 11v10"/><path d="M17 21V3c-2.2 1.2-3.5 3.8-3.5 7.5 0 1.8 1 3 3.5 3"/></svg>';
// merket i hjørnet: حلال for verifisert, ! og ? for de andre
const PINMERKE = { verifisert: 'حلال', delvis: '!', uavklart: '?' };

// Rund pinne med kniv og gaffel og et lite merke i hjørnet, på mobil og PC. Valgt sted blir større, med gullkant og navnet under.
function makeIcon(status, stor, navn) {
  const st = STATUS[status];
  return L.divIcon({
    className: '', iconSize: stor ? [50, 58] : [34, 40], iconAnchor: stor ? [25, 57] : [17, 39],
    html: '<div class="rpin ' + st.pin + (stor ? ' stor' : '') + '" data-s="' + status + '">' +
      '<span class="rpin-sirkel">' + BESTIKK + '</span>' +
      '<span class="rpin-merke" aria-hidden="true">' + PINMERKE[status] + '</span></div>' +
      (stor && navn ? '<span class="rpin-navn">' + esc(navn) + '</span>' : '')
  });
}
// Minikartet på stedssiden: en gullprikk med mørk ring
const STEDSPRIKK = L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: '<div class="d-punkt"></div>' });

const MND = ['januar','februar','mars','april','mai','juni',
             'juli','august','september','oktober','november','desember'];
const MND_EN = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
function fmtDato(iso) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!d) return '';
  return sprak === 'en' ? (+d[3]) + ' ' + MND_EN[+d[2] - 1] + ' ' + d[1] : (+d[3]) + '. ' + MND[+d[2] - 1] + ' ' + d[1];
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
    sort: el('fSort') ? el('fSort').value : ''
  };
}
function passes(s, f) {
  if (f.bydel && s.bydel !== f.bydel) return false;
  if (f.cuisine && !s.cuisines.includes(f.cuisine)) return false;
  if (f.price && String(s.price) !== f.price) return false;
  if (f.open === 'naa') { const st = openState(s).state; if (st !== 'open' && st !== 'soon') return false; }
  else if (f.open && openState(s).state !== f.open) return false;
  if (f.q) {
    const raa = s.name + ' ' + s.cuisines.join(' ') + ' ' + s.cuisines.map(function (c) { return ENGELSK[c] || ''; }).join(' ') + ' ' + s.bydel + ' ' + (s.address || '');
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

  // det valgte stedet står utenfor klyngene, så det alltid synes.
  // Bare pinnene som endrer seg flyttes; å tømme og fylle alle klyngene på nytt var tregt.
  const inn = [], ut = [];
  HALAL_SPOTS.forEach(function (s) {
    const m = markers[s.id], skal = shown.has(s.id) && layerOn[s.halalStatus] && s.id !== activeId, er = klynge.hasLayer(m);
    if (skal && !er) inn.push(m); else if (!skal && er) ut.push(m);
  });
  if (ut.length) klynge.removeLayers(ut);
  if (inn.length) klynge.addLayers(inn);

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
  el('search').placeholder = erMobil() ? T('Søk') : T('Hva har du lyst på? Søk sted, kjøkken eller adresse');
  el('search').setAttribute('aria-label', T('Søk'));
  const t = el('toppfelt');
  if (t && erMobil()) document.documentElement.style.setProperty('--toppfelt-h', Math.round(t.getBoundingClientRect().height + 6) + 'px');
}

// Kjøkken heter «Cuisine», også på norsk
const kjokkenOrd = () => 'Cuisine';

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
  brikke(IKON.klokke + esc(T('Åpent nå')), { hurtig: 'apent', trykket: apent, klikk: function () {
    el('fOpen').value = apent ? '' : 'naa'; track('hurtigfilter', { filter: 'apent' }); render(); foelgFilter();
  } });
  brikke(IKON.hake + esc(T('Kun verifisert')), { hurtig: 'verifisert', trykket: strict === 0, klikk: function () {
    strict = strict === 0 ? 2 : 0; applyStrict(); track('hurtigfilter', { filter: 'kun_verifisert' }); render();
  } });
  const felt = [['fCuisine', kjokkenOrd(), 'kjokken'], ['fPrice', 'Pris', 'pris'], ['fBydel', 'Område', 'omrade']];
  felt.filter(function (d) { return el(d[0]).value; }).concat(felt.filter(function (d) { return !el(d[0]).value; }))
    .forEach(function (d) {
      const x = el(d[0]);
      if (x.value) {
        const tekst = valgtTekst(x);
        brikke(esc(tekst) + IKON.x, { hurtig: d[2], satt: true, etikett: T('Fjern filteret {t}', { t: tekst }), klikk: function () {
          x.value = ''; track('filter_fjernet', { filter: d[0] }); render();
        } });
      } else {
        brikke(esc(T(d[1])) + IKON.pil, { hurtig: d[2], etikett: T('{t}, åpner filtrene', { t: T(d[1]) }), klikk: function () { apneFilterark(d[2]); } });
      }
    });
  rad.scrollLeft = scroll;
}

function filterTekst() {
  const deler = [];
  const sok = el('search').value.trim();
  if (sok) deler.push('«' + sok + '»');
  if (el('fOpen').value) deler.push(valgtTekst(el('fOpen')).toLowerCase());
  if (!alleStatuser()) deler.push(T(strict === 0 ? 'kun verifisert' : strict === 1 ? 'uten uavklarte' : 'utvalgte statuser'));
  if (el('fCuisine').value) deler.push(sprak === 'en' ? T(el('fCuisine').value) : el('fCuisine').value.toLowerCase());
  if (el('fBydel').value) deler.push(el('fBydel').value);
  if (el('fPrice').value) deler.push('$'.repeat(+el('fPrice').value));
  if (!deler.length) return '';
  return ' · ' + (deler.length === 1 ? deler[0] : T('{n} filtre', { n: deler.length }));
}

function oppdaterSkall() {
  const f = currentFilters();
  const n = HALAL_SPOTS.filter(function (s) { return passes(s, f) && layerOn[s.halalStatus]; }).length;
  el('bunnTall').textContent = n;
  el('bunnTekst').textContent = n < HALAL_SPOTS.length
    ? T('av {n} steder', { n: HALAL_SPOTS.length }) + filterTekst() : T(n === 1 ? 'sted' : 'steder');
  tegnBunnHode();
  const a = antallAktive(), t = el('filterTeller');
  if (t) { t.hidden = !a; t.textContent = a; }
  if (el('filterknapp')) el('filterknapp').setAttribute('aria-label', a ? T('Åpne filtrene, {n} på', { n: a }) : T('Åpne filtrene'));
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
    return '<div class="segment" role="radiogroup" aria-label="' + esc(T(navn)) + '">' + valg.map(function (v) {
      return '<button type="button" role="radio" aria-checked="' + (v[0] === aktiv) + '" data-v="' + esc(v[0]) + '" data-seg="' + klikk + '">' + esc(T(v[1])) + '</button>';
    }).join('') + '</div>';
  };
  const brikker = function (id, del, verdier, antall) {
    const valgt = el(id).value;
    const vis = faVisAlle[del] ? verdier : verdier.slice(0, antall);
    if (valgt && vis.indexOf(valgt) < 0) vis.push(valgt);
    return '<div class="fa-brikker">' + vis.map(function (v) {
      return '<button type="button" aria-pressed="' + (v === valgt) + '" data-velg="' + id + '" data-v="' + esc(v) + '">' + esc(id === 'fCuisine' ? T(v) : v) + '</button>';
    }).join('') + (verdier.length > antall ? '<button type="button" class="fa-flere" data-flere="' + del + '">' +
      (faVisAlle[del] ? T('Vis færre') : T('Vis alle {n}', { n: verdier.length })) + '</button>' : '') + '</div>';
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
    '<section class="fa-del" data-del="status"><h3>' + T('Halal-status') + '</h3>' +
      segment('Halal-status', [['0', 'Verifisert'], ['1', '+ Delvis'], ['2', 'Alle']], String(strict), 'strict') +
      '<p class="fa-note">' + esc(T(strict >= 0 ? STRICT_STEPS[strict].note : 'Et eget utvalg av statuser.')) + '</p></section>' +
    '<section class="fa-del" data-del="apent"><div class="fa-rad"><div><h3>' + T('Åpent nå') + '</h3>' +
      '<p>' + T('Skjul steder som er stengt') + '</p></div>' +
      '<button type="button" class="bryter" role="switch" aria-label="' + T('Åpent nå') + '" aria-checked="' + (el('fOpen').value === 'naa') + '" data-bryter="apent"></button></div></section>' +
    '<section class="fa-del" data-del="kjokken"><h3>' + T(kjokkenOrd()) + '</h3>' + brikker('fCuisine', 'kjokken', telling('cuisines'), 6) + '</section>' +
    '<section class="fa-del" data-del="omrade"><h3>' + T('Område') + '</h3>' + brikker('fBydel', 'omrade', telling('bydel'), 8) + '</section>' +
    '<section class="fa-del" data-del="pris"><h3>' + T('Pris') + '</h3><div class="fa-pris">' + ['1', '2', '3'].map(function (v) {
      return '<button type="button" aria-pressed="' + (el('fPrice').value === v) + '" data-velg="fPrice" data-v="' + v + '" aria-label="' +
        T(['Rimelig', 'Middels', 'Dyrere'][v - 1]) + '">' + '$'.repeat(+v) + '</button>'; }).join('') + '</div></section>' +
    '<section class="fa-del" data-del="sorter"><h3>' + T('Sortering') + '</h3>' +
      segment('Sortering', [['', 'Standard'], ['avstand', 'Nærmest'], ['navn', 'A–Å'], ['pris', 'Pris']], el('fSort').value, 'fSort') + '</section>';

  k.scrollTop = rull;
  if (nokkel) {
    let ny = null;
    try { ny = k.querySelector(nokkel); } catch (err) {}
    if (ny) ny.focus({ preventScroll: true });
  }

  const a = antallAktive();
  el('faNull').disabled = !a;
  el('faVis').innerHTML = '<span>' + (!antall ? T('Ingen steder passer')
    : strict === 0 ? (antall === 1 ? T('Vis 1 verifisert sted') : T('Vis {n} verifiserte steder', { n: antall }))
    : antall === HALAL_SPOTS.length ? T('Vis alle {n} steder', { n: antall })
    : antall === 1 ? T('Vis 1 sted') : T('Vis {n} steder', { n: antall })) + '</span>' + (antall ? IKON2.pil : '');
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
let detaljFra = null, detaljKart = null, merFra = null, detaljId = null;

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
  return '<span class="skjold" data-s="' + esc(s.halalStatus) + '"' + (medTekst ? '' : ' role="img" aria-label="' + T(st.label) + '"') + '>' +
    SKJOLD + '<span class="skjold-tegn" aria-hidden="true">' + st.tegn + '</span></span>' + (medTekst ? '<span class="skjold-tekst">' + T(st.label) + '</span>' : '');
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
function kortTid(s, liste) {
  const t = tidNa(s);
  if (t.state === 'open' || t.state === 'soon') return { cls: t.cls, tekst: T(liste ? 'Stenger kl. {t}' : '– kl. {t}', { t: t.stenger }) };
  if (t.state === 'closed') return { cls: t.cls, tekst: /^Åpner/.test(t.label) && t.apner ? T('Åpner kl. {t}', { t: t.apner }) : visTid(t.label) };
  return null;
}
function apentLinje(s) {
  const st = openState(s);
  const stenger = clockMinutes(s.hours);
  if (st.state === 'open') return { cls: 'os-open', tekst: T('Åpent – kl. {t}', { t: fmtClock(stenger) }) };
  if (st.state === 'soon') return { cls: 'os-soon', tekst: T('Stenger snart – kl. {t}', { t: fmtClock(stenger) }) };
  if (st.state === 'closed') {
    const apner = s.opens ? clockMinutes(s.opens) : null;
    return { cls: 'os-closed', tekst: /^Åpner/.test(st.label) && apner !== null ? T('Stengt – åpner kl. {t}', { t: fmtClock(apner) }) : visTid(st.label) };
  }
  return null;
}
function metaTekst(s, skille) {
  const sk = '<span class="skraa">' + (skille || ' / ') + '</span>';
  const deler = [];
  if (userLoc) deler.push(fmtDist(dist(s)));
  deler.push(s.cuisines.slice(0, 2).map(function (c) { return T(c); }).join(', '), s.bydel);
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
    '" aria-label="' + esc(p ? T('Fjern {navn} fra Lagret', { navn: s.name }) : T('Lagre {navn}', { navn: s.name })) + '">' + IKON2.hjerte + '</button>';
}
function oppdaterHjerte(b) {
  const s = byId(b.dataset.lagre);
  if (!s) return;
  const p = erLagret(s.id);
  b.setAttribute('aria-pressed', String(p));
  if (b.dataset.tekst) b.querySelector('span').textContent = T(p ? 'Lagret' : 'Lagre');
  else b.setAttribute('aria-label', p ? T('Fjern {navn} fra Lagret', { navn: s.name }) : T('Lagre {navn}', { navn: s.name }));
}
function byttLagret(id) {
  const l = lagrede(), i = l.indexOf(id), s = byId(id);
  if (i >= 0) l.splice(i, 1); else l.push(id);
  try { localStorage.setItem(LAGRET_NOKKEL, JSON.stringify(l)); }
  catch (e) { toast(T('Kunne ikke lagre på denne enheten')); return; }
  toast(T(i >= 0 ? 'Fjernet fra Lagret' : 'Lagret på denne enheten'));
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
  const t = kortTid(s, true);
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
  el('listeTall').innerHTML = lagretVis ? T('Lagret') : '<b>' + liste.length + '</b> ' + T(liste.length === 1 ? 'sted' : 'steder');
  el('listeSorter').hidden = lagretVis;
  el('listeSort').value = el('fSort').value;
  if (!liste.length) {
    boks.innerHTML = lagretVis
      ? '<div class="tom"><b>' + T('Ingen lagrede steder ennå') + '</b>' + T('Trykk på hjertet ved et sted for å lagre det. Lagrede steder ligger bare på denne enheten.') + '</div>'
      : '<div class="tom"><b>' + T('Ingen treff') + '</b>' + T('Prøv å fjerne et filter eller søk på noe annet.') + '</div>';
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
  const lapp = m.getElement() && m.getElement().querySelector('.rpin-navn');
  const halv = Math.max(60, lapp ? lapp.offsetWidth / 2 + 12 : 0);
  // pinnen er 58 px høy, og navnet står under spissen
  const topp = o.topp + 64, bunn = o.bunn - (lapp ? lapp.offsetHeight + 16 : 20);
  let dx = 0, dy = 0;
  if (p.y < topp) dy = p.y - topp; else if (p.y > bunn) dy = p.y - bunn;
  if (p.x < o.venstre + halv) dx = p.x - (o.venstre + halv); else if (p.x > o.hoyre - halv) dx = p.x - (o.hoyre - halv);
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
        '<a class="knapp primar" href="' + esc(ruteUrl(s)) + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' + IKON2.rute + T('Veibeskrivelse') + '</a>' +
        '<button type="button" class="knapp" data-detalj="' + esc(s.id) + '">' + T('Se stedet') + '</button>' +
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
  el('visListe').innerHTML = (valgt ? T('Alle {n} steder', { n: el('bunnTall').textContent }) : T('Vis liste')) + IKON2.pil;
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
  if (t.state === 'open') { hoved = T('Åpent nå'); rest = T('– kl. {t}', { t: t.stenger }); }
  else if (t.state === 'soon') { hoved = T('Stenger snart'); rest = T('– kl. {t}', { t: t.stenger }); }
  else if (t.state === 'closed') { hoved = T(t.label === 'Midlertidig stengt' ? t.label : 'Stengt'); rest = /^Åpner/.test(t.label) && t.apner ? T('– åpner kl. {t}', { t: t.apner }) : ''; }
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
    '<a class="dknapp primar" href="' + esc(ruteUrl(s)) + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' + IKON2.rute + '<span>' + T('Veibeskrivelse') + '</span></a>',
    tel ? '<a class="dknapp" href="tel:' + esc(tel) + '">' + IKON2.telefon + '<span>' + T('Ring') + '</span></a>' : '',
    site ? '<a class="dknapp" href="' + esc(site) + '" target="_blank" rel="noopener">' + IKON2.globus + '<span>' + T('Nett') + '</span></a>' : ''
  ].filter(Boolean);

  const liste = Array.isArray(s.verification) ? s.verification : (s.verification ? [{ tekst: s.verification }] : []);
  const bevis = liste.map(function (v) {
    return '<p>' + esc(v.tekst ? T(v.tekst) : '') + (v.kilde ? ' <span class="d-kilde">' + esc(v.kilde) + '</span>' : '') + '</p>';
  }).join('') || '<p>' + T('Vi har ikke skrevet ned hvordan statusen er bekreftet ennå.') + '</p>';
  const d = dagerSiden(s.lastVerified);
  const naar = d === null ? T('Ikke bekreftet med dato') : T('Sist bekreftet {d}', { d: fmtDato(s.lastVerified) }) + (d > 180 ? T(', over et halvår siden') : '');

  const stenger = clockMinutes(s.hours), apner = s.opens ? clockMinutes(s.opens) : null;
  const idag = stenger === null ? (s.hours ? visTid(s.hours) : T('Ukjent'))
    : (apner !== null ? T('kl. {a} – kl. {b}', { a: fmtClock(apner), b: fmtClock(stenger) }) : T('Stenger kl. {t}', { t: fmtClock(stenger) }));
  const rad = function (navn, verdi) { return '<div><dt>' + T(navn) + '</dt><dd>' + verdi + '</dd></div>'; };
  const rader = [
    rad('Adresse', adresseLinjer(s)),
    rad('I dag', esc(idag)),
    rad('Alkohol', T(s.alcohol ? 'Serveres' : 'Ingen kjent servering'))
  ];
  if (tel) rader.push(rad('Telefon', '<a href="tel:' + esc(tel) + '">' + esc(s.phone) + '</a>'));

  return '<div class="d-topp">' +
      '<button type="button" class="d-rund" id="detaljTilbake" aria-label="' + T('Tilbake') + '">' + IKON2.tilbake + '</button>' +
      '<span class="d-luft"></span>' +
      '<button type="button" class="d-rund" data-act="del" data-id="' + esc(s.id) + '" aria-label="' + esc(T('Del {navn}', { navn: s.name })) + '">' + IKON2.del + '</button>' +
      hjerte(s, 'd-rund') +
      '<a class="d-merke" href="./" aria-label="' + T('Halalkartet, start på nytt') + '">حلال</a>' +
    '</div>' +
    '<header class="d-hero">' +
      '<p class="d-oy" data-s="' + esc(s.halalStatus) + '">' + skjold(s) + '</p>' +
      '<h2 id="detaljNavn">' + esc(s.name) + '</h2>' +
      '<p class="d-meta">' + metaTekst(s) + '</p>' +
    '</header>' +
    '<div class="d-kropp">' +
      '<div class="d-tidrad">' + (dagensTid(s) || '<p class="d-apent"><span>' + T('Åpningstid ukjent') + '</span></p>') +
        '<a class="d-alletider" href="' + esc(kartAppUrl(s)) + '" target="_blank" rel="noopener" aria-label="' + esc(T('Alle åpningstider for {navn}, i kart-appen', { navn: s.name })) + '">' + T('Alle tider') + '</a></div>' +
      (s.description ? '<p class="d-beskr">' + esc(T(s.description)) + '</p>' : '') +
      '<div class="d-knapper k' + knapper.length + '">' + knapper.join('') + '</div>' +
      '<section class="d-om" aria-labelledby="dOmTittel">' +
        '<div class="d-om-hode"><h3 id="dOmTittel">' + T('Om halal-statusen') + '</h3><span class="d-ar" aria-hidden="true">حلال</span></div>' +
        bevis +
        '<p class="d-forbehold">' + T('Halalkartet sertifiserer ikke selv.') + '</p>' +
        '<div class="d-om-fot"><span class="d-naar">' + naar + '</span><button type="button" class="d-lenke" data-faq>' + T('Hva betyr statusene?') + '</button></div>' +
      '</section>' +
      '<dl class="d-info">' + rader.join('') + '</dl>' +
      '<div class="d-kartboks"><div class="d-kart" id="detaljKart"></div>' +
        '<a class="d-kartlenke" href="' + esc(kartAppUrl(s)) + '" target="_blank" rel="noopener">' + T('Åpne i kart-appen') + IKON2.utpil + '</a></div>' +
      '<div class="d-feil"><div><h3>' + T('Ser du noe som er feil?') + '</h3><p>' + T('Si ifra, så sjekker vi stedet på nytt.') + '</p></div>' +
        '<button type="button" class="knapp" data-sifra="' + esc(s.id) + '">' + T('Si ifra') + '</button></div>' +
    '</div>';
}
function tegnDetaljKart(s) {
  const boks = el('detaljKart');
  if (!boks) return;
  detaljKart = L.map(boks, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
    boxZoom: false, keyboard: false, touchZoom: false, tap: false }).setView([s.lat, s.lng], 16);
  detaljKart.attributionControl.setPrefix(false);
  leggTilBakgrunn(detaljKart);
  L.marker([s.lat, s.lng], { icon: STEDSPRIKK, keyboard: false, interactive: false }).addTo(detaljKart);
}
function apneDetalj(id) {
  const s = byId(id), d = el('detalj');
  if (!s || !d) return;
  if (detaljKart) { detaljKart.remove(); detaljKart = null; }
  if (d.hidden) detaljFra = document.activeElement;
  d.innerHTML = detaljHtml(s);
  detaljId = id;
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
    else if (f === 'sprak') byttSprak();
    else if (f === 'stott') openInfo('stott');
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
    const utv = t.closest('[data-utvalgt]');
    if (utv) { closeInfo(); lukkMer(); lukkSkuff(); setActive(utv.dataset.utvalgt, true); return; }
    const sifra = t.closest('[data-sifra]');
    if (sifra) {
      const sted = byId(sifra.dataset.sifra);
      lukkDetalj();
      setTimeout(function () {
        openInfo('feil');
        const felt = document.querySelector('#kontaktForm textarea[name="melding"]');
        if (felt && sted && !felt.value) felt.value = T('Om {navn}: ', { navn: sted.name });
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
    if (b.dataset.mer === 'tips') openSheet('tips', false);
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
const FILTERFELT = ['fBydel', 'fCuisine', 'fPrice', 'fOpen'];


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

// Tipsboksen på mobil. Den lukker seg ikke av seg selv.
const SHEETS = {
  tips: { box: 'tips', lukk: 'tipsLukk', hendelse: 'tips_apnet' }
};

// Utvalgte steder vises i en boble, som de andre sidene, og blir stående til du lukker den
function tegnUtvalgte() {
  const list = el('utvalgtListe');
  if (!list) return;
  list.innerHTML = currentHighlights().map(function (s) {
    return '<button type="button" class="utv-rad" data-utvalgt="' + esc(s.id) + '">' + monogram(s, 0) +
      '<span><span class="utv-navn">' + esc(s.name) + '</span>' +
      '<span class="utv-meta">' + esc([s.cuisines[0] ? T(s.cuisines[0]) : '', s.bydel].filter(Boolean).join(' · ')) + '</span></span>' +
      skjold(s) + '</button>';
  }).join('');
  const d = daysUntilRotation();
  el('utvalgtSub').textContent = d === 1 ? T('Fem steder vi har bekreftet som helt halal. Nytt utvalg i morgen.')
    : T('Fem steder vi har bekreftet som helt halal. Nytt utvalg om {n} dager.', { n: d });
}

function openSheet(key, auto) {
  if (key === 'tips' && !erMobil()) { openInfo('tips'); return; }
  const cfg = SHEETS[key], box = el(cfg.box);
  if (!box) return;
  box.hidden = false;
  void box.offsetWidth;
  box.classList.add('open');
  if (key === 'tips') requestAnimationFrame(oppdaterTipsHint);
  track(cfg.hendelse, { hvordan: auto ? 'automatisk' : 'knapp' });
}

function closeSheet(key) {
  const box = el(SHEETS[key].box);
  if (!box || !box.classList.contains('open')) return;
  box.classList.remove('open');
  setTimeout(function () { if (!box.classList.contains('open')) box.hidden = true; }, 260);
}

function wireSheets() {
  Object.keys(SHEETS).forEach(function (key) {
    const lukk = el(SHEETS[key].lukk);
    if (lukk) lukk.addEventListener('click', function () { closeSheet(key); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    Object.keys(SHEETS).forEach(function (k) { closeSheet(k); });
  });
}

function refreshOpenStates() {
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
    navigator.share({ title: s.name, text: s.name + ' – ' + T(STATUS[s.halalStatus].label), url: url })
      .catch(function () {});
    return;
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url)
      .then(function () { toast(T('Lenke kopiert')); }, function () { toast(T('Kunne ikke kopiere lenken')); });
  } else {
    toast(T('Kopier lenken fra adressefeltet'));
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
  if (!navigator.geolocation) { toast(T('Nettleseren din støtter ikke posisjon.')); return; }
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
    toast(T('Fant ikke posisjonen din. Sjekk at nettleseren har tilgang til posisjon.'));
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
    el('kontaktTittel').textContent = T(feil ? 'Si ifra om feil' : 'Kontakt oss');
    el('kontaktIntro').textContent = T(feil
      ? 'Ser du noe som er feil på et sted? Skriv hvilket sted det gjelder og hva som er feil, så sjekker vi det.'
      : 'Har du et tips om et sted, funnet en feil, eller vil du bare si hva du synes, så hører vi gjerne fra deg. Fyll ut skjemaet under.');
    el('kontaktTittel').dataset.feil = feil ? 'ja' : 'nei';
  }
  if (section === 'stott') tegnStott();
  if (section === 'utvalgte') tegnUtvalgte();
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

// Støtt Halalkartet: lim inn betalingslenken fra Vipps her. Står den tom, er Gi-knappen avslått og sier fra.
const VIPPS_LENKE = '';
let stottBelop = 50;
const HJERTE_GI = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 13s-4.5-2.7-4.5-6A2.6 2.6 0 0112 5.6 2.6 2.6 0 0116.5 7c0 3.3-4.5 6-4.5 6z"/><path d="M4 15c2 0 3 1.5 5 1.5h4a1.5 1.5 0 010 3H8M4 21h10l6-4"/></svg>';
function tegnStott() {
  document.querySelectorAll('.stott-belop [data-belop]').forEach(function (b) { b.setAttribute('aria-checked', String(+b.dataset.belop === stottBelop)); });
  const gi = el('stottGi');
  if (!gi) return;
  gi.innerHTML = HJERTE_GI + '<span>' + esc(T('Gi {b} kr med Vipps', { b: stottBelop })) + '</span>';
  gi.disabled = !VIPPS_LENKE;
  el('stottSnart').hidden = !!VIPPS_LENKE;
}
function wireStott() {
  document.querySelectorAll('.stott-belop [data-belop]').forEach(function (b) {
    b.addEventListener('click', function () { stottBelop = +b.dataset.belop; tegnStott(); });
  });
  el('stottGi').addEventListener('click', function () {
    if (!VIPPS_LENKE) return;
    track('stott', { belop: stottBelop });
    window.open(VIPPS_LENKE, '_blank', 'noopener');
  });
  tegnStott();
}

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
  btn.disabled = true; btn.textContent = T('Sender');
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
        toast(T('Vi får dessverre ikke tatt imot skjemaer akkurat nå. Teksten din står igjen.'));
      } else {
        console.error('[Halalkartet] Innsending feilet. Er endepunktets domene lagt ' +
          'til i både connect-src og form-action i CSP-en?', e);
        toast(T('Beklager, noe gikk galt. Prøv igjen om litt.'));
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
  { del: 'kjokken', id: 'fCuisine', navn: 'Cuisine', alle: 'Alle kjøkken' },
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
    return '<button type="button" class="pc-status" data-status="' + st + '" aria-pressed="' + layerOn[st] + '" aria-label="' + T('{s}, {n} steder', { s: T(STATUS[st].label), n: n }) + '">' +
      skjoldFor(st) + '<span class="pc-st-navn">' + T(STATUS[st].kort) + '</span><span class="pc-st-tall">' + n + '</span></button>';
  }).join('');

  const apent = el('fOpen').value === 'naa';
  const valg = PC_VALG.map(function (v) {
    const x = el(v.id), satt = !!x.value;
    const tekst = satt ? (v.id === 'fPrice' ? '$'.repeat(+x.value) : v.id === 'fCuisine' ? T(x.value) : x.value) : T(v.navn);
    let meny = '';
    if (pcApen === v.del) {
      meny = '<div class="pc-nedtrekk" role="menu" aria-label="' + T(v.navn) + '">' + [...x.options].map(function (o) {
        const n = o.value ? passer.filter(function (s) {
          return v.id === 'fCuisine' ? s.cuisines.includes(o.value) : v.id === 'fBydel' ? s.bydel === o.value : String(s.price) === o.value;
        }).length : null;
        return '<button type="button" role="menuitemradio" aria-checked="' + (o.value === x.value) + '" data-pc="velg" data-valg="' + v.del + '" data-v="' + esc(o.value) + '">' +
          '<span>' + esc(o.value ? valgtTekst(x, o) : T(v.alle)) + '</span>' + (n !== null ? '<small>' + n + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    }
    return '<div class="pc-valg">' +
      '<button type="button" class="pc-valgknapp' + (satt ? ' satt' : '') + '" data-valg="' + v.del + '" aria-haspopup="menu" aria-expanded="' + (pcApen === v.del) + '">' +
      '<span>' + esc(tekst) + '</span>' + CHEV + '</button>' + meny + '</div>';
  }).join('');

  boks.innerHTML =
    '<div class="pc-statusgruppe" role="group" aria-label="' + T('Halal-status') + '">' + status + '</div>' +
    '<span class="pc-skille" aria-hidden="true"></span>' +
    '<div class="pc-valggruppe">' +
      '<button type="button" class="pc-valgknapp" data-pc="apent" aria-pressed="' + apent + '"><span>' + T('Åpent nå') + '</span></button>' +
      valg +
    '</div>' +
    '<span class="pc-skille" aria-hidden="true"></span>' +
    sprakknapp('pc-sprak', 'data-pc="sprak"') +
    '<button type="button" class="pc-nullstill" data-pc="nullstill"' + (antallAktive() || f.q || pcVisLagret || activeId ? '' : ' disabled') + '>' + T('Nullstill') + '</button>';

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
  el('pcKiTekst').textContent = n === alle ? T(n === 1 ? 'sted' : 'steder')
    : T(bareApent ? (n === 1 ? 'av {n} steder er åpent' : 'av {n} steder er åpne') : 'av {n} steder passer', { n: alle });
}

function pcRad(s) {
  const t = kortTid(s, true);
  return '<button type="button" class="pc-rad" data-pcvelg="' + esc(s.id) + '">' + skjold(s) +
    '<span class="pc-rad-tekst"><span class="pc-rad-navn">' + esc(s.name) + '</span>' +
    '<span class="pc-rad-meta">' + esc(s.cuisines[0] ? T(s.cuisines[0]) : '') + ' · ' + '$'.repeat(s.price) + '</span></span>' +
    '<span class="pc-rad-tid ' + (t ? t.cls : '') + '">' + (t ? esc(t.tekst) : '') + '</span></button>';
}

function pcValgtKort(s) {
  const tel = s.phone ? String(s.phone).replace(/\s+/g, '') : '';
  const gate = s.address ? s.address.split(',')[0].trim() : s.bydel;
  const meta = [esc(s.cuisines[0] ? T(s.cuisines[0]) : ''), '$'.repeat(s.price)];
  const apent = apentLinje(s);
  if (apent) meta.push(esc(apent.tekst));
  return '<article class="pc-valgt" tabindex="-1" data-id="' + esc(s.id) + '" aria-label="' + esc(s.name) + '">' +
    '<div class="pc-valgt-topp">' + skjold(s) + hjerte(s, 'pc-valgt-hjerte') + '</div>' +
    '<h3>' + esc(s.name) + '</h3>' +
    '<p class="pc-valgt-meta">' + meta.join(' · ') + '</p>' +
    '<dl class="pc-valgt-info"><div><dt>' + T('Adresse') + '</dt><dd>' + esc(gate) + '</dd></div>' +
      (tel ? '<div><dt>' + T('Telefon') + '</dt><dd><a href="tel:' + esc(tel) + '">' + esc(s.phone) + '</a></dd></div>' : '') + '</dl>' +
    '<div class="pc-valgt-knapper">' +
      '<a class="primar" href="' + esc(ruteUrl(s)) + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' + IKON2.rute + T('Veibeskrivelse') + '</a>' +
      '<button type="button" data-detalj="' + esc(s.id) + '">' + T('Se hele siden') + '</button>' +
    '</div></article>';
}

function pcKjede(g) {
  const apen = !!kjedeApen[kjedeNokkel(g)] || g.filialer.some(function (s) { return s.id === activeId; });
  const omrader = [...new Set(g.filialer.map(function (s) { return s.bydel; }))];
  const tider = [...new Set(g.filialer.map(function (s) { const t = kortTid(s, true); return t ? t.tekst : ''; }))];
  return '<div class="pc-kjede' + (apen ? ' apen' : '') + '">' +
    '<button type="button" class="pc-rad" data-pckjede="' + esc(kjedeNokkel(g)) + '" data-antall="' + g.filialer.length + '" aria-expanded="' + apen + '">' + skjold(g.filialer[0]) +
      '<span class="pc-rad-tekst"><span class="pc-rad-navn">' + esc(g.navn) + '</span>' +
      '<span class="pc-rad-meta">' + T('{n} steder', { n: g.filialer.length }) + ' · ' + esc(omrader.length <= 2 ? omrader.join(T(' og ')) : T('{n} områder', { n: omrader.length })) + '</span></span>' +
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
  el('pcListeTittel').textContent = pcVisLagret ? T('Lagret') : f.bydel ? T('Steder i {b}', { b: f.bydel }) : T('Steder');
  el('pcSort').closest('.pc-sorter').hidden = pcVisLagret;
  const rull = boks.scrollTop;

  let html = '';
  if (pcVisLagret) {
    html = '<button type="button" class="pc-tilbake" data-pc="alle">' + IKON2.tilbake + T('Alle steder') + '</button>' +
      (liste.length ? pcRader(liste) : '<div class="pc-tom"><b>' + T('Ingen lagrede steder ennå') + '</b>' + T('Trykk på hjertet på et sted for å lagre det her.') + '</div>');
  } else if (!liste.length) {
    html = '<div class="pc-tom"><b>' + T('Ingen treff') + '</b>' + T('Prøv å fjerne et filter eller søk på noe annet.') +
      '<button type="button" class="pc-nullstill" data-pc="nullstill">' + T('Nullstill') + '</button></div>';
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
        '<span class="pc-gruppe-tall">' + (rader.length === 1 ? T('1 sted') : T('{n} steder', { n: rader.length })) + '</span></div>' +
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
  el('pcStott').addEventListener('click', function () { openInfo('stott'); });
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
    } else if (b.dataset.pc === 'sprak') {
      byttSprak();
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
