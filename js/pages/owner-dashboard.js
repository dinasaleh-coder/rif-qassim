/* ==========================================================================
   Owner workspace  (pages/owner-dashboard.html)
   Landing → Assessment → Report → here.

   One source of truth: the stored assessment (answers + readiness) and the
   farm record in the shared pipeline (api.getOwnerDashboard). Scenarios come
   from the shared scenario view (feasibility engine + 7 assumptions);
   opportunities from the shared builder; edits go through
   api.updateFarmAnswers, which re-scores with the existing engine.

   Views (hash): #home #farm #opportunities #numbers #study #activity #profile
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, mount, $, $$, on, onceVisible } from "../core/dom.js";
import { L, t, getLang } from "../core/i18n.js";
import { formatNumber, formatDate, formatMoney, count } from "../core/format.js";
import { route } from "../core/paths.js";
import { store } from "../core/store.js";
import { icon } from "../components/icons.js";
import { pageBand, playBand, emptyState, errorState } from "../components/cards.js";
import { scoreRing, hbars, playCharts } from "../components/charts.js";
import { field, choiceGroup, stepper, initSteppers, readForm, validateForm, bindLiveValidation } from "../components/forms.js";
import { openDrawer } from "../components/overlay.js";
import { toast } from "../components/toast.js";
import { createScenarioModel } from "../components/scenarios.js";
import { openStudyForm, STUDY_STATES, studyStateIndex, contactTimeLabel } from "../components/study-request.js";
import { computeReadiness, scoreBand } from "../services/scoring.js";
import { buildOpportunities, opportunityStatus } from "../services/opportunities.js";
import { DIMENSIONS, CITIES, FACILITIES, CURRENT_SERVICES, BUILDING_CONDITIONS, MAINTENANCE_LEVELS, SAMPLE_ANSWERS } from "../data/assessment.js";
import { ASSET_TYPES, PIPELINE_STAGES } from "../data/farms.js";
import * as api from "../services/api.js";

initShell({ page: "owner", header: "overlay", bottomNav: false, footer: "minimal" });

const X = (ar, en) => L({ ar, en });
const main = $("#main");

const VIEWS = [
  { id: "home", icon: "home", label: X("الرئيسية", "Overview") },
  { id: "farm", icon: "map", label: X("المزرعة والجاهزية", "Farm & readiness") },
  { id: "opportunities", icon: "leaf", label: X("الفرص", "Opportunities") },
  { id: "numbers", icon: "chart", label: X("السيناريوهات والافتراضات", "Scenarios & assumptions") },
  { id: "study", icon: "file", label: X("دراسة ريف", "Rif study") },
  { id: "activity", icon: "bell", label: X("النشاط والتنبيهات", "Activity") },
  { id: "profile", icon: "user", label: X("الملف والبيانات", "Profile & details") },
];

/* Journey: التقييم → الجاهزية → الفرص → السيناريو → دراسة ريف → التطوير → التشغيل */
const JOURNEY = [
  { id: "assessment", label: X("التقييم", "Assessment") },
  { id: "readiness", label: X("الجاهزية", "Readiness") },
  { id: "opportunities", label: X("الفرص", "Opportunities") },
  { id: "scenario", label: X("السيناريو", "Scenario") },
  { id: "study", label: X("دراسة ريف", "Rif study") },
  { id: "development", label: X("التطوير", "Development") },
  { id: "operating", label: X("التشغيل", "Operation") },
];

/* ---- State ---------------------------------------------------------------- */
let dash; // api.getOwnerDashboard()
let answers;
let readiness;
let model; // shared scenario view
let view = "home";

const isDemo = () => dash.mode === "demo";
const study = () => (isDemo() ? null : store.get("studyRequests").find((r) => r.farmId === dash.result.farmId) || null);
const messages = () => (isDemo() ? dash.messages : store.get("ownerMessages"));
const unread = () => messages().filter((m) => !m.read).length;
const stage = () => dash.farm?.stage || "new";
const stageLabel = () => L(PIPELINE_STAGES.find((s) => s.id === stage())?.label);
const lastUpdate = () => (isDemo() ? dash.farm.updatedAt : (dash.result.updatedAt || dash.result.submittedAt).slice(0, 10));
const firstName = () => (isDemo() ? L(dash.ownerFirstName) : dash.ownerFirstName || String(answers.ownerName || "").split(/\s+/)[0] || "");

function journeyIndex() {
  if (stage() === "operating") return 6;
  if (stage() === "development") return 5;
  return 4;
}

/* What the owner should do next */
function nextAction() {
  if (isDemo()) return { label: X("ابدأ تقييم مزرعتك", "Start your farm assessment"), href: route("assessment") };
  if (!study()) return { label: X("اطلب دراسة ريف", "Request a Rif study"), action: "study" };
  if (readiness.missing.length) return { label: X("أكمل بيانات المزرعة", "Complete your farm details"), href: "#profile" };
  return { label: X("تابع طلب الدراسة", "Follow your study request"), href: "#study" };
}

