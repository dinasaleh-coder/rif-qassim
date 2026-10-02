/* ==========================================================================
   For owners  (pages/business.html)
   "لديك أرض؟ دعنا نعرف ماذا يمكن أن تصبح."
   A consultation told in the homepage's voice: one image-led opening, the
   five-step journey on a single rule, what the report contains, how the
   score is weighed, and an honest start.
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, mount, $, on, onceVisible, observeReveals } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatNumber, formatDate } from "../core/format.js";
import { route } from "../core/paths.js";
import { store } from "../core/store.js";
import { renderMedia } from "../components/media.js";
import { icon } from "../components/icons.js";
import { pageBand, playBand } from "../components/cards.js";
import { scoreRing, hbars, playCharts } from "../components/charts.js";
import { DIMENSIONS, WIZARD_STEPS } from "../data/assessment.js";
import { SEED_FARMS, OWNER_TIMELINE, PIPELINE_STAGES } from "../data/farms.js";
import { getDestinationById } from "../data/destinations.js";

initShell({ page: "business", header: "overlay", bottomNav: true, footer: "full" });

const X = (ar, en) => L({ ar, en });
const draft = store.get("assessmentDraft");
const result = store.get("assessmentResult");
const hasDraft = draft && Object.keys(draft.answers || {}).length > 0;
const startLabel = () => (hasDraft ? X("أكمل تقييم مزرعتك", "Continue your assessment") : X("ابدأ تقييم مزرعتك", "Start your farm assessment"));

/* ---- Sections ---------------------------------------------------------- */

function band() {
  return pageBand({
    tall: true,
    media: "owners-hero",
    crumbs: [{ label: t("nav.home"), href: route("home") }, { label: X("للملاك", "For owners") }],
    title: X("لديك أرض؟ دعنا نعرف ماذا يمكن أن تصبح.", "Own land? Let's find out what it could become."),
    lead: X(
      "تقييم أولي في سبع خطوات قصيرة يقرأ مزرعتك كما يقرؤها فريق ريف: البنية، والوصول، والمباني، والتشغيل. تحصل على تقرير مفسّر وسيناريوهات تقديرية، قبل أي التزام.",
      "A seven-step initial assessment that reads your farm the way the Rif team does: infrastructure, access, buildings and operations. You get an explained report and estimated scenarios, before any commitment."
    ),
    actions: html`
      <a class="btn btn--light btn--lg" href="${route("assessment")}">${startLabel()}</a>
      <a class="btn btn--outline-light btn--lg" href="${result ? route("result", { ref: result.reference }) : route("result", { example: 1 })}">${result ? X("اعرض تقريرك", "View your report") : X("شاهد تقريرًا نموذجيًا", "See an example report")}</a>`,
    facts: html`<span>${X("قرابة ١٠ دقائق", "About 10 minutes")}</span><span>${X("بلا التزام، وبلا رسوم", "No commitment, no fee")}</span>`,
  });
}

function resumeNote() {
  if (!hasDraft && !result) return "";
  return html`
    <div class="container container--wide" style="padding-top:var(--space-7)">
      <div class="ob-resume" role="status">
        ${result
          ? html`<p>${X(`تقريرك عن ${result.answers.farmName} جاهز.`, `Your report on ${result.answers.farmName} is ready.`)} <span class="ref">${result.reference}</span> <span class="meta">${formatDate(result.submittedAt.slice(0, 10))}</span></p>
             <span class="cluster"><a class="btn btn--primary btn--sm" href="${route("owner")}">${X("مساحة مزرعتي", "My farm workspace")}</a><a class="btn btn--secondary btn--sm" href="${route("result", { ref: result.reference })}">${X("اعرض التقرير", "View the report")}</a></span>`
          : html`<p>${X(`لديك تقييم محفوظ عند الخطوة ${formatNumber(draft.step)} من ٧.`, `You have a saved assessment at step ${draft.step} of 7.`)}</p>
             <a class="btn btn--primary btn--sm" href="${route("assessment")}">${X("أكمل من حيث توقفت", "Continue where you left off")}</a>`}
      </div>
    </div>`;
}

