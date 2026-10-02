/* ==========================================================================
   Assessment report  (pages/assessment-result.html)
   A preliminary field & investment report built only from existing engines:
     - readiness: services/scoring.js (stored with the submission)
     - scenarios: services/feasibility.js with the shared assumptions
   ?example=1 shows the same report for a sample farm (nothing is saved).
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, mount, $, $$, on, debounce, onceVisible, getParam } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatMoney, formatCompact, formatPercent, formatNumber, formatDate, count } from "../core/format.js";
import { route } from "../core/paths.js";
import { store } from "../core/store.js";
import { icon } from "../components/icons.js";
import { pageBand, playBand, emptyState } from "../components/cards.js";
import { scoreRing, hbars, playCharts } from "../components/charts.js";
import { createScenarioModel } from "../components/scenarios.js";
import { openStudyForm, receivedMarkup } from "../components/study-request.js";
import { toast } from "../components/toast.js";
import { computeReadiness, scoreBand } from "../services/scoring.js";
import { buildOpportunities } from "../services/opportunities.js";
import { DIMENSIONS, CITIES, FACILITIES, SAMPLE_ANSWERS } from "../data/assessment.js";
import { ASSET_TYPES, OWNER_TIMELINE } from "../data/farms.js";
import * as api from "../services/api.js";

initShell({ page: "business", header: "overlay", bottomNav: true, footer: "full" });

const X = (ar, en) => L({ ar, en });
const EST = () => t("common.estimate");
const main = $("#main");
const isExample = getParam("example") === "1";



/* ---- State --------------------------------------------------------------- */
let report;
let model; // shared scenario view (feasibility engine + assumptions)

/* ==========================================================================
   Chapters
   ========================================================================== */

const CHAPTERS = [
  ["summary", X("الخلاصة", "Summary")],
  ["readiness", X("قراءة الجاهزية", "Readiness")],
  ["strengths", X("القوة والفجوات", "Strengths and gaps")],
  ["opportunities", X("الفرص", "Opportunities")],
  ["scenarios", X("السيناريوهات", "Scenarios")],
  ["assumptions", X("الافتراضات", "Assumptions")],
  ["next", X("الخطوات التالية", "Next steps")],
];

const chapter = (i, id, body, lead) => html`
  <section class="rp-chapter" id="${id}" aria-labelledby="h-${id}" data-chapter>
    <header class="rp-chapter__head">
      <span class="rp-chapter__num">${String(i + 1).padStart(2, "0")}</span>
      <h2 class="rp-chapter__title" id="h-${id}">${CHAPTERS[i][1]}</h2>
      ${lead ? html`<p class="muted" style="max-inline-size:60ch">${lead}</p>` : ""}
    </header>
    ${body}
  </section>`;

const range = (key) => model.range(key);

function summary() {
  const r = report.readiness;
  const b = scoreBand(r.score);
  const sorted = DIMENSIONS.map((d) => ({ ...d, v: r.dims[d.id] })).sort((a, z) => z.v - a.v);
  const top = sorted[0];
  const low = sorted[sorted.length - 1];
  return chapter(
    0,
    "summary",
    html`
      <div class="rp-summary">
        ${scoreRing(r.score, { size: 200, label: X("الجاهزية", "Readiness") })}
        <div class="rp-verdict">
          <span class="est">${EST()}</span>
          <p class="rp-verdict__label">${L(b.label)}</p>
          <p class="lead" style="color:var(--color-text)">${L(b.text)}</p>
          <p class="meta">${X("الدرجة مجموع موزون لخمسة أبعاد. ما فوق ٨٠ قريب من التشغيل، وما بين ٦٥ و٨٠ فرصة واعدة بفجوات معروفة.", "The score is a weighted sum of five dimensions. Above 80 is close to operation; 65–80 is promising with known gaps.")}</p>
        </div>
      </div>
      <ul class="rp-findings" role="list" data-findings>
        <li><span class="k">${X("أقوى ما في الأرض", "Strongest")}</span><span class="v">${L(top.label)}، ${X(`${formatNumber(top.v)} من 100`, `${top.v}/100`)}</span></li>
        <li><span class="k">${X("أكبر فجوة", "Biggest gap")}</span><span class="v">${L(low.label)}، ${X(`${formatNumber(low.v)} من 100`, `${low.v}/100`)}</span></li>
        <li><span class="k">${X("الإيراد السنوي", "Annual revenue")}</span><span class="v"><span class="rp-range" data-range="revenue">${range("revenue")}</span> ${X("ر.س", "SAR")} <span class="est">${EST()}</span></span></li>
        <li><span class="k">${X("الاستثمار الأولي", "Initial investment")}</span><span class="v"><span class="rp-range" data-range="investment">${range("investment")}</span> ${X("ر.س", "SAR")} <span class="est">${EST()}</span></span></li>
      </ul>
      <p class="note" style="margin-top:var(--space-6)">${icon("info")}<span>${X("هذا التقييم أولي ومحاكى لأغراض النموذج التجريبي، ولا يمثل دراسة جدوى نهائية.", "This assessment is initial and simulated for the prototype, and is not a final feasibility study.")}</span></p>`
  );
}