function attentionItems() {
  const items = [];
  if (!isDemo() && !study()) items.push(["file", X("لم تطلب دراسة ريف بعد", "No Rif study requested yet"), X("الخطوة التي تنقل التقرير إلى معاينة ميدانية.", "The step that turns the report into a site visit."), { label: X("اطلبها", "Request"), action: "study" }]);
  readiness.gaps.slice(0, 2).forEach((g) => items.push(["alert", X(`فجوة في ${L(DIMENSIONS.find((d) => d.id === g.id).label)}`, `Gap in ${L(DIMENSIONS.find((d) => d.id === g.id).label)}`), L(g.text), { label: X("الفرص", "Opportunities"), href: "#opportunities" }]));
  if (readiness.missing.length) items.push(["image", X("بيانات تنقص التقييم", "Missing details"), readiness.missing.map((m) => L(m.label)).join("، "), { label: X("أكمل", "Complete"), href: "#profile" }]);
  return items;
}

function doneItems() {
  const items = [];
  const submitted = isDemo() ? dash.farm.submittedAt : dash.result.submittedAt.slice(0, 10);
  items.push([X("أرسلت تقييم المزرعة", "Sent the farm assessment"), isDemo() ? X("حساب تجريبي", "Demo account") : html`<span class="ref">${dash.result.reference}</span>`, formatDate(submitted, { day: "numeric", month: "short" })]);
  items.push([X(`جاهزية ${readiness.score} من 100`, `Readiness ${readiness.score}/100`), L(scoreBand(readiness.score).label), ""]);
  items.push([X("استكشفت الفرص والسيناريوهات", "Explored opportunities and scenarios"), X("في التقرير الأولي", "In the initial report"), ""]);
  const s = study();
  if (s) items.push([X("طلبت دراسة ريف", "Requested a Rif study"), html`<span class="ref">${s.id}</span>`, formatDate(s.createdAt.slice(0, 10), { day: "numeric", month: "short" })]);
  return items;
}

/* ==========================================================================
   Masthead
   ========================================================================== */

function greeting() {
  const h = new Date().getHours();
  const word = h < 12 ? X("صباح الخير", "Good morning") : X("مساء الخير", "Good evening");
  const name = firstName();
  return name ? (getLang() === "ar" ? `${word}، ${name}.` : `${word}, ${name}.`) : `${word}.`;
}

function band() {
  const city = CITIES.find((c) => c.id === answers.city);
  const act = nextAction();
  const actBtn = act.action
    ? html`<button type="button" class="btn btn--light" data-act="${act.action}">${act.label}</button>`
    : html`<a class="btn btn--light" href="${act.href}">${act.label}</a>`;
  return pageBand({
    compact: true,
    cls: "ow-band",
    media: "story-destination",
    crumbs: [{ label: t("nav.home"), href: route("home") }, { label: X("للملاك", "For owners"), href: route("business") }, { label: X("مزرعتي", "My farm") }],
    title: greeting(),
    lead: X(`${answers.farmName}، ${L(city?.label)}. هذه مساحتك لمتابعة مزرعتك من التقييم إلى التشغيل.`, `${answers.farmName}, ${L(city?.label)}. Your space to follow the farm from assessment to operation.`),
    actions: html`${actBtn}
      <button type="button" class="btn btn--outline-light" data-notify aria-label="${X("التنبيهات", "Notifications")}">${icon("bell", { size: "sm" })} ${unread() ? html`<span class="ow-badge" style="margin:0">${formatNumber(unread())}</span>` : X("التنبيهات", "Notifications")}</button>`,
    facts: html`
      <span>${answers.farmName}</span>
      <span>${X("الجاهزية", "Readiness")} <strong class="num">${formatNumber(readiness.score)}</strong> ${X("من 100", "/ 100")}</span>
      <span>${X("المرحلة", "Stage")}: <strong>${stageLabel()}</strong></span>
      <span>${X("آخر تحديث", "Last update")} ${formatDate(lastUpdate(), { day: "numeric", month: "short" })}</span>`,
  });
}

/* ==========================================================================
   Views
   ========================================================================== */

const head = (title, lead) => html`<header class="ow-head"><h2 class="ow-title" tabindex="-1" data-view-title>${title}</h2>${lead ? html`<p class="muted">${lead}</p>` : ""}</header>`;
const blockTitle = (title, aside) => html`<div class="ow-block__title"><h3>${title}</h3>${aside || ""}</div>`;

function journeyMarkup() {
  const cur = journeyIndex();
  const notes = [
    isDemo() ? X("مكتمل", "Done") : formatDate(dash.result.submittedAt.slice(0, 10), { day: "numeric", month: "short" }),
    X(`${readiness.score} من 100`, `${readiness.score}/100`),
    X(`${buildOpportunities(answers).length} فرص`, `${buildOpportunities(answers).length} found`),
    X("ثلاثة سيناريوهات", "Three scenarios"),
    L(STUDY_STATES[studyStateIndex(study())].label),
    "",
    "",
  ];
  return html`<ol class="ow-journey" role="list" aria-label="${X("مسار المزرعة", "Farm journey")}">
    ${JOURNEY.map((s, i) => {
      const state = i < cur ? "is-done" : i === cur ? "is-current" : "";
      return html`<li class="ow-jstep ${state}" ${i === cur ? 'aria-current="step"' : ""}>
        <span class="ow-jdot">${i < cur ? icon("check") : ""}</span>
        <span class="ow-jlabel">${s.label}${notes[i] ? html`<span class="ow-jnote">${notes[i]}</span>` : ""}</span>
      </li>`;
    })}
  </ol>`;
}