function journey() {
  const steps = [
    [X("أدخل معلومات الأرض", "Describe your land"), X("المساحة، والمباني، والمرافق، وما تقدمه اليوم.", "Area, buildings, facilities and what you offer today."), X("أنت، قرابة ١٠ دقائق", "You, about 10 minutes")],
    [X("قيّم الجاهزية", "Readiness assessed"), X("درجة من ١٠٠ على خمسة أبعاد، وكل نقطة مرتبطة بإجابة.", "A score out of 100 across five dimensions, every point tied to an answer."), X("فوري", "Instant")],
    [X("استكشف السيناريوهات", "Explore scenarios"), X("متحفظ وأساسي ومتفائل، بافتراضات تستطيع تعديلها.", "Conservative, base and optimistic, with assumptions you can edit."), X("في التقرير", "In the report")],
    [X("اعرف الإمكانات", "See the potential"), X("الفرص، والفجوات، وما يحتاجه التطوير قبل التشغيل.", "Opportunities, gaps, and what development needs before operation."), X("في التقرير", "In the report")],
    [X("اطلب دراسة ريف", "Request a Rif study"), X("مراجعة الفريق، ثم معاينة ميدانية ودراسة تفصيلية.", "Team review, then a site visit and a detailed study."), X("فريق ريف", "The Rif team")],
  ];
  return html`
    <section class="section" aria-labelledby="ob-journey-title">
      <div class="container container--wide">
        <div class="stack" style="--stack-gap:var(--space-4);margin-bottom:var(--space-8);max-inline-size:52ch">
          <p class="kicker">${X("كيف يعمل", "How it works")}</p>
          <h2 class="h1" id="ob-journey-title">${X("من سؤال واحد إلى قرار واضح.", "From one question to a clear decision.")}</h2>
        </div>
        <ol class="ob-journey" role="list">
          ${steps.map(
            ([h, p, who], i) => html`<li class="ob-step" data-reveal style="--i:${i}">
              <span class="ob-step__num">${String(i + 1).padStart(2, "0")}</span>
              <div><h3 class="ob-step__title">${h}</h3><p class="ob-step__text">${p}</p><span class="ob-step__who">${who}</span></div>
            </li>`
          )}
        </ol>
      </div>
    </section>`;
}

function whatYouGet() {
  const demoDims = { infrastructure: 82, accessibility: 88, accommodation: 71, operations: 68, experiences: 63 };
  const items = [
    ["target", X("درجة جاهزية مفسّرة", "An explained readiness score"), X("ليست رقمًا مجردًا: ترى من أين جاءت كل نقطة، وما الذي يرفعها.", "Not a bare number: see where each point came from, and what would raise it.")],
    ["leaf", X("نقاط القوة والفجوات والفرص", "Strengths, gaps and opportunities"), X("ما يميز أرضك، وما ينقصها، وما يمكن بناؤه عليها.", "What sets your land apart, what it lacks, and what could be built on it.")],
    ["chart", X("ثلاثة سيناريوهات تقديرية", "Three estimated scenarios"), X("الإيراد والتكلفة والاستثمار والعائد، مع افتراضات تستطيع تغييرها.", "Revenue, costs, investment and payback, with assumptions you can change.")],
    ["file", X("خطوات تالية واضحة", "Clear next steps"), X("ما الذي تفعله الآن، ومتى يدخل فريق ريف.", "What to do now, and when the Rif team steps in.")],
  ];
  return html`
    <section class="section section--sand" aria-labelledby="ob-get-title">
      <div class="container container--wide ob-get">
        <div class="stack" style="--stack-gap:var(--space-5)">
          <p class="kicker">${X("ماذا تحصل", "What you get")}</p>
          <h2 class="h1" id="ob-get-title">${X("تقرير ميداني أولي، لا لوحة أرقام.", "A preliminary field report, not a dashboard.")}</h2>
          <ul class="ob-get__list" role="list">${items.map(([ic, h, p]) => html`<li>${icon(ic)}<div><h3>${h}</h3><p>${p}</p></div></li>`)}</ul>
        </div>
        <figure class="report-preview" data-report aria-label="${X("مثال على تقرير التقييم الأولي", "Example initial assessment report")}">
          <div class="report-preview__head">
            <div><p class="meta">${X("تقرير تقييم أولي", "Initial assessment report")}</p><p class="h3">${X("مزرعة الريحان، بريدة", "Al Raihan Farm, Buraydah")}</p></div>
            <span class="demo-tag">${X("مثال توضيحي", "Example")}</span>
          </div>
          <div class="report-preview__body">
            ${scoreRing(78, { size: 168, label: X("الجاهزية", "Readiness") })}
            ${hbars(DIMENSIONS.slice(0, 4).map((d) => ({ label: L(d.label), value: demoDims[d.id] })))}
          </div>
          <a class="btn btn--secondary btn--sm" href="${route("result", { example: 1 })}" style="justify-self:start">${X("افتح التقرير النموذجي كاملًا", "Open the full example report")}</a>
        </figure>
      </div>
    </section>`;
}

function whatWeRead() {
  const text = {
    infrastructure: X("كهرباء، ومياه، ودورات مياه، ومطبخ، ومواقف، وحالة المباني. أصعب ما يُستكمل وأغلاه.", "Power, water, restrooms, kitchen, parking and building condition. The hardest and costliest to complete."),
    accessibility: X("المسافة عن المدينة، وموقع المركز، والمواقف. الزائر الذي لا يصل لا يحجز.", "Distance from town, location and parking. A guest who can't get there doesn't book."),
    accommodation: X("الغرف والمباني القابلة للتأهيل. تحدد إن كانت الوجهة نهارية أم للإقامة.", "Rooms and buildings that can be converted. They decide day visits or stays."),
    operations: X("العاملون، والصيانة، والزوار والحجوزات الحالية. ما يمكن البناء عليه.", "Staff, maintenance, current visitors and bookings. What can be built on."),
    experiences: X("طبيعة الأصل، والمساحات الخارجية، والخدمات القائمة. أسهل ما تبنيه ريف.", "The asset's character, outdoor spaces and existing services. The easiest for Rif to build."),
  };
  return html`
    <section class="section" style="background:var(--rif-earth);color:var(--color-on-dark)" aria-labelledby="ob-read-title">
      <div class="container container--wide ob-read">
        <div class="stack" style="--stack-gap:var(--space-5)">
          <p class="kicker" style="color:var(--color-on-dark-muted)">${X("ما الذي نقرؤه", "What we read")}</p>
          <h2 class="h1" id="ob-read-title">${X("خمسة أبعاد، بأوزان معلنة.", "Five dimensions, with published weights.")}</h2>
          <p class="lead" style="color:var(--color-on-dark-muted)">${X(
            "الأساسيات التي يصعب تغييرها تزن أكثر. التجارب تزن أقل لأن بناءها هو عملنا.",
            "The fundamentals that are hard to change weigh most. Experiences weigh least, because building them is our job."
          )}</p>
        </div>
        <div class="ob-dims">
          ${DIMENSIONS.map(
            (d) => html`<div class="ob-dim" data-reveal>
              <h3>${L(d.label)}</h3><span class="ob-dim__weight">${formatNumber(d.weight * 100)}%</span>
              <p>${text[d.id]}</p>
              <span class="ob-dim__bar" aria-hidden="true"><span style="--w:${d.weight}"></span></span>
            </div>`
          )}
        </div>
      </div>
    </section>`;
}

function cases() {
  const picks = ["farm-sidr", "farm-tin", "farm-wasm"].map((id) => SEED_FARMS.find((f) => f.id === id));
  const stageIndex = (stage) => OWNER_TIMELINE.findIndex((s) => s.stages.includes(stage));
  return html`
    <section class="section" aria-labelledby="ob-cases-title">
      <div class="container container--wide">
        <div class="stack" style="--stack-gap:var(--space-4);margin-bottom:var(--space-7);max-inline-size:56ch">
          <p class="kicker">${X("من أرض إلى وجهة", "From land to destination")}</p>
          <h2 class="h1" id="ob-cases-title">${X("بدأت كلها بالتقييم نفسه.", "They all started with this assessment.")}</h2>
          <p class="meta">${X("وجهات توضيحية في النموذج.", "Illustrative destinations in the prototype.")}</p>
        </div>
        <div class="ob-cases">
          ${picks.map((f) => {
            const d = getDestinationById(f.destinationId);
            const idx = stageIndex(f.stage);
            const stage = PIPELINE_STAGES.find((s) => s.id === f.stage);
            return html`<article class="ob-case" data-reveal>
              ${renderMedia(d.media.card)}
              <div class="ob-case__stage"><span>${L(d.town)}</span><span>${L(stage.label)}</span></div>
              <div class="ob-case__track" role="img" aria-label="${X("مرحلة المشروع", "Project stage")}: ${L(stage.label)}">${OWNER_TIMELINE.map((s, i) => html`<span class="${i <= idx ? "is-done" : ""}"></span>`)}</div>
              <h3 class="h3"><a href="${route("destination", { id: d.id })}">${L(d.name)}</a></h3>
              <p class="muted small">${L(f.note)}</p>
            </article>`;
          })}
        </div>
      </div>
    </section>`;
}

