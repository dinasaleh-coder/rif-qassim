/* ==========================================================================
   Farm assessment  (pages/assessment.html)
   Seven steps, one notebook. Answers are saved on every change and resumed
   after a reload. Every answer key is the input of the existing scoring
   engine (services/scoring.js); submission goes through api.submitAssessment,
   which scores, stores the report and adds the farm to the Rif pipeline.
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, mount, $, $$, on, debounce } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatNumber, count } from "../core/format.js";
import { route } from "../core/paths.js";
import { store } from "../core/store.js";
import { icon } from "../components/icons.js";
import { pageBand, playBand, errorState } from "../components/cards.js";
import { field, choiceGroup, stepper, initSteppers, readForm, validateForm, bindLiveValidation, createUploader, showError, clearError } from "../components/forms.js";
import { openModal } from "../components/overlay.js";
import { toast } from "../components/toast.js";
import { CITIES, BUILDING_CONDITIONS, FACILITIES, CURRENT_SERVICES, MAINTENANCE_LEVELS, WIZARD_STEPS, DIMENSIONS } from "../data/assessment.js";
import { ASSET_TYPES } from "../data/farms.js";
import * as api from "../services/api.js";

initShell({ page: "business", header: "overlay", bottomNav: false, footer: "minimal" });

const X = (ar, en) => L({ ar, en });
const main = $("#main");
const TOTAL = WIZARD_STEPS.length;
const OFFERING = ["day-visits", "stays", "events", "produce", "workshops"];

/* Which dimensions each step feeds (shown in the notebook) */
const READS = {
  basics: ["accessibility", "experiences"],
  area: ["experiences"],
  buildings: ["accommodation", "infrastructure"],
  facilities: ["infrastructure", "accessibility", "operations"],
  services: ["experiences", "operations"],
  operations: ["operations"],
  uploads: [],
};

const STEP_COPY = {
  basics: [X("لنبدأ بالأرض ومن يملكها.", "Let's start with the land and its owner."), X("الموقع والمسافة عن المدينة يحددان سهولة وصول الزائر.", "Location and distance from town decide how easily guests arrive.")],
  area: [X("كم مساحة الأرض؟", "How big is the land?"), X("المساحة القابلة للاستخدام هي ما يمكن أن يستقبل الضيوف دون أن يمس الإنتاج.", "Usable area is what can host guests without touching production.")],
  buildings: [X("ماذا يقوم على الأرض؟", "What stands on the land?"), X("المباني القائمة أسرع وأرخص طريق إلى الإقامة.", "Existing buildings are the fastest, cheapest route to stays.")],
  facilities: [X("ما المتوفر من مرافق؟", "Which facilities are in place?"), X("اختر الموجود فعلًا اليوم. إن لم يتوفر شيء، اترك الخيارات فارغة.", "Choose what exists today. If nothing does, leave them empty.")],
  services: [X("ماذا تقدم المزرعة الآن؟", "What does the farm offer now?"), X("أي نشاط قائم، ولو بسيطًا، هو أساس يمكن البناء عليه.", "Any existing activity, however small, is a base to build on.")],
  operations: [X("من يدير المزرعة؟", "Who runs the farm?"), X("العاملون والصيانة والتكاليف الحالية تدخل في الجاهزية وفي السيناريوهات.", "Staff, maintenance and current costs feed readiness and the scenarios.")],
  uploads: [X("أرنا المكان.", "Show us the place."), X("صورة واحدة على الأقل. الصور والمستندات الإضافية ترفع ثقة التقييم.", "At least one photo. More photos and documents raise the assessment's confidence.")],
};

/* ---- State ----------------------------------------------------------------- */
let draft = store.get("assessmentDraft");
let step = Math.min(TOTAL, Math.max(1, draft.step || 1));
let answers = { ...draft.answers };
let uploads = { photos: [], documents: [], pricing: [], ...(draft.uploads || {}) };

const save = () => store.set("assessmentDraft", { step, answers, uploads });
const saveSoon = debounce(save, 250);
const stepDef = () => WIZARD_STEPS[step - 1];
const offers = () => (answers.services || []).some((s) => OFFERING.includes(s));