function whereSentence() {
  const s = study();
  if (stage() === "operating") return X("مزرعتك وجهة عاملة. تابع الحجوزات والنشاط من هنا.", "Your farm is an operating destination. Follow bookings and activity here.");
  if (stage() === "development") return X("مزرعتك في مرحلة التطوير مع ريف.", "Your farm is in development with Rif.");
  if (isDemo()) return X("مزرعة الريحان عند مراجعة ريف، بعد اكتمال التقييم الأولي.", "Al Raihan Farm is at Rif review, after the initial assessment.");
  if (!s) return X("التقييم الأولي مكتمل. الخطوة التالية: طلب دراسة ريف.", "The initial assessment is complete. Next: request a Rif study.");
  return X(`طلب الدراسة ${L(STUDY_STATES[studyStateIndex(s)].label)}. سيظهر هنا كل تقدم.`, `Your study request is ${L(STUDY_STATES[studyStateIndex(s)].label).toLowerCase()}. Progress will show here.`);
}

function studyTrack() {
  const idx = studyStateIndex(study());
  return html`<ol class="ow-track" role="list" aria-label="${X("حالة طلب الدراسة", "Study request status")}">
    ${STUDY_STATES.map((s, i) => html`<li class="${i < idx ? "is-done" : i === idx ? "is-current" : ""}" ${i === idx ? 'aria-current="step"' : ""}><span>${L(s.label)}</span></li>`)}
  </ol>`;
}

const actionLink = (a) =>
  a.action ? html`<button type="button" class="btn btn--link" data-act="${a.action}">${a.label}</button>` : html`<a class="btn btn--link" href="${a.href}">${a.label}</a>`;

function viewHome() {
  const opp = buildOpportunities(answers)[0];
  const attention = attentionItems();
  const recent = messages().slice(0, 3);
  return html`
    ${isDemo() ? demoBanner() : ""}
    <section class="ow-block" aria-labelledby="q-where">
      ${blockTitle(html`<span id="q-where">${X("أين مزرعتي الآن؟", "Where is my farm now?")}</span>`, html`<span class="ow-question">${stageLabel()}</span>`)}
      <p class="ow-where">${whereSentence()}</p>
      ${journeyMarkup()}
    </section>

    <div class="ow-two">
      <section class="ow-block" aria-labelledby="q-done">
        ${blockTitle(html`<span id="q-done">${X("ماذا أنجزت", "What you've done")}</span>`)}
        <ul class="ow-list ow-list--done" role="list">
          ${doneItems().map(([a, b, c]) => html`<li>${icon("check", { size: "sm" })}<span class="ow-list__text"><span>${a}</span><small>${b}</small></span><span class="ow-list__aside">${c}</span></li>`)}
        </ul>
      </section>
      <section class="ow-block" aria-labelledby="q-att">
        ${blockTitle(html`<span id="q-att">${X("ما يحتاج انتباهك", "What needs attention")}</span>`, attention.length ? html`<span class="ow-question">${formatNumber(attention.length)}</span>` : "")}
        ${attention.length
          ? html`<ul class="ow-list ow-list--attention" role="list">${attention.map(([ic, a, b, act]) => html`<li>${icon(ic, { size: "sm" })}<span class="ow-list__text"><span>${a}</span><small>${b}</small></span>${actionLink(act)}</li>`)}</ul>`
          : html`<p class="muted">${X("لا شيء يحتاج انتباهك الآن.", "Nothing needs your attention right now.")}</p>`}
      </section>
    </div>

    <section class="ow-next contours" aria-labelledby="q-next">
      <p class="kicker" id="q-next">${X("الفرصة التالية", "The next opportunity")}</p>
      <p class="ow-next__title">${L(opp.title)}</p>
      <dl class="ow-next__grid">
        <div><dt>${X("ما هي", "What it is")}</dt><dd>${L(opp.what)}</dd></div>
        <div><dt>${X("لماذا تهم", "Why it matters")}</dt><dd>${L(opp.why)}</dd></div>
        <div><dt>${X("ما المطلوب بعدها", "What's needed next")}</dt><dd>${L(opp.next)}</dd></div>
      </dl>
      <a class="btn btn--link" href="#opportunities" style="justify-self:start">${X("كل الفرص", "All opportunities")}</a>
    </section>

    <div class="ow-two">
      <section class="ow-block" aria-labelledby="q-study">
        ${blockTitle(html`<span id="q-study">${X("أين وصل طلب دراسة ريف؟", "Where is my Rif study request?")}</span>`)}
        ${studyTrack()}
        ${study()
          ? html`<p class="small">${X("رقم الطلب", "Reference")}: <span class="ref">${study().id}</span></p><a class="btn btn--link" href="#study" style="justify-self:start">${X("تفاصيل الطلب", "Request details")}</a>`
          : isDemo()
            ? html`<p class="muted small">${X("يظهر هنا طلبك بعد أن تقيّم مزرعتك.", "Your request appears here once you assess your farm.")}</p>`
            : html`<button type="button" class="btn btn--primary" data-act="study" style="justify-self:start">${X("اطلب دراسة ريف", "Request a Rif study")}</button>`}
      </section>
      <section class="ow-block" aria-labelledby="q-recent">
        ${blockTitle(html`<span id="q-recent">${X("آخر النشاط", "Recent activity")}</span>`, html`<a class="btn btn--link" href="#activity">${X("الكل", "All")}</a>`)}
        ${recent.length ? messageList(recent) : html`<p class="muted">${X("لا نشاط بعد.", "No activity yet.")}</p>`}
      </section>
    </div>`;
}

