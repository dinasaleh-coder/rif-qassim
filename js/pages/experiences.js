/* ==========================================================================
   Experiences
   Categories + filters (date, guests, duration, price, destination) drive one
   request to the mock API; results are grouped under the destination they
   belong to, so each card keeps its place in that destination's story.
   One filter panel: inline on desktop, moved into a full-screen drawer on
   phones (no duplicated controls). State mirrors the URL.
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, mount, $, $$, on, observeReveals } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatMoney, formatNumber, formatDate, toISODate, count } from "../core/format.js";
import { route } from "../core/paths.js";
import { renderMedia } from "../components/media.js";
import { icon } from "../components/icons.js";
import { experienceCard, skeletonCards, emptyState, errorState, pageBand, playBand } from "../components/cards.js";
import { openDrawer } from "../components/overlay.js";
import { EXPERIENCE_CATEGORIES } from "../data/experiences.js";
import { DESTINATIONS, DESTINATION_TYPES, getDestinationById } from "../data/destinations.js";
import { today } from "../services/availability.js";
import * as api from "../services/api.js";

initShell({ page: "experiences", header: "overlay", bottomNav: true, footer: "full" });

const X = (ar, en) => L({ ar, en });
const PRICE_MAX = 2500;
const PRICE_STEP = 50;

const DURATIONS = [
  { id: "", label: X("أي مدة", "Any length") },
  { id: "short", label: X("حتى ساعتين", "Up to 2 hours") },
  { id: "half", label: X("نصف يوم", "Half day") },
  { id: "full", label: X("يوم كامل", "Full day") },
  { id: "stay", label: X("إقامة", "Overnight") },
];

/* ---- State (mirrors the URL) ------------------------------------------- */
const qs = new URLSearchParams(location.search);
const state = {
  category: qs.get("category") || "all",
  date: qs.get("date") || "",
  guests: Number(qs.get("guests")) || 0,
  duration: qs.get("duration") || "",
  priceMax: Number(qs.get("max")) || 0, // 0 = any
  destination: qs.get("destination") || "",
};
let reqId = 0;

function syncURL() {
  const u = new URL(location.href);
  const map = { category: state.category === "all" ? "" : state.category, date: state.date, guests: state.guests || "", duration: state.duration, max: state.priceMax || "", destination: state.destination };
  Object.entries(map).forEach(([k, v]) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k)));
  history.replaceState(null, "", u);
}

const apiFilters = () => ({
  category: state.category,
  date: state.date || undefined,
  guests: state.guests || undefined,
  duration: state.duration || undefined,
  priceMax: state.priceMax || undefined,
  destinationId: state.destination || undefined,
});

const activeCount = () => ["date", "guests", "duration", "priceMax", "destination"].filter((k) => state[k]).length;

/* ---- Markup ------------------------------------------------------------ */

function intro() {
  const dests = DESTINATIONS.filter((d) => d.status !== "soon").length;
  return pageBand({
    media: "exp-date-nights",
    crumbs: [{ label: t("nav.home"), href: route("home") }, { label: X("التجارب", "Experiences") }],
    title: X("تجارب من طبيعة المكان.", "Experiences drawn from the place."),
    lead: X(
      "كل تجربة هنا تنتمي إلى مزرعة أو بيت أو مخيم له قصته. اختر حسب اليوم وعدد من معك، ثم احجز مباشرة.",
      "Every experience here belongs to a farm, a house or a camp with its own story. Choose by day and group size, then book directly."
    ),
    facts: html`<span>${X("في", "Across")} <strong>${formatNumber(dests)}</strong> ${X("وجهات في القصيم", "destinations in Qassim")}</span><span>${X("إقامة، طعام، ورش، فعاليات، ومنتجات", "Stays, food, workshops, events and products")}</span>`,
  });
}

function categories() {
  return html`
    <nav class="ex-cats" aria-label="${X("فئات التجارب", "Experience categories")}">
      <div class="container container--wide">
        <div class="ex-cats__list" role="group" data-cats>
          ${[{ id: "all", label: X("الكل", "All") }, ...EXPERIENCE_CATEGORIES.map((c) => ({ id: c.id, label: L(c.label) }))].map(
            (c) => html`<button type="button" class="ex-cat" data-cat="${c.id}" aria-pressed="${state.category === c.id}">${c.label} <small data-cat-n="${c.id}"></small></button>`
          )}
        </div>
      </div>
    </nav>`;
}

