/* ==========================================================================
   Destinations
   Filters (type, availability, search) update the URL, the index and the
   map together. Loading, empty and error states are real states of the
   same data request (try ?simulate=error).
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, mount, $, $$, on, debounce, observeReveals } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatMoney, formatNumber } from "../core/format.js";
import { route } from "../core/paths.js";
import { renderMedia } from "../components/media.js";
import { icon } from "../components/icons.js";
import { emptyState, errorState } from "../components/cards.js";
import { renderQassimMap, wireQassimMap, setActivePin } from "../components/qassim-map.js";
import { DESTINATIONS, DESTINATION_TYPES } from "../data/destinations.js";
import * as api from "../services/api.js";

initShell({ page: "destinations", header: "solid", bottomNav: true, footer: "full" });

const X = (ar, en) => L({ ar, en });

const STATUS_FILTERS = [
  { id: "all", label: X("الكل", "All") },
  { id: "open", label: X("متاح الآن", "Open now") },
  { id: "season", label: X("موسمي", "Seasonal") },
  { id: "soon", label: X("قريبًا", "Coming soon") },
];

const STATUS_LINE = {
  open: "avail.open",
  limited: "avail.limited",
  season: "avail.season",
  soon: "avail.soon",
};

/* ---- State (mirrors the URL) ------------------------------------------- */
const params = new URLSearchParams(location.search);
const state = {
  type: params.get("type") || "all",
  status: params.get("status") || "all",
  q: params.get("q") || "",
};
let results = [];
let reqId = 0;

function syncURL() {
  const u = new URL(location.href);
  ["type", "status", "q"].forEach((k) => {
    const v = state[k];
    if (v && v !== "all") u.searchParams.set(k, v);
    else u.searchParams.delete(k);
  });
  history.replaceState(null, "", u);
}

/* "Open now" also includes limited-availability destinations */
const apiFilters = () => ({
  type: state.type,
  q: state.q,
  status: state.status === "open" ? "all" : state.status,
});
const postFilter = (list) => (state.status === "open" ? list.filter((d) => d.status === "open" || d.status === "limited") : list);

/* ---- Markup ------------------------------------------------------------ */

function intro() {
  const open = DESTINATIONS.filter((d) => d.status !== "soon").length;
  return html`
    <section class="dx-intro contours">
      <div class="container container--wide dx-intro__grid">
        <div class="stack" style="--stack-gap:var(--space-5)">
          <p class="kicker">${X("الوجهات", "Destinations")}</p>
          <h1 class="display" style="max-inline-size:12ch">${X("وجهات تستحق أن تُعاش.", "Destinations worth living.")}</h1>
          <p class="lead">${X(
            "مزارع ونُزل طينية ومخيمات شتوية، طوّرتها ريف من أصول قائمة في القصيم. كل وجهة لها طابعها، وكلها تُحجز من مكان واحد.",
            "Farms, mud-brick lodges and winter camps, developed by Rif from existing assets in Qassim. Each has its own character; all are booked in one place."
          )}</p>
        </div>
        <div class="dx-intro__note">
          <p>${X(`${formatNumber(open)} وجهات متاحة، وواحدة قيد التطوير.`, `${open} destinations open, one in development.`)}</p>
          <p class="meta">${X("نموذج تجريبي: الوجهات والأسعار والتوافر توضيحية.", "Prototype: destinations, prices and availability are illustrative.")}</p>
        </div>
      </div>
    </section>`;
}

function filters() {
  const counts = DESTINATIONS.reduce((a, d) => ((a[d.type] = (a[d.type] || 0) + 1), a), {});
  return html`
    <div class="dx-filters" role="search" aria-label="${X("تصفية الوجهات", "Filter destinations")}">
      <div class="container container--wide dx-filters__inner">
        <div class="dx-filters__types" role="group" aria-label="${X("نوع الوجهة", "Destination type")}" data-types>
          <button type="button" class="chip" data-type="all" aria-pressed="${state.type === "all"}">${X("كل الوجهات", "All destinations")} <span class="chip__count">${formatNumber(DESTINATIONS.length)}</span></button>
          ${Object.entries(DESTINATION_TYPES).map(
            ([id, label]) => html`<button type="button" class="chip" data-type="${id}" aria-pressed="${state.type === id}">${L(label)} <span class="chip__count">${formatNumber(counts[id] || 0)}</span></button>`
          )}
        </div>
        <div class="dx-filters__row">
          <div class="segmented" role="group" aria-label="${X("التوافر", "Availability")}" data-status>
            ${STATUS_FILTERS.map((s) => html`<button type="button" class="segmented__btn" data-status-id="${s.id}" aria-pressed="${state.status === s.id}">${s.label}</button>`)}
          </div>
          <label class="dx-search">
            <span class="visually-hidden">${t("common.search")}</span>
            ${icon("search", { size: "sm" })}
            <input class="input" type="search" data-q value="${state.q}" placeholder="${X("ابحث بالاسم أو المدينة", "Search by name or town")}" autocomplete="off">
          </label>
        </div>
      </div>
    </div>`;
}