function demoBanner() {
  return html`<div class="ow-demo" role="note">
    <span>${X("تشاهد حسابًا تجريبيًا لمالك افتراضي. قيّم مزرعتك لترى بياناتك هنا.", "You're viewing a demo account for a sample owner. Assess your farm to see your own data here.")}</span>
    <a class="btn btn--primary btn--sm" href="${route("assessment")}">${X("ابدأ تقييم مزرعتك", "Start your farm assessment")}</a>
  </div>`;
}

function viewFarm() {
  const a = answers;
  const city = CITIES.find((c) => c.id === a.city);
  const cond = BUILDING_CONDITIONS.find((c) => c.id === a.buildingCondition);
  const maint = MAINTENANCE_LEVELS.find((m) => m.id === a.maintenance);
  const fac = (a.facilities || []).map((id) => L(FACILITIES.find((f) => f.id === id)?.label)).filter(Boolean);
  const svc = (a.services || []).filter((s) => s !== "none").map((id) => L(CURRENT_SERVICES.find((c) => c.id === id)?.label));
  const conf = { high: X("عالية", "High"), medium: X("متوسطة", "Medium"), low: X("منخفضة", "Low") }[readiness.confidence];
  return html`
    ${head(X("المزرعة والجاهزية", "Farm & readiness"), X("البيانات التي جمعتها في التقييم، وما تقوله عن جاهزية مزرعتك.", "The details you gave in the assessment, and what they say about readiness."))}
    <section class="ow-block">
      ${blockTitle(X("الجاهزية", "Readiness"), html`<span class="est">${t("common.estimate")}</span>`)}
      <div class="ow-readiness" data-charts>
        ${scoreRing(readiness.score, { size: 176, label: L(scoreBand(readiness.score).label) })}
        ${hbars(DIMENSIONS.map((d) => ({ label: L(d.label), value: readiness.dims[d.id] })))}
      </div>
      <p class="meta">${X("ثقة التقييم", "Confidence")}: ${conf}. ${X("الدرجة تُحسب بمحرك التقييم نفسه كلما عدّلت بياناتك.", "The score is recalculated by the same engine whenever you edit your details.")}</p>
      <div class="cluster">
        ${isDemo() ? html`<a class="btn btn--secondary btn--sm" href="${route("result", { example: 1 })}">${X("التقرير النموذجي", "Example report")}</a>` : html`<a class="btn btn--secondary btn--sm" href="${route("result", { ref: dash.result.reference })}">${X("التقرير الكامل", "Full report")}</a>`}
        ${isDemo() ? "" : html`<a class="btn btn--ghost btn--sm" href="#profile">${icon("edit", { size: "sm" })} ${X("عدّل البيانات", "Edit details")}</a>`}
        ${isDemo() ? "" : html`<button type="button" class="btn btn--ghost btn--sm" data-act="reassess">${icon("refresh", { size: "sm" })} ${X("أعد التقييم بخطواته", "Redo the assessment")}</button>`}
      </div>
    </section>
    <section class="ow-block">
      ${blockTitle(X("بيانات المزرعة", "Farm details"))}
      <dl class="ow-facts">
        <div><dt>${X("الاسم", "Name")}</dt><dd>${a.farmName}</dd></div>
        <div><dt>${X("الموقع", "Location")}</dt><dd>${L(city?.label)}، ${X(`${formatNumber(a.distanceKm)} كم عن المدينة`, `${a.distanceKm} km from town`)}</dd></div>
        <div><dt>${X("النوع", "Type")}</dt><dd>${L(ASSET_TYPES[a.assetType])}</dd></div>
        <div><dt>${X("المساحة", "Area")}</dt><dd><span class="num">${formatNumber(a.usableArea)}</span> ${X("قابلة للاستخدام من", "usable of")} <span class="num">${formatNumber(a.totalArea)}</span> م²</dd></div>
        <div><dt>${X("المباني والغرف", "Buildings and rooms")}</dt><dd>${formatNumber(a.buildings || 0)}، ${count(Number(a.rooms) || 0, "rooms")}${cond && Number(a.buildings) ? `، ${L(cond.label)}` : ""}</dd></div>
        <div><dt>${X("المرافق", "Facilities")}</dt><dd>${fac.length ? fac.join("، ") : X("لا توجد", "None")}</dd></div>
        <div><dt>${X("الخدمات الحالية", "Current services")}</dt><dd>${svc.length ? svc.join("، ") : X("لا توجد", "None")}</dd></div>
        <div><dt>${X("التشغيل", "Operations")}</dt><dd>${X(`${formatNumber(Number(a.staff) || 0)} عاملين`, `${Number(a.staff) || 0} staff`)}، ${L(maint?.label)}</dd></div>
        <div><dt>${X("التكاليف السنوية", "Yearly costs")}</dt><dd class="num">${formatMoney(Number(a.annualCosts) || 0)}</dd></div>
      </dl>
    </section>`;
}

function viewOpportunities() {
  const status = opportunityStatus(stage());
  const opps = buildOpportunities(answers);
  return html`
    ${head(X("فرص التطوير", "Development opportunities"), X("من خطة التطوير نفسها التي تُبنى عليها السيناريوهات. الحالة تتبع مرحلة مزرعتك.", "From the same development plan the scenarios use. Status follows your farm's stage."))}
    <ol class="ow-opps" role="list">
      ${opps.map(
        (o) => html`<li class="ow-opp">
          <div class="ow-opp__head"><h3 class="ow-opp__title">${icon(o.icon)} ${L(o.title)}</h3><span class="status status--${status.id === "proposed" ? "upcoming" : status.id === "study" ? "pending" : "confirmed"}">${L(status.label)}</span></div>
          <dl>
            <div><dt>${X("ما هي", "What it is")}</dt><dd>${L(o.what)}</dd></div>
            <div><dt>${X("لماذا تهم", "Why it matters")}</dt><dd>${L(o.why)}</dd></div>
            <div><dt>${X("ما المطلوب بعدها", "What's needed next")}</dt><dd>${L(o.next)}</dd></div>
          </dl>
        </li>`
      )}
    </ol>`;
}