function readiness() {
  const r = report.readiness;
  const conf = { high: X("عالية", "High"), medium: X("متوسطة", "Medium"), low: X("منخفضة", "Low") }[r.confidence];
  return chapter(
    1,
    "readiness",
    html`
      <div class="rp-dims">
        ${DIMENSIONS.map(
          (d, i) => html`<div class="rp-dim" data-acc>
            ${hbars([{ label: `${L(d.label)} (${X("الوزن", "weight")} ${formatNumber(d.weight * 100)}%)`, value: r.dims[d.id] }])}
            <button type="button" class="btn btn--link rp-dim__why" aria-expanded="false" aria-controls="why-${d.id}" data-why>${X("لماذا هذه الدرجة؟", "Why this score?")}</button>
            <ul class="rp-drivers" id="why-${d.id}" role="list" hidden>
              ${(r.drivers[d.id] || []).map((dr) => html`<li><span>${L(dr.label)}</span><span class="pts ${dr.points === 0 ? "is-zero" : ""}">${formatNumber(dr.points)} / ${formatNumber(dr.max)}</span></li>`)}
            </ul>
          </div>`
        )}
      </div>
      <p class="meta" style="margin-top:var(--space-5)">${X("ثقة التقييم", "Confidence")}: <strong>${conf}</strong>${r.missing.length ? html`. ${X("ترتفع بإضافة", "Raised by adding")}: ${r.missing.map((m) => L(m.label)).join("، ")}.` : "."}</p>`,
    X("كل نقطة في الدرجة مرتبطة بإجابة محددة. افتح أي بُعد لترى ما الذي رفعه أو خفّضه.", "Every point traces to a specific answer. Open any dimension to see what raised or lowered it.")
  );
}

function strengths() {
  const r = report.readiness;
  return chapter(
    2,
    "strengths",
    html`<div class="rp-two">
      <div>
        <h3 class="h4" style="margin-bottom:var(--space-4)">${X("نقاط القوة", "Strengths")}</h3>
        ${r.strengths.length
          ? html`<ul class="rp-list rp-list--good" role="list">${r.strengths.map((s) => html`<li>${icon("check")}<div><h4>${L(DIMENSIONS.find((d) => d.id === s.id).label)} <span class="num muted">${formatNumber(s.value)}</span></h4><p>${L(s.text)}</p></div></li>`)}</ul>`
          : html`<p class="muted">${X("لا يوجد بُعد فوق ٧٢ بعد. هذا شائع في الأراضي غير المطوّرة.", "No dimension above 72 yet. Common for undeveloped land.")}</p>`}
      </div>
      <div>
        <h3 class="h4" style="margin-bottom:var(--space-4)">${X("الفجوات وما نوصي به", "Gaps and what we recommend")}</h3>
        ${r.gaps.length
          ? html`<ul class="rp-list rp-list--gap" role="list">${r.gaps.map((g) => html`<li>${icon("alert")}<div><h4>${L(DIMENSIONS.find((d) => d.id === g.id).label)} <span class="num muted">${formatNumber(g.value)}</span></h4><p>${L(g.text)}</p></div></li>`)}</ul>`
          : html`<p class="muted">${X("لا توجد فجوات كبيرة تحت ٧٠.", "No major gaps below 70.")}</p>`}
      </div>
    </div>`
  );
}