function row(d, i) {
  const unit = d.priceUnit === "night" ? t("common.perNight") : t("common.perPerson");
  const facts = d.facts.slice(0, 2);
  return html`
    <article class="dx-row" data-row="${d.id}" data-reveal style="--i:0" aria-labelledby="dx-${d.id}">
      ${renderMedia(d.media.hero, { cls: "dx-row__media", eager: i < 1 })}
      <div class="dx-row__body">
        <p class="dx-row__where"><span>${L(d.town)}</span><span>${L(DESTINATION_TYPES[d.type])}</span></p>
        <h2 class="dx-row__name" id="dx-${d.id}"><a href="${route("destination", { id: d.id })}">${L(d.name)}</a></h2>
        <p class="dx-row__headline">${L(d.headline)}</p>
        <p class="dx-row__short">${L(d.short)}</p>
        <dl class="dx-row__facts">
          ${facts.map((f) => html`<div><dt>${L(f.label)}</dt><dd>${L(f.value)}</dd></div>`)}
        </dl>
        <div class="dx-row__foot">
          ${d.status === "soon"
            ? html`<span class="availability availability--season">${X("قيد التطوير مع ريف", "In development with Rif")}</span>`
            : html`<span class="dx-row__price">${t("common.from")}<strong>${formatMoney(d.priceFrom)}</strong>${unit}</span>`}
          <span class="availability availability--${d.status === "soon" ? "season" : d.status}">${t(STATUS_LINE[d.status])}</span>
        </div>
        <a class="btn btn--secondary dx-row__cta" href="${route("destination", { id: d.id })}" style="justify-self:start" tabindex="-1" aria-hidden="true">
          ${d.status === "soon" ? X("تابع الوجهة", "Follow this destination") : X("اكتشف الوجهة", "Explore the destination")} ${icon("arrow", { size: "sm" })}
        </a>
      </div>
    </article>`;
}

function skeletonRows(n = 2) {
  return html`${Array.from({ length: n }, () => html`
    <div class="dx-skel" aria-hidden="true">
      <div class="skeleton skeleton--media"></div>
      <div class="stack">
        <div class="skeleton skeleton--text" style="width:30%"></div>
        <div class="skeleton skeleton--title" style="height:2.4em"></div>
        <div class="skeleton skeleton--text" style="width:90%"></div>
        <div class="skeleton skeleton--text" style="width:70%"></div>
      </div>
    </div>`)}`;
}

function mapSection() {
  return html`
    <section class="section dx-map" id="map" aria-labelledby="map-title">
      <div class="container container--wide">
        <div class="stack" style="--stack-gap:var(--space-4);margin-bottom:var(--space-7);max-inline-size:56ch">
          <p class="kicker">${X("الخريطة", "Map")}</p>
          <h2 class="h1" id="map-title">${X("القصيم، من بريدة إلى المذنب.", "Qassim, from Buraydah to Al Mithnab.")}</h2>
          <p class="muted">${X(
            "خريطة توضيحية تبيّن المواقع التقريبية للوجهات. يُرسل الموقع الدقيق مع تأكيد الحجز.",
            "An illustrative map showing approximate locations. The exact location is shared with booking confirmation."
          )}</p>
        </div>
        <div class="dx-map__grid">
          <div data-map></div>
          <div class="dx-map__panel">
            <ul class="dx-map__list" role="list" data-map-list></ul>
            <div data-map-preview></div>
          </div>
        </div>
      </div>
    </section>`;
}

/* ---- Rendering ----------------------------------------------------------- */

function renderResults() {
  const list = $("[data-list]");
  const count = $("[data-count]");
  count.textContent = X(`${formatNumber(results.length)} من ${formatNumber(DESTINATIONS.length)} وجهات`, `${results.length} of ${DESTINATIONS.length} destinations`);

  if (!results.length) {
    mount(
      list,
      emptyState({
        title: t("empty.destinations.title"),
        text: t("empty.destinations.text"),
        action: html`<button type="button" class="btn btn--secondary btn--sm" data-clear>${t("common.clearFilters")}</button>`,
      })
    );
  } else {
    mount(list, html`${results.map(row)}`);
    observeReveals(list);
  }
  renderMap();
}