function viewNumbers() {
  return html`
    ${head(X("السيناريوهات والافتراضات", "Scenarios & assumptions"), X("نفس السيناريوهات والافتراضات في تقريرك. أي تعديل هنا يظهر في التقرير، والعكس.", "The same scenarios and assumptions as your report. Edits here show in the report, and vice versa."))}
    <section class="ow-block">${blockTitle(X("السيناريوهات", "Scenarios"), html`<a class="btn btn--link" href="${isDemo() ? route("result", { example: 1 }) : route("result", { ref: dash.result.reference })}#scenarios">${X("في التقرير", "In the report")}</a>`)}${model.scenariosMarkup()}</section>
    <section class="ow-block">${blockTitle(X("الافتراضات", "Assumptions"))}${model.assumptionsMarkup()}</section>`;
}

function viewStudy() {
  const s = study();
  const idx = studyStateIndex(s);
  return html`
    ${head(X("دراسة ريف", "Rif study"), X("الدراسة التفصيلية تبدأ بمراجعة تقريرك، ثم معاينة ميدانية، ثم أرقام فعلية.", "The detailed study starts with reviewing your report, then a site visit, then real figures."))}
    <section class="ow-block">
      ${blockTitle(X("حالة الطلب", "Request status"), html`<span class="ow-question">${L(STUDY_STATES[idx].label)}</span>`)}
      <ol class="ow-journey ow-journey--five" role="list">
        ${STUDY_STATES.map((st, i) => html`<li class="ow-jstep ${i < idx ? "is-done" : i === idx ? "is-current" : ""}"><span class="ow-jdot">${i < idx ? icon("check") : ""}</span><span class="ow-jlabel">${L(st.label)}</span></li>`)}
      </ol>
    </section>
    ${s
      ? html`<section class="ow-block">
          ${blockTitle(X("تفاصيل الطلب", "Request details"))}
          <dl class="ow-facts">
            <div><dt>${X("رقم الطلب", "Reference")}</dt><dd class="ref">${s.id}</dd></div>
            <div><dt>${X("تاريخ الإرسال", "Sent on")}</dt><dd>${formatDate(s.createdAt.slice(0, 10))}</dd></div>
            <div><dt>${X("تقرير التقييم", "Assessment report")}</dt><dd class="ref">${s.assessmentRef || dash.result.reference}</dd></div>
            <div><dt>${X("وقت التواصل المفضل", "Preferred contact time")}</dt><dd>${contactTimeLabel(s.contactTime)}</dd></div>
            <div><dt>${X("رقم الجوال", "Mobile")}</dt><dd class="ltr" style="text-align:start">${s.phone}</dd></div>
            ${s.notes ? html`<div><dt>${X("ملاحظاتك", "Your notes")}</dt><dd>${s.notes}</dd></div>` : ""}
          </dl>
          <p class="note note--neutral">${icon("info")}<span>${X(
            "في هذا النموذج التجريبي لا يراجع أحد الطلب فعليًا. تتغير الحالة فقط عندما تُحدَّث من لوحة فريق ريف التجريبية.",
            "In this prototype no one actually reviews the request. The status only changes when it's updated from the demo Rif team view."
          )}</span></p>
        </section>`
      : isDemo()
        ? html`<section class="ow-block">${demoBanner()}</section>`
        : html`<section class="ow-next contours">
            <p class="ow-next__title">${X("لم تطلب الدراسة بعد.", "You haven't requested the study yet.")}</p>
            <p class="muted">${X("بلا رسوم ولا التزام. يراجع الفريق تقريرك ويتواصل معك في الوقت الذي تختاره.", "No fee or commitment. The team reviews your report and contacts you at the time you choose.")}</p>
            <button type="button" class="btn btn--primary btn--lg" data-act="study" style="justify-self:start">${X("اطلب دراسة ريف", "Request a Rif study")}</button>
          </section>`}`;
}

function messageList(list) {
  return html`<ul class="ow-list" role="list">
    ${list.map((m) => html`<li class="${m.read ? "" : "is-unread"}">${icon(m.from === "rif" ? "message" : "refresh", { size: "sm" })}<span class="ow-list__text"><span>${L(m.text)}</span><small>${m.from === "rif" ? X("ريف (رسالة آلية في النموذج)", "Rif (automatic message in the prototype)") : X("النظام", "System")}</small></span><span class="ow-list__aside">${formatDate(m.at.slice(0, 10), { day: "numeric", month: "short" })}</span></li>`)}
  </ul>`;
}