/** The single filter panel (inline on desktop, in a drawer on phones). */
function filterPanel() {
  const min = toISODate(today());
  return html`
    <div class="ex-filters" data-filters>
      <label class="ex-f">
        <span class="ex-f__label">${X("التاريخ", "Date")}</span>
        <input class="input" type="date" data-f="date" min="${min}" value="${state.date}">
      </label>
      <label class="ex-f">
        <span class="ex-f__label">${X("عدد الأشخاص", "People")}</span>
        <select class="select" data-f="guests">
          <option value="0">${X("أي عدد", "Any")}</option>
          ${Array.from({ length: 12 }, (_, i) => i + 1).map((n) => html`<option value="${n}" ${state.guests === n ? "selected" : ""}>${count(n, "guests")}</option>`)}
        </select>
      </label>
      <label class="ex-f">
        <span class="ex-f__label">${X("المدة", "Length")}</span>
        <select class="select" data-f="duration">
          ${DURATIONS.map((d) => html`<option value="${d.id}" ${state.duration === d.id ? "selected" : ""}>${d.label}</option>`)}
        </select>
      </label>
      <label class="ex-f">
        <span class="ex-f__range"><span class="ex-f__label">${X("أعلى سعر", "Max price")}</span><strong class="num" data-price-out></strong></span>
        <input class="range" type="range" data-f="priceMax" min="${PRICE_STEP * 2}" max="${PRICE_MAX}" step="${PRICE_STEP}" value="${state.priceMax || PRICE_MAX}" aria-describedby="price-hint">
        <span class="visually-hidden" id="price-hint">${X("سعر الشخص أو الليلة أو الحجز قبل الضريبة", "Per person, night or booking, before VAT")}</span>
      </label>
      <button type="button" class="btn btn--ghost btn--sm" data-clear-all>${t("common.clear")}</button>
    </div>`;
}

function bar() {
  return html`
    <div class="ex-bar">
      <div class="container container--wide ex-bar__inner" data-bar>
        ${filterPanel()}
        <button type="button" class="btn btn--secondary btn--sm ex-filter-btn" data-open-filters>${icon("filter", { size: "sm" })} ${t("common.filter")} <span class="ex-filter-btn__n" data-active-n hidden></span></button>
        <p class="meta hide-desktop" data-count-mobile aria-hidden="true"></p>
      </div>
    </div>`;
}

function activeChips() {
  const chips = [];
  if (state.destination) chips.push(["destination", L(getDestinationById(state.destination)?.name)]);
  if (state.date) chips.push(["date", formatDate(state.date, { day: "numeric", month: "short" })]);
  if (state.guests) chips.push(["guests", count(state.guests, "guests")]);
  if (state.duration) chips.push(["duration", DURATIONS.find((d) => d.id === state.duration)?.label]);
  if (state.priceMax) chips.push(["priceMax", X(`حتى ${formatMoney(state.priceMax)}`, `Up to ${formatMoney(state.priceMax)}`)]);
  return html`${chips.map(([k, label]) => html`<button type="button" class="chip" data-remove="${k}" aria-label="${X("إزالة", "Remove")} ${label}">${label} ${icon("close", { size: "sm" })}</button>`)}`;
}

function groupsMarkup(items) {
  const byDest = new Map();
  DESTINATIONS.forEach((d) => byDest.set(d.id, []));
  items.forEach((e) => byDest.get(e.destinationId)?.push(e));
  // Packages first inside each group: they are the fullest way to visit
  const order = { package: 0, stay: 1, experience: 2, agri: 3, food: 4, event: 5, product: 6 };
  return html`${[...byDest.entries()]
    .filter(([, list]) => list.length)
    .map(([id, list]) => {
      const d = getDestinationById(id);
      list.sort((a, b) => order[a.category] - order[b.category]);
      return html`
        <section class="ex-group" aria-labelledby="g-${id}" data-reveal>
          <header class="ex-group__head">
            <div class="ex-group__place">
              ${renderMedia(d.media.card, { label: false })}
              <div class="stack" style="--stack-gap:var(--space-1)">
                <h2 class="ex-group__name" id="g-${id}"><a href="${route("destination", { id })}">${L(d.name)}</a></h2>
                <p class="ex-group__line">${L(d.town)}، ${L(DESTINATION_TYPES[d.type])}</p>
              </div>
            </div>
            <p class="ex-group__headline">${L(d.headline)}</p>
            <a class="btn btn--link" href="${route("destination", { id })}" style="justify-self:start">${X("عن الوجهة", "About the destination")}</a>
          </header>
          <div class="ex-grid">${list.map((e, i) => experienceCard(e, { i, showDestination: false }))}</div>
        </section>`;
    })}`;
}

/* ---- Rendering ----------------------------------------------------------- */