/* ==========================================================================
   Step views
   ========================================================================== */

function viewBasics() {
  return html`
    <div class="wz-row wz-row--2">
      ${field({ name: "ownerName", label: X("اسمك", "Your name"), autocomplete: "name", value: answers.ownerName })}
      ${field({ name: "phone", label: X("رقم الجوال", "Mobile number"), type: "tel", inputmode: "tel", rules: "required|phone", dir: "ltr", placeholder: "05XXXXXXXX", autocomplete: "tel", value: answers.phone, hint: X("يتواصل به فريق ريف إن طلبت دراسة.", "The Rif team uses it if you request a study.") })}
    </div>
    <div class="wz-row wz-row--2">
      ${field({ name: "farmName", label: X("اسم المزرعة أو الأصل", "Farm or asset name"), value: answers.farmName, placeholder: X("مثال: مزرعة الريحان", "e.g. Al Raihan Farm") })}
      ${field({ name: "city", label: X("المدينة أو المركز", "Town"), type: "select", placeholder: X("اختر من القائمة", "Choose from the list"), value: answers.city, options: CITIES.map((c) => ({ value: c.id, label: L(c.label) })) })}
    </div>
    ${choiceGroup({ name: "assetType", label: X("ما نوع الأصل؟", "What kind of asset?"), value: answers.assetType, options: Object.entries(ASSET_TYPES).map(([id, l]) => ({ value: id, title: L(l) })) })}
    ${field({ name: "distanceKm", label: X("المسافة عن أقرب مدينة", "Distance to the nearest town"), type: "number", inputmode: "numeric", unit: X("كم", "km"), rules: "required|number|min:0|max:400", value: answers.distanceKm, hint: X("بالسيارة، تقريبًا.", "By car, roughly.") })}`;
}

function viewArea() {
  return html`
    <div class="wz-row wz-row--2">
      ${field({ name: "totalArea", label: X("المساحة الإجمالية", "Total area"), type: "number", inputmode: "numeric", unit: "م²", rules: "required|number|min:500|max:5000000", value: answers.totalArea, hint: X("بالمتر المربع. الهكتار = ١٠٬٠٠٠ م².", "In m². One hectare = 10,000 m².") })}
      ${field({ name: "usableArea", label: X("المساحة القابلة للاستخدام السياحي", "Area usable for guests"), type: "number", inputmode: "numeric", unit: "م²", rules: "required|number|min:100|max:5000000", value: answers.usableArea, hint: X("ساحات، ممرات، جلسات، مبانٍ. لا تحتسب الحقول المنتجة.", "Yards, paths, seating, buildings. Not producing fields.") })}
    </div>
    <figure class="wz-plot" data-plot aria-live="polite">
      <div class="wz-plot__land" role="img" aria-label="${X("نسبة المساحة القابلة للاستخدام", "Usable share of the land")}"><span class="wz-plot__use"></span></div>
      <figcaption class="wz-plot__text" data-plot-text></figcaption>
    </figure>`;
}

function viewBuildings() {
  const b = Number(answers.buildings) || 0;
  return html`
    ${stepper({ name: "buildings", label: X("عدد المباني", "Number of buildings"), value: b, min: 0, max: 30, hint: X("بيوت، استراحات، مخازن قابلة للتأهيل.", "Houses, rest houses, stores that could be converted.") })}
    <div class="wz-cond" data-cond="buildings" ${b > 0 ? "" : "hidden"}>
      ${stepper({ name: "rooms", label: X("عدد الغرف الصالحة للنوم أو التأهيل", "Rooms that can sleep guests or be converted"), value: Number(answers.rooms) || 0, min: 0, max: 60 })}
      ${choiceGroup({ name: "buildingCondition", label: X("حالة المباني عمومًا", "Overall building condition"), value: answers.buildingCondition, options: BUILDING_CONDITIONS.map((c) => ({ value: c.id, title: L(c.label), desc: L(c.desc) })) })}
    </div>
    <p class="note note--neutral" data-cond="no-buildings" ${b > 0 ? "hidden" : ""}>${icon("info")}<span>${X(
      "لا مبانٍ؟ لا بأس. سنقرأ الأرض كتطوير جديد، وتظهر الإقامة في التقرير كفرصة بناء.",
      "No buildings? That's fine. We'll read the land as new development, and stays appear in the report as a build opportunity."
    )}</span></p>`;
}