function renderMap(activeId) {
  const shown = results.length ? results : [];
  const active = activeId && shown.some((d) => d.id === activeId) ? activeId : shown[0]?.id;
  mount($("[data-map]"), renderQassimMap(shown, { activeId: active, label: X("خريطة توضيحية للقصيم", "Illustrative map of Qassim") }));
  mount(
    $("[data-map-list]"),
    shown.length
      ? html`${shown.map(
          (d) => html`<li class="dx-map__item"><button type="button" data-map-item="${d.id}" aria-pressed="${d.id === active}">
            <i class="is-${d.status}"></i><span>${L(d.name)}</span><small>${L(d.town)}</small></button></li>`
        )}`
      : html`<li class="meta" style="padding-block:var(--space-4)">${X("لا توجد وجهات على الخريطة بهذه التصفية.", "No destinations on the map for these filters.")}</li>`
  );
  showPreview(active);
}

function showPreview(id) {
  const d = results.find((x) => x.id === id);
  const wrap = $("[data-map-preview]");
  if (!d) return mount(wrap, "");
  mount(
    wrap,
    html`<article class="dx-map__preview">
      ${renderMedia(d.media.card, { label: false })}
      <div class="stack" style="--stack-gap:var(--space-1)">
        <p class="h4">${L(d.name)}</p>
        <p class="meta">${L(d.town)}، ${L(DESTINATION_TYPES[d.type])}</p>
        <p class="meta">${L(d.mapNote)}</p>
        <a class="btn btn--link" href="${route("destination", { id: d.id })}" style="justify-self:start;margin-top:var(--space-2)">${d.status === "soon" ? X("تابع الوجهة", "Follow") : X("اكتشف الوجهة", "Explore")}</a>
      </div>
    </article>`
  );
  $$("[data-map-item]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mapItem === id)));
  setActivePin($("[data-map]"), id);
}

async function load() {
  const id = ++reqId;
  const list = $("[data-list]");
  list.setAttribute("aria-busy", "true");
  mount(list, skeletonRows(2));
  try {
    const data = await api.getDestinations(apiFilters());
    if (id !== reqId) return; // a newer request superseded this one
    results = postFilter(data);
    renderResults();
  } catch {
    if (id !== reqId) return;
    results = [];
    mount(list, errorState(X("تعذّر تحميل الوجهات. تحقق من اتصالك ثم أعد المحاولة.", "Couldn't load destinations. Check your connection and try again.")));
    $("[data-count]").textContent = "";
    renderMap();
  } finally {
    if (id === reqId) list.removeAttribute("aria-busy");
  }
}

/* ---- Boot ---------------------------------------------------------------- */
mount(
  $("#main"),
  html`${intro()}${filters()}
    <section class="container container--wide" aria-labelledby="results-title">
      <h2 class="visually-hidden" id="results-title">${X("النتائج", "Results")}</h2>
      <div class="split" style="padding-top:var(--space-6)">
        <p class="dx-count" data-count aria-live="polite"></p>
        <a class="btn btn--link" href="#map">${icon("map", { size: "sm" })} ${X("عرض على الخريطة", "View on map")}</a>
      </div>
      <div class="dx-list" data-list></div>
    </section>
    ${mapSection()}`
);

const root = $("#main");

on(root, "click", "[data-type]", (e, b) => {
  state.type = b.dataset.type;
  $$("[data-type]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  syncURL();
  load();
});

on(root, "click", "[data-status-id]", (e, b) => {
  state.status = b.dataset.statusId;
  $$("[data-status-id]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  syncURL();
  load();
});

$("[data-q]").addEventListener(
  "input",
  debounce((e) => {
    state.q = e.target.value.trim();
    syncURL();
    load();
  }, 280)
);

on(root, "click", "[data-clear]", () => {
  state.type = "all";
  state.status = "all";
  state.q = "";
  $("[data-q]").value = "";
  $$("[data-type]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.type === "all")));
  $$("[data-status-id]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.statusId === "all")));
  syncURL();
  load();
});

on(root, "click", "[data-retry]", () => {
  // Retrying drops the simulated failure so the page recovers
  const u = new URL(location.href);
  if (u.searchParams.get("simulate")) {
    u.searchParams.delete("simulate");
    history.replaceState(null, "", u);
  }
  load();
});

on(root, "click", "[data-map-item]", (e, b) => showPreview(b.dataset.mapItem));
wireQassimMap($("[data-map]").parentElement, { onSelect: (id) => showPreview(id) });

load();