function updateControls() {
  $$("[data-cat]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === state.category)));
  $$('[data-f="duration"]').forEach((i) => (i.value = state.duration));
  $$('[data-f="date"]').forEach((i) => (i.value = state.date));
  $$('[data-f="guests"]').forEach((i) => (i.value = String(state.guests)));
  $$('[data-f="priceMax"]').forEach((i) => (i.value = state.priceMax || PRICE_MAX));
  $$("[data-price-out]").forEach((o) => (o.textContent = state.priceMax ? formatMoney(state.priceMax) : X("أي سعر", "Any")));
  const n = activeCount();
  $$("[data-active-n]").forEach((el) => {
    el.hidden = !n;
    el.textContent = formatNumber(n);
  });
  mount($("[data-active]"), activeChips());
}

async function updateCounts() {
  try {
    const counts = await api.getExperienceCounts({ ...apiFilters(), category: "all" });
    $$("[data-cat-n]").forEach((el) => {
      const n = counts[el.dataset.catN] || 0;
      el.textContent = formatNumber(n);
      el.closest("[data-cat]").disabled = n === 0 && el.dataset.catN !== state.category && el.dataset.catN !== "all";
    });
  } catch {
    /* counts are a nicety; the main request reports errors */
  }
}

async function load() {
  const id = ++reqId;
  const list = $("[data-list]");
  list.setAttribute("aria-busy", "true");
  mount(list, html`<div class="ex-group"><div class="ex-group__head"><div class="skeleton" style="aspect-ratio:4/3"></div><div class="skeleton skeleton--title"></div></div><div class="ex-grid">${skeletonCards(3, { ratio: "3 / 2" })}</div></div>`);
  updateControls();
  updateCounts();
  try {
    const items = await api.getExperiences(apiFilters());
    if (id !== reqId) return;
    const label = X(`${formatNumber(items.length)} تجربة`, `${items.length} experiences`);
    $("[data-count]").textContent = label;
    $("[data-count-mobile]").textContent = label;
    if (!items.length) {
      mount(list, emptyState({
        title: t("empty.experiences.title"),
        text: t("empty.experiences.text"),
        action: html`<button type="button" class="btn btn--secondary btn--sm" data-clear-all>${t("common.clearFilters")}</button>`,
      }));
    } else {
      mount(list, groupsMarkup(items));
      observeReveals(list);
    }
  } catch {
    if (id !== reqId) return;
    $("[data-count]").textContent = "";
    $("[data-count-mobile]").textContent = "";
    mount(list, errorState(X("تعذّر تحميل التجارب. تحقق من اتصالك ثم أعد المحاولة.", "Couldn't load experiences. Check your connection and try again.")));
  } finally {
    if (id === reqId) list.removeAttribute("aria-busy");
  }
}

function apply() {
  syncURL();
  playBand();
load();
}

/* ---- Boot ---------------------------------------------------------------- */
mount(
  $("#main"),
  html`${intro()}${categories()}${bar()}
    <section class="container container--wide ex-results" aria-labelledby="ex-results-title">
      <h2 class="visually-hidden" id="ex-results-title">${X("النتائج", "Results")}</h2>
      <div class="ex-meta">
        <p class="meta" data-count aria-live="polite"></p>
        <div class="ex-active" data-active></div>
      </div>
      <div data-list></div>
      <p class="note note--neutral" style="margin-top:var(--space-8)">${icon("info")}<span>${X(
        "التوافر والأسعار تجريبية. الأسعار قبل ضريبة القيمة المضافة، وتُحسب الضريبة عند الحجز.",
        "Availability and prices are illustrative. Prices exclude VAT, which is added at booking."
      )}</span></p>
    </section>`
);

const main = $("#main");
const panel = $("[data-filters]");
const panelHome = panel.parentElement;

on(main, "click", "[data-cat]", (e, b) => {
  state.category = b.dataset.cat;
  apply();
});

// Filter controls (work wherever the panel currently lives)
document.addEventListener("change", (e) => {
  const f = e.target.closest?.("[data-f]");
  if (!f) return;
  if (f.dataset.f === "date") state.date = f.value;
  if (f.dataset.f === "guests") state.guests = Number(f.value) || 0;
  if (f.dataset.f === "duration") state.duration = f.value;
  if (f.dataset.f === "priceMax") state.priceMax = Number(f.value) >= PRICE_MAX ? 0 : Number(f.value);
  apply();
});
document.addEventListener("input", (e) => {
  const f = e.target.closest?.('[data-f="priceMax"]');
  if (f) $$("[data-price-out]").forEach((o) => (o.textContent = Number(f.value) >= PRICE_MAX ? X("أي سعر", "Any") : formatMoney(Number(f.value))));
});
document.addEventListener("click", (e) => {
  if (e.target.closest?.("[data-clear-all]")) {
    Object.assign(state, { category: "all", date: "", guests: 0, duration: "", priceMax: 0, destination: "" });
    apply();
    return;
  }
  const r = e.target.closest?.("[data-remove]");
  if (r) {
    state[r.dataset.remove] = r.dataset.remove === "guests" || r.dataset.remove === "priceMax" ? 0 : "";
    apply();
  }
});

on(main, "click", "[data-retry]", () => {
  const u = new URL(location.href);
  u.searchParams.delete("simulate");
  history.replaceState(null, "", u);
  playBand();
load();
});

// Phones: move the one filter panel into a full-screen drawer
on(main, "click", "[data-open-filters]", () => {
  openDrawer({
    title: t("common.filter"),
    body: "",
    foot: html`<button type="button" class="btn btn--primary btn--block btn--lg" data-close>${X("اعرض النتائج", "Show results")}</button>`,
    onOpen(p) {
      p.querySelector(".panel__body").append(panel);
    },
    onClose() {
      panelHome.prepend(panel);
    },
  });
});

playBand();
load();
