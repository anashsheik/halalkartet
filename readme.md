# Halal i Oslo

A ship-fast, static halal food finder for Oslo. No backend, no database — just an
`index.html` that reads all listings from `spots.json` and draws them on a map,
colored by halal status.

```
halal-oslo/
├── index.html   ← markup + styling for the app (map, filters, list). You rarely touch this.
├── app.js       ← the app logic (rendering, filters, search, geolocation). You rarely touch this.
├── spots.json   ← the data. This is what you edit and grow.
└── README.md    ← this file.
```

---

## Running it locally

Because the app fetches `spots.json`, browsers block it if you just double-click
`index.html` (the `file://` protocol forbids local fetches). Run a tiny server
from inside the folder instead:

```bash
cd halal-oslo
python3 -m http.server
```

Then open `http://localhost:8000`. Once the site is deployed, this is a non-issue —
it just works.

## Deploying (pick one, all free)

- **Netlify / Vercel** — drag the folder into their dashboard, or connect a Git repo.
- **GitHub Pages** — push the folder to a repo, enable Pages on the branch.

No build step. It's three files.

---

## The data schema

Every entry in `spots.json` is one object with these fields.

| Field          | Type            | Required | Notes |
|----------------|-----------------|----------|-------|
| `id`           | string          | yes      | Unique, url-safe slug, e.g. `gronland-kebab`. Never reuse. |
| `name`         | string          | yes      | Display name. |
| `description`  | string          | yes      | One short sentence. |
| `bydel`        | string          | yes      | Area label. An Oslo district (`Grønland`, `Grünerløkka`) or, outside Oslo, the town (`Drammen`, `Strømmen`, `Trondheim`). Powers the area filter. |
| `address`      | string          | yes      | Street address + postcode. |
| `lat`          | number          | yes      | Latitude, decimal degrees (see geocoding below). |
| `lng`          | number          | yes      | Longitude, decimal degrees. |
| `halalStatus`  | enum            | yes      | One of `verifisert`, `delvis`, `uavklart`. Sets the pin color. |
| `verification` | string          | no       | Plain-language note on *how* halal status was confirmed. Shown in the popup. |
| `cuisines`     | array of string | yes      | e.g. `["Tyrkisk", "Kebab"]`. Powers the cuisine filter. |
| `price`        | number          | yes      | `1` = rimelig, `2` = middels, `3` = dyrere. Vises som `$`, `$$`, `$$$`. |
| `phone`        | string or null  | no       | |
| `website`      | string or null  | no       | Full `https://` URL. |
| `hours`        | string or null  | no       | Closing time as free text, e.g. `Stenger kl. 23`, `Stengt nå`, `Midlertidig stengt`. Parsed into the open/closing-soon/closed badge. |
| `opens`        | string          | no       | Opening time, `HH:MM`. Without it the app only knows when a place *closes*, so at 08:00 it will still say "Stenger kl 23" for somewhere that opens at 11. Add it and the badge reads "Åpner kl 11" instead. |
| `alcohol`      | boolean         | no       | Set to `true` only when you know the place serves alcoholic **drinks** while the food itself is halal. Adds a note to the popup and is what the alcohol filter matches on. Leave the field out otherwise — a missing field means "no known alcohol service", not "confirmed dry". Alcohol *in the food* is not this field; that makes a place `delvis`. |
| `lastVerified` | string (date)   | no       | `YYYY-MM-DD`. When you last confirmed the halal status. Very important — see below. |

### Adding a spot

Copy an existing block, change the values, make sure the `id` is unique, and check
the JSON is still valid (no trailing commas). That's the whole workflow.

---

## Halal status: the heart of this app

The one thing this app must get right is **trust**. A user needs to know not just
that a place claims to be halal, but *how strong that claim is*. That's why the
status is a three-level field, not a yes/no — and why the pin color matches it.

| Value        | Pin   | Means | Set it when… |
|--------------|-------|-------|--------------|
| `verifisert` | green | Confirmed 100% halal. | A halal certificate is on file / displayed, or you're otherwise confident the whole menu is halal. |
| `delvis`     | amber | Partially halal: part of the menu isn't. | The kitchen serves both halal and non-halal dishes (e.g. halal meat but non-halal alcohol-based items, or only some proteins are halal). |
| `uavklart`   | grey  | Not yet confirmed. | You couldn't confirm halal status one way or the other — staff assurance was unclear, or you haven't checked yet. |

This mirrors how the largest global halal directory (Zabihah) grades listings —
"certificate on file" vs. "halal sign visible" vs. "verbal assurance from staff" —
so users coming from that world will find it familiar.

### Who certifies halal in Norway (for the `verifisert` tier)

- **Halal Kontroll (Halal Control Norway)** — the main independent certifier that
  inspects restaurants and food producers against a halal standard.
- **Islamsk Råd Norge (IRN)** — the umbrella body for Muslim organisations; it
  endorses standards and approves certifiers, and maintains a reference list of
  approved products.
- **Mattilsynet** (Norwegian Food Safety Authority) regulates food safety and
  labelling but does **not** run halal certification — don't treat a clean
  Mattilsynet record as a halal signal.

Only mark a spot `verifisert` if you can point to one of the first two.

### A note on honesty

`spots.json` holds real Oslo listings, not placeholder data — treat every edit
accordingly. Before adding or changing an entry, decide its `halalStatus` using the
table above and back it with a `verification` note. When in doubt, downgrade the
tier rather than overstate it. Publishing an unverified place as `verifisert` is the
one mistake this project can't afford.

---

## Collecting the real Oslo dataset

A practical order of operations:

1. **Seed the list from existing directories.** Zabihah (`zabihah.com`) is the
   biggest, free, and already has Oslo entries; search its Oslo / Østlandet pages.
   Cross-check with Google Maps and OpenStreetMap searches for "halal" plus the
   Grønland, Tøyen, and Grünerløkka areas, where most spots cluster.
2. **Add community knowledge.** Local mosque noticeboards, Norwegian Muslim
   community Facebook groups, and delivery apps (Foodora, Wolt) that tag halal
   restaurants surface places the directories miss.
3. **Verify each one before it goes live.** For every spot, decide the
   `halalStatus` using the table above, and write a one-line `verification` note
   ("Halal-sertifikat fra Halal Kontroll vises i lokalet" / "Personalet bekrefter
   muntlig"). When in doubt, downgrade the tier rather than overstate it.
4. **Stamp `lastVerified`.** Halal status changes when ownership or suppliers
   change — a place can quietly stop being halal. A visible date lets you (and
   later, users) know how fresh the claim is, and tells you what to re-check.

### Geocoding (turning an address into lat/lng)

For a small, curated list, the simplest path: search the address on Google Maps,
right-click the pin → the first numbers are `lat, lng`. Or use the free
Nominatim service (`nominatim.openstreetmap.org`) — paste the address, copy the
coordinates. Paste both into the spot's `lat` and `lng`.

---

## Growing beyond Oslo

Every spot already carries a `bydel` field, and the filters build themselves from
the data. When you expand to Bergen or Trondheim, the cleanest step is to add a
`city` field to each spot and a city filter — the rest of the app won't need to
change. Ship Oslo well first.