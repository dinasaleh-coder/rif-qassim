/* ==========================================================================
   RIF OS — internal workspace (pages/admin.html)  · demo, no authentication
   Every list here is the shared data the public site and the owner use:
   bookings (api.listBookings), farms (api.listFarms), study requests
   (api.listStudyRequests), content overrides. Status changes persist in the
   shared store and show up on the owner's and visitors' side.

   Routes (hash): #overview #pipeline #farm/<id> #assessments #studies
                  #bookings #destinations #experiences #packages #people
                  #analytics #settings
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, raw, mount, $, $$, on, debounce } from "../core/dom.js";
import { L, t, getLang } from "../core/i18n.js";
import { formatNumber, formatDate, formatMoney, formatCompact, formatPercent, count } from "../core/format.js";
import { route } from "../core/paths.js";
import { store } from "../core/store.js";
import { icon } from "../components/icons.js";
import { hbars, playCharts } from "../components/charts.js";
import { openDrawer } from "../components/overlay.js";
import { toast } from "../components/toast.js";
import { createScenarioModel } from "../components/scenarios.js";
import { contactTimeLabel } from "../components/study-request.js";
import { scoreBand } from "../services/scoring.js";
import { buildOpportunities } from "../services/opportunities.js";
import { bookingSummary, pipelineCounts, studyCounts, byMonth } from "../services/analytics.js";
import { DIMENSIONS, CITIES, FACILITIES, BUILDING_CONDITIONS } from "../data/assessment.js";
import { ASSUMPTIONS, SCENARIOS } from "../data/assumptions.js";
import { PIPELINE_STAGES, ASSET_TYPES } from "../data/farms.js";
import * as api from "../services/api.js";
import { X, EST, stageTone, stageLabel, scoreClass, STUDY_STATUS, studyLabel, viewHead, load, empty, selectMarkup, searchBox, chip, keepSearch } from "./admin-common.js";
import { viewBookings, viewDestinations, viewExperiences, viewPackages, viewPeople, viewAnalytics, viewSettings } from "./admin-views.js";

initShell({ page: "admin", header: "none", bottomNav: false, footer: false });
document.body.classList.add("is-admin");

const main = $("#main");

const NAV = [
  { group: X("التشغيل", "Operations"), items: [
    { id: "overview", icon: "grid", label: X("نظرة عامة", "Overview") },
    { id: "pipeline", icon: "layers", label: X("مسار المزارع", "Farm pipeline"), count: "newFarms" },
    { id: "assessments", icon: "survey", label: X("التقييمات", "Assessments") },
    { id: "studies", icon: "file", label: X("طلبات الدراسة", "Study requests"), count: "newStudies" },
    { id: "bookings", icon: "calendar", label: X("الحجوزات", "Bookings"), count: "pendingBookings" },
  ] },
  { group: X("المحتوى", "Content"), items: [
    { id: "destinations", icon: "compass", label: X("الوجهات", "Destinations") },
    { id: "experiences", icon: "leaf", label: X("التجارب", "Experiences") },
    { id: "packages", icon: "briefcase", label: X("الباقات", "Packages") },
  ] },
  { group: X("الناس والأرقام", "People & numbers"), items: [
    { id: "people", icon: "users", label: X("العملاء والملاك", "Customers & owners") },
    { id: "analytics", icon: "chart", label: X("التحليلات", "Analytics") },
    { id: "settings", icon: "target", label: X("الإعدادات", "Settings") },
  ] },
];
const ALL = NAV.flatMap((g) => g.items);

let counts = {};

/* ==========================================================================
   Frame
   ========================================================================== */

function brand() {
  return html`<a class="brand" href="${route("home")}" data-brand aria-label="${t("brand.home")}"><span class="brand__wordmark"><span class="brand__wordmark-ar">ريف القصيم</span><span class="brand__wordmark-en">RIF QASSIM</span></span></a>`;
}

function navMarkup(current) {
  return html`${NAV.map(
    (g) => html`<div class="ad-nav__group"><p class="ad-nav__label">${g.group}</p>
      ${g.items.map((it) => html`<a href="#${it.id}" ${it.id === current ? 'aria-current="page"' : ""}>${icon(it.icon, { size: "sm" })}<span>${it.label}</span>${it.count && counts[it.count] ? html`<span class="ad-count">${formatNumber(counts[it.count])}</span>` : ""}</a>`)}
    </div>`
  )}`;
}

function frame() {
  return html`
    <div class="ad">
      <aside class="ad-side on-dark" aria-label="${X("أقسام مساحة الفريق", "Team workspace sections")}">
        <div class="ad-side__inner contours contours--light">
          <div class="stack" style="--stack-gap:var(--space-1)">${brand()}<span class="ad-os">RIF OS</span><span class="ad-os" style="color:var(--color-on-dark-muted)">${X("مساحة داخلية تجريبية", "Internal demo workspace")}</span></div>
          <nav class="ad-nav" data-nav></nav>
          <div class="ad-side__foot">
            <p>${X("نموذج تجريبي: لا تسجيل دخول ولا صلاحيات. كل البيانات في هذا المتصفح.", "Prototype: no sign-in or permissions. All data lives in this browser.")}</p>
            <div class="lang-toggle" role="group" aria-label="${t("nav.language")}" style="justify-self:start">
              <button type="button" data-lang="ar" aria-pressed="${getLang() === "ar"}"><span>ع</span></button>
              <button type="button" data-lang="en" aria-pressed="${getLang() === "en"}"><span>EN</span></button>
            </div>
            <a href="${route("home")}">${X("العودة إلى الموقع العام", "Back to the public site")}</a>
          </div>
        </div>
      </aside>
      <div style="min-inline-size:0">
        <div class="ad-top on-dark">
          ${brand()}
          <span class="ad-top__title" data-top-title></span>
          <button type="button" class="menu-button" data-ad-menu aria-label="${t("nav.openMenu")}"><span class="menu-button__bars"></span></button>
        </div>
        <div class="ad-main" id="ad-main" tabindex="-1">
          <p class="ad-banner" role="note">${icon("info", { size: "sm" })}<span>${X("مساحة داخلية تجريبية لفريق ريف. لا يوجد تسجيل دخول أو صلاحيات، والأرقام والحالات تجريبية.", "A demo internal workspace for the Rif team. There is no sign-in or permissions, and figures and statuses are simulated.")}</span></p>
          <div data-view></div>
        </div>
      </div>
    </div>`;
}

async function refreshCounts() {
  try {
    const [farms, studies, bookings] = await Promise.all([api.listFarms(), api.listStudyRequests(), api.listBookings()]);
    counts = {
      newFarms: farms.filter((f) => f.stage === "new").length,
      newStudies: studies.filter((s) => s.status === "received").length,
      pendingBookings: bookings.filter((b) => b.status === "pending").length,
    };
  } catch {
    counts = {};
  }
  renderNav();
}

function renderNav() {
  const id = current().id === "farm" ? "pipeline" : current().id;
  mount($("[data-nav]"), navMarkup(id));
  const item = ALL.find((i) => i.id === id);
  $("[data-top-title]").textContent = item ? item.label : "";
}

/* ==========================================================================
   Router
   ========================================================================== */

const current = () => {
  const [id, param] = location.hash.slice(1).split("/");
  return { id: id || "overview", param: param ? decodeURIComponent(param) : null };
};

const VIEWS = {
  overview: viewOverview,
  pipeline: viewPipeline,
  farm: viewFarm,
  assessments: viewAssessments,
  studies: viewStudies,
  bookings: viewBookings,
  destinations: viewDestinations,
  experiences: viewExperiences,
  packages: viewPackages,
  people: viewPeople,
  analytics: viewAnalytics,
  settings: viewSettings,
};

async function go({ focus = true } = {}) {
  const { id, param } = current();
  const fn = VIEWS[id] || viewOverview;
  renderNav();
  const el = $("[data-view]");
  await fn(el, { param, refreshCounts, go });
  document.title = `${(ALL.find((i) => i.id === id) || { label: X("المزرعة", "Farm") }).label} — RIF OS`;
  if (focus) {
    window.scrollTo({ top: 0 });
    setTimeout(() => $("[data-view-title]", el)?.focus({ preventScroll: true }), 30);
  }
}

/* ==========================================================================
   Overview
   ========================================================================== */

async function viewOverview(el) {
  await load(el, async () => {
    const [farms, studies, bookings] = await Promise.all([api.listFarms(), api.listStudyRequests(), api.listBookings()]);
    const sum = bookingSummary(bookings);
    const today = new Date().toISOString().slice(0, 10);
    const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    const upcoming = bookings.filter((b) => b.status !== "cancelled" && b.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const week = upcoming.filter((b) => b.date <= in7);
    const newFarms = farms.filter((f) => f.stage === "new");
    const newStudies = studies.filter((s) => s.status === "received");
    const pending = bookings.filter((b) => b.status === "pending");
    const pc = pipelineCounts(farms);
    const months = byMonth(bookings);

    const queue = [
      ...newFarms.map((f) => ["layers", X(`فرصة جديدة: ${L(f.name)}`, `New opportunity: ${L(f.name)}`), X(`جاهزية ${f.score}، ${f.city}`, `Readiness ${f.score}, ${f.city}`), `#farm/${f.id}`, X("افتح", "Open")]),
      ...newStudies.map((s) => ["file", X(`طلب دراسة: ${L(s.farmName)}`, `Study request: ${L(s.farmName)}`), html`<span class="ref">${s.id}</span>`, "#studies", X("راجع", "Review")]),
      ...pending.slice(0, 4).map((b) => ["calendar", X(`حجز بانتظار التأكيد: ${b.customer}`, `Booking to confirm: ${b.customer}`), html`${formatDate(b.date, { day: "numeric", month: "short" })} <span class="ref">${b.id}</span>`, "#bookings", X("أكّد", "Confirm")]),
    ];

    mount(
      el,
      html`
      ${viewHead({ title: X("ماذا يحدث الآن؟", "What's happening now?"), desc: X(`تحديث ${formatDate(today)}`, `As of ${formatDate(today)}`) })}
      <section class="ad-section">
        <p class="ad-now">${X(
          `${formatNumber(newFarms.length)} فرص جديدة في المسار، و${formatNumber(newStudies.length)} طلبات دراسة تنتظر المراجعة، و${formatNumber(week.length)} حجوزات خلال الأيام السبعة القادمة.`,
          `${newFarms.length} new opportunities in the pipeline, ${newStudies.length} study requests awaiting review, and ${week.length} bookings in the next seven days.`
        )}</p>
        <div class="ad-figs">
          <div class="ad-fig"><span class="ad-fig__v">${formatNumber(farms.length)}</span><span class="ad-fig__l">${X("مزرعة في المسار", "Farms in the pipeline")}</span></div>
          <div class="ad-fig"><span class="ad-fig__v">${formatNumber(studies.length)}</span><span class="ad-fig__l">${X("طلبات دراسة", "Study requests")}</span></div>
          <div class="ad-fig"><span class="ad-fig__v">${formatNumber(sum.count)}</span><span class="ad-fig__l">${X("حجوزات قائمة", "Live bookings")}</span><span class="ad-fig__n">${X(`${formatNumber(sum.statusCounts.cancelled)} ملغاة لا تُحتسب`, `${sum.statusCounts.cancelled} cancelled not counted`)}</span></div>
          <div class="ad-fig"><span class="ad-fig__v">${formatCompact(sum.gross)}</span><span class="ad-fig__l">${X("إيراد الحجوزات (ر.س)", "Booking revenue (SAR)")}</span><span class="ad-fig__n">${EST()}</span></div>
          <div class="ad-fig"><span class="ad-fig__v">${formatCompact(sum.vat)}</span><span class="ad-fig__l">${X("منها ضريبة القيمة المضافة", "Of which VAT")}</span><span class="ad-fig__n">${EST()}</span></div>
        </div>
      </section>

      <section class="ad-section">
        <div class="ad-section__head"><h2>${X("كم مزرعة في كل مرحلة؟", "How many farms at each stage?")}</h2><a class="btn btn--link" href="#pipeline">${X("المسار", "Pipeline")}</a></div>
        <div class="ad-stages">${PIPELINE_STAGES.map((s) => html`<a class="ad-stage" data-tone="${stageTone(s.id)}" href="#pipeline/${s.id}"><strong>${formatNumber(pc[s.id] || 0)}</strong>${L(s.label)}</a>`)}</div>
      </section>

      <div class="ad-cols">
        <section class="ad-section">
          <div class="ad-section__head"><h2>${X("ما الذي يحتاج إجراء؟", "What needs action?")}</h2><span class="ad-q">${formatNumber(queue.length)}</span></div>
          ${queue.length
            ? html`<ul class="ad-queue" role="list">${queue.map(([ic, a, b, href, act]) => html`<li>${icon(ic, { size: "sm" })}<span>${a}<small>${b}</small></span><a class="btn btn--secondary btn--sm" href="${href}">${act}</a></li>`)}</ul>`
            : html`<p class="muted">${X("لا شيء ينتظر إجراء.", "Nothing is waiting for action.")}</p>`}
        </section>
        <section class="ad-section">
          <div class="ad-section__head"><h2>${X("الحجوزات القادمة", "Upcoming bookings")}</h2><a class="btn btn--link" href="#bookings">${X("كل الحجوزات", "All bookings")}</a></div>
          ${upcoming.length
            ? html`<ul class="ad-queue" role="list">${upcoming.slice(0, 6).map((b) => html`<li>${icon("calendar", { size: "sm" })}<span>${b.customer}، ${count(b.guests, "guests")}<small>${L(b.packageTitle)}، ${L(b.destinationName)}</small></span><span class="small">${formatDate(b.date, { weekday: "short", day: "numeric", month: "short" })}</span></li>`)}</ul>`
            : empty(X("لا حجوزات قادمة", "No upcoming bookings"))}
        </section>
      </div>

      <section class="ad-section">
        <div class="ad-section__head"><h2>${X("الإيرادات التجريبية حسب شهر الزيارة", "Demo revenue by month of visit")}</h2><span class="est">${EST()}</span></div>
        <div class="table-wrap"><table class="table ad-table">
          <thead><tr><th>${X("الشهر", "Month")}</th><th>${X("الحجوزات", "Bookings")}</th><th>${X("الإيراد شامل الضريبة", "Revenue incl. VAT")}</th></tr></thead>
          <tbody>${months.map((m) => html`<tr><td>${formatDate(`${m.month}-01`, { month: "long", year: "numeric" })}</td><td class="num">${formatNumber(m.count)}</td><td class="num">${formatMoney(m.gross)}</td></tr>`)}</tbody>
        </table></div>
        <a class="btn btn--link" href="#analytics" style="justify-self:start">${X("التحليلات الكاملة", "Full analytics")}</a>
      </section>`
    );
  });
}

/* ==========================================================================
   Pipeline
   ========================================================================== */

async function viewPipeline(el, { param }) {
  const state = { stage: param && PIPELINE_STAGES.some((s) => s.id === param) ? param : "all", q: "", minScore: 0, view: window.matchMedia("(min-width: 1100px)").matches ? "board" : "list" };

  await load(el, async () => {
    let farms = await api.listFarms();
    const render = () => {
      const q = state.q.trim();
      const list = farms
        .filter((f) => state.stage === "all" || f.stage === state.stage)
        .filter((f) => f.score >= state.minScore)
        .filter((f) => !q || `${L(f.name)} ${L(f.ownerName)} ${f.city}`.includes(q));
      const pc = pipelineCounts(farms);
      const scoreTag = (f) => html`<span class="ad-score ${scoreClass(f.score)}">${formatNumber(f.score)}</span>`;
      const stageSel = (f) => selectMarkup({ options: PIPELINE_STAGES, value: f.stage, attrs: raw(`data-move="${f.id}"`), label: X(`مرحلة ${L(f.name)}`, `Stage of ${L(f.name)}`) });
      mount(
        el,
        html`
        ${viewHead({
          title: X("مسار المزارع", "Farm pipeline"),
          desc: X("كل مزرعة قيّمها مالكها، من الطلب الجديد إلى التشغيل. غيّر المرحلة بالسحب أو من القائمة.", "Every farm its owner assessed, from new request to operation. Change the stage by dragging or from the menu."),
          actions: html`<div class="segmented" role="group" aria-label="${X("العرض", "View")}"><button type="button" class="segmented__btn" data-view-mode="board" aria-pressed="${state.view === "board"}">${X("لوحة", "Board")}</button><button type="button" class="segmented__btn" data-view-mode="list" aria-pressed="${state.view === "list"}">${X("قائمة", "List")}</button></div>`,
        })}
        <div class="ad-tools">
          ${searchBox(X("ابحث بالمزرعة أو المالك أو المدينة", "Search farm, owner or town"), state.q)}
          <select class="select" data-min aria-label="${X("أدنى جاهزية", "Minimum readiness")}">${[0, 50, 65, 75].map((n) => html`<option value="${n}" ${state.minScore === n ? "selected" : ""}>${n ? X(`جاهزية ${n}+`, `Readiness ${n}+`) : X("كل الدرجات", "Any score")}</option>`)}</select>
          <div class="chips">${chip("all", X("كل المراحل", "All stages"), farms.length, state.stage === "all")}${PIPELINE_STAGES.map((s) => chip(s.id, L(s.label), pc[s.id] || 0, state.stage === s.id))}</div>
        </div>
        ${!list.length
          ? empty(X("لا مزارع بهذه التصفية", "No farms match"), X("وسّع البحث أو اختر مرحلة أخرى.", "Widen the search or choose another stage."))
          : state.view === "board"
            ? html`<div class="ad-board">${PIPELINE_STAGES.filter((s) => state.stage === "all" || s.id === state.stage).map((s) => {
                const col = list.filter((f) => f.stage === s.id);
                return html`<section class="ad-col" data-tone="${stageTone(s.id)}" data-drop="${s.id}" aria-label="${L(s.label)}">
                  <div class="ad-col__head">${L(s.label)}<span>${formatNumber(col.length)}</span></div>
                  ${col.length ? col.map((f) => html`<article class="ad-farm ${f.isUserSubmitted ? "is-mine" : ""}" draggable="true" data-drag="${f.id}">
                    <div class="ad-farm__top"><a class="ad-farm__name" href="#farm/${f.id}">${L(f.name)}</a>${scoreTag(f)}</div>
                    <span class="muted">${L(f.ownerName)}، ${f.city}</span>
                    ${f.isUserSubmitted ? html`<span class="ad-mine">${X("من البوابة في هذا المتصفح", "From the portal, this browser")}</span>` : ""}
                    ${f.studyRequested ? html`<span class="tag" style="justify-self:start">${X("طلب دراسة", "Study requested")}</span>` : ""}
                    ${stageSel(f)}
                  </article>`) : html`<p class="ad-empty-col">${X("فارغ", "Empty")}</p>`}
                </section>`;
              })}</div>`
            : html`<div class="table-wrap"><table class="table ad-table table--stack">
                <thead><tr><th>${X("المزرعة", "Farm")}</th><th>${X("المالك", "Owner")}</th><th>${X("المدينة", "Town")}</th><th>${X("الجاهزية", "Readiness")}</th><th>${X("آخر تحديث", "Updated")}</th><th>${X("المرحلة", "Stage")}</th></tr></thead>
                <tbody>${list.map((f) => html`<tr class="${f.isUserSubmitted ? "is-mine" : ""}">
                  <td class="cell--primary"><a class="ad-open" href="#farm/${f.id}">${L(f.name)}</a>${f.isUserSubmitted ? html` <span class="ad-mine">${X("من البوابة", "Portal")}</span>` : ""}</td>
                  <td data-label="${X("المالك", "Owner")}">${L(f.ownerName)}</td>
                  <td data-label="${X("المدينة", "Town")}">${f.city}</td>
                  <td data-label="${X("الجاهزية", "Readiness")}">${scoreTag(f)}</td>
                  <td data-label="${X("آخر تحديث", "Updated")}">${formatDate(f.updatedAt, { day: "numeric", month: "short" })}</td>
                  <td data-label="${X("المرحلة", "Stage")}" class="cell--action">${stageSel(f)}</td>
                </tr>`)}</tbody></table></div>`}`
      );
    };

    const reload = async () => {
      farms = await api.listFarms();
      render();
    };
    const move = async (id, stage) => {
      await api.moveFarm(id, stage);
      toast(X(`نُقلت المزرعة إلى «${stageLabel(stage)}».`, `Moved to “${stageLabel(stage)}”.`));
      await reload();
      refreshCounts();
    };

    render();
    on(el, "click", "[data-filter]", (e, b) => { state.stage = b.dataset.filter; history.replaceState(null, "", state.stage === "all" ? "#pipeline" : `#pipeline/${state.stage}`); render(); });
    on(el, "click", "[data-view-mode]", (e, b) => { state.view = b.dataset.viewMode; render(); });
    on(el, "change", "[data-move]", (e, s) => move(s.dataset.move, s.value));
    on(el, "change", "[data-min]", (e, s) => { state.minScore = Number(s.value); render(); });
    el.addEventListener("input", debounce((e) => { if (e.target.matches("[data-q]")) { state.q = e.target.value; keepSearch(el, render); } }, 200));
    // Drag and drop between stages (the menu does the same for keyboard/touch)
    el.addEventListener("dragstart", (e) => { const c = e.target.closest?.("[data-drag]"); if (c) { e.dataTransfer.setData("text/plain", c.dataset.drag); c.classList.add("is-dragging"); } });
    el.addEventListener("dragend", (e) => e.target.closest?.("[data-drag]")?.classList.remove("is-dragging"));
    el.addEventListener("dragover", (e) => { const col = e.target.closest?.("[data-drop]"); if (col) { e.preventDefault(); col.classList.add("is-over"); } });
    el.addEventListener("dragleave", (e) => e.target.closest?.("[data-drop]")?.classList.remove("is-over"));
    el.addEventListener("drop", (e) => {
      const col = e.target.closest?.("[data-drop]");
      if (!col) return;
      e.preventDefault();
      col.classList.remove("is-over");
      const id = e.dataTransfer.getData("text/plain");
      const farm = farms.find((f) => f.id === id);
      if (farm && farm.stage !== col.dataset.drop) move(id, col.dataset.drop);
    });
  });
}

/* ==========================================================================
   Farm detail — the whole story
   ========================================================================== */

async function viewFarm(el, { param }) {
  await load(el, async () => {
    const rec = await api.getFarmRecord(param);
    if (!rec) {
      mount(el, html`${viewHead({ title: X("مزرعة غير موجودة", "Farm not found"), crumb: { href: "#pipeline", label: X("مسار المزارع", "Farm pipeline") } })}${empty(X("لم نجد هذه المزرعة", "We couldn't find this farm"), X("ربما أُعيد ضبط بيانات العرض.", "The demo data may have been reset."))}`);
      return;
    }
    const { farm, answers, assessment, readiness, studies } = rec;
    const dims = readiness ? readiness.dims : farm.dims;
    const score = readiness ? readiness.score : farm.score;
    const stageIdx = PIPELINE_STAGES.findIndex((s) => s.id === farm.stage);
    const isOwnerFarm = assessment?.source === "owner";
    const model = answers
      ? createScenarioModel({
          answers,
          infra: dims.infrastructure,
          assumptions: isOwnerFarm ? store.get("assumptions") : null,
          scenario: isOwnerFarm ? store.get("scenario") || "base" : "base",
          persist: false,
        })
      : null;
    const A = model ? model.feas.assumptions : null;
    const chapter = (n, title, body) => html`<section class="ad-chapter"><div class="ad-chapter__head"><span class="ad-chapter__num">${String(n).padStart(2, "0")}</span><h2 class="ad-chapter__title">${title}</h2></div><div>${body}</div></section>`;
    const noAnswers = html`<p class="note note--neutral">${icon("info")}<span>${X("هذه مزرعة من البيانات الأولية للنموذج: تتوفر درجاتها المسجلة فقط، دون إجابات التقييم التفصيلية.", "This farm comes from the prototype's seed data: only its recorded scores exist, not the detailed assessment answers.")}</span></p>`;
    const city = answers ? CITIES.find((c) => c.id === answers.city) : null;

    mount(
      el,
      html`
      ${viewHead({
        title: L(farm.name),
        crumb: { href: "#pipeline", label: X("مسار المزارع", "Farm pipeline") },
        desc: html`${L(farm.ownerName)}، ${farm.city}${farm.reference ? html`، <span class="ref">${farm.reference}</span>` : ""}`,
        actions: html`<label class="small">${X("المرحلة", "Stage")} ${selectMarkup({ options: PIPELINE_STAGES, value: farm.stage, attrs: raw(`data-move="${farm.id}"`), label: X("المرحلة", "Stage") })}</label>`,
      })}
      <ol class="ad-stagebar" role="list" aria-label="${X("المرحلة الحالية", "Current stage")}">${PIPELINE_STAGES.map((s, i) => html`<li class="${i < stageIdx ? "is-done" : i === stageIdx ? "is-current" : ""}"><span>${L(s.label)}</span></li>`)}</ol>
      <div class="ad-story" style="margin-top:var(--space-6)">
        ${chapter(1, X("المزرعة", "The farm"), html`<dl class="ad-kv">
          <div><dt>${X("المالك", "Owner")}</dt><dd>${L(farm.ownerName)}</dd></div>
          <div><dt>${X("المدينة", "Town")}</dt><dd>${farm.city}${answers ? X(`، ${answers.distanceKm} كم`, `, ${answers.distanceKm} km`) : ""}</dd></div>
          <div><dt>${X("النوع", "Type")}</dt><dd>${L(ASSET_TYPES[farm.assetType])}</dd></div>
          <div><dt>${X("المساحة", "Area")}</dt><dd><span class="num">${formatNumber(farm.usableArea)}</span> / <span class="num">${formatNumber(farm.totalArea)}</span> م²</dd></div>
          <div><dt>${X("الغرف", "Rooms")}</dt><dd>${formatNumber(farm.rooms)}</dd></div>
          ${answers ? html`<div><dt>${X("المرافق", "Facilities")}</dt><dd>${(answers.facilities || []).map((id) => L(FACILITIES.find((f) => f.id === id)?.label)).join("، ") || "—"}</dd></div>
          <div><dt>${X("حالة المباني", "Condition")}</dt><dd>${L(BUILDING_CONDITIONS.find((c) => c.id === answers.buildingCondition)?.label)}</dd></div>
          <div><dt>${X("التكاليف السنوية", "Yearly costs")}</dt><dd class="num">${formatMoney(Number(answers.annualCosts) || 0)}</dd></div>
          <div><dt>${X("الجوال", "Mobile")}</dt><dd class="ltr" style="text-align:start">${answers.phone || farm.phone || "—"}</dd></div>` : ""}
          ${farm.note ? html`<div style="grid-column:1/-1"><dt>${X("ملاحظة", "Note")}</dt><dd>${L(farm.note)}</dd></div>` : ""}
        </dl>`)}
        ${chapter(2, X("التقييم", "Assessment"), html`<dl class="ad-kv">
          <div><dt>${X("المصدر", "Source")}</dt><dd>${isOwnerFarm ? X("بوابة الملاك (هذا المتصفح)", "Owner portal (this browser)") : assessment?.source === "sample" ? X("إجابات المالك التجريبي", "Demo owner's answers") : X("بيانات أولية", "Seed data")}</dd></div>
          <div><dt>${X("المرجع", "Reference")}</dt><dd class="ref">${assessment?.reference || farm.reference || "—"}</dd></div>
          <div><dt>${X("تاريخ الإرسال", "Submitted")}</dt><dd>${formatDate((assessment?.submittedAt || farm.submittedAt).slice(0, 10))}</dd></div>
          ${assessment?.updatedAt ? html`<div><dt>${X("آخر تعديل من المالك", "Last owner edit")}</dt><dd>${formatDate(assessment.updatedAt.slice(0, 10))}</dd></div>` : ""}
          ${readiness ? html`<div><dt>${X("ثقة التقييم", "Confidence")}</dt><dd>${{ high: X("عالية", "High"), medium: X("متوسطة", "Medium"), low: X("منخفضة", "Low") }[readiness.confidence]}</dd></div>
          <div><dt>${X("بيانات ناقصة", "Missing")}</dt><dd>${readiness.missing.map((m) => L(m.label)).join("، ") || "—"}</dd></div>` : ""}
          ${isOwnerFarm ? html`<div><dt>${X("التقرير", "Report")}</dt><dd><a href="${route("result", { ref: assessment.reference })}">${X("تقرير المالك", "Owner's report")}</a></dd></div>` : ""}
        </dl>`)}
        ${chapter(3, X("الجاهزية", "Readiness"), html`<div class="stack" style="--stack-gap:var(--space-4)" data-dims>
          <p><span class="ad-score ${scoreClass(score)}" style="font-size:2rem;font-weight:300">${formatNumber(score)}</span> <span class="muted">/ 100، ${L(scoreBand(score).label)}</span></p>
          ${hbars(DIMENSIONS.map((d) => ({ label: `${L(d.label)} (${formatNumber(d.weight * 100)}%)`, value: dims[d.id] })))}
        </div>`)}
        ${chapter(4, X("القوة والفجوات", "Strengths and gaps"), readiness
          ? html`<div class="ad-cols ad-cols--even">
              <ul class="ad-queue" role="list">${readiness.strengths.length ? readiness.strengths.map((s) => html`<li>${icon("check", { size: "sm" })}<span>${L(DIMENSIONS.find((d) => d.id === s.id).label)} ${formatNumber(s.value)}<small>${L(s.text)}</small></span><span></span></li>`) : html`<li><span></span><span class="muted">${X("لا نقاط قوة فوق ٧٢", "No strengths above 72")}</span><span></span></li>`}</ul>
              <ul class="ad-queue" role="list">${readiness.gaps.length ? readiness.gaps.map((g) => html`<li>${icon("alert", { size: "sm" })}<span>${L(DIMENSIONS.find((d) => d.id === g.id).label)} ${formatNumber(g.value)}<small>${L(g.text)}</small></span><span></span></li>`) : html`<li><span></span><span class="muted">${X("لا فجوات تحت ٧٠", "No gaps below 70")}</span><span></span></li>`}</ul>
            </div>`
          : noAnswers)}
        ${chapter(5, X("الفرص", "Opportunities"), answers
          ? html`<ul class="ad-queue" role="list">${buildOpportunities(answers).map((o) => html`<li>${icon(o.icon, { size: "sm" })}<span>${L(o.title)}<small>${L(o.what)}</small></span><span></span></li>`)}</ul>`
          : noAnswers)}
        ${chapter(6, X("السيناريوهات", "Scenarios"), model
          ? html`<div data-scn-root>${model.scenariosMarkup()}</div>
              <p class="meta">${isOwnerFarm ? X("بافتراضات المالك وسيناريوه المختار كما في تقريره ومساحته.", "With the owner's assumptions and chosen scenario, as in their report and workspace.") : X("بالافتراضات الأصلية.", "With the original assumptions.")} ${X("التبديل هنا لا يغيّر اختيار المالك.", "Switching here doesn't change the owner's choice.")}</p>`
          : noAnswers)}
        ${chapter(7, X("الافتراضات", "Assumptions"), A
          ? html`<dl class="ad-kv">${ASSUMPTIONS.map((a) => html`<div><dt>${L(a.label)}</dt><dd class="num">${a.unit === "percent" ? formatPercent(A[a.key]) : a.unit === "nights" ? X(`${formatNumber(A[a.key])} ليلة`, `${A[a.key]} nights`) : formatMoney(A[a.key])}${a.unit === "sarPerSqm" ? X(" للمتر", " per m²") : ""}${A[a.key] !== a.default ? html` <span class="ad-mine">${X("عدّلها المالك", "edited by owner")}</span>` : ""}</dd></div>`)}</dl>`
          : noAnswers)}
        ${chapter(8, X("طلب الدراسة", "Study request"), studies.length
          ? html`${studies.map((s) => html`<dl class="ad-kv">
              <div><dt>${X("المرجع", "Reference")}</dt><dd><a class="ref" href="#studies/${s.id}">${s.id}</a></dd></div>
              <div><dt>${X("التاريخ", "Date")}</dt><dd>${formatDate(s.createdAt.slice(0, 10))}</dd></div>
              <div><dt>${X("وقت التواصل", "Contact time")}</dt><dd>${contactTimeLabel(s.contactTime)}</dd></div>
              <div><dt>${X("الحالة", "Status")}</dt><dd>${selectMarkup({ options: STUDY_STATUS, value: s.status, attrs: raw(`data-study="${s.id}"`), label: X("حالة الطلب", "Request status") })}</dd></div>
              ${s.notes ? html`<div style="grid-column:1/-1"><dt>${X("ملاحظات المالك", "Owner notes")}</dt><dd>${s.notes}</dd></div>` : ""}
            </dl>`)}`
          : html`<p class="muted">${X("لم يطلب المالك دراسة بعد.", "The owner hasn't requested a study yet.")}</p>`)}
        ${chapter(9, X("المرحلة الحالية", "Current stage"), html`<p>${X(`المزرعة الآن في «${stageLabel(farm.stage)}». غيّر المرحلة من أعلى الصفحة أو من المسار؛ يظهر التغيير في مساحة المالك.`, `The farm is now at “${stageLabel(farm.stage)}”. Change it at the top of the page or in the pipeline; the owner's workspace reflects it.`)}</p>`)}
      </div>`
    );
    if (model) model.wire($("[data-scn-root]", el));
    playCharts($("[data-dims]", el));
    on(el, "change", "[data-move]", async (e, s) => {
      await api.moveFarm(farm.id, s.value);
      toast(X(`نُقلت المزرعة إلى «${stageLabel(s.value)}».`, `Moved to “${stageLabel(s.value)}”.`));
      refreshCounts();
      viewFarm(el, { param });
    });
    on(el, "change", "[data-study]", async (e, s) => {
      await api.updateStudyStatus(s.dataset.study, s.value);
      toast(X(`حالة الطلب: ${studyLabel(s.value)}.`, `Request status: ${studyLabel(s.value)}.`));
      refreshCounts();
    });
  });
}

/* ==========================================================================
   Assessments
   ========================================================================== */

async function viewAssessments(el) {
  await load(el, async () => {
    const farms = (await api.listFarms()).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    const studies = await api.listStudyRequests();
    mount(
      el,
      html`${viewHead({ title: X("التقييمات", "Assessments"), desc: X("كل تقييم أولي أرسله مالك، مع درجته ومرحلته.", "Every initial assessment an owner sent, with its score and stage.") })}
      <div class="table-wrap"><table class="table ad-table table--stack">
        <thead><tr><th>${X("المزرعة", "Farm")}</th><th>${X("التاريخ", "Date")}</th><th>${X("الجاهزية", "Readiness")}</th><th>${X("القراءة", "Read")}</th>${DIMENSIONS.map((d) => html`<th class="hide-mobile">${L(d.label)}</th>`)}<th>${X("دراسة", "Study")}</th><th>${X("المرحلة", "Stage")}</th></tr></thead>
        <tbody>${farms.map((f) => html`<tr class="${f.isUserSubmitted ? "is-mine" : ""}">
          <td class="cell--primary"><a class="ad-open" href="#farm/${f.id}">${L(f.name)}</a></td>
          <td data-label="${X("التاريخ", "Date")}">${formatDate(f.submittedAt, { day: "numeric", month: "short", year: "numeric" })}</td>
          <td data-label="${X("الجاهزية", "Readiness")}"><span class="ad-score ${scoreClass(f.score)}">${formatNumber(f.score)}</span></td>
          <td data-label="${X("القراءة", "Read")}">${L(scoreBand(f.score).label)}</td>
          ${DIMENSIONS.map((d) => html`<td class="num hide-mobile">${formatNumber(f.dims[d.id])}</td>`)}
          <td data-label="${X("دراسة", "Study")}">${studies.some((s) => s.farmId === f.id) ? studyLabel(studies.find((s) => s.farmId === f.id).status) : "—"}</td>
          <td data-label="${X("المرحلة", "Stage")}">${stageLabel(f.stage)}</td>
        </tr>`)}</tbody>
      </table></div>`
    );
  });
}

/* ==========================================================================
   Study requests
   ========================================================================== */

async function viewStudies(el, { param } = {}) {
  const state = { status: "all", q: param || "" }; // #studies/<reference>
  await load(el, async () => {
    let list = await api.listStudyRequests();
    const render = () => {
      const sc = studyCounts(list);
      const q = state.q.trim();
      const shown = list.filter((s) => state.status === "all" || s.status === state.status).filter((s) => !q || `${s.id} ${L(s.farmName)} ${L(s.ownerName)}`.includes(q));
      mount(
        el,
        html`${viewHead({ title: X("طلبات الدراسة", "Study requests"), desc: X("طلبات «اطلب دراسة ريف» من تقارير الملاك ومساحاتهم. تغيير الحالة هنا يظهر للمالك فورًا (تحديث تجريبي).", "“Request a Rif study” requests from owners' reports and workspaces. Status changes here show to the owner right away (demo update).") })}
        <div class="ad-tools">
          ${searchBox(X("ابحث بالمرجع أو المزرعة أو المالك", "Search reference, farm or owner"), state.q)}
          <div class="chips">${chip("all", X("الكل", "All"), list.length, state.status === "all")}${STUDY_STATUS.map((s) => chip(s.id, L(s.label), sc[s.id] || 0, state.status === s.id))}</div>
        </div>
        ${shown.length
          ? html`<div class="table-wrap"><table class="table ad-table table--stack">
            <thead><tr><th>${X("المرجع", "Reference")}</th><th>${X("المزرعة", "Farm")}</th><th>${X("المالك", "Owner")}</th><th>${X("الجاهزية", "Readiness")}</th><th>${X("التاريخ", "Date")}</th><th>${X("التواصل", "Contact")}</th><th>${X("التقييم", "Assessment")}</th><th>${X("الحالة", "Status")}</th></tr></thead>
            <tbody>${shown.map((s) => html`<tr class="${s.isUserCreated ? "is-mine" : ""}">
              <td class="cell--primary"><span class="ref">${s.id}</span>${s.isUserCreated ? html` <span class="ad-mine">${X("هذا المتصفح", "this browser")}</span>` : ""}</td>
              <td data-label="${X("المزرعة", "Farm")}"><a class="ad-open" href="#farm/${s.farmId}">${L(s.farmName)}</a></td>
              <td data-label="${X("المالك", "Owner")}">${L(s.ownerName)}</td>
              <td data-label="${X("الجاهزية", "Readiness")}">${s.score !== null ? html`<span class="ad-score ${scoreClass(s.score)}">${formatNumber(s.score)}</span>` : "—"}</td>
              <td data-label="${X("التاريخ", "Date")}">${formatDate(s.createdAt.slice(0, 10), { day: "numeric", month: "short" })}</td>
              <td data-label="${X("التواصل", "Contact")}">${contactTimeLabel(s.contactTime)}</td>
              <td data-label="${X("التقييم", "Assessment")}"><span class="ref">${s.assessmentRef || "—"}</span></td>
              <td data-label="${X("الحالة", "Status")}" class="cell--action">${selectMarkup({ options: STUDY_STATUS, value: s.status, attrs: raw(`data-study="${s.id}"`), label: X("حالة الطلب", "Request status") })}</td>
            </tr>`)}</tbody></table></div>`
          : empty(X("لا طلبات بهذه التصفية", "No requests match"), X("تظهر هنا الطلبات فور إرسالها من تقرير المالك.", "Requests appear here as soon as an owner sends one from their report."))}`
      );
    };
    render();
    on(el, "click", "[data-filter]", (e, b) => { state.status = b.dataset.filter; render(); });
    el.addEventListener("input", debounce((e) => { if (e.target.matches("[data-q]")) { state.q = e.target.value; keepSearch(el, render); } }, 200));
    on(el, "change", "[data-study]", async (e, s) => {
      await api.updateStudyStatus(s.dataset.study, s.value);
      list = await api.listStudyRequests();
      toast(X(`حالة الطلب: ${studyLabel(s.value)}.`, `Request status: ${studyLabel(s.value)}.`));
      refreshCounts();
      render();
    });
  });
}

/* ==========================================================================
   Boot
   ========================================================================== */

mount(main, frame());
on(document, "click", "[data-ad-menu]", () => {
  const { el, close } = openDrawer({ title: "RIF OS", body: html`<nav class="ad-nav ad-nav--drawer">${navMarkup(current().id)}</nav>` });
  el.addEventListener("click", (e) => e.target.closest("a") && close());
});
window.addEventListener("hashchange", () => go());
["bookingStatuses", "farmStages", "studyRequests", "submittedFarms", "userBookings"].forEach((s) => store.subscribe(s, debounce(refreshCounts, 100)));
refreshCounts();
go({ focus: false });