function viewActivity() {
  return html`
    ${head(X("النشاط والتنبيهات", "Activity & notifications"))}
    <section class="ow-block">
      ${blockTitle(X("التنبيهات", "Notifications"), unread() ? html`<button type="button" class="btn btn--link" data-act="read">${X("علّم الكل كمقروء", "Mark all read")}</button>` : "")}
      ${messages().length ? messageList(messages()) : emptyState({ title: X("لا تنبيهات بعد", "No notifications yet"), icon: "bell" })}
    </section>
    <section class="ow-block">
      ${blockTitle(X("الحجوزات والتشغيل", "Bookings & operations"), html`<span class="demo-tag">${t("common.demo")}</span>`)}
      <p class="muted">${stage() === "operating"
        ? X("حجوزات مزرعتك.", "Your farm's bookings.")
        : X("مزرعتك لم تبدأ التشغيل بعد، فلا حجوزات لها. هكذا تظهر الحجوزات عند التشغيل، من بيانات تجريبية لمزرعة السدر العاملة في ريف.", "Your farm isn't operating yet, so it has no bookings. This is how bookings appear once it is, using demo data from Al Sidr, an operating Rif farm.")}</p>
      <div data-bookings aria-busy="true">${html`<div class="skeleton skeleton--text"></div><div class="skeleton skeleton--text" style="width:80%"></div><div class="skeleton skeleton--text" style="width:60%"></div>`}</div>
    </section>`;
}

async function loadBookings() {
  const el = $("[data-bookings]");
  if (!el) return;
  try {
    const list = (await api.listBookings({ destinationId: "sidr" })).slice(0, 6);
    if (!list.length) return mount(el, emptyState({ title: t("empty.bookings.title"), text: t("empty.bookings.text"), icon: "calendar" }));
    mount(
      el,
      html`<ul class="ow-list" role="list">${list.map(
        (b) => html`<li>${icon("calendar", { size: "sm" })}<span class="ow-list__text"><span>${L(b.packageTitle)}، ${count(b.guests, "guests")}</span><small>${formatDate(b.date, { weekday: "short", day: "numeric", month: "short" })} <span class="ref">${b.id}</span></small></span><span class="ow-list__aside"><span class="status status--${b.status}">${t(`status.${b.status}`)}</span></span></li>`
      )}</ul>`
    );
  } catch {
    mount(el, errorState());
  } finally {
    el.removeAttribute("aria-busy");
  }
}

function viewProfile() {
  if (isDemo()) {
    return html`${head(X("الملف والبيانات", "Profile & details"))}${demoBanner()}
      <p class="muted">${X("بيانات الحساب التجريبي للعرض فقط.", "The demo account's details are view-only.")}</p>`;
  }
  const a = answers;
  const b = Number(a.buildings) || 0;
  return html`
    ${head(X("الملف والبيانات", "Profile & details"), X("هي نفسها بيانات تقييمك. أي تعديل يُعيد حساب الجاهزية والسيناريوهات، ويحدّث مزرعتك لدى فريق ريف.", "These are your assessment answers. Any edit recalculates readiness and scenarios, and updates your farm for the Rif team."))}
    <form class="ow-form" data-profile novalidate>
      <div class="ow-form__group">
        <h3 class="h4">${X("بيانات التواصل", "Contact details")}</h3>
        <div class="ow-form__row">
          ${field({ name: "ownerName", label: X("الاسم", "Name"), autocomplete: "name", value: a.ownerName })}
          ${field({ name: "phone", label: X("رقم الجوال", "Mobile number"), type: "tel", inputmode: "tel", rules: "required|phone", dir: "ltr", autocomplete: "tel", value: a.phone })}
        </div>
        ${field({ name: "email", label: X("البريد الإلكتروني", "Email"), type: "email", rules: "email", optional: true, dir: "ltr", autocomplete: "email", value: a.email })}
      </div>
      <div class="ow-form__group">
        <h3 class="h4">${X("المزرعة", "The farm")}</h3>
        <div class="ow-form__row">
          ${field({ name: "farmName", label: X("اسم المزرعة", "Farm name"), value: a.farmName })}
          ${field({ name: "city", label: X("المدينة أو المركز", "Town"), type: "select", value: a.city, options: CITIES.map((c) => ({ value: c.id, label: L(c.label) })) })}
        </div>
        <div class="ow-form__row">
          ${field({ name: "distanceKm", label: X("المسافة عن أقرب مدينة", "Distance to town"), type: "number", inputmode: "numeric", unit: X("كم", "km"), rules: "required|number|min:0|max:400", value: a.distanceKm })}
          ${field({ name: "annualCosts", label: X("التكاليف السنوية", "Yearly costs"), type: "number", inputmode: "numeric", unit: X("ر.س", "SAR"), rules: "required|number|min:0|max:50000000", value: a.annualCosts })}
        </div>
        <div class="ow-form__row">
          ${field({ name: "totalArea", label: X("المساحة الإجمالية", "Total area"), type: "number", inputmode: "numeric", unit: "م²", rules: "required|number|min:500|max:5000000", value: a.totalArea })}
          ${field({ name: "usableArea", label: X("المساحة القابلة للاستخدام", "Usable area"), type: "number", inputmode: "numeric", unit: "م²", rules: "required|number|min:100|max:5000000", value: a.usableArea })}
        </div>
        <div class="ow-form__row">
          ${stepper({ name: "buildings", label: X("المباني", "Buildings"), value: b, min: 0, max: 30 })}
          ${stepper({ name: "rooms", label: X("الغرف", "Rooms"), value: Number(a.rooms) || 0, min: 0, max: 60 })}
        </div>
        ${choiceGroup({ name: "buildingCondition", label: X("حالة المباني", "Building condition"), value: a.buildingCondition, options: BUILDING_CONDITIONS.map((c) => ({ value: c.id, title: L(c.label) })) })}
        ${choiceGroup({ name: "facilities", label: X("المرافق المتوفرة", "Facilities available"), type: "checkbox", rules: "", value: a.facilities || [], options: FACILITIES.map((f) => ({ value: f.id, title: L(f.label) })) })}
        <div class="ow-form__row">
          ${stepper({ name: "staff", label: X("العاملون الدائمون", "Permanent staff"), value: Number(a.staff) || 0, min: 0, max: 100 })}
          ${choiceGroup({ name: "maintenance", label: X("الصيانة", "Maintenance"), value: a.maintenance, options: MAINTENANCE_LEVELS.map((m) => ({ value: m.id, title: L(m.label) })) })}
        </div>
      </div>
      <div class="ow-form__actions">
        <button type="submit" class="btn btn--primary btn--lg">${X("احفظ التغييرات", "Save changes")}</button>
        <span class="meta" data-profile-status></span>
      </div>
    </form>`;
}

