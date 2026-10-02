# ريف القصيم · RIF Qassim — prototype

A working, high-fidelity prototype of the RIF Qassim rural-tourism ecosystem:
RIF Business (farm owners) → RIF Core (development & operations) → RIF
Experiences (visitors). Arabic RTL first, English available.

This is a pre-launch prototype. Destinations, prices, availability and every
financial figure are illustrative. No payments are taken and no data leaves
the browser.

## Run it

The pages use ES modules, so open them through a local web server (opening
the HTML file directly from disk will not load the scripts):

- VS Code: install "Live Server", right-click `index.html` → Open with Live Server
- or in a terminal, from this folder: `npx serve .`  or  `python3 -m http.server 8000`

Then visit `http://localhost:8000/` (or the address the tool prints).

## Your logo

1. Copy the official logo into `assets/logo/` (SVG preferred, PNG fine).
2. In `js/data/brand.js`, set `file: "assets/logo/your-file.svg"`.

It then appears in the header, mobile menu and footer of every page. For dark
grounds, set `fileOnDark` to a light version, or keep `onDark: "invert"` for a
single-colour logo. Until `file` is set, a typeset wordmark is shown.

## Real photography

Every image is a key in `js/data/media.js`. Keys without a `src` show a drawn
demo scene labelled «صورة توضيحية». To use a real photo, put it in
`assets/images/` and set `src: "assets/images/<name>.jpg"` for that key
(optionally `focal: "50% 30%"`). Layout and components do not change.

## Structure

```
index.html                 Homepage (cinematic story)
pages/
  destinations.html        All destinations, filters, map
  destination-detail.html  Destination detail (?id=sidr), booking drawer
  experiences.html         Categories, filters, grouped by destination
  booking.html             5-step booking flow
  business.html            Owner landing
  assessment.html          7-step farm assessment
  assessment-result.html   Preliminary assessment report
  owner-dashboard.html     Owner workspace
  admin.html               Internal workspace (demo)
  styleguide.html          Design system & component reference
css/
  variables.css            Design tokens
  global.css               Base, typography, layout primitives
  components.css           Shared components
  motion.css               Reveals, keyframes, reduced motion
  responsive.css           Breakpoints 360 → 1920
  pages/*.css              Per-page styles
js/
  core/                    dom (safe templating), store, i18n, format, paths
  data/                    Centralised mock data (destinations, packages, …)
  services/                api (mock async), pricing, availability, scoring, feasibility
  components/              shell, media, cards, forms, overlay, toast, charts, icons
  pages/                   One controller per page
assets/                    Logo slot, images, contour pattern, favicon
```

## Connecting a backend later

Pages only talk to `js/services/api.js`. Replace those async functions with
real API calls (REST, Supabase, Firebase); pages and components stay the same.
State that the demo keeps in `localStorage` (`js/core/store.js`) maps onto
backend resources one-to-one: bookings, assessments, study requests, farm
stages and booking statuses.

## Build status

- Part 1 — Foundation: design system, core, data, services, components, `pages/styleguide.html`
- Part 2 — Homepage, destinations, destination detail
- Part 3 — Experiences (categories + filters) and the 5-step booking flow
  (`pages/booking.html?package=<package or experience id>`, `?ref=<booking ref>`
  reopens a confirmation made in this browser)
- Part 4 — Owner landing (`pages/business.html`), 7-step assessment
  (`pages/assessment.html`, saved draft, resume, conditional questions) and the
  report (`pages/assessment-result.html`, `?example=1` for a sample farm):
  readiness from `services/scoring.js`, scenarios from
  `services/feasibility.js`, editable assumptions, study request.
  Submissions appear in the shared farm pipeline as new opportunities.
- Part 5 — Owner workspace (`pages/owner-dashboard.html`, views `#home #farm
  #opportunities #numbers #study #activity #profile`). Reads the stored
  assessment and the shared farm record; scenarios through the shared scenario
  view (`js/components/scenarios.js`), opportunities through
  `js/services/opportunities.js`, study requests through
  `js/components/study-request.js`. Farm edits go through
  `api.updateFarmAnswers`, which re-scores with the existing engine.
  Without a submitted assessment it shows a labelled demo owner.
- Part 6 — Internal workspace, RIF OS (`pages/admin.html`; routes
  `#overview #pipeline #farm/<id> #assessments #studies #bookings
  #destinations #experiences #packages #people #analytics #settings`).
  Reads the same shared lists as the public site and owner workspace; status
  changes (farm stage, booking, study request) and content edits (destination
  status/text, pausing experiences or packages) persist in the shared store
  and show up on the public and owner side. Demo only: no sign-in or
  permissions.

To preview error states, add `?simulate=error` to any page URL that loads
data (destinations, destination detail, experiences, booking, owner
workspace, admin).

## One application

Serve this folder once and the whole product works from it: public site,
owner journey and the Rif team workspace share one data layer
(`js/core/store.js`, read and written only through `js/services/api.js`),
saved in the browser's localStorage under `rif:v1:*` and synced across tabs.

Addresses carry their state, so refresh, back/forward and direct links work:
`destination-detail.html?id=sidr`, `booking.html?package=pkg-full-day`,
`booking.html?ref=RIF-…` (a confirmation), `assessment-result.html?ref=ASM-…`,
`owner-dashboard.html#study`, `admin.html#farm/<id>`,
`admin.html#bookings/<ref>`, `admin.html#studies/<ref>`.

The separate preview files (rif-qassim-preview.zip) are generated from this
project for visual review only; they are not part of the application.

## Prices

All prices live in one file: `js/data/prices.js` (SAR, before 15% VAT):
experiences, food, stays, products, package bundles and their add-ons, the
"from" price of each destination, and the market benchmarks behind the owner
report's default assumptions. Data files and pages only reference it; the
pricing engine adds VAT and totals.

## Booking engine

One engine for every booking: `js/services/bookable.js` (packages and
experiences in one shape), `js/services/booking.js` (draft, quote, submit),
`js/services/pricing.js` (lines, VAT 15%) and `js/services/availability.js`
(weekdays, seasons, event dates, demo capacity). The booking page is the only
place bookings are made; every "احجز" in the product links to it.

## Demo data loop

- A booking made as a visitor appears in the admin bookings view.
- An assessment submitted by an owner appears in the admin pipeline as a new
  opportunity, and on the owner dashboard.
- "عرض تجريبي" (bottom corner) switches perspectives and resets demo data.

## Fonts

IBM Plex Sans Arabic / IBM Plex Sans / IBM Plex Mono load from Google Fonts
without blocking the page. Offline, the system Arabic font is used.
