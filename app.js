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

// Appen
// Inne i iPhone-appen har halalkartet-app lagt inn window.HalalNative før denne fila kjører. Da brukes telefonens
// egen posisjon, deling, statuslinje og vibrasjon, og stedene hentes ferske fra halalkartet.no.
// På nettsiden finnes den ikke. Da er APP null, og alt er som før.
const APP = window.HalalNative || null;
if (APP) document.documentElement.classList.add('i-app');

// Språk: norsk er grunnspråket, engelsk slås opp her. Nøkkelen er den norske teksten.
// Nettsiden starter på norsk. Appen følger språket på telefonen til du velger selv.
const SPRAK_NOKKEL = 'halalkartet-sprak';
let sprak = (function () {
  try { const valgt = localStorage.getItem(SPRAK_NOKKEL); if (valgt === 'en' || valgt === 'nb') return valgt; } catch (e) {}
  return APP && !/^(nb|nn|no)\b/i.test(navigator.language || 'nb') ? 'en' : 'nb';
})();
const MANGLER = new Set();
const ENGELSK = {
  // toppen, menyen og lista
  'Meny': 'Menu', 'Nær meg': 'Near me', 'Tips oss': 'Suggest a place', 'Tips oss (fane)': 'Suggest', 'Lagrede steder': 'Saved places', 'Søk': 'Search',
  'Finn halal nær deg': 'Find halal near you', 'Filtre': 'Filters', 'Sorter listen': 'Sort the list',
  'Anbefalt': 'Recommended', 'Nærmest': 'Nearest', 'Navn A–Å': 'Name A–Z', 'Pris lav–høy': 'Price low–high',
  'Lukk menyen': 'Close menu', 'Tips oss om et sted': 'Suggest a place', 'Si ifra om feil': 'Report an error', 'FAQ': 'FAQ',
  'Personvern': 'Privacy', 'Vilkår': 'Terms', 'Om oss': 'About us', 'Kontakt oss': 'Contact us', 'Kontakt': 'Contact',
  'Finn steder nær meg': 'Find places near me', 'Hva har du lyst på? Søk sted, cuisine eller adresse': 'What are you craving? Search place, cuisine or address',
  'Halalkartet, start på nytt': 'Halalkartet, start over', 'Hurtigfiltre': 'Quick filters', 'Åpne filtrene': 'Open filters',
  'Åpne filtrene, {n} på': 'Open filters, {n} on', 'Lukk filtrene': 'Close filters', 'Nullstill': 'Reset', 'Vis steder': 'Show places',
  'Steder på kartet': 'Places on the map', 'Vis liste': 'Show list', 'Steder': 'Places', 'Steder i {b}': 'Places in {b}',
  'Sorter:': 'Sort:', 'Kart': 'Map', 'Hovedmeny': 'Main menu', 'Lagret': 'Saved', 'Mer': 'More', 'Lukk': 'Close', 'Informasjon': 'Information',
  'Si ifra eller kontakt oss': 'Report an error or contact us', 'Ofte stilte spørsmål': 'Frequently asked questions',
  'Utvalgte steder': 'Featured places', 'Fem utvalgte steder som vi mener du burde prøve.': 'Five featured places we think you should try.',
  'Mat det er verdt å ta turen for. Sveip deg gjennom og finn ditt neste favorittmåltid.': 'Food worth the trip. Swipe through and find your next favourite meal.',
  
  'sted': 'place', 'steder': 'places', '1 sted': '1 place', '{n} steder': '{n} places', 'av {n} steder': 'of {n} places',
  'Alle steder': 'All places', 'Utforsk andre steder': 'Explore other places', '{n} steder · {o}': '{n} places · {o}', ' og ': ' and ', '{n} områder': '{n} areas',
  'Ingen treff': 'No results', 'Prøv å fjerne et filter eller søk på noe annet.': 'Try removing a filter or searching for something else.',
  'Ingen lagrede steder ennå': 'No saved places yet',
  'Trykk på hjertet ved et sted for å lagre det. Lagrede steder ligger bare på denne enheten.': 'Tap the heart on a place to save it. Saved places are only stored on this device.',
  'Trykk på hjertet på et sted for å lagre det her.': 'Tap the heart on a place to save it here.',
  'Fant ikke dataene': 'Could not load the data', 'Prøv å laste siden på nytt.': 'Try reloading the page.',
  'Kartet venter på data': 'The map is waiting for data',
  'Appen fikk ikke lastet stedene. Lukk appen og åpne den igjen.': 'The app could not load the places. Close the app and open it again.',
  'Lukk appen og åpne den igjen.': 'Close the app and open it again.',
  'Du er uten nett. Kartet og nye steder kommer når du er på nett igjen.': 'You are offline. The map and new places will load when you are back online.',
  'Appen fikk ikke lastet {f}. Prøv å laste siden på nytt. Hjelper ikke det, står feilen i nettleserkonsollen.': 'The app could not load {f}. Try reloading the page. If that does not help, the error is shown in the browser console.',
  // status og filtre
  'Verifisert halal': 'Verified halal', 'Delvis halal': 'Partly halal', 'Dette vet vi': 'What we know', 'Kilde: {k}': 'Source: {k}', 'Denne restauranten er': 'This restaurant is', 'delvis halal': 'partly halal', 'uavklart': 'unconfirmed', 'Uavklart': 'Unconfirmed', 'Verifisert': 'Verified', 'Delvis': 'Partly',
  'Halal-status': 'Halal status', 'Kun verifisert': 'Verified only', '+ delvis': '+ partly', '+ uavklart': '+ unconfirmed', '+ Delvis': '+ Partly', 'Alle': 'All',
  'Bare steder vi har bekreftet som helt halal.': 'Only places we have confirmed as fully halal.',
  'Også steder der bare deler av menyen er halal.': 'Also places where only part of the menu is halal.',
  'Alt vi kjenner til, også steder vi ikke har rukket å sjekke ennå.': 'Everything we know of, including places we have not checked yet.',
  'Et eget utvalg av statuser.': 'A custom selection of statuses.', '{s}, {n} steder': '{s}, {n} places',
  'Pris': 'Price', 'Område': 'Area', 'Åpningstider': 'Opening hours', 'Se på Google': 'See on Google', 'Se åpningstider': 'See opening hours',
  'Åpningstider for {navn} på Google Maps': 'Opening hours for {navn} on Google Maps',
  'Uten alkohol': 'No alcohol', 'Skjul steder som serverer alkohol': 'Hide places that serve alcohol', 'Uten kjent alkoholservering': 'No known alcohol service',
  'Alkohol': 'Alcohol', 'Rimelig': 'Inexpensive', 'Middels': 'Moderate', 'Dyrere': 'Pricier', 'Ingen kjent': 'None known', 'Serverer': 'Serves',
  '«Ingen kjent» betyr at vi ikke vet om stedet serverer alkohol.': '“None known” means we do not know whether the place serves alcohol.',
  'Sortering': 'Sorting', 'Sorter': 'Sort', 'Ingen grupper': 'No groups', 'Grupper listen': 'Group the list', 'Finn de nærmeste stedene': 'Find the nearest places', 'Standard': 'Default', 'A–Å': 'A–Z', 'Vis færre': 'Show fewer', 'Vis alle {n}': 'Show all {n}',
  'Ingen steder passer': 'No places match', 'Vis alle {n} steder': 'Show all {n} places', 'Vis {n} steder': 'Show {n} places', 'Vis 1 sted': 'Show 1 place',
  'Fjern filteret {t}': 'Remove filter {t}', '{t}, åpner filtrene': '{t}, opens filters', '{n} filtre': '{n} filters',
  'kun verifisert': 'verified only', 'av {n} steder som er': 'of {n} places that are', 'uten uavklarte': 'without unconfirmed', 'utvalgte statuser': 'selected statuses',
  'serverer alkohol': 'serves alcohol', 'uten kjent alkohol': 'no known alcohol',
  'Filtrer på område': 'Filter by area', 'Alle områder': 'All areas', 'Filtrer på cuisine': 'Filter by cuisine',
  'Filtrer på prisnivå': 'Filter by price', 'Alle priser': 'All prices', '$ · Rimelig': '$ · Inexpensive', '$$ · Middels': '$$ · Moderate', '$$$ · Dyrere': '$$$ · Pricier',
  'Filtrer på alkoholservering': 'Filter by alcohol', 'Alkohol: alle steder': 'Alcohol: all places', 'Halal mat, serverer alkohol': 'Halal food, serves alcohol',
  'Ingen kjent alkoholservering': 'No known alcohol', 'Sorter etter': 'Sort by', 'Nærmest meg': 'Nearest me',
  // steder
  'Cuisine': 'Cuisine',
  'Bare steder vi selv har sjekket.': 'Only places we have checked ourselves.',
  'Steder vi har sjekket, og steder der deler av menyen er halal.': 'Places we have checked, and places where part of the menu is halal.',
  'Vis 1 verifisert sted': 'Show 1 verified place', 'Vis {n} verifiserte steder': 'Show {n} verified places', 'Filter': 'Filters',
  'Veibeskrivelse': 'Directions', 'Se stedet': 'View place', 'Se hele siden': 'View full page', 'Ring': 'Call', 'Nett': 'Website',
  'Fjern {navn} fra Lagret': 'Remove {navn} from Saved', 'Lagre {navn}': 'Save {navn}', 'Lagre': 'Save',
  'Kunne ikke lagre på denne enheten': 'Could not save on this device', 'Fjernet fra Lagret': 'Removed from Saved', 'Lagret på denne enheten': 'Saved on this device',
  'Vi har ikke skrevet ned hvordan statusen er bekreftet ennå.': 'We have not yet written down how the status was confirmed.',
  'Ikke bekreftet med dato': 'Not confirmed with a date', 'Sist bekreftet {d}': 'Last confirmed {d}', ', over et halvår siden': ', more than six months ago',
  'Adresse': 'Address', 'Telefon': 'Phone', 'Serveres': 'Served', 'Ingen kjent servering': 'None known',
  'Tilbake': 'Back', 'Del {navn}': 'Share {navn}', 'Del': 'Share', 'Send et tips til': 'Suggest another place', 'Om halal-statusen': 'Halal status',
  'Halalkartet sertifiserer ikke selv.': 'Halalkartet does not certify places itself.', 'Hva betyr statusene?': 'What do the statuses mean?',
  'Åpne i {app}': 'Open in {app}', 'Apple Kart': 'Apple Maps', 'Ser du noe som er feil?': 'Something wrong?', 'Si ifra, så sjekker vi stedet på nytt.': 'Let us know, and we will check the place again.',
  'Si ifra': 'Report', 'Si ifra!': 'Report it!', 'Om {navn}: ': 'About {navn}: ',
  'Lenke kopiert': 'Link copied', 'Kunne ikke kopiere lenken': 'Could not copy the link', 'Kopier lenken fra adressefeltet': 'Copy the link from the address bar',
  'Nettleseren din støtter ikke posisjon.': 'Your browser does not support location.',
  'Fant ikke posisjonen din. Sjekk at nettleseren har tilgang til posisjon.': 'Could not find your location. Check that the browser has access to location.',
  'Halalkartet har ikke tilgang til posisjonen din. Trykk her for å åpne Innstillinger.': 'Halalkartet does not have access to your location. Tap here to open Settings.',
  'Stedstjenester er slått av på telefonen. Slå dem på i Innstillinger for å se steder nær deg.': 'Location Services are turned off on your phone. Turn them on in Settings to see places near you.',
  'Fant ikke posisjonen din akkurat nå. Prøv igjen om litt.': 'Could not find your location right now. Try again in a moment.',
  // skjemaene
  'Vi er i startfasen og bygger kartet sammen med dere. Tips oss om en restaurant du mener er halal, så sjekker vi den.': 'We are just getting started and are building the map together with you. Tell us about a restaurant you believe is halal, and we will check it.',
  'Restaurantens navn': 'Name of the restaurant', 'påkrevd': 'required', 'frivillig': 'optional', 'Adresse eller by/bydel': 'Address or city/area',
  'F.eks. Oslo eller Storgata 17': 'E.g. Oslo or Storgata 17', 'Hva vet du om stedet?': 'What do you know about the place?',
  'Velg ett': 'Choose one', 'Helt halal': 'Fully halal', 'Halal mat, men serverer alkohol som drikke': 'Halal food, but serves alcoholic drinks',
  'Delvis halal – deler av menyen er ikke halal': 'Partly halal – parts of the menu are not halal', 'Serverer svinekjøtt': 'Serves pork',
  'Usikker – vil gjerne at dere sjekker': 'Not sure – please check', 'Hvordan vet du det?': 'How do you know?',
  'Sertifikat i lokalet, personalet har sagt det, eller du spiser der ofte …': 'A certificate on the wall, the staff told you, or you eat there often …',
  'Telefon eller e-post': 'Phone or email', 'Takk. Vi ser på stedet og legger det inn når vi har sjekket det.': 'Thank you. We will look into the place and add it once we have checked it.',
  'Vennligst ikke send oss steder som ikke har noe halal på menyen, eller rene vegetar- og veganrestauranter.': 'Please do not send us places with nothing halal on the menu, or purely vegetarian and vegan restaurants.',
  'Send inn tips': 'Send tip', 'Send inn': 'Send', 'Navn': 'Name', 'Hvor kommer du fra? By eller bydel': 'Where are you from? City or area', 'Meldingen din': 'Your message',
  'Har du et tips om et sted, funnet en feil, eller vil du bare si hva du synes, så hører vi gjerne fra deg. Fyll ut skjemaet under.': 'Do you have a tip about a place, found an error, or just want to tell us what you think? We would love to hear from you. Fill in the form below.',
  'Navn og hvor du kommer fra er frivillig, men det hjelper oss mye. Skriver du inn telefon eller e-post, kan vi komme tilbake til deg.': 'Name and where you are from are optional, but they help us a lot. If you leave a phone number or email, we can get back to you.',
  'Ser du noe som er feil på et sted? Skriv hvilket sted det gjelder og hva som er feil, så sjekker vi det.': 'Is something wrong about a place? Tell us which place and what is wrong, and we will check it.',
  'Skriv en gyldig e-post (med én @ og et punktum) eller et telefonnummer, eller la feltet stå tomt.': 'Enter a valid email (with one @ and a dot) or a phone number, or leave the field empty.',
  'Takk for at du sier fra. Meldingen din er sendt, og vi svarer så snart vi kan.': 'Thank you for letting us know. Your message has been sent, and we will reply as soon as we can.',
  'Støtt Halalkartet': 'Support Halalkartet', 'Støtt oss': 'Support us', 'Velg beløp': 'Choose amount', 'Gi {b} kr med Vipps': 'Give {b} kr with Vipps',
  'Vipps er ikke koblet til ennå. Vi sier fra her når det er klart.': 'Vipps is not connected yet. We will say so here when it is ready.',
  'Sender': 'Sending', 'Vi får dessverre ikke tatt imot skjemaer akkurat nå. Teksten din står igjen.': 'Unfortunately we cannot receive forms right now. Your text is still here.',
  'Beklager, noe gikk galt. Prøv igjen om litt.': 'Sorry, something went wrong. Please try again shortly.',
  'Halalkartet · Utforsk halal mat over hele Norge': 'Halalkartet · Explore halal food across Norway',
  'Mangler vi et sted, kan du tipse oss.': 'If a place is missing, you can suggest it.', 'Finn steder på kartet': 'Find places on the map',
  'Vis på kartet': 'Show on map', '{i} av {n}': '{i} of {n}',
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
  'Registrert som helt halal mat. Serverer alkoholholdig drikke.': 'Registered as fully halal food. Serves alcoholic drinks.', 'Serverer alkoholholdig drikke.': 'Serves alcoholic drinks.',
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
  tipsLead: 'We would most like restaurants and other places to eat in <strong>the big cities</strong>, but you are also welcome to suggest a place anywhere in the country.'
};
function T(nb, verdier) {
  let s = nb;
  if (sprak === 'en') {
    if (ENGELSK[nb] !== undefined) s = ENGELSK[nb]; else MANGLER.add(nb);
  }
  return verdier ? s.replace(/\{(\w+)\}/g, function (m, k) { return verdier[k]; }) : s;
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
  document.title = T('Halalkartet · Utforsk halal mat over hele Norge');
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

// Datoen i Oslo, til Utvalgte steder og «sist bekreftet»
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
// I appen ligger MapLibre i appen selv, i de samme versjonene, så kartet ikke venter på en ekstra nedlasting.
const MAPLIBRE = APP ? [
  ['link', 'vendor/maplibre-gl.css'],
  ['script', 'vendor/maplibre-gl.js'],
  ['script', 'vendor/leaflet-maplibre-gl.js']
] : [
  ['link', 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.1/dist/maplibre-gl.css', 'sha384-uTttxo/aOKbdE5RlD/SPzSDoDmNvGlUYPjONi2MN/b7c9HPSvW07OIuyP7uL6jxK'],
  ['script', 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.1/dist/maplibre-gl.js', 'sha384-nXMl9YiLoSG5KBPTFgvxVuIqQQcqIvo0bFrvoEaGJC6r7IibIzF1S36Zbf/sKBtL'],
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
        if (sri) { e.integrity = sri; e.crossOrigin = 'anonymous'; }
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
const RESERVER = new WeakMap();
function leggTilBakgrunn(kart) {
  const reserve = function () {
    if (kart.getContainer().isConnected) RESERVER.set(kart, L.tileLayer(RESERVE_URL, { attribution: RESERVE_KILDE, maxZoom: 19 }).addTo(kart));
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
// Appen kan bli åpnet uten nett. Da står kartet på reserveflisene, og det riktige kartet prøves igjen når nettet er tilbake.
function provBakgrunnIgjen(kart) {
  const lag = RESERVER.get(kart);
  if (!lag) return;
  kart.removeLayer(lag);
  RESERVER.delete(kart);
  leggTilBakgrunn(kart);
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
// når posisjonen sist ble funnet, og hvor lenge den regnes som fersk nok til å flytte kartet uten å vente
let posisjonTid = 0;
const POSISJON_FERSK = 2 * 60 * 1000;
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
const alleStatuser = () => STATUS_ORDER.every(st => layerOn[st]);
const byId = id => HALAL_SPOTS.find(s => s.id === id);

// Sporing
// Hendelser telles i Plausible, se analytics.js
function track(name, props) {
  try { if (typeof window.plausible === 'function') window.plausible(name, props ? { props: props } : undefined); } catch (e) {}
}

// Stedene
// Et sted må ha det kartet trenger. Mangler noe, eller har stedet en status denne utgaven ikke kjenner,
// hoppes det over i stedet for at hele kartet stopper. Appen kan få nyere data enn den selv er laget for.
function gyldigSted(s) {
  return !!s && typeof s.id === 'string' && !!s.id && typeof s.name === 'string' && !!s.name &&
    Number.isFinite(s.lat) && Number.isFinite(s.lng) && Object.prototype.hasOwnProperty.call(STATUS, s.halalStatus) &&
    typeof s.bydel === 'string' && Array.isArray(s.cuisines) && s.cuisines.every(c => typeof c === 'string') &&
    (s.address == null || typeof s.address === 'string') &&
    (s.price == null || (Number.isInteger(s.price) && s.price >= 0 && s.price <= 5));
}
async function hentFil(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// Appen henter stedene ferske fra halalkartet.no hver gang den åpnes, så et sted som mister statusen sin
// ikke blir stående til appen oppdateres. Svarer ikke nettet fort nok, brukes lista fra forrige gang,
// og har appen aldri vært på nett, lista som fulgte med den.
const STEDER_URL = 'https://halalkartet.no/spots.json';
const STEDER_NOKKEL = 'halalkartet-steder';
const APNE_NOKKEL = 'halalkartet-apne';
const STEDER_VENT = 2500;              // så lenge venter appen på ferske steder før den starter med dem den har
const STEDER_PAUSE = 30 * 60 * 1000;   // så lenge etter forrige sjekk ser appen etter nye steder
let stederVist = '', stederSjekket = 0, nyeStederVenter = false;

// En liste appen kan stole på: nok steder, og de aller fleste hele
function gyldigListe(liste) {
  if (!Array.isArray(liste)) return false;
  const hele = liste.filter(gyldigSted).length;
  return hele >= 50 && hele >= liste.length * 0.8;
}
// Gir null når nettet ikke svarer, eller når lista ikke er til å stole på.
// Går ikke den vanlige forespørselen gjennom, prøves det én gang til med en adresse ingen mellomlagre har sett før.
function hentFerske() {
  const hent = function (url, valg) { return fetch(url, valg).then(function (r) { return r.ok ? r.json() : null; }); };
  return hent(STEDER_URL, { cache: 'no-cache' })
    .catch(function () { return hent(STEDER_URL + '?t=' + Date.now()); })
    .then(function (liste) {
      if (!gyldigListe(liste)) return null;
      stederSjekket = Date.now();
      try { localStorage.setItem(STEDER_NOKKEL, JSON.stringify({ hentet: stederSjekket, steder: liste })); } catch (e) {}
      return liste;
    })
    .catch(function () { return null; });
}
function lagredeSteder() {
  try {
    const lagret = JSON.parse(localStorage.getItem(STEDER_NOKKEL));
    // etter en oppdatering av appen er lista som fulgte med, nyere enn den som ble hentet før
    if (lagret && lagret.hentet > (APP.bygget || 0) && gyldigListe(lagret.steder)) return lagret.steder;
  } catch (e) {}
  return null;
}
async function hentSteder() {
  if (!APP) return hentFil('spots.json');
  const ferske = hentFerske();
  let liste = navigator.onLine === false ? null
    : await Promise.race([ferske, new Promise(function (ok) { setTimeout(ok, STEDER_VENT, null); })]);
  if (!liste) liste = lagredeSteder() || await hentFil('spots.json');
  stederVist = JSON.stringify(liste);
  // kom de ferske stedene for sent til starten, vises de neste gang appen hentes fram
  ferske.then(function (sene) { if (sene && JSON.stringify(sene) !== stederVist) nyeStederVenter = true; });
  return liste;
}

(async function boot() {
  try {
    const alle = await hentSteder();
    if (!Array.isArray(alle)) throw new Error('ikke en liste');
    HALAL_SPOTS = alle.filter(gyldigSted);
    if (HALAL_SPOTS.length < alle.length) console.warn('Halalkartet: hopper over ' + (alle.length - HALAL_SPOTS.length) + ' steder som mangler noe');
    if (!HALAL_SPOTS.length) throw new Error('tomt');
  } catch (e) { showLoadError(e); if (APP) APP.klar(); return; }
  initApp();
  // oppstartsbildet i appen blir stående til kartet og stedene er tegnet
  if (APP) APP.klar();
})();

function showLoadError(err) {
  if (err && window.console) console.error('Halalkartet: klarte ikke å laste spots.json –', err);
  el('bunnTall').textContent = '0';
  el('bunnTekst').textContent = T('Fant ikke dataene');
  const overlay = document.createElement('div');
  overlay.className = 'map-overlay';
  overlay.innerHTML = APP
    ? '<div class="box"><h2>' + T('Kartet venter på data') + '</h2><p>' + T('Appen fikk ikke lastet stedene. Lukk appen og åpne den igjen.') + '</p></div>'
    : '<div class="box"><h2>' + T('Kartet venter på data') + '</h2>' +
    '<p>' + T('Appen fikk ikke lastet {f}. Prøv å laste siden på nytt. Hjelper ikke det, står feilen i nettleserkonsollen.', { f: '<code>spots.json</code>' }) + '</p>' +
    '<p>Utvikler du lokalt, husk at filen må serveres over http. Nettlesere blokkerer henting av lokale filer:</p>' +
    '<p><code>python3 -m http.server</code></p>' +
    '<p>Gå så til <code>http://localhost:8000</code>.</p></div>';
  el('map').appendChild(overlay);
  if (el('pcListeInnhold')) el('pcListeInnhold').innerHTML = '<div class="pc-tom"><b>' + T('Fant ikke dataene') + '</b>' + T(APP ? 'Lukk appen og åpne den igjen.' : 'Prøv å laste siden på nytt.') + '</div>';
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

  ['search', 'fBydel', 'fCuisine', 'fPrice', 'fAlkohol', 'fSort'].forEach(id => {
    const x = el(id);
    if (x) x.addEventListener('input', render);
  });
  ['fBydel', 'fCuisine', 'fPrice', 'fAlkohol'].forEach(function (id) {
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
  if (el('fSort')) el('fSort').addEventListener('change', () => {
    const v = el('fSort').value;
    if (v) track('sortering', { modus: v });
    if (v === 'avstand' && !userLoc) locateUser();
  });
  leggTilNaermest();
  oversettStatisk();
  document.addEventListener('touchstart', function () {}, { passive: true });
  wireMobilskall();
  wirePc();
  wireMobil();
  wireNearMe();
  wireInfo();
  wireContactForm();
  wireStott();
  wireTipsForm();
  merkSkjemaUtenMottak();
  wirePopupActions();
  wireShortcuts();
  wireApp();
  render();
  applyHash();
  window.addEventListener('hashchange', function () { if (location.hash.slice(1) !== encodeURIComponent(activeId || '')) applyHash(); });
  apneIgjen();

}

// Appen: statuslinje, vibrasjon, nye steder og nett som kommer og går
// Statuslinja øverst får mørk tekst over lyse flater (filterarket og Lagret) og lys tekst over grønt
let statusLys = null;
function oppdaterStatuslinje() {
  const lyst = !el('filterark').hidden || (document.body.classList.contains('fane-lagret') && el('detalj').hidden);
  if (lyst === statusLys) return;
  statusLys = lyst;
  APP.statuslinje(lyst ? 'mork' : 'lys');
}
// teksten «Om stedet: » som appen selv legger inn i Si ifra om feil, teller ikke som påbegynt
function skjemaPabegynt() {
  return [...document.querySelectorAll('.kf-field input, .kf-field textarea')].some(function (x) { return x.value.trim() && x.value !== x.dataset.forslag; });
}
// Laster appen på nytt med de nye stedene. Stedssiden du har oppe åpnes igjen, og et skjema du har begynt på får stå i fred.
function visNyeSteder() {
  if (skjemaPabegynt()) { nyeStederVenter = true; return; }
  try { if (!el('detalj').hidden && detaljId) sessionStorage.setItem(APNE_NOKKEL, detaljId); } catch (e) {}
  location.reload();
}
// straks: bytt med en gang. Ellers venter de nye stedene til neste gang appen hentes fram.
function sjekkNyeSteder(straks) {
  hentFerske().then(function (liste) {
    if (!liste || JSON.stringify(liste) === stederVist) return;
    if (straks) visNyeSteder(); else nyeStederVenter = true;
  });
}
function apneIgjen() {
  if (!APP) return;
  let id = null;
  try { id = sessionStorage.getItem(APNE_NOKKEL); sessionStorage.removeItem(APNE_NOKKEL); } catch (e) {}
  if (id && byId(id)) apneDetalj(id);
}
function utenNett() { toast(T('Du er uten nett. Kartet og nye steder kommer når du er på nett igjen.')); }
function wireApp() {
  if (!APP) return;
  const obs = new MutationObserver(oppdaterStatuslinje);
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  ['filterark', 'detalj'].forEach(function (id) { obs.observe(el(id), { attributes: true, attributeFilter: ['hidden'] }); });
  oppdaterStatuslinje();

  // et lite dunk i hånda når man lagrer et sted eller slår et filter av og på
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-lagre], .hbrikke, .bryter, .segment button, .fa-brikker button, .fa-pris button')) APP.vibrer();
  });

  // Når appen hentes fram igjen, ser den etter nye steder hvis det er en stund siden sist.
  // Telefonen sier fra på to måter, så «borte» sørger for at det bare skjer én gang.
  let borte = false;
  const gikkBort = function () { borte = true; };
  const komTilbake = function () {
    if (!borte) return;
    borte = false;
    if (nyeStederVenter) { nyeStederVenter = false; visNyeSteder(); }
    else if (Date.now() - stederSjekket >= STEDER_PAUSE) sjekkNyeSteder(true);
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden) gikkBort(); else komTilbake(); });
  document.addEventListener('pause', gikkBort);
  document.addEventListener('resume', komTilbake);

  window.addEventListener('online', function () {
    provBakgrunnIgjen(map);
    if (Date.now() - stederSjekket >= STEDER_PAUSE) sjekkNyeSteder(false);
  });
  window.addEventListener('offline', utenNett);
  if (navigator.onLine === false) utenNett();
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
    alkohol: el('fAlkohol') ? el('fAlkohol').value : '',
    sort: el('fSort') ? el('fSort').value : ''
  };
}
function passes(s, f) {
  if (f.bydel && s.bydel !== f.bydel) return false;
  if (f.cuisine && !s.cuisines.includes(f.cuisine)) return false;
  if (f.price && String(s.price) !== f.price) return false;
  if (f.alkohol === 'uten' && s.alcohol) return false;
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
  el('search').placeholder = erMobil() ? T('Søk') : T('Hva har du lyst på? Søk sted, cuisine eller adresse');
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
  if (el('fAlkohol').value) deler.push(T('uten kjent alkohol'));
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
  // Bare «kun verifisert» på: «av 188 steder som er kun verifisert», med de to siste ordene uthevet
  const bareKun = strict === 0 && !alleStatuser() && filterTekst() === ' · ' + T('kun verifisert');
  if (n < HALAL_SPOTS.length && bareKun) {
    el('bunnTekst').innerHTML = esc(T('av {n} steder som er', { n: HALAL_SPOTS.length })) + ' <em class="bunn-kun">' + esc(T('kun verifisert')) + '</em>';
  } else {
    el('bunnTekst').textContent = n < HALAL_SPOTS.length
      ? T('av {n} steder', { n: HALAL_SPOTS.length }) + filterTekst() : T(n === 1 ? 'sted' : 'steder');
  }
  tegnBunnHode();
  const a = antallAktive(), t = el('filterTeller');
  if (t) { t.hidden = !a; t.textContent = a; }
  if (el('filterknapp')) el('filterknapp').setAttribute('aria-label', a ? T('Åpne filtrene, {n} på', { n: a }) : T('Åpne filtrene'));
  byggHurtigrad();
  maalToppfelt();
  if (el('filterark') && !el('filterark').hidden) tegnFilterark(n);
}

// Filterarket
const BAKGRUNN = ['map', 'pcTopp', 'pcFilter', 'pcListe', 'toppfelt', 'nearme', 'bunnark', 'liste', 'visKart', 'fane'];
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
    '<section class="fa-del" data-del="alkohol"><div class="fa-rad"><div><h3>' + T('Uten alkohol') + '</h3>' +
      '<p>' + T('Skjul steder som serverer alkohol') + '</p></div>' +
      '<button type="button" class="bryter" role="switch" aria-label="' + T('Uten alkohol') + '" aria-checked="' + (el('fAlkohol').value === 'uten') + '" data-bryter="alkohol"></button></div></section>' +
    '<section class="fa-del" data-del="kjokken"><h3>' + T(kjokkenOrd()) + '</h3>' + brikker('fCuisine', 'kjokken', telling('cuisines'), 6) + '</section>' +
    '<section class="fa-del" data-del="omrade"><h3>' + T('Område') + '</h3>' + brikker('fBydel', 'omrade', telling('bydel'), 8) + '</section>' +
    '<section class="fa-del" data-del="pris"><h3>' + T('Pris') + '</h3><div class="fa-pris">' + ['1', '2', '3'].map(function (v) {
      return '<button type="button" aria-pressed="' + (el('fPrice').value === v) + '" data-velg="fPrice" data-v="' + v + '" aria-label="' +
        T(['Rimelig', 'Middels', 'Dyrere'][v - 1]) + '">' + '$'.repeat(+v) + '</button>'; }).join('') + '</div></section>' +
    '<section class="fa-del" data-del="sorter"><h3>' + T('Sortering') + '</h3>' +
      segment('Sortering', [['', 'Anbefalt'], ['avstand', 'Nærmest'], ['navn', 'A–Å'], ['pris', 'Pris']], el('fSort').value, 'fSort') + '</section>';

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
    else if (b.dataset.bryter === 'alkohol') { el('fAlkohol').value = el('fAlkohol').value ? '' : 'uten'; track('filter_ark', { filter: 'fAlkohol' }); render(); }
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
  if (aktiv) setActive(aktiv, false);
}

function ruteUrl(s) {
  return 'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent(s.address ? s.name + ', ' + s.address : s.lat + ',' + s.lng);
}
// Lenkene under kartet på stedssiden. Google Maps står for alle. På iPhone, iPad og Mac med berøring står Apple Kart ved siden av.
function kartLenker(s) {
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const lenke = function (url, navn) {
    return '<a class="d-kartlenke" href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="' + esc(T('Åpne i {app}', { app: navn })) + '">' + esc(navn) + IKON2.utpil + '</a>';
  };
  return '<div class="d-kartvalg">' +
    (ios ? lenke('https://maps.apple.com/?q=' + encodeURIComponent(s.name) + '&ll=' + s.lat + ',' + s.lng, T('Apple Kart')) : '') +
    lenke('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + (s.address ? ', ' + s.address : '')), 'Google Maps') + '</div>';
}

const SKJOLD = SVG(20, '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/>');
// Verifiserte steder: et takket merke med hake, i stedet for skjoldet
const MERKE_V = '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke="none" d="M12.00 0.60L14.38 3.11L17.70 2.13L18.51 5.49L21.87 6.30L20.89 9.62L23.40 12.00L20.89 14.38L21.87 17.70L18.51 18.51L17.70 21.87L14.38 20.89L12.00 23.40L9.62 20.89L6.30 21.87L5.49 18.51L2.13 17.70L3.11 14.38L0.60 12.00L3.11 9.62L2.13 6.30L5.49 5.49L6.30 2.13L9.62 3.11Z"/><path d="M7.7 12.5l2.9 2.7 5.7-6.4" fill="none" stroke="#C8A253" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function skjold(s, medTekst) {
  const st = STATUS[s.halalStatus];
  const merke = '<span class="skjold" data-s="' + esc(s.halalStatus) + '"' + (medTekst ? ' aria-hidden="true"' : ' role="img" aria-label="' + T(st.label) + '"') + '>' +
    (s.halalStatus === 'verifisert' ? MERKE_V : SKJOLD) + (s.halalStatus === 'verifisert' ? '' : '<span class="skjold-tegn" aria-hidden="true">' + st.tegn + '</span>') + '</span>';
  // med tekst: ordet først, så merket etter
  return medTekst ? '<span class="skjold-tekst" data-s="' + esc(s.halalStatus) + '">' + T(st.label) + '</span>' + merke : merke;
}
// Flisa følger statusen: mørk med gull bokstav for verifiserte steder, lys for de andre.
// I lista er alle fliser like (noyt), så lista ikke sier noe om statusen.
function monogram(s, noyt) {
  const m = /[A-Za-zÀ-ÿÆØÅæøå0-9]/.exec(s.name);
  return '<span class="mono ' + (noyt || s.halalStatus === 'verifisert' ? 'mono-mork' : 'mono-lys') + '"' + (noyt ? '' : ' data-s="' + esc(s.halalStatus) + '"') + ' aria-hidden="true">' + (m ? m[0].toUpperCase() : '?') + '</span>';
}
// Åpningstidene vises ikke i appen. Lenken åpner stedet i Google Maps, der står tidene restauranten selv har lagt inn.
function tiderUrl(s) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ', ' + (s.address || s.bydel));
}
function tiderLenke(s, tekst, kls) {
  return '<a class="' + (kls || 'tider-lenke') + '" href="' + esc(tiderUrl(s)) + '" target="_blank" rel="noopener" data-act="tider" data-id="' + esc(s.id) + '"' +
    ' aria-label="' + esc(T('Åpningstider for {navn} på Google Maps', { navn: s.name })) + '">' + T(tekst) + IKON2.utpil + '</a>';
}
// Linja med avstand, mat, område og pris. Hver opplysning holdes samlet, og området og prisen følger hverandre.
// Stilarket skjuler skilletegnet foran den første opplysningen på hver linje, så linja aldri begynner eller slutter med et skilletegn.
function metaTekst(s, skille) {
  const sk = '<span class="skraa">' + (skille || ' / ') + '</span>';
  const deler = [];
  if (userLoc) deler.push('<b>' + esc(fmtDist(dist(s))) + '</b>');
  deler.push('<span class="fakta-mat">' + esc(s.cuisines.slice(0, 2).map(function (c) { return T(c); }).join(', ')) + '</span>');
  deler.push('<span>' + esc(s.bydel) + sk + priceLabel(s.price) + '</span>');
  return '<span class="fakta' + (skille ? ' prikk' : '') + '"><span>' + deler.join('') + '</span></span>';
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
  return '<article class="lkort" data-id="' + esc(s.id) + '">' + monogram(s, true) +
    '<div class="lkort-tekst">' +
      '<h3><button type="button" class="lkort-navn" data-detalj="' + esc(s.id) + '">' + esc(s.name) + '</button></h3>' +
      '<p class="lkort-meta">' + metaTekst(s, ' · ') + '</p>' +
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
      ? '<div class="tom">' + IKON2.hjerte + '<b>' + T('Ingen lagrede steder ennå') + '</b>' +
          '<p>' + T('Trykk på hjertet ved et sted for å lagre det. Lagrede steder ligger bare på denne enheten.') + '</p>' +
          '<button type="button" class="knapp primar" data-tom="kart">' + T('Finn steder på kartet') + '</button></div>'
      : '<div class="tom"><b>' + T('Ingen treff') + '</b>' +
          '<p>' + T('Prøv å fjerne et filter eller søk på noe annet.') + ' ' + T('Mangler vi et sted, kan du tipse oss.') + '</p>' +
          '<button type="button" class="knapp primar" data-tom="nullstill">' + T('Nullstill') + '</button>' +
          '<button type="button" class="knapp" data-tom="tips">' + T('Tips oss om et sted') + '</button></div>';
    return;
  }
  boks.innerHTML = liste.map(function (s, i) { return listekortHtml(s, i); }).join('');
}