const VIEW_RENDER = { home: viewHome, farm: viewFarm, opportunities: viewOpportunities, numbers: viewNumbers, study: viewStudy, activity: viewActivity, profile: viewProfile };

/* ==========================================================================
   Frame & navigation
   ========================================================================== */

function frame() {
  return html`
    ${band()}
    <div class="container container--wide ow-page">
      <div class="ow-layout">
        <nav class="ow-rail" aria-label="${X("مساحة المالك", "Owner workspace")}">
          <ul class="ow-rail__list" role="list" data-rail></ul>
        </nav>
        <div class="ow-view" data-view tabindex="-1"></div>
      </div>
    </div>
    <nav class="ow-tabs" aria-label="${X("مساحة المالك", "Owner workspace")}" data-tabs></nav>`;
}

function renderNav() {
  mount(
    $("[data-rail]"),
    html`${VIEWS.map((v) => html`<li><a class="ow-rail__link" href="#${v.id}" ${v.id === view ? 'aria-current="page"' : ""}>${icon(v.icon, { size: "sm" })}<span>${v.label}</span>${v.id === "activity" && unread() ? html`<span class="ow-badge">${formatNumber(unread())}</span>` : ""}</a></li>`)}`
  );
  const primary = ["home", "farm", "numbers", "study"];
  const more = !primary.includes(view);
  mount(
    $("[data-tabs]"),
    html`<ul role="list">
      ${primary.map((id) => {
        const v = VIEWS.find((x) => x.id === id);
        const short = { home: X("الرئيسية", "Home"), farm: X("المزرعة", "Farm"), numbers: X("الأرقام", "Numbers"), study: X("الدراسة", "Study") }[id];
        return html`<li><a href="#${id}" ${id === view ? 'aria-current="page"' : ""}>${icon(v.icon)}<span>${short}</span></a></li>`;
      })}
      <li><button type="button" data-more ${more ? 'aria-current="page"' : ""} aria-haspopup="dialog">${icon("menu")}<span>${X("المزيد", "More")}</span></button></li>
    </ul>`
  );
}

function renderView({ focus = false } = {}) {
  const el = $("[data-view]");
  mount(el, VIEW_RENDER[view]());
  renderNav();
  if (view === "numbers") model.wire(el);
  if (view === "farm") onceVisible($("[data-charts]", el), () => playCharts(el), 0.05);
  if (view === "activity") loadBookings();
  if (view === "profile" && !isDemo()) wireProfile();
  if (focus) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => $("[data-view-title]", el)?.focus({ preventScroll: true }), 60);
  }
}

function rerenderBand() {
  const old = $("[data-band]");
  const tmp = document.createElement("div");
  tmp.innerHTML = String(band());
  old.replaceWith(tmp.firstElementChild);
  $("[data-band]").classList.add("is-in");
  $$("[data-band] .line-mask").forEach((m) => m.classList.add("is-revealed"));
}

function setView(id, { focus = true } = {}) {
  view = VIEWS.some((v) => v.id === id) ? id : "home";
  renderView({ focus });
}

/* ==========================================================================
   Actions
   ========================================================================== */

function requestStudy() {
  openStudyForm({
    answers,
    reference: dash.result.reference,
    onDone: () => {
      rerenderBand();
      renderView();
    },
  });
}

function openNotifications() {
  const list = messages();
  openDrawer({
    title: X("التنبيهات", "Notifications"),
    body: list.length ? messageList(list) : emptyState({ title: X("لا تنبيهات بعد", "No notifications yet"), icon: "bell" }),
    onClose: () => {
      if (!isDemo()) {
        api.markMessagesRead();
        rerenderBand();
        renderNav();
      }
    },
  });
}

function openMore() {
  const { el, close } = openDrawer({
    title: X("المزيد", "More"),
    body: html`<ul class="ow-rail__list" role="list">${VIEWS.filter((v) => !["home", "farm", "numbers", "study"].includes(v.id)).map(
      (v) => html`<li><a class="ow-rail__link" href="#${v.id}" ${v.id === view ? 'aria-current="page"' : ""}>${icon(v.icon, { size: "sm" })}<span>${v.label}</span>${v.id === "activity" && unread() ? html`<span class="ow-badge">${formatNumber(unread())}</span>` : ""}</a></li>`
    )}
    <li><a class="ow-rail__link" href="${isDemo() ? route("result", { example: 1 }) : route("result", { ref: dash.result.reference })}">${icon("file", { size: "sm" })}<span>${X("التقرير الكامل", "Full report")}</span></a></li></ul>`,
  });
  el.addEventListener("click", (e) => e.target.closest("a") && close());
}