function prepare() {
  const prep = [
    ["map", X("المساحة الإجمالية والقابلة للاستخدام، ولو تقريبية", "Total and usable area, even roughly")],
    ["home", X("عدد المباني والغرف وحالتها", "Number of buildings and rooms, and their condition")],
    ["bolt", X("المرافق المتوفرة: كهرباء، مياه، مواقف", "Facilities: power, water, parking")],
    ["coin", X("التكاليف السنوية الحالية", "Current yearly costs")],
    ["image", X("صور للمباني والمساحات (صورة واحدة على الأقل)", "Photos of buildings and spaces (at least one)")],
  ];
  const faq = [
    [X("هل التقييم ملزم؟", "Is the assessment binding?"), X("لا. هو قراءة أولية تساعدك على القرار، ولا يترتب عليه أي التزام منك أو من ريف.", "No. It's an initial read to help you decide, with no commitment from you or Rif.")],
    [X("هل الأرقام دقيقة؟", "Are the numbers accurate?"), X("الأرقام تقديرية ومحاكاة، تعتمد على إجاباتك وعلى افتراضات تراها وتعدّلها. الدراسة التفصيلية بعد المعاينة هي ما يُعتمد عليه.", "They're simulated estimates based on your answers and assumptions you can see and edit. The detailed study after a site visit is what to rely on.")],
    [X("أين تُحفظ بياناتي؟", "Where is my data kept?"), X("في هذا النموذج التجريبي تُحفظ في متصفحك فقط، ولا تُرسل إلى أي خادم.", "In this prototype it stays in your browser only and is never sent to a server.")],
    [X("ماذا يحدث بعد الإرسال؟", "What happens after I submit?"), X("ترى تقريرك فورًا، وتظهر مزرعتك فرصةً جديدة لدى فريق ريف. وإذا طلبت دراسة، يتواصل معك الفريق في الوقت الذي تختاره.", "You see your report straight away and your farm appears as a new opportunity for the Rif team. If you request a study, the team contacts you at the time you choose.")],
  ];
  return html`
    <section class="section section--paper" aria-labelledby="ob-prep-title">
      <div class="container container--wide ob-prep">
        <div class="stack" style="--stack-gap:var(--space-5)">
          <p class="kicker">${X("قبل أن تبدأ", "Before you start")}</p>
          <h2 class="h2" id="ob-prep-title">${X(`${formatNumber(WIZARD_STEPS.length)} خطوات، وهذا ما يفيدك تجهيزه.`, `${WIZARD_STEPS.length} steps, and what helps to have ready.`)}</h2>
          <ul class="ob-prep__list" role="list">${prep.map(([ic, txt]) => html`<li>${icon(ic)}<span>${txt}</span></li>`)}</ul>
          <p class="meta">${X("يُحفظ تقدمك تلقائيًا، وتستطيع العودة لاحقًا.", "Your progress saves automatically; you can come back later.")}</p>
        </div>
        <div class="accordion" data-faq>
          ${faq.map(
            ([q, a], i) => html`<div class="accordion__item">
              <button type="button" class="accordion__trigger" aria-expanded="false" aria-controls="faq-${i}">${q} ${icon("plus")}</button>
              <div class="accordion__panel" id="faq-${i}"><div><p class="accordion__content muted">${a}</p></div></div>
            </div>`
          )}
        </div>
      </div>
    </section>`;
}

function closing() {
  return html`
    <section class="closing" aria-labelledby="ob-close-title">
      <div class="closing__media">${renderMedia("story-potential", { fill: true, label: false })}</div>
      <div class="closing__veil"></div>
      <div class="container container--wide closing__inner">
        <h2 class="closing__title" id="ob-close-title">${X("قد تكون وجهتك القادمة أقرب مما تتخيل.", "Your next destination may be closer than you think.")}</h2>
        <a class="btn btn--light btn--lg" href="${route("assessment")}">${startLabel()}</a>
      </div>
    </section>`;
}

/* ---- Boot ---------------------------------------------------------------- */
mount($("#main"), html`${band()}${resumeNote()}${journey()}${whatYouGet()}${whatWeRead()}${cases()}${prepare()}${closing()}`);
playBand();
observeReveals();
onceVisible($("[data-report]"), () => playCharts($("[data-report]")), 0.3);

on($("#main"), "click", "[data-faq] .accordion__trigger", (e, b) => {
  const item = b.closest(".accordion__item");
  const open = !item.classList.contains("is-open");
  item.classList.toggle("is-open", open);
  b.setAttribute("aria-expanded", String(open));
});