function viewFacilities() {
  return html`
    ${choiceGroup({
      name: "facilities",
      label: X("المرافق المتوفرة اليوم", "Facilities available today"),
      type: "checkbox",
      rules: "",
      value: answers.facilities || [],
      options: FACILITIES.map((f) => ({ value: f.id, title: L(f.label), desc: L(f.desc) })),
    })}
    <p class="meta" data-fac-count></p>`;
}

function viewServices() {
  const s = answers.services || [];
  return html`
    ${choiceGroup({ name: "services", label: X("الخدمات الحالية", "Current services"), type: "checkbox", value: s, options: CURRENT_SERVICES.map((c) => ({ value: c.id, title: L(c.label) })) })}
    <div class="wz-cond" data-cond="offers" ${offers() ? "" : "hidden"}>
      <div class="wz-row wz-row--2">
        ${field({ name: "currentPrice", label: X("متوسط سعرك الحالي", "Your current average price"), type: "number", inputmode: "numeric", unit: X("ر.س", "SAR"), rules: "number|min:0|max:100000", optional: true, value: answers.currentPrice, hint: X("للزيارة أو الليلة أو الحجز.", "Per visit, night or booking.") })}
        ${field({ name: "visitorsPerYear", label: X("الزوار في السنة تقريبًا", "Visitors a year, roughly"), type: "number", inputmode: "numeric", rules: "number|min:0|max:1000000", optional: true, value: answers.visitorsPerYear })}
      </div>
      <div data-cond="stays" ${s.includes("stays") || s.includes("events") ? "" : "hidden"}>
        ${field({ name: "bookingsPerYear", label: X("حجوزات المبيت أو المناسبات في السنة", "Stay or event bookings a year"), type: "number", inputmode: "numeric", rules: "number|min:0|max:100000", optional: true, value: answers.bookingsPerYear })}
      </div>
    </div>`;
}

function viewOperations() {
  return html`
    ${stepper({ name: "staff", label: X("عدد العاملين الدائمين", "Permanent staff"), value: Number(answers.staff) || 0, min: 0, max: 100 })}
    ${choiceGroup({ name: "maintenance", label: X("الصيانة", "Maintenance"), value: answers.maintenance, options: MAINTENANCE_LEVELS.map((m) => ({ value: m.id, title: L(m.label), desc: L(m.desc) })) })}
    ${field({ name: "annualCosts", label: X("التكاليف السنوية الحالية", "Current yearly costs"), type: "number", inputmode: "numeric", unit: X("ر.س", "SAR"), rules: "required|number|min:0|max:50000000", value: answers.annualCosts, hint: X("رواتب، كهرباء، مياه، صيانة. اكتب ٠ إن لم توجد.", "Wages, power, water, upkeep. Enter 0 if none.") })}`;
}

function viewUploads() {
  const group = (key, title, desc, required) => html`
    <div class="field wz-upload" data-field="upload-${key}">
      <div class="wz-upload__head">
        <p class="field__label">${title}${required ? "" : html`<span class="optional">${t("common.optional")}</span>`}</p>
        <span class="meta" data-up-count="${key}"></span>
      </div>
      <p class="field__hint">${desc}</p>
      <div data-uploader="${key}"></div>
    </div>`;
  return html`
    ${group("photos", X("صور المزرعة", "Farm photos"), X("المباني، والمداخل، والمساحات الخارجية. صورة واحدة على الأقل، وخمس صور تعطي قراءة أدق.", "Buildings, entrances and outdoor areas. At least one; five give a sharper read."), true)}
    ${group("documents", X("صك الملكية أو المستندات", "Title deed or documents"), X("يساعد الفريق في مرحلة المراجعة.", "Helps the team at review."), false)}
    ${offers() ? group("pricing", X("قوائم الأسعار الحالية", "Current price lists"), X("إن وُجدت.", "If you have them."), false) : ""}
    <p class="note note--neutral">${icon("info")}<span>${t("upload.hint")}</span></p>`;
}