/* Opportunities from the shared builder (existing development plan) */
function opportunities() {
  const items = buildOpportunities(report.answers);
  return chapter(
    3,
    "opportunities",
    html`<div class="rp-opps">${items.map((o) => html`<div class="rp-opp"><span class="rp-opp__icon">${icon(o.icon)}</span><div><h4>${L(o.title)}</h4><p>${L(o.what)}</p><p class="meta" style="margin-top:var(--space-2)">${L(o.why)}</p></div></div>`)}</div>`,
    X("ما يمكن بناؤه على الأرض كما هي اليوم.", "What could be built on the land as it is today.")
  );
}

function scenarios() {
  return chapter(
    4,
    "scenarios",
    model.scenariosMarkup(),
    X("ثلاثة سيناريوهات على الافتراضات نفسها: المتحفظ يخفض الطلب ويرفع التكلفة، والمتفائل يعكس ذلك.", "Three scenarios on the same assumptions: conservative lowers demand and raises costs; optimistic does the opposite.")
  );
}

function assumptionsChapter() {
  return chapter(
    5,
    "assumptions",
    model.assumptionsMarkup(),
    X("هذه هي الافتراضات التي بُنيت عليها الأرقام. غيّر أيًا منها، وتتحدث السيناريوهات فورًا.", "These are the assumptions behind the numbers. Change any of them and the scenarios update immediately.")
  );
}

function nextSteps() {
  const r = report.readiness;
  const steps = [];
  r.gaps.slice(0, 2).forEach((g) => steps.push([L(DIMENSIONS.find((d) => d.id === g.id).label), L(g.text), X("أنت", "You")]));
  if (r.missing.length) steps.push([X("أكمل البيانات", "Complete the details"), r.missing.map((m) => L(m.label)).join("، "), X("أنت", "You")]);
  const team = OWNER_TIMELINE.slice(2, 5);
  steps.push([L(team[0].label), X("يراجع فريق ريف إجاباتك وصورك خلال ٣ أيام عمل.", "The Rif team reviews your answers and photos within 3 working days."), X("فريق ريف", "Rif team")]);
  steps.push([L(team[1].label), X("زيارة ميدانية لقياس المباني والوصول والمرافق.", "A site visit to measure buildings, access and utilities."), X("فريق ريف", "Rif team")]);
  steps.push([L(team[2].label), X("دراسة تفصيلية بأرقام فعلية، تسبق أي قرار تطوير.", "A detailed study with real figures, before any development decision."), X("فريق ريف", "Rif team")]);
  return chapter(
    6,
    "next",
    html`<ol class="rp-next" role="list">${steps.map(([h, p, who], i) => html`<li><span class="num">${String(i + 1).padStart(2, "0")}</span><div><h4>${h}</h4><p>${p}</p></div><span class="who">${who}</span></li>`)}</ol>`
  );
}

function studyCta() {
  if (isExample) {
    return html`<section class="rp-cta contours contours--light" data-no-print aria-labelledby="cta-title">
      <h2 class="rp-cta__title" id="cta-title">${X("هذا تقرير نموذجي. تقريرك يبدأ من أرضك.", "This is an example. Your report starts with your land.")}</h2>
      <a class="btn btn--light btn--lg" href="${route("assessment")}">${X("ابدأ تقييم مزرعتك", "Start your farm assessment")}</a>
    </section>`;
  }
  const existing = store.get("studyRequests").find((s) => s.farmId === report.farmId);
  return html`<section class="rp-cta contours contours--light" id="study" aria-labelledby="cta-title" data-cta>
    ${existing ? receivedMarkup(existing) : html`
      <p class="kicker" style="color:var(--color-on-dark-muted)">${X("الخطوة التالية", "Next step")}</p>
      <h2 class="rp-cta__title" id="cta-title">${X("اطلب دراسة ريف.", "Request a Rif study.")}</h2>
      <p class="lead">${X("يراجع الفريق هذا التقرير معك، ثم يرتب معاينة ميدانية ودراسة تفصيلية بأرقام فعلية. بلا التزام.", "The team reviews this report with you, then arranges a site visit and a detailed study with real figures. No commitment.")}</p>
      <button type="button" class="btn btn--light btn--lg" data-study>${X("اطلب دراسة ريف", "Request a Rif study")}</button>`}
  </section>`;
}

