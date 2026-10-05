# Halalkartet

Kart over halal mat i Norge, på [halalkartet.no](https://halalkartet.no). Statisk side uten backend. Alle stedene ligger i `spots.json`.

## Filer

| Fil | Innhold |
|---|---|
| `index.html` | Markup og CSS |
| `app.js` | Kart, liste, filtre, søk og skjemaer |
| `analytics.js` | Google Analytics uten cookies |
| `spots.json` | Stedene |
| `favicon.svg`, `apple-touch-icon.png` | Ikonet i fanen og på hjemskjermen |
| `CNAME` | Domenet for GitHub Pages |

## Kjøre lokalt

`spots.json` hentes med fetch, så siden må serveres over http:

```bash
python3 -m http.server
```

Åpne `http://localhost:8000`.

## Publisering

GitHub Pages bygger fra `main` med `.github/workflows/static.yml`. Det er ingen byggesteg.

GitHub Pages lar nettleseren huske filene i ti minutter. Derfor lastes `app.js` og `analytics.js` med et versjonsnummer, `app.js?v=…`. Endrer du en av dem, må du også bytte tallet etter `?v=` i `index.html`. Ellers kan en besøkende få ny `index.html` sammen med gammel `app.js`, og da virker ikke siden.

## Skjemaene

Tips- og kontaktskjemaet sendes til [Formspree](https://formspree.io), som videresender dem på e-post. Adressen til skjemaet står i `SKJEMA_ENDEPUNKT` øverst i skjemadelen av `app.js`, f.eks. `https://formspree.io/f/abcdwxyz`. Står den tom, er skjemaene avslått og sier fra om det. Gratisplanen tar imot 50 innsendinger i måneden.

## Felter i spots.json

| Felt | Type | Påkrevd | Merknad |
|---|---|---|---|
| `id` | tekst | ja | Unik, f.eks. `gronland-kebab`. Brukes i delte lenker, så ikke endre den. |
| `name` | tekst | ja | |
| `description` | tekst | ja | Én kort setning. |
| `bydel` | tekst | ja | Bydel i Oslo, ellers byen. Brukes i områdefilteret. |
| `address` | tekst | ja | Gate og postnummer. |
| `lat`, `lng` | tall | ja | Koordinater. |
| `halalStatus` | tekst | ja | `verifisert`, `delvis` eller `uavklart`. |
| `verification` | tekst | nei | Hvordan statusen er bekreftet. Vises i kortet. |
| `chain` | tekst | nei | Kjedenavn. Bare når minst to filialer er med. Filialene samles i én rad i listen. |
| `cuisines` | liste | ja | F.eks. `["Tyrkisk", "Kebab"]`. |
| `price` | tall | ja | `1`, `2` eller `3` (vises som $, $$, $$$). |
| `phone` | tekst | nei | |
| `website` | tekst | nei | Full `https://`-adresse. |
| `hours` | tekst | nei | Stengetid, f.eks. `Stenger kl. 23` eller `Midlertidig stengt`. |
| `opens` | tekst | nei | Åpningstid, `HH:MM`. Uten den vet kartet bare når stedet stenger. |
| `alcohol` | boolsk | nei | `true` hvis stedet serverer alkohol som drikke. Utelat ellers. Alkohol i maten gjør stedet `delvis`. |
| `lastVerified` | dato | nei | `YYYY-MM-DD`, når statusen sist ble sjekket. Vises i kortet. |

## Halalstatus

| Verdi | Farge | Betyr |
|---|---|---|
| `verifisert` | grønn | Hele menyen er halal, helst med sertifikat. |
| `delvis` | oransje | Deler av menyen er ikke halal, f.eks. svin. |
| `uavklart` | grå | Ikke bekreftet ennå. |

Er du i tvil, velg det laveste nivået. Skriv alltid hvordan statusen er bekreftet i `verification`.

Sertifisering i Norge: Halal Kontroll og Islamsk Råd Norge. Mattilsynet sertifiserer ikke halal.

## Koordinater

Søk opp adressen i Google Maps og høyreklikk på punktet. Første tall er `lat`, andre er `lng`. Eller bruk [nominatim.openstreetmap.org](https://nominatim.openstreetmap.org).