const VIEWS = { basics: viewBasics, area: viewArea, buildings: viewBuildings, facilities: viewFacilities, services: viewServices, operations: viewOperations, uploads: viewUploads };

/* ==========================================================================
   Frame
   ========================================================================== */

function frame() {
  return html`
    ${pageBand({
      compact: true,
      media: "owners-hero",
      crumbs: [{ label: t("nav.home"), href: route("home") }, { label: X("للملاك", "For owners"), href: route("business") }, { label: X("التقييم", "Assessment") }],
      title: X("تقييم مزرعتك", "Your farm assessment"),
      lead: X("أجب بما تعرفه اليوم؛ التقديرات التقريبية كافية. يُحفظ كل شيء تلقائيًا.", "Answer with what you know today; rough figures are enough. Everything saves automatically."),
      facts: html`<span>${formatNumber(TOTAL)} ${X("خطوات", "steps")}</span><span>${X("قرابة ١٠ دقائق", "About 10 minutes")}</span>`,
    })}
    <div class="container container--wide wz-page">
      <div class="wz-layout">
        <aside class="wz-notebook contours" aria-label="${X("دفتر التقييم", "Assessment notebook")}">
          <p class="kicker">${X("دفتر التقييم", "Assessment notebook")}</p>
          <ol class="wz-index" role="list" data-index></ol>
          <div class="wz-reads" data-reads></div>
        </aside>
        <div>
          <div class="wz-mprogress">
            <div class="split"><span class="step-counter" data-counter></span><span class="meta" data-saved></span></div>
            <div class="progress"><div class="progress__bar" data-progress></div></div>
          </div>
          <form class="wz-form" data-form novalidate>
            <div class="wz-head" data-head></div>
            <div class="wz-step" data-step></div>
          </form>
          <div class="wz-nav">
            <button type="button" class="btn btn--ghost" data-back>${icon("arrow", { size: "sm", cls: "cal__prev" })} ${t("common.back")}</button>
            <button type="button" class="btn btn--primary btn--lg" data-next></button>
          </div>
        </div>
      </div>
    </div>
    <div class="wz-bar" data-bar>
      <button type="button" class="btn btn--secondary btn--icon" data-back aria-label="${t("common.back")}">${icon("arrow", { cls: "cal__prev" })}</button>
      <button type="button" class="btn btn--primary" data-next></button>
    </div>`;
}

/* ==========================================================================
   Rendering
   ========================================================================== */

function renderChrome() {
  $("[data-counter]").innerHTML = String(html`<strong>${String(step).padStart(2, "0")}</strong> / ${String(TOTAL).padStart(2, "0")}`);
  $("[data-progress]").style.setProperty("--value", step / TOTAL);
  mount(
    $("[data-index]"),
    html`${WIZARD_STEPS.map((s, i) => {
      const n = i + 1;
      const state = n < step ? "is-done" : n === step ? "is-current" : "";
      return html`<li class="${state}"><button type="button" data-jump="${n}" ${n < step ? "" : "disabled"} ${n === step ? 'aria-current="step"' : ""}>
        <span class="num">${String(n).padStart(2, "0")}</span><span>${L(s.title)}</span>${n < step ? icon("check", { size: "sm" }) : html`<span></span>`}
      </button></li>`;
    })}`
  );
  const reads = READS[stepDef().id];
  mount(
    $("[data-reads]"),
    reads.length
      ? html`<p>${X("هذه الخطوة تغذي في التقييم:", "This step feeds:")}</p><ul role="list">${reads.map((id) => html`<li class="tag">${L(DIMENSIONS.find((d) => d.id === id).label)}</li>`)}</ul>`
      : html`<p>${X("هذه الخطوة ترفع ثقة التقييم، ولا تغيّر الدرجة.", "This step raises confidence; it doesn't change the score.")}</p>`
  );
  const nextLabel = step === TOTAL ? X("راجع وأرسل", "Review and send") : t("common.next");
  $$("[data-next]").forEach((b) => (b.innerHTML = String(html`${nextLabel}${step < TOTAL ? html` ${icon("arrow", { size: "sm" })}` : ""}`)));
  $$("[data-back]").forEach((b) => {
    b.disabled = step === 1;
    b.style.visibility = step === 1 ? "hidden" : "";
  });
}

function renderStep({ focus = true } = {}) {
  const def = stepDef();
  const [title, intro] = STEP_COPY[def.id];
  mount(
    $("[data-head]"),
    html`<p class="kicker">${X(`الخطوة ${formatNumber(step)}`, `Step ${step}`)}: ${L(def.title)}</p>
      <h2 class="wz-title" tabindex="-1" data-title>${title}</h2>
      <p class="wz-intro">${intro}</p>`
  );
  mount($("[data-step]"), VIEWS[def.id]());
  renderChrome();
  afterRender(def.id);
  if (focus) {
    $("[data-head]").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => $("[data-title]")?.focus({ preventScroll: true }), 60);
  }
}

function afterRender(id) {
  if (id === "area") updatePlot();
  if (id === "facilities") updateFacilityCount();
  if (id === "uploads") {
    ["photos", "documents", "pricing"].forEach((key) => {
      const el = $(`[data-uploader="${key}"]`);
      if (!el) return;
      createUploader(el, {
        name: key,
        accept: key === "photos" ? "image/*" : "image/*,.pdf,.doc,.docx,.xls,.xlsx",
        initial: uploads[key] || [],
        onChange: (files) => {
          uploads[key] = files;
          updateUploadCounts();
          if (key === "photos" && files.length) clearError($('[data-field="upload-photos"]'));
          save();
        },
      });
    });
    updateUploadCounts();
  }
}

function updatePlot() {
  const total = Number(answers.totalArea) || 0;
  const use = Number(answers.usableArea) || 0;
  const share = total ? Math.min(1, use / total) : 0;
  $("[data-plot] .wz-plot__use").style.setProperty("--use", share);
  $("[data-plot-text]").innerHTML = String(
    total
      ? html`<span>${X(`${formatNumber(Math.round(share * 100))}% من الأرض قابل للاستخدام`, `${Math.round(share * 100)}% of the land is usable`)}</span><span>${X(`${formatNumber(total / 10000, { decimals: 1 })} هكتار إجمالًا`, `${formatNumber(total / 10000, { decimals: 1 })} ha in total`)}</span>`
      : html`<span>${X("أدخل المساحتين لترى نسبة الاستخدام.", "Enter both areas to see the usable share.")}</span>`
  );
}

function updateFacilityCount() {
  const n = (answers.facilities || []).length;
  $("[data-fac-count]").textContent = n
    ? X(`اخترت ${formatNumber(n)} من ${formatNumber(FACILITIES.length)}.`, `${n} of ${FACILITIES.length} selected.`)
    : X("لم تختر شيئًا. لا بأس إن كانت الأرض بلا مرافق بعد.", "Nothing selected. That's fine if the land has no facilities yet.");
}

function updateUploadCounts() {
  $$("[data-up-count]").forEach((el) => {
    const n = (uploads[el.dataset.upCount] || []).length;
    el.textContent = n ? X(`${formatNumber(n)} ملف`, `${n} file${n > 1 ? "s" : ""}`) : "";
  });
}

function updateConditions() {
  const b = Number(answers.buildings) || 0;
  const cond = $('[data-cond="buildings"]');
  if (cond) {
    cond.hidden = b === 0;
    $('[data-cond="no-buildings"]').hidden = b > 0;
  }
  const off = $('[data-cond="offers"]');
  if (off) {
    off.hidden = !offers();
    const s = answers.services || [];
    $('[data-cond="stays"]').hidden = !(s.includes("stays") || s.includes("events"));
  }
}

/* ==========================================================================
   Reading answers & validation
   ========================================================================== */

function collect() {
  const v = readForm($("[data-form]"));
  const id = stepDef().id;
  Object.assign(answers, v);
  if (id === "buildings" && (Number(answers.buildings) || 0) === 0) {
    // No buildings: nothing to sleep in, nothing to restore
    answers.rooms = 0;
    answers.buildingCondition = "poor";
  }
  if (id === "services" && !offers()) {
    answers.currentPrice = "";
    answers.visitorsPerYear = "";
    answers.bookingsPerYear = "";
  }
  answers.uploads = { photos: (uploads.photos || []).length, documents: (uploads.documents || []).length, pricing: (uploads.pricing || []).length };
}

function validateStep() {
  const form = $("[data-form]");
  const id = stepDef().id;
  const custom = {
    usableArea: () =>
      Number(answers.usableArea) > Number(answers.totalArea)
        ? X("المساحة القابلة للاستخدام لا يمكن أن تزيد عن المساحة الإجمالية.", "Usable area can't be larger than the total area.")
        : null,
  };
  const { valid } = validateForm(form, custom);
  if (!valid) return false;
  if (id === "uploads" && !(uploads.photos || []).length) {
    const f = $('[data-field="upload-photos"]');
    showError(f, X("أضف صورة واحدة على الأقل للمزرعة.", "Add at least one photo of the farm."));
    f.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

function go(n) {
  step = Math.min(TOTAL, Math.max(1, n));
  save();
  renderStep();
}

function next() {
  collect();
  if (!validateStep()) {
    toast(t("error.fixBelow"), { type: "error" });
    return;
  }
  save();
  if (step < TOTAL) go(step + 1);
  else confirmSubmit();
}

/* ==========================================================================
   Confirmation & submission
   ========================================================================== */

function confirmSubmit() {
  const city = CITIES.find((c) => c.id === answers.city);
  const services = (answers.services || []).filter((s) => s !== "none").map((s) => L(CURRENT_SERVICES.find((c) => c.id === s).label));
  const { close } = openModal({
    title: X("قبل أن نرسل التقييم", "Before we send the assessment"),
    body: html`
      <div class="stack" style="--stack-gap:var(--space-5)">
        <p class="muted">${X("راجع الملخص. بعد الإرسال ترى تقريرك فورًا، وتظهر مزرعتك فرصةً جديدة لدى فريق ريف.", "Check the summary. After sending you'll see your report straight away, and your farm appears as a new opportunity for the Rif team.")}</p>
        <dl class="wz-review">
          <div><dt>${X("المزرعة", "Farm")}</dt><dd>${answers.farmName}، ${L(city?.label)}</dd></div>
          <div><dt>${X("النوع", "Type")}</dt><dd>${L(ASSET_TYPES[answers.assetType])}</dd></div>
          <div><dt>${X("المساحة", "Area")}</dt><dd><span class="num">${formatNumber(answers.usableArea)}</span> ${X("من", "of")} <span class="num">${formatNumber(answers.totalArea)}</span> م²</dd></div>
          <div><dt>${X("المباني", "Buildings")}</dt><dd>${formatNumber(answers.buildings || 0)}</dd></div>
          <div><dt>${X("الغرف", "Rooms")}</dt><dd>${count(Number(answers.rooms) || 0, "rooms")}</dd></div>
          <div><dt>${X("المرافق", "Facilities")}</dt><dd>${formatNumber((answers.facilities || []).length)} ${X("من", "of")} ${formatNumber(FACILITIES.length)}</dd></div>
          <div><dt>${X("الخدمات الحالية", "Current services")}</dt><dd>${services.length ? services.join("، ") : X("لا توجد", "None")}</dd></div>
          <div><dt>${X("الصور", "Photos")}</dt><dd>${formatNumber(answers.uploads.photos)}</dd></div>
          <div><dt>${X("المستندات", "Documents")}</dt><dd>${formatNumber(answers.uploads.documents)}</dd></div>
        </dl>
        <p class="note">${icon("info")}<span>${X("هذا التقييم أولي ومحاكى لأغراض النموذج التجريبي، ولا يمثل دراسة جدوى نهائية.", "This assessment is initial and simulated for the prototype, and is not a final feasibility study.")}</span></p>
      </div>`,
    foot: html`<div class="cluster" style="justify-content:space-between">
      <button type="button" class="btn btn--ghost" data-close>${X("راجع إجاباتي", "Review my answers")}</button>
      <button type="button" class="btn btn--primary btn--lg" data-send>${X("أرسل التقييم", "Send the assessment")}</button>
    </div>`,
    onOpen(panel) {
      $("[data-send]", panel).addEventListener("click", () => {
        close();
        submit();
      });
    },
  });
}

async function submit() {
  const lines = [
    X("نقرأ البنية التحتية", "Reading infrastructure"),
    X("نقيس سهولة الوصول", "Measuring access"),
    X("نحسب إمكانات الإقامة", "Working out stay potential"),
    X("نبني السيناريوهات التقديرية", "Building estimated scenarios"),
  ];
  $("[data-bar]")?.setAttribute("hidden", "");
  document.body.classList.remove("has-wz-bar");
  const page = $(".wz-page");
  page.scrollIntoView({ behavior: "smooth", block: "start" });
  mount(
    page,
    html`<div class="wz-analysing contours" role="status" aria-live="polite">
      <span class="wz-analysing__mark" aria-hidden="true"></span>
      <h2 class="h2">${X(`نقرأ ${answers.farmName}`, `Reading ${answers.farmName}`)}</h2>
      <ol class="wz-analysing__lines" role="list">${lines.map((l) => html`<li>${l}</li>`)}</ol>
    </div>`
  );
  const items = $$(".wz-analysing__lines li", page);
  let i = 0;
  const timer = setInterval(() => items[i] && items[i++].classList.add("is-on"), 380);
  try {
    const ownerName = String(answers.ownerName || "").trim();
    const submitted = await api.submitAssessment({ ...answers, ownerFirstName: ownerName.split(/\s+/)[0] || "" });
    clearInterval(timer);
    items.forEach((li) => li.classList.add("is-on"));
    setTimeout(() => window.location.assign(route("result", { ref: submitted.reference, new: 1 })), 450);
  } catch {
    clearInterval(timer);
    mount(page, errorState(X("تعذّر إرسال التقييم. إجاباتك محفوظة؛ أعد المحاولة.", "Couldn't send the assessment. Your answers are saved; try again.")));
    page.querySelector("[data-retry]").addEventListener("click", () => window.location.reload());
  }
}

/* ==========================================================================
   Boot
   ========================================================================== */

function wire() {
  on(main, "click", "[data-next]", next);
  on(main, "click", "[data-back]", () => {
    collect();
    save();
    go(step - 1);
  });
  on(main, "click", "[data-jump]", (e, b) => {
    collect();
    save();
    go(Number(b.dataset.jump));
  });
  initSteppers(main);
  bindLiveValidation($("[data-form]"));

  const onChange = (e) => {
    if (!e.target.closest?.("[data-form]")) return;
    // "No services yet" is exclusive with the others
    if (e.target.name === "services" && e.type === "change") {
      const boxes = $$('input[name="services"]', main);
      if (e.target.value === "none" && e.target.checked) boxes.forEach((b) => b.value !== "none" && (b.checked = false));
      if (e.target.value !== "none" && e.target.checked) boxes.forEach((b) => b.value === "none" && (b.checked = false));
    }
    collect();
    updateConditions();
    if (stepDef().id === "area") updatePlot();
    if (stepDef().id === "facilities") updateFacilityCount();
    saveSoon();
    $("[data-saved]").textContent = t("common.saved");
  };
  main.addEventListener("input", onChange);
  main.addEventListener("change", onChange);
  $("[data-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    next();
  });
}

mount(main, frame());
document.body.classList.add("has-wz-bar");
playBand(main);
wire();
renderStep({ focus: false });

// Resuming a saved draft: say so, and offer a clean start
if (Object.keys(draft.answers || {}).length) {
  toast(X(`استأنفنا تقييمك من الخطوة ${formatNumber(step)}.`, `Resumed your assessment at step ${step}.`), {
    type: "info",
    duration: 6000,
    action: {
      label: X("ابدأ من جديد", "Start over"),
      onClick: () => {
        store.reset("assessmentDraft");
        window.location.reload();
      },
    },
  });
}