/* ==========================================================================
   Boot
   ========================================================================== */

function render() {
  const a = report.answers;
  const city = CITIES.find((c) => c.id === a.city);
  const date = report.submittedAt.slice(0, 10);
  mount(
    main,
    html`
      ${pageBand({
        compact: true,
        media: "story-assessment",
        crumbs: [{ label: t("nav.home"), href: route("home") }, { label: X("للملاك", "For owners"), href: route("business") }, { label: X("التقرير", "Report") }],
        title: X("تقييم أولي لفرص تطوير مزرعتك", "An initial read of your farm's development potential"),
        lead: `${a.farmName}، ${L(city?.label)}`,
        actions: html`
          ${isExample ? "" : html`<a class="btn btn--light" href="#study">${X("اطلب دراسة ريف", "Request a Rif study")}</a>`}
          ${isExample ? "" : html`<a class="btn btn--outline-light" href="${route("owner")}">${X("مساحة مزرعتي", "My farm workspace")}</a>`}
          <button type="button" class="btn btn--outline-light" data-print>${icon("file", { size: "sm" })} ${X("اطبع التقرير", "Print the report")}</button>`,
        facts: html`<span>${isExample ? X("تقرير نموذجي", "Example report") : html`<span class="ref">${report.reference}</span>`}</span><span>${formatDate(date)}</span><span>${EST()}</span>`,
      })}
      <div class="container container--wide rp-page">
        <div class="rp-layout">
          <nav class="rp-toc" aria-label="${X("محتويات التقرير", "Report contents")}">
            <ol role="list">${CHAPTERS.map(([id, label], i) => html`<li><a href="#${id}" data-toc="${id}"><span class="num">${String(i + 1).padStart(2, "0")}</span><span>${label}</span></a></li>`)}</ol>
            ${isExample ? "" : html`<a class="btn btn--primary btn--sm" href="#study">${X("اطلب دراسة ريف", "Request a Rif study")}</a>
              <a class="btn btn--secondary btn--sm" href="${route("owner")}">${X("مساحة مزرعتي", "My farm workspace")}</a>`}
          </nav>
          <div>
            <article class="rp-sheet" aria-label="${X("التقرير", "Report")}">
              <header class="rp-letterhead">
                <div class="stack" style="--stack-gap:var(--space-1)">
                  <p class="brand__wordmark-ar">ريف القصيم</p>
                  <p class="meta">${X("تقرير تقييم أولي، للمالك", "Initial assessment report, for the owner")}</p>
                </div>
                <dl>
                  <dt>${X("المزرعة", "Farm")}</dt><dd>${a.farmName}</dd>
                  <dt>${X("النوع", "Type")}</dt><dd>${L(ASSET_TYPES[a.assetType])}</dd>
                  <dt>${X("المساحة", "Area")}</dt><dd><span class="num">${formatNumber(a.totalArea)}</span> م²</dd>
                  <dt>${X("المرافق", "Facilities")}</dt><dd>${formatNumber((a.facilities || []).length)}/${formatNumber(FACILITIES.length)}</dd>
                </dl>
              </header>
              ${summary()}${readiness()}${strengths()}${opportunities()}${scenarios()}${assumptionsChapter()}${nextSteps()}
            </article>
            ${studyCta()}
          </div>
        </div>
      </div>`
  );
  playBand(main);
  model.wire(main);
  // Chapters are tall: play each one's figures as soon as any part shows
  ["#summary", "#readiness", "#scenarios"].forEach((sel) => onceVisible($(sel), () => playCharts($(sel)), 0.01));
  wire();
}