// Kortet i bunnarket
// Bunnarket har tre stillinger: lavt, midt og høyt.
// Uten valgt sted: lavt = linja med antall og «Vis liste», midt = lista over nedre halvdel, høyt = hele lista.
// Med valgt sted:  lavt = bare navnet, midt = kortet, høyt = stedssiden.
let listeHalv = false, kortLavt = false;
const MIDT = .5;   // lista i midtstilling begynner midt på skjermen
function bunnTopp() {
  const b = el('bunnark');
  if (b && b.getClientRects().length) return Math.round(window.innerHeight - b.getBoundingClientRect().top - (new DOMMatrixReadOnly(getComputedStyle(b).transform)).m42);
  if (document.body.classList.contains('liste-halv')) return Math.round(window.innerHeight * (1 - MIDT));
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
  boks.innerHTML =
    '<article class="vkort" aria-labelledby="valgtNavn">' + monogram(s) +
      '<div class="lkort-tekst">' +
        '<h3 id="valgtNavn">' + esc(s.name) + '</h3>' +
        '<p class="lkort-meta">' + metaTekst(s) + '</p>' +
      '</div>' +
      '<p class="vkort-status">' + skjold(s, true) + '<span class="skille" aria-hidden="true"></span>' + tiderLenke(s, 'Se åpningstider') + '</p>' +
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
  b.classList.toggle('kort-lavt', valgt && kortLavt);
  el('visListe').innerHTML = (valgt ? T('Utforsk andre steder') : T('Vis liste')) + IKON2.pil;
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
  document.body.classList.toggle('liste-halv', liste && listeHalv && fane !== 'lagret');
  document.body.classList.toggle('fane-lagret', fane === 'lagret');
  document.querySelectorAll('#fane [data-fane]').forEach(function (b) {
    if (b.dataset.fane === fane) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (liste) tegnListe();
  requestAnimationFrame(function () { maalToppfelt(); etterKortet(); if (!liste) map.invalidateSize(); });
}
function settVisning(v, halv) {
  if (!erMobil()) return;
  visning = v; fane = 'utforsk'; listeHalv = v === 'liste' && halv === true;
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
function adresseLinjer(s) {
  if (!s.address) return esc(s.bydel);
  const deler = s.address.split(',');
  const gate = deler[0].trim();
  const by = deler.length > 1 ? deler[deler.length - 1].replace(/\d+/g, '').trim() : '';
  const linje2 = !by || by === s.bydel ? s.bydel : s.bydel + ', ' + by;
  return esc(gate) + '<br>' + esc(linje2);
}
// Stempelet på stedssiden og i kortet på PC. Verifiserte steder har gullstempelet med حلال.
// Uavklarte steder har et grått stempel med spørsmålstegn på stedssiden. Delvis halal har ikke stempel.
// Begge kan stå på siden samtidig på PC, så sirkelen teksten følger, får eget navn per sted.
function stempel(hvor, status) {
  const uavklart = status === 'uavklart', delvis = status === 'delvis';
  const sti = 'stempelSti' + (hvor ? '-' + hvor : '');
  const navn = uavklart ? 'Uavklart' : delvis ? 'Delvis halal' : 'Verifisert halal';
  return '<svg class="stempel"' + (uavklart || delvis ? ' data-s="' + status + '"' : '') + ' role="img" aria-label="' + T(navn) + '" viewBox="0 0 100 100">' +
    '<defs><path id="' + sti + '" d="M50 50 m-34.5 0 a34.5 34.5 0 1 1 69 0 a34.5 34.5 0 1 1 -69 0"/></defs>' +
    '<g fill="none" stroke="currentColor"><path d="M94.40 50.00 A5.4 5.4 0 0 1 93.29 59.88 A5.4 5.4 0 0 1 90.00 69.26 A5.4 5.4 0 0 1 84.71 77.68 A5.4 5.4 0 0 1 77.68 84.71 A5.4 5.4 0 0 1 69.26 90.00 A5.4 5.4 0 0 1 59.88 93.29 A5.4 5.4 0 0 1 50.00 94.40 A5.4 5.4 0 0 1 40.12 93.29 A5.4 5.4 0 0 1 30.74 90.00 A5.4 5.4 0 0 1 22.32 84.71 A5.4 5.4 0 0 1 15.29 77.68 A5.4 5.4 0 0 1 10.00 69.26 A5.4 5.4 0 0 1 6.71 59.88 A5.4 5.4 0 0 1 5.60 50.00 A5.4 5.4 0 0 1 6.71 40.12 A5.4 5.4 0 0 1 10.00 30.74 A5.4 5.4 0 0 1 15.29 22.32 A5.4 5.4 0 0 1 22.32 15.29 A5.4 5.4 0 0 1 30.74 10.00 A5.4 5.4 0 0 1 40.12 6.71 A5.4 5.4 0 0 1 50.00 5.60 A5.4 5.4 0 0 1 59.88 6.71 A5.4 5.4 0 0 1 69.26 10.00 A5.4 5.4 0 0 1 77.68 15.29 A5.4 5.4 0 0 1 84.71 22.32 A5.4 5.4 0 0 1 90.00 30.74 A5.4 5.4 0 0 1 93.29 40.12 A5.4 5.4 0 0 1 94.40 50.00 Z" stroke-width="1.7" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="50" r="40.6"/><circle cx="50" cy="50" r="27.6"/></g>' +
    '<text font-family="Manrope, sans-serif" font-weight="700" font-size="7.6" fill="currentColor"><textPath href="#' + sti + '" textLength="213" lengthAdjust="spacing">' +
      T(uavklart ? 'Uavklart' : delvis ? 'Delvis halal' : 'Verifisert').toUpperCase() + ' • HALALKARTET • </textPath></text>' +
    (uavklart || delvis
      ? '<text x="50" y="62.5" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="35" fill="currentColor">' + (delvis ? '!' : '?') + '</text>'
      : '<text x="50" y="57.5" text-anchor="middle" font-family="Amiri, serif" font-weight="700" font-size="24" fill="currentColor" direction="rtl">حلال</text>') + '</svg>';
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
  // Det vi vet, som en liste: én setning per punkt, og kilden til slutt
  const punkter = [];
  liste.forEach(function (v) {
    const tekst = v.tekst ? T(v.tekst) : '';
    // delt etter punktum, utropstegn og spørsmålstegn. Skrevet uten «lookbehind», som eldre iPhone-er ikke forstår
    tekst.replace(/([.!?])\s+/g, '$1\u0001').split('\u0001').filter(Boolean).forEach(function (setning) { punkter.push(esc(setning)); });
    if (v.kilde) punkter.push(T('Kilde: {k}', { k: esc(v.kilde) }));
  });
  // Verifiserte steder har ikke boksen, unntatt de som serverer alkohol: der skal merknaden stå.
  // Sier ikke teksten om stedet noe om alkohol, legges setningen til, så merknaden alltid er der.
  const medAlkohol = s.halalStatus === 'verifisert' && !!s.alcohol;
  if (medAlkohol && !liste.some(function (v) { return /alkohol/i.test(v.tekst || ''); })) punkter.push(esc(T('Serverer alkoholholdig drikke.')));
  const bevis = s.halalStatus === 'verifisert' && !medAlkohol ? '' : '<div class="d-vet"><h4>' + T('Dette vet vi') + '</h4>' +
    (punkter.length ? '<ul>' + punkter.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>'
      : '<p>' + T('Vi har ikke skrevet ned hvordan statusen er bekreftet ennå.') + '</p>') + '</div>';
  const d = dagerSiden(s.lastVerified);
  const naar = d === null ? T('Ikke bekreftet med dato') : T('Sist bekreftet {d}', { d: fmtDato(s.lastVerified) }) + (d > 180 ? T(', over et halvår siden') : '');

  const rad = function (navn, verdi) { return '<div><dt>' + T(navn) + '</dt><dd>' + verdi + '</dd></div>'; };
  const rader = [
    rad('Adresse', adresseLinjer(s)),
    rad('Åpningstider', tiderLenke(s, 'Se åpningstider')),
    rad('Alkohol', T(s.alcohol ? 'Serveres' : 'Ingen kjent servering'))
  ];
  if (tel) rader.push(rad('Telefon', '<a href="tel:' + esc(tel) + '">' + esc(s.phone) + '</a>'));

  return '<div class="d-topp"><span class="d-grep" aria-hidden="true"></span>' +
      '<button type="button" class="d-rund" id="detaljTilbake" aria-label="' + T('Tilbake') + '">' + IKON2.tilbake + '</button>' +
      '<span class="d-luft"></span>' +
      '<button type="button" class="d-rund d-del" data-act="del" data-id="' + esc(s.id) + '" aria-label="' + esc(T('Del {navn}', { navn: s.name })) + '">' + IKON2.del + '<span>' + T('Del') + '</span></button>' +
      hjerte(s, 'd-rund') +
      '<a class="d-merke" href="./" aria-label="' + T('Halalkartet, start på nytt') + '">حلال</a>' +
    '</div>' +
    '<header class="d-hero har-stempel">' +
      stempel('side', s.halalStatus) +
      '<h2 id="detaljNavn">' + esc(s.name) + '</h2>' +
      '<p class="d-meta">' + metaTekst(s) + '</p>' +
    '</header>' +
    '<div class="d-kropp">' +
      '<div class="d-knapper k' + knapper.length + '">' + knapper.join('') + '</div>' +
      '<section class="d-om" aria-labelledby="dOmTittel">' +
        '<div class="d-om-hode"><h3 id="dOmTittel">' + T('Om halal-statusen') + '</h3>' +
          (s.halalStatus === 'verifisert' ? '<span class="d-ar" aria-hidden="true">حلال</span>' : '<span class="d-om-status">' + skjold(s) + '</span>') + '</div>' +
        (s.halalStatus !== 'verifisert' ? '<p class="d-status-setning" data-s="' + esc(s.halalStatus) + '">' + T('Denne restauranten er') + ' <strong>' + T(s.halalStatus === 'delvis' ? 'delvis halal' : 'uavklart') + '</strong>.</p>' : '') +
        bevis +
        '<p class="d-forbehold">' + T('Halalkartet sertifiserer ikke selv.') + '</p>' +
        '<div class="d-om-fot"><span class="d-naar">' + naar + '</span><button type="button" class="d-lenke" data-faq>' + T('Hva betyr statusene?') + '</button></div>' +
      '</section>' +
      '<dl class="d-info">' + rader.join('') + '</dl>' +
      '<div class="d-kartboks"><div class="d-kart" id="detaljKart"></div>' +
        kartLenker(s) + '</div>' +
      '<div class="d-feil"><div><h3>' + T('Ser du noe som er feil?') + '</h3><p>' + T('Si ifra, så sjekker vi stedet på nytt.') + '</p></div>' +
        '<button type="button" class="knapp" data-sifra="' + esc(s.id) + '">' + T('Si ifra!') + '</button></div>' +
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
    if (f === 'tips') openInfo('tips');
    else if (f === 'sprak') byttSprak();
    else if (f === 'stott') openInfo('stott');
    else if (f === 'mer') apneMer();
    else if (f === 'lagret') settFane('lagret');
    else if (f === 'naer') { settVisning('kart'); locateUser(); }
    else settFane('utforsk');
  });

  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target : null;
    if (!t) return;
    const lagre = t.closest('[data-lagre]');
    if (lagre) { e.preventDefault(); byttLagret(lagre.dataset.lagre); return; }
    const det = t.closest('[data-detalj]');
    if (det) { e.preventDefault(); apneDetalj(det.dataset.detalj); return; }
    // knappene i tomme lister
    const tom = t.closest('[data-tom]');
    if (tom) {
      if (tom.dataset.tom === 'nullstill') { nullstill(); el('search').blur(); }
      else if (tom.dataset.tom === 'tips') openInfo('tips');
      else settVisning('kart');
      return;
    }
    if (t.closest('#detaljTilbake')) { lukkDetalj(); return; }
    if (t.closest('[data-faq]')) { openInfo('faq'); el('infoScrim').classList.add('over-side'); return; }
    const utv = t.closest('[data-utvalgt]');
    if (utv) { closeInfo(); lukkMer(); lukkSkuff(); setActive(utv.dataset.utvalgt, true); return; }
    const sifra = t.closest('[data-sifra]');
    if (sifra) {
      const sted = byId(sifra.dataset.sifra);
      lukkDetalj();
      setTimeout(function () {
        openInfo('feil');
        const felt = document.querySelector('#kontaktForm textarea[name="melding"]');
        if (felt && sted && !felt.value) { felt.value = T('Om {navn}: ', { navn: sted.name }); felt.dataset.forslag = felt.value; }
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

  // Et drag flytter bare arket. Det følger fingeren opp og ned og stopper i én av tre stillinger når fingeren slipper.
  // Kartet står stille imens, og ingenting lukkes: et valgt sted lukkes med «Utforsk andre steder» eller et trykk på kartet.
  const bunn = el('bunnark'), listeEl = el('liste'), side = el('detalj');
  const STILLINGER = ['lav', 'midt', 'hoy'];
  let drag = null, sisteDrag = 0;
  const hoyTopp = function () { return (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--toppfelt-h')) || 120) - 30; };
  const midtTopp = function () { return Math.round(window.innerHeight * MIDT); };
  const demp = function (v, min, maks) { return v < min ? min + (v - min) * .25 : v > maks ? maks + (v - maks) * .25 : v; };
  function dragStart(e, hva) {
    if (e.button || !erMobil() || fane === 'lagret') return;
    const elm = hva === 'liste' ? listeEl : hva === 'side' ? side : bunn;
    drag = { hva: hva, y0: e.clientY, spor: [[e.timeStamp, e.clientY]], fart: 0, iGang: false, topp0: elm.getBoundingClientRect().top,
             fra: hva === 'linje' ? 'lav' : hva === 'liste' ? (listeHalv ? 'midt' : 'hoy') : hva === 'side' ? 'hoy' : (kortLavt ? 'lav' : 'midt'),
             lav: window.innerHeight - el('fane').getBoundingClientRect().height - 62 };
  }
  bunn.addEventListener('pointerdown', function (e) { dragStart(e, activeId ? 'kort' : 'linje'); });
  listeEl.querySelector('.liste-hode').addEventListener('pointerdown', function (e) { if (!e.target.closest('select')) dragStart(e, 'liste'); });
  side.addEventListener('pointerdown', function (e) { if (e.target.closest('.d-grep') && side.scrollTop <= 0) dragStart(e, 'side'); });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    const dy = e.clientY - drag.y0;
    if (!drag.iGang) {
      if (Math.abs(dy) < 8 || (drag.hva === 'linje' && dy > 0) || (drag.hva === 'side' && dy < 0)) return;
      drag.iGang = true;
      document.body.classList.add('ark-drar');
      if (drag.hva === 'linje') {                       // lista kommer opp under fingeren
        visning = 'liste'; listeHalv = false;
        document.body.classList.add('vis-liste');
        tegnListe();
      }
    }
    drag.spor.push([e.timeStamp, e.clientY]);
    while (drag.spor.length > 2 && e.timeStamp - drag.spor[0][0] > 80) drag.spor.shift();
    drag.fart = (e.clientY - drag.spor[0][1]) / Math.max(1, e.timeStamp - drag.spor[0][0]);
    if (drag.hva === 'kort') bunn.style.transform = 'translateY(' + demp(dy, kortLavt ? -200 : -70, kortLavt ? 0 : 200) + 'px)';
    else if (drag.hva === 'side') side.style.transform = 'translateY(' + Math.max(0, dy) + 'px)';
    else listeEl.style.top = demp(drag.topp0 + dy, hoyTopp(), drag.lav) + 'px';
  });
  function slipp(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.iGang) return;                               // et vanlig trykk
    sisteDrag = e.timeStamp;
    const dy = e.clientY - d.y0, rask = Math.abs(d.fart) > .5, opp = d.fart < 0;
    const etter = function (ms, fn) { setTimeout(fn, reduceMotion ? 0 : ms); };
    if (d.hva === 'kort') {
      // der arket står nå, så det glir derfra til den nye stillingen
      const naa = bunn.getBoundingClientRect().top;
      if (kortLavt) { if (dy < -40 || (rask && opp)) kortLavt = false; }
      else if (dy > 60 || (rask && !opp)) kortLavt = true;
      else if (dy < -50 || (rask && opp)) apneDetalj(activeId);
      bunn.style.transform = '';
      tegnBunnHode();
      bunn.style.transform = 'translateY(' + (naa - bunn.getBoundingClientRect().top) + 'px)';
      void bunn.offsetWidth;
      document.body.classList.remove('ark-drar');
      bunn.style.transform = '';
      etter(280, function () { etterKortet(function () { if (activeId) holdPunktFritt(activeId); }); });
    } else if (d.hva === 'side') {
      document.body.classList.remove('ark-drar');
      side.style.transform = '';
      if (dy > 110 || (rask && !opp)) lukkDetalj();
    } else {
      const y = listeEl.getBoundingClientRect().top;
      const stopp = { hoy: hoyTopp(), midt: midtTopp(), lav: d.lav };
      let til = STILLINGER.reduce(function (a, b) { return Math.abs(stopp[b] - y) < Math.abs(stopp[a] - y) ? b : a; });
      if (rask) til = STILLINGER[Math.max(0, Math.min(2, STILLINGER.indexOf(d.fra) + (opp ? 1 : -1)))];
      document.body.classList.remove('ark-drar');
      if (til === 'lav') {
        listeEl.style.top = d.lav + 'px';
        etter(260, function () { listeEl.style.top = ''; settVisning('kart'); });
      } else {
        listeEl.style.top = '';
        settVisning('liste', til === 'midt');
        etterKortet();
      }
    }
  }
  window.addEventListener('pointerup', slipp);
  window.addEventListener('pointercancel', slipp);
  // et drag skal ikke også bli et trykk på knappen som lå under fingeren
  [bunn, listeEl, side].forEach(function (x) {
    x.addEventListener('click', function (e) { if (e.timeStamp - sisteDrag < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
  });

  el('merLukk').addEventListener('click', lukkMer);
  el('mer').addEventListener('click', function (e) {
    if (e.target === el('mer')) { lukkMer(); return; }
    const b = e.target.closest('[data-mer]');
    if (!b) return;
    lukkMer();
    el('faneMer').focus({ preventScroll: true });
    openInfo(b.dataset.mer);
  });

  document.addEventListener('keydown', function (e) {
    const d = el('detalj'), m = el('mer');
    if (!d.hidden && !el('infoScrim').classList.contains('over-side')) { if (e.key === 'Escape') { e.preventDefault(); lukkDetalj(); } else fangTab(e, d); return; }
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
const FILTERFELT = ['fBydel', 'fCuisine', 'fPrice', 'fAlkohol'];


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
  if (id) {
    kortLavt = false;                                   // et nytt valgt sted kommer alltid opp som kort, i midtstilling
    if (listeHalv && erMobil() && !fromList) settVisning('kart');
  }
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
  // regnet fra kartkortets hjørne: zoom øverst til høyre, Nærmest nede til venstre
  return { venstre: 0, hoyre: W - 60, topp: 20, bunn: H - 80 };
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

// Lenker rett til en infoside: halalkartet.no/#personvern åpner Personvern, og #kontakt åpner Kontakt oss.
// De engelske navnene bytter også til engelsk. Med -app bak vises teksten slik den står i appen,
// og det er den adressen App Store peker på.
const INFOLENKER = {
  'personvern': ['personvern'], 'vilkar': ['vilkar'], 'faq': ['faq'], 'om': ['om'], 'kontakt': ['kontakt'], 'tips': ['tips'],
  'privacy': ['personvern', 'en'], 'terms': ['vilkar', 'en'], 'about': ['om', 'en'], 'contact': ['kontakt', 'en'],
  'personvern-app': ['personvern', '', true], 'privacy-app': ['personvern', 'en', true]
};
function infolenke(id) { return Object.prototype.hasOwnProperty.call(INFOLENKER, id) ? INFOLENKER[id] : null; }
function applyHash() {
  let id = '';
  try { id = decodeURIComponent((location.hash || '').replace(/^#/, '')); } catch (e) { return false; }
  if (id && byId(id)) { setActive(id, true); return true; }
  const side = infolenke(id);
  if (side) {
    if (side[1] === 'en' && sprak !== 'en') byttSprak();
    openInfo(side[0], side[2] === true);
    return true;
  }
  return false;
}

// Utvalgte steder: ett sted om gangen i en boks. Man sveiper sidelengs til neste, eller trykker på prikkene under.
function tegnUtvalgte() {
  const list = el('utvalgtListe');
  if (!list) return;
  const steder = currentHighlights();
  list.innerHTML =
    '<div class="utv-bane" id="utvBane" tabindex="0" role="group" aria-label="' + T('Utvalgte steder') + '">' +
    steder.map(function (s, i) {
      return '<article class="utv-kort" aria-label="' + esc(s.name + ', ' + T('{i} av {n}', { i: i + 1, n: steder.length })) + '">' +
        '<header class="utv-topp">' + stempel('utv' + i) +
          '<h3>' + esc(s.name).replace(/\//g, '/<wbr>') + '</h3>' +
          '<p class="utv-meta">' + metaTekst(s) + '</p>' +
        '</header>' +
        '<div class="utv-kropp">' +
          (s.description ? '<p class="utv-om">' + esc(T(s.description)) + '</p>' : '') +
          (s.address ? '<p class="utv-adr">' + esc(s.address) + '</p>' : '') +
          '<div class="utv-knapper">' +
            '<a class="knapp primar" href="' + esc(ruteUrl(s)) + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' + T('Veibeskrivelse') + '</a>' +
            '<button type="button" class="knapp" data-utvalgt="' + esc(s.id) + '">' + T('Vis på kartet') + '</button>' +
          '</div>' +
        '</div></article>';
    }).join('') + '</div>' +
    '<div class="utv-prikker">' + steder.map(function (s, i) {
      return '<button type="button" data-utv="' + i + '" aria-label="' + esc(T('{i} av {n}', { i: i + 1, n: steder.length })) + '"' + (i ? '' : ' aria-current="true"') + '></button>';
    }).join('') + '</div>';
  el('utvalgtSub').textContent = T('Mat det er verdt å ta turen for. Sveip deg gjennom og finn ditt neste favorittmåltid.');
  // prikkene følger boksen som står fremme
  const bane = el('utvBane'), prikker = list.querySelectorAll('.utv-prikker button');
  let vent = 0;
  bane.addEventListener('scroll', function () {
    cancelAnimationFrame(vent);
    vent = requestAnimationFrame(function () {
      const midt = bane.scrollLeft + bane.clientWidth / 2;
      let naa = 0;
      Array.prototype.forEach.call(bane.children, function (k, i) { if (k.offsetLeft <= midt) naa = i; });
      prikker.forEach(function (p, i) { if (i === naa) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
    });
  }, { passive: true });
  list.querySelector('.utv-prikker').addEventListener('click', function (e) {
    const p = e.target.closest('[data-utv]');
    if (p) bane.children[+p.dataset.utv].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  });
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
    else if (b.dataset.act === 'tider') track('apningstider', { navn: s.name });
  });
}
function shareSpot(s) {
  // appen deler en lenke til nettsiden, så den virker også for dem som ikke har appen
  const url = (APP ? 'https://halalkartet.no/' : location.origin + location.pathname) + '#' + encodeURIComponent(s.id);
  track('del_sted', { navn: s.name });
  if (APP) {
    APP.del({ title: s.name, text: s.name + ' – ' + T(STATUS[s.halalStatus].label), url: url }).catch(function () {});
    return;
  }
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
// handling: det som skjer når man trykker på meldingen. Da blir den stående lenger.
function toast(msg, handling) {
  let t = el('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.onclick = handling || null;
  t.classList.toggle('trykk', !!handling);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, handling ? 6000 : 2600);
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
  const knapper = [el('nearme'), el('faneNaer'), el('pcNaer'), el('pcNaermest')].filter(Boolean);
  const laster = paa => knapper.forEach(k => k.classList.toggle('loading', paa));
  track('naer_meg');
  if (!APP && !navigator.geolocation) { toast(T('Nettleseren din støtter ikke posisjon.')); return; }
  // Vet kartet allerede hvor du er, flytter det seg dit med en gang, og posisjonen friskes opp i bakgrunnen.
  // Ellers snurrer knappen til telefonen har svart.
  const kjent = !!userLoc && Date.now() - posisjonTid < POSISJON_FERSK;
  if (kjent) goTo(userLoc.lat, userLoc.lng, 14.5); else laster(true);
  // svarer man aldri på spørsmålet om posisjon, skal knappen ikke bli stående låst
  const slipp = setTimeout(() => laster(false), 15000);
  const utenfor = () => !map.getBounds().contains([userLoc.lat, userLoc.lng]);
  const funnet = pos => {
    clearTimeout(slipp);
    // knappen slippes først, så den aldri blir stående låst om noe under skulle gå galt
    laster(false);
    visPosisjon(pos);
    if (!kjent) goTo(userLoc.lat, userLoc.lng, 14.5);
    else if (utenfor()) goTo(userLoc.lat, userLoc.lng, map.getZoom());
    if (el('fSort') && !el('fSort').value) {
      el('fSort').value = 'avstand';
      pcGruppe = false; el('pcSort').value = '';
    }
    render();
  };
  // Appen svarer først raskt og så nøyaktigere. Da flyttes prikken, og kartet bare hvis prikken havnet utenfor bildet.
  const finere = pos => {
    visPosisjon(pos);
    if (utenfor()) goTo(userLoc.lat, userLoc.lng, map.getZoom());
    render();
  };
  const ikkeFunnet = feil => {
    clearTimeout(slipp);
    laster(false);
    // kartet står allerede på posisjonen fra i sted. Da sier vi bare fra hvis appen har mistet lov til å bruke posisjon.
    if (kjent && !(feil && (feil.grunn === 'nektet' || feil.grunn === 'av' || feil.code === 1))) return;
    track('naer_meg_avslag');
    if (el('fSort') && el('fSort').value === 'avstand') {
      el('fSort').value = '';
      pcGruppe = true; el('pcSort').value = 'bydel';
    }
    // appen vet hvorfor det ikke gikk, og kan sende deg rett til Innstillinger
    const grunn = APP && feil ? feil.grunn : null;
    if (grunn === 'nektet') toast(T('Halalkartet har ikke tilgang til posisjonen din. Trykk her for å åpne Innstillinger.'), APP.innstillinger);
    else if (grunn === 'av') toast(T('Stedstjenester er slått av på telefonen. Slå dem på i Innstillinger for å se steder nær deg.'));
    else if (APP) toast(T('Fant ikke posisjonen din akkurat nå. Prøv igjen om litt.'));
    else toast(T('Fant ikke posisjonen din. Sjekk at nettleseren har tilgang til posisjon.'));
  };
  // i appen spør telefonen selv om lov første gang, med appens egen forklaring
  if (APP) APP.posisjon(finere).then(funnet, ikkeFunnet);
  else navigator.geolocation.getCurrentPosition(funnet, ikkeFunnet, { enableHighAccuracy: true, timeout: 10000 });
}
// Setter den blå prikken der du står. Pila på knappen fylles, så det synes at kartet vet hvor du er.
function visPosisjon(pos) {
  userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  posisjonTid = Date.now();
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker([userLoc.lat, userLoc.lng], {
    icon: L.divIcon({ className: '', html: '<div class="userloc"></div>', iconSize: [16,16], iconAnchor: [8,8] }),
    zIndexOffset: 1000
  }).addTo(map);
  el('nearme').classList.add('aktiv');
  if (el('faneNaer')) el('faneNaer').classList.add('aktiv');
}

// Infovinduet
function wireInfo() {
  document.querySelectorAll('.info-tab').forEach(t =>
    t.addEventListener('click', () => showInfo(t.dataset.tab)));
  el('infoClose').addEventListener('click', closeInfo);
  el('infoScrim').addEventListener('click', e => { if (e.target === el('infoScrim')) closeInfo(); });
  // Esc med spørsmålsboblen over stedssiden: lukk bare boblen, ikke stedssiden under
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && el('infoScrim').classList.contains('over-side')) { e.stopPropagation(); closeInfo(); }
  }, true);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeInfo(); return; }
    if (e.key === 'Tab') trapFocus(e);
  });
}
function openInfo(section, appTekst) {
  // Støtt oss er tatt ut av appen inntil videre
  if (APP && section === 'stott') return;
  // på nettsiden vises appens utgave av teksten bare når lenken ber om det
  document.documentElement.classList.toggle('app-tekst', appTekst === true);
  lastFocus = document.activeElement;
  track('apnet_side', { side: section });
  if (!el('tipsOk').hidden) nyttTips();
  el('kontaktOk').hidden = true;
  el('infoScrim').classList.add('open');
  showInfo(section);
  el('infoClose').focus();
}
function closeInfo() {
  const scrim = el('infoScrim');
  if (!scrim.classList.contains('open')) return;
  scrim.classList.remove('open', 'over-side');
  document.documentElement.classList.remove('app-tekst');
  // kom man hit med en lenke til infosiden, ryddes den bort fra adressen når vinduet lukkes
  let hash = '';
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
  if (infolenke(hash)) history.replaceState(history.state, '', location.pathname + location.search);
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
  if (section === 'utvalgte') requestAnimationFrame(tilpassUtvNavn);
}
// Utvalgte steder: navnet krymper til det lengste ordet får plass ved siden av stempelet (31 px ned til 22 px)
function tilpassUtvNavn() {
  document.querySelectorAll('.utv-topp h3').forEach(function (h3) {
    h3.style.fontSize = '';
    if (!h3.clientWidth) return;
    // målt uten orddeling, så navnet krymper før et ord deles
    h3.style.overflowWrap = 'normal'; h3.style.webkitHyphens = h3.style.hyphens = 'manual';
    let fs = parseFloat(getComputedStyle(h3).fontSize);
    while (h3.scrollWidth > h3.clientWidth + 1 && fs > 22) { fs -= 1; h3.style.fontSize = fs + 'px'; }
    // Ord deles bare når et ord fortsatt er for langt i minste skrift. Ellers står delingen av, slik den gjør under målingen:
    // da deler ikke nettleseren ord som har plass, og et ord som er en brøkdel av et punkt for bredt, blir ikke brutt.
    if (h3.scrollWidth > h3.clientWidth + 1) h3.style.overflowWrap = h3.style.webkitHyphens = h3.style.hyphens = '';
  });
}
window.addEventListener('resize', function () { if (document.querySelector('.utv-topp h3')) tilpassUtvNavn(); });
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
  if (APP) data.set('sendt fra', 'iPhone-appen');
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
      el('tipsNy').hidden = false;
    });
  });
  el('tipsNy').addEventListener('click', function () {
    nyttTips();
    f.querySelector('input[name="restaurant"]').focus();
  });
}
// Tar fram tipsskjemaet igjen etter et sendt tips
function nyttTips() {
  el('tipsOk').hidden = true;
  el('tipsNy').hidden = true;
  el('tipsForm').hidden = false;
  el('tipsSend').hidden = false;
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
  { del: 'kjokken', id: 'fCuisine', navn: 'Cuisine', alle: 'Alle' },
  { del: 'omrade', id: 'fBydel', navn: 'Område', alle: 'Alle områder' },
  { del: 'pris', id: 'fPrice', navn: 'Pris', alle: 'Alle priser' }
];
const PC_SORT = [['', 'Standard'], ['avstand', 'Nærmest'], ['navn', 'A–Å'], ['pris', 'Pris']];
const CHEV = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

function tegnPc() {
  if (erMobil() || !el('pcFilter') || !HALAL_SPOTS.length) return;
  tegnPcFilter();
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
    ? ['status', 'valg', 'v', 'pc', 'pcsort'].map(function (a) { return document.activeElement.dataset[a]; }) : null;

  // to av/på-knapper: Kun verifisert og Uten alkohol, som på mobil
  const utenAlkohol = el('fAlkohol').value === 'uten';
  const status =
    '<button type="button" class="pc-valgknapp" data-pc="verifisert" aria-pressed="' + (strict === 0) + '"><span>' + T('Kun verifisert') + '</span></button>' +
    '<button type="button" class="pc-valgknapp" data-pc="alkohol" aria-pressed="' + utenAlkohol + '" aria-label="' + T('Uten kjent alkoholservering') + '"><span>' + T('Uten alkohol') + '</span></button>';

  const sort = el('fSort').value;
  const sorter = PC_SORT.map(function ([v, navn]) {
    return '<button type="button" class="pc-sortknapp" data-pcsort="' + v + '" aria-pressed="' + (sort === v) + '">' + T(navn) + '</button>';
  }).join('');
  const treff = passer.filter(function (s) { return layerOn[s.halalStatus]; }).length;
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
    '<div class="pc-statusgruppe" role="group" aria-label="' + T('Filtre') + '">' + status + '</div>' +
    '<span class="pc-skille" aria-hidden="true"></span>' +
    '<div class="pc-valggruppe">' + valg + '</div>' +
    '<span class="pc-skille" aria-hidden="true"></span>' +
    sprakknapp('pc-sprak', 'data-pc="sprak"') +
    '<span class="pc-skille pc-brudd" aria-hidden="true"></span>' +
    '<div class="pc-sortgruppe" role="group" aria-label="' + T('Sorter listen') + '"><span class="pc-sort-etikett" aria-hidden="true">' + T('Sorter') + '</span>' + sorter + '</div>' +
    '<p class="pc-treff" aria-live="polite"><b>' + treff + '</b> ' + (strict === 0 && !pcVisLagret && treff < HALAL_SPOTS.length && filterTekst() === ' · ' + T('kun verifisert')
      ? esc(T('av {n} steder som er', { n: HALAL_SPOTS.length })) + ' <em class="bunn-kun">' + esc(T('kun verifisert')) + '</em>'
      : (sprak === 'en' ? (treff === 1 ? 'result' : 'results') : 'treff')) + '</p>' +
    '<button type="button" class="pc-nullstill" data-pc="nullstill"' + (antallAktive() || f.q || f.sort || !pcGruppe || pcVisLagret || activeId ? '' : ' disabled') + '>' + T('Nullstill') + '</button>';

  if (fokus) {
    const [st, vg, v, pc, so] = fokus;
    let sel = st ? '[data-status="' + st + '"]' : pc ? '[data-pc="' + pc + '"]' : vg ? '.pc-valgknapp[data-valg="' + vg + '"]' : so !== undefined ? '[data-pcsort="' + so + '"]' : null;
    if (pc === 'velg') sel = '[data-pc="velg"][data-valg="' + vg + '"][data-v="' + CSS.escape(v || '') + '"]';
    const ny = sel && boks.querySelector(sel);
    if (ny) ny.focus({ preventScroll: true });
  }
}

function pcRad(s) {
  return '<button type="button" class="pc-rad" data-pcvelg="' + esc(s.id) + '">' +
    '<span class="pc-rad-tekst"><span class="pc-rad-navn">' + esc(s.name) + '</span>' +
    '<span class="pc-rad-meta">' + esc(s.cuisines[0] ? T(s.cuisines[0]) : '') + ' · ' + '$'.repeat(s.price) + '</span></span></button>';
}

function pcValgtKort(s) {
  const tel = s.phone ? String(s.phone).replace(/\s+/g, '') : '';
  const gate = s.address ? s.address.split(',')[0].trim() : s.bydel;
  const meta = [esc(s.cuisines[0] ? T(s.cuisines[0]) : ''), '$'.repeat(s.price)];
  const verifisert = s.halalStatus === 'verifisert';
  return '<article class="pc-valgt' + (verifisert ? ' har-stempel' : '') + '" tabindex="-1" data-id="' + esc(s.id) + '" aria-label="' + esc(s.name) + '">' +
    hjerte(s, 'pc-valgt-hjerte') + (verifisert ? stempel('kort') : '') +
    '<h3>' + esc(s.name) + '</h3>' +
    '<p class="pc-valgt-meta">' + meta.join(' · ') + '</p>' +
    '<p class="pc-valgt-status">' + skjold(s, true) + '</p>' +
    '<dl class="pc-valgt-info"><div><dt>' + T('Adresse') + '</dt><dd>' + esc(gate) + '</dd></div>' +
      (tel ? '<div><dt>' + T('Telefon') + '</dt><dd><a href="tel:' + esc(tel) + '">' + esc(s.phone) + '</a></dd></div>' : '') +
      '<div><dt>' + T('Åpningstider') + '</dt><dd>' + tiderLenke(s, 'Se åpningstider', 'pc-tider') + '</dd></div></dl>' +
    '<div class="pc-valgt-knapper">' +
      '<a class="primar" href="' + esc(ruteUrl(s)) + '" target="_blank" rel="noopener" data-act="rute" data-id="' + esc(s.id) + '">' + IKON2.rute + T('Veibeskrivelse') + '</a>' +
      '<button type="button" data-detalj="' + esc(s.id) + '">' + T('Se hele siden') + '</button>' +
    '</div></article>';
}

function pcKjede(g) {
  const apen = !!kjedeApen[kjedeNokkel(g)] || g.filialer.some(function (s) { return s.id === activeId; });
  const omrader = [...new Set(g.filialer.map(function (s) { return s.bydel; }))];
  return '<div class="pc-kjede' + (apen ? ' apen' : '') + '">' +
    '<button type="button" class="pc-rad" data-pckjede="' + esc(kjedeNokkel(g)) + '" data-antall="' + g.filialer.length + '" aria-expanded="' + apen + '">' +
      '<span class="pc-rad-tekst"><span class="pc-rad-navn">' + esc(g.navn) + '</span>' +
      '<span class="pc-rad-meta">' + T('{n} steder', { n: g.filialer.length }) + ' · ' + esc(omrader.length <= 2 ? omrader.join(T(' og ')) : T('{n} områder', { n: omrader.length })) + '</span></span></button>' +
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
  ['pcTopp', 'pcFilter', 'pcListe', 'map'].forEach(function (id) { el(id).inert = true; });
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
  ['pcTopp', 'pcFilter', 'pcListe', 'map'].forEach(function (id) { el(id).inert = false; });
  el('pcMenyknapp').setAttribute('aria-expanded', 'false');
  setTimeout(function () {
    if (sk.classList.contains('apen')) return;
    sk.hidden = true;
    if (el('detalj').hidden) sj.hidden = true;
  }, reduceMotion ? 0 : 320);
  if (skuffFra && document.contains(skuffFra)) skuffFra.focus({ preventScroll: true });
}

// PC: «Nærmest» nede til venstre på kartet finner posisjonen og sorterer lista etter avstand. Mobilen har sin egen knapp.
function leggTilNaermest() {
  const Naermest = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd: function () {
      const b = L.DomUtil.create('button', 'pc-naermest');
      b.type = 'button'; b.id = 'pcNaermest';
      b.setAttribute('aria-label', 'Finn de nærmeste stedene'); b.dataset.ta = 'aria-label';
      b.innerHTML = IKON2.rute + '<span data-t>Nærmest</span>';
      L.DomEvent.disableClickPropagation(b);
      L.DomEvent.on(b, 'click', locateUser);
      return b;
    }
  });
  new Naermest().addTo(map);
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
    pcGruppe = el('pcSort').value === 'bydel';
    track('grupper_pc', { bydel: pcGruppe });
    render();
  });

  el('pcFilter').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pc === 'verifisert') {
      strict = strict === 0 ? 2 : 0; applyStrict();
      track('hurtigfilter', { filter: 'kun_verifisert' });
      render(); foelgFilter();
    } else if (b.dataset.pc === 'sprak') {
      byttSprak();
    } else if (b.dataset.pc === 'alkohol') {
      el('fAlkohol').value = el('fAlkohol').value ? '' : 'uten';
      el('fAlkohol').dispatchEvent(new Event('change'));
      render();
    } else if (b.dataset.pc === 'velg') {
      const v = PC_VALG.find(function (x) { return x.del === b.dataset.valg; });
      el(v.id).value = b.dataset.v;
      pcApen = null;
      el(v.id).dispatchEvent(new Event('change'));
      render();
      const k = el('pcFilter').querySelector('.pc-valgknapp[data-valg="' + v.del + '"]');
      if (k) k.focus({ preventScroll: true });
    } else if (b.dataset.pcsort !== undefined) {
      const v = b.dataset.pcsort;
      el('fSort').value = v;
      // nærmest gir mest mening som én lang liste, ikke delt på områder
      if (v === 'avstand') { pcGruppe = false; el('pcSort').value = ''; }
      el('fSort').dispatchEvent(new Event('change'));
      render();
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
  window.addEventListener('resize', function () { if (!erMobil()) tegnPc(); else lukkSkuff(); });
}