function reassess() {
  // Start the 7 steps again, prefilled with today's answers (same data model)
  store.set("assessmentDraft", { step: 1, answers: { ...answers }, uploads: {} });
  window.location.assign(route("assessment"));
}

function wireProfile() {
  const form = $("[data-profile]");
  bindLiveValidation(form);
  const custom = {
    usableArea: () => (Number(form.usableArea.value) > Number(form.totalArea.value) ? X("المساحة القابلة للاستخدام لا يمكن أن تزيد عن المساحة الإجمالية.", "Usable area can't be larger than the total area.") : null),
  };
  form.addEventListener("input", () => ($("[data-profile-status]").textContent = X("تغييرات غير محفوظة", "Unsaved changes")));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateForm(form, custom).valid) {
      toast(t("error.fixBelow"), { type: "error" });
      return;
    }
    const v = readForm(form);
    const patch = { ...v };
    if ((Number(patch.buildings) || 0) === 0) {
      patch.rooms = 0;
      patch.buildingCondition = "poor";
    }
    const btn = form.querySelector("[type=submit]");
    btn.classList.add("is-loading");
    try {
      const { result, previousScore } = await api.updateFarmAnswers(patch);
      dash.result = result;
      answers = result.answers;
      readiness = result.readiness;
      dash.farm = { ...dash.farm, ...((await api.listFarms()).find((f) => f.id === result.farmId) || {}) };
      model.update(answers, readiness.dims.infrastructure);
      rerenderBand();
      renderNav();
      $("[data-profile-status]").textContent = t("common.saved");
      toast(
        previousScore === readiness.score
          ? X("حُفظت التغييرات.", "Changes saved.")
          : X(`حُفظت التغييرات. الجاهزية الآن ${readiness.score} (كانت ${previousScore}).`, `Changes saved. Readiness is now ${readiness.score} (was ${previousScore}).`)
      );
    } catch {
      toast(X("تعذّر حفظ التغييرات. أعد المحاولة.", "Couldn't save the changes. Try again."), { type: "error" });
    } finally {
      btn.classList.remove("is-loading");
    }
  });
}

function wire() {
  window.addEventListener("hashchange", () => setView(location.hash.slice(1)));
  on(main, "click", "[data-act]", (e, b) => {
    const a = b.dataset.act;
    if (a === "study") requestStudy();
    if (a === "reassess") reassess();
    if (a === "read") {
      api.markMessagesRead();
      rerenderBand();
      renderView();
    }
  });
  on(main, "click", "[data-notify]", openNotifications);
  on(main, "click", "[data-more]", openMore);
  initSteppers(main);
  // Other tabs (report, admin) may change the shared state
  ["studyRequests", "ownerMessages", "assessmentResult"].forEach((slice) =>
    store.subscribe(slice, () => {
      if (slice === "assessmentResult" && !isDemo()) {
        const r = store.get("assessmentResult");
        if (r) {
          dash.result = r;
          answers = r.answers;
          readiness = r.readiness;
          model.update(answers, readiness.dims.infrastructure);
        }
      }
      if (view !== "profile") renderView();
      renderNav();
    })
  );
}

/* ==========================================================================
   Boot
   ========================================================================== */

function skeleton() {
  return html`<section class="band band--compact" aria-busy="true"><div class="band__veil"></div>
    <div class="container container--wide band__inner">
      <div class="skeleton" style="height:1em;width:180px;opacity:.2"></div>
      <div class="skeleton" style="height:3.4rem;width:min(460px,80%);opacity:.2"></div>
      <div class="skeleton" style="height:1em;width:min(380px,70%);opacity:.2"></div>
    </div></section>
    <div class="container container--wide ow-page"><div class="ow-layout"><div class="skeleton" style="height:320px"></div><div class="stack"><div class="skeleton skeleton--title"></div><div class="skeleton" style="height:160px"></div><div class="skeleton" style="height:220px"></div></div></div></div>`;
}

async function boot() {
  mount(main, skeleton());
  try {
    dash = await api.getOwnerDashboard();
  } catch {
    $("[data-header]")?.classList.add("is-scrolled");
    mount(main, html`<div class="container" style="padding-block:calc(var(--header-h) + var(--space-8)) var(--space-9)">${errorState(X("تعذّر تحميل مساحة مزرعتك. أعد المحاولة.", "Couldn't load your farm workspace. Try again."))}</div>`);
    on(main, "click", "[data-retry]", () => {
      const u = new URL(location.href);
      u.searchParams.delete("simulate");
      location.replace(u);
    });
    return;
  }

  if (isDemo()) {
    answers = { ...SAMPLE_ANSWERS, farmName: L(SAMPLE_ANSWERS.farmName) };
    readiness = computeReadiness(answers);
  } else {
    answers = dash.result.answers;
    readiness = dash.result.readiness;
  }
  model = createScenarioModel({
    answers,
    infra: readiness.dims.infrastructure,
    assumptions: isDemo() ? null : store.get("assumptions"),
    scenario: isDemo() ? "base" : store.get("scenario") || "base",
    persist: !isDemo(),
    store,
    note: isDemo() ? X("تعديلات الحساب التجريبي لا تُحفظ.", "Demo account edits aren't saved.") : "",
  });

  document.title = `${answers.farmName} — ${X("مزرعتي", "My farm")} — ${t("brand.name")}`;
  mount(main, frame());
  document.body.classList.add("has-ow-tabs");
  playBand(main);
  wire();
  setView(location.hash.slice(1) || "home", { focus: false });
}

boot();