function wire() {
  on(main, "click", "[data-why]", (e, b) => {
    const list = document.getElementById(b.getAttribute("aria-controls"));
    const open = list.hidden;
    list.hidden = !open;
    b.setAttribute("aria-expanded", String(open));
    b.textContent = open ? X("إخفاء التفاصيل", "Hide details") : X("لماذا هذه الدرجة؟", "Why this score?");
  });

  on(main, "click", "[data-study]", () =>
    openStudyForm({
      answers: report.answers,
      reference: report.reference,
      onDone: (req) => {
        mount($("[data-cta]"), receivedMarkup(req));
        $("[data-cta]").scrollIntoView({ behavior: "smooth", block: "center" });
      },
    })
  );
  on(main, "click", "[data-print]", () => window.print());

  // Contents: mark the chapter in view
  const links = $$("[data-toc]");
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.isIntersecting && links.forEach((l) => l.setAttribute("aria-current", String(l.dataset.toc === en.target.id)))),
    { rootMargin: "-40% 0px -55% 0px" }
  );
  $$("[data-chapter]").forEach((c) => io.observe(c));
}

function boot() {
  if (isExample) {
    const answers = { ...SAMPLE_ANSWERS, farmName: L(SAMPLE_ANSWERS.farmName) };
    report = { answers, readiness: computeReadiness(answers), reference: null, submittedAt: new Date().toISOString(), farmId: null };
  } else {
    report = api.getAssessmentResult();
    const askedRef = getParam("ref");
    if (report && askedRef && askedRef !== report.reference) {
      // A report link for an assessment that isn't in this browser
      $("[data-header]")?.classList.add("is-scrolled");
      mount(
        main,
        html`<div class="container" style="padding-block:calc(var(--header-h) + var(--space-8)) var(--space-9)">${emptyState({
          title: X("هذا التقرير غير محفوظ في هذا المتصفح", "This report isn't saved in this browser"),
          text: X(`المرجع ${askedRef} لا يطابق التقييم المحفوظ هنا. التقارير التجريبية تُحفظ في المتصفح الذي أُرسلت منه.`, `Reference ${askedRef} doesn't match the assessment saved here. Demo reports live in the browser they were sent from.`),
          icon: "survey",
          action: html`<div class="cluster" style="justify-content:center"><a class="btn btn--primary btn--sm" href="${route("result", { ref: report.reference })}">${X("اعرض تقريري المحفوظ", "Open my saved report")}</a><a class="btn btn--secondary btn--sm" href="${route("owner")}">${X("مساحة مزرعتي", "My farm workspace")}</a></div>`,
        })}</div>`
      );
      return;
    }
    if (report && !askedRef) {
      // Keep the reference in the URL so refresh, back and sharing keep it
      const u = new URL(location.href);
      u.searchParams.set("ref", report.reference);
      history.replaceState(null, "", u);
    }
    if (!report) {
      $("[data-header]")?.classList.add("is-scrolled");
      mount(
        main,
        html`<div class="container" style="padding-block:calc(var(--header-h) + var(--space-8)) var(--space-9)">${emptyState({
          title: t("empty.assessment.title"),
          text: t("empty.assessment.text"),
          icon: "survey",
          action: html`<div class="cluster" style="justify-content:center"><a class="btn btn--primary btn--sm" href="${route("assessment")}">${X("ابدأ تقييم مزرعتك", "Start your farm assessment")}</a><a class="btn btn--secondary btn--sm" href="${route("result", { example: 1 })}">${X("شاهد تقريرًا نموذجيًا", "See an example report")}</a></div>`,
        })}</div>`
      );
      return;
    }
  }
  model = createScenarioModel({
    answers: report.answers,
    infra: report.readiness.dims.infrastructure,
    assumptions: isExample ? null : store.get("assumptions"),
    scenario: isExample ? "base" : store.get("scenario") || "base",
    persist: !isExample,
    store,
    note: isExample ? X("تعديلاتك هنا لا تُحفظ في التقرير النموذجي.", "Edits aren't saved on the example report.") : "",
  });
  document.title = `${X("تقرير التقييم الأولي", "Initial assessment report")}: ${report.answers.farmName} — ${t("brand.name")}`;
  render();

  if (getParam("new") === "1" && !isExample) {
    toast(X(`أُرسل التقييم ${report.reference}، وأصبحت مزرعتك فرصةً جديدة لدى فريق ريف.`, `Assessment ${report.reference} sent; your farm is now a new opportunity for the Rif team.`), { duration: 6000 });
    const u = new URL(location.href);
    u.searchParams.delete("new");
    history.replaceState(null, "", u);
    // (the ?ref= stays)
  }
}

boot();
