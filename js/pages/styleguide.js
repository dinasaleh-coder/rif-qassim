/* ==========================================================================
   Foundation reference (pages/styleguide.html)
   A working page, not a static picture: every component here is live and
   every number comes from the real services, so it doubles as a test bench
   for later parts.
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, raw, mount, $, $$, on, onceVisible, animateNumber } from "../core/dom.js";
import { L, t, getLang } from "../core/i18n.js";
import { store } from "../core/store.js";
import { formatMoney, formatCompact, formatPercent, formatDate, count, formatNumber } from "../core/format.js";
import { route } from "../core/paths.js";
import { icon } from "../components/icons.js";
import { renderMedia, sceneSVG } from "../components/media.js";
import { destinationCard, experienceCard, skeletonCards, emptyState, errorState } from "../components/cards.js";
import { field, choiceGroup, stepper, initSteppers, validateForm, bindLiveValidation, readForm, createUploader } from "../components/forms.js";
import { scoreRing, hbars, columns, updateColumns, spark, playCharts } from "../components/charts.js";
import { openModal, openDrawer, confirmDialog } from "../components/overlay.js";
import { toast } from "../components/toast.js";
import * as api from "../services/api.js";
import { computePackagePrice } from "../services/pricing.js";
import { computeReadiness } from "../services/scoring.js";
import { computeFeasibility } from "../services/feasibility.js";
import { getPackageById } from "../data/packages.js";
import { DIMENSIONS } from "../data/assessment.js";
import { SCENARIOS } from "../data/assumptions.js";
import { OWNER_TIMELINE } from "../data/farms.js";

initShell({ page: "styleguide", header: "solid", bottomNav: true, footer: "full" });

const X = (ar, en) => L({ ar, en });

/* Sample farm used to exercise the scoring and feasibility engines */
const SAMPLE_FARM = {
  farmName: X("مزرعة النموذج", "Sample farm"),
  city: "badaea",
  assetType: "palm-farm",
  distanceKm: 18,
  totalArea: 24000,
  usableArea: 7000,
  buildings: 3,
  rooms: 3,
  buildingCondition: "good",
  facilities: ["electricity", "water", "restrooms", "parking", "kitchen", "outdoor"],
  services: ["day-visits", "produce"],
  visitorsPerYear: 800,
  staff: 3,
  maintenance: "regular",
  annualCosts: 120000,
  uploads: { photos: 6, documents: 1 },
};

const SECTIONS = [
  ["brand", X("الشعار", "Logo")],
  ["color", X("الألوان", "Colour")],
  ["type", X("الخط", "Type")],
  ["motif", X("الخطوط الكنتورية", "Contours")],
  ["buttons", X("الأزرار", "Buttons")],
  ["labels", X("الوسوم والحالات", "Labels")],
  ["forms", X("النماذج", "Forms")],
  ["imagery", X("الصور", "Imagery")],
  ["cards", X("البطاقات", "Cards")],
  ["pricing", X("التسعير", "Pricing")],
  ["charts", X("الرسوم", "Charts")],
  ["progress", X("التقدم والمراحل", "Progress")],
  ["overlays", X("النوافذ", "Overlays")],
  ["states", X("الحالات", "States")],
  ["loop", X("دورة البيانات", "Data loop")],
];

const head = (n, id, title, text) => html`
  <div class="sg-section__head" id="${id}">
    <span class="sg-section__num">${String(n).padStart(2, "0")}</span>
    <h2 class="h2">${title}</h2>
    ${text ? html`<p class="muted">${text}</p>` : ""}
  </div>`;

const COLORS = [
  ["--rif-white", "#FAF7F1", X("أبيض دافئ", "Warm white"), X("الأرضية", "Ground")],
  ["--rif-paper", "#F4EEE3", X("ورقي", "Paper"), X("التقارير والأسطح", "Reports, surfaces")],
  ["--rif-sand", "#ECE3D2", X("رملي", "Sand"), X("أرضيات الأقسام", "Section grounds")],
  ["--rif-stone", "#CDBFA6", X("حجري", "Stone"), X("الخطوط والفواصل", "Rules")],
  ["--rif-sage", "#98A287", X("ميرمية", "Sage"), X("ثانوي، قيد التقدم", "Secondary, in progress")],
  ["--rif-olive", "#59603F", X("زيتوني", "Olive"), X("الإجراء الأساسي", "Primary action")],
  ["--rif-earth", "#5B3F2C", X("ترابي", "Earth"), X("الأقسام الداكنة", "Dark sections")],
  ["--rif-date", "#A8683A", X("تمري", "Date"), X("لمسة واحدة مقيدة", "One restrained accent")],
  ["--rif-ink", "#23201C", X("حبري", "Ink"), X("النص", "Text")],
];

function render() {
  const root = $("[data-styleguide]");
  const nav = html`<nav class="sg-index" aria-label="${X("أقسام المرجع", "Reference sections")}">
    ${SECTIONS.map(([id, label]) => html`<a href="#${id}">${label}</a>`)}
  </nav>`;

  mount(
    root,
    html`
    <div class="sg-layout">
      <aside class="sg-nav">${nav}</aside>
      <div>
        <header class="sg-hero contours">
          <p class="kicker">${X("الجزء الأول: الأساس", "Part 1: Foundation")}</p>
          <h1 class="display sg-hero__title" style="margin-top:var(--space-5)">${X("أساس ريف.", "The Rif foundation.")}</h1>
          <p class="lead" style="margin-top:var(--space-5)">${X(
            "مرجع داخلي لنظام التصميم والمكونات والخدمات التي تُبنى عليها كل صفحات ريف. كل ما هنا يعمل: الأسعار تُحسب، والنماذج تتحقق، والرسوم تُقرأ من محرك التقييم نفسه.",
            "An internal reference for the design system, components and services every Rif page is built on. Everything here works: prices compute, forms validate, and charts read from the real assessment engine."
          )}</p>
          <div class="sg-hero-index">${nav}</div>
        </header>

        <!-- 01 Brand -->
        <section class="sg-section">
          ${head(1, "brand", X("الشعار", "Logo"), X(
            "يُقرأ الشعار من مكان واحد ويظهر في الترويسة والقائمة والتذييل. انسخ الملف إلى assets/logo واكتب مساره في js/data/brand.js، دون تعديل أي صفحة.",
            "The logo is read from one place and used in the header, menu and footer. Copy the file into assets/logo and set its path in js/data/brand.js, without editing any page."
          ))}
          <div class="sg-logo-board">
            <div><a class="brand" href="${route("home")}" data-brand style="--logo-h:56px"><span class="brand__wordmark"><span class="brand__wordmark-ar">ريف القصيم</span><span class="brand__wordmark-en">RIF QASSIM</span></span></a></div>
            <div class="on-dark sg-panel--dark"><a class="brand" href="${route("home")}" data-brand style="--logo-h:56px;color:var(--color-on-dark)"><span class="brand__wordmark"><span class="brand__wordmark-ar">ريف القصيم</span><span class="brand__wordmark-en">RIF QASSIM</span></span></a></div>
          </div>
          <p class="note note--neutral" style="margin-top:var(--space-4)" data-logo-status>${icon("info")}<span>${X("جارٍ البحث عن ملف الشعار…", "Looking for the logo file…")}</span></p>
        </section>

        <!-- 02 Colour -->
        <section class="sg-section">
          ${head(2, "color", X("الألوان", "Colour"), X(
            "ألوان الأرض نفسها: رمل، وطين، وزيتون، وميرمية. لون التمر يُستخدم بقدر محدود للتأكيد فقط. لا أزرق، ولا تدرجات زخرفية.",
            "The colours of the land itself: sand, mud, olive and sage. Date-brown is used sparingly for emphasis only. No blue, no decorative gradients."
          ))}
          <div class="sg-swatches">
            ${COLORS.map(
              ([v, hex, name, role]) => html`<div>
                <div class="sg-swatch__chip" style="background:var(${v})"></div>
                <p class="sg-swatch__name">${name}</p>
                <p class="meta">${role}</p>
                <p class="sg-swatch__hex">${hex}</p>
              </div>`
            )}
          </div>
        </section>

        <!-- 03 Type -->
        <section class="sg-section">
          ${head(3, "type", X("الخط", "Type"), X(
            "عائلة واحدة: IBM Plex Sans Arabic بأوزان خفيفة للعناوين الكبيرة، ومسافات سطر واسعة للعربية. الخط اللاتيني المرافق IBM Plex Sans للأرقام والإنجليزية.",
            "One family: IBM Plex Sans Arabic, light weights for large headlines and generous Arabic leading. IBM Plex Sans pairs for numerals and English."
          ))}
          <div>
            <div class="sg-type-row"><span class="meta">Display</span><p class="display">من الأرض تبدأ الحكاية.</p></div>
            <div class="sg-type-row"><span class="meta">H1</span><p class="h1">وجهات تستحق أن تُعاش.</p></div>
            <div class="sg-type-row"><span class="meta">H2</span><p class="h2">نرى ما يمكن أن تصبح عليه الأرض.</p></div>
            <div class="sg-type-row"><span class="meta">H3</span><p class="h3">تقييم أولي لفرص تطوير مزرعتك</p></div>
            <div class="sg-type-row"><span class="meta">H4</span><p class="h4">ورشة سعف النخيل</p></div>
            <div class="sg-type-row"><span class="meta">Lead</span><p class="lead">نحوّل الأصول الريفية القائمة إلى وجهات متكاملة قابلة للتشغيل والاستثمار.</p></div>
            <div class="sg-type-row"><span class="meta">Body</span><p class="prose">يبدأ الصباح هنا بصوت الماء في السواقي، وينتهي بقهوة على حافة البستان. كانت السدر مزرعة نخيل عائلية تعمل للحصاد فقط، ثم أعادت ريف قراءتها.</p></div>
            <div class="sg-type-row"><span class="meta">Numerals</span><p class="stat__value num">${formatNumber(computePackagePrice(getPackageById("pkg-full-day"), { guests: 2, addOns: [] }).total, { decimals: 1 })} <span class="h4">ر.س</span></p></div>
          </div>
        </section>

        <!-- 04 Motif -->
        <section class="sg-section">
          ${head(4, "motif", X("الخطوط الكنتورية وشبكة المسح", "Contours and the survey grid"), X(
            "خطوط المسح الطبوغرافي هي العنصر البصري المتكرر: تذكير بأن ريف تبدأ بقراءة الأرض. شبكة المسح تظهر خلف التقييمات والتقارير.",
            "Topographic survey lines are the recurring motif: a reminder that Rif starts by reading the land. The survey grid sits behind assessments and reports."
          ))}
          <div class="grid grid--2">
            <div class="sg-motif contours section--sand" style="--contour-opacity:.22;color:var(--rif-earth)"></div>
            <div class="sg-motif plot-grid section--paper"></div>
          </div>
        </section>

        <!-- 05 Buttons -->
        <section class="sg-section">
          ${head(5, "buttons", X("الأزرار", "Buttons"), X(
            "زر أساسي واحد في كل شاشة. نص الزر يقول ما سيحدث بالضبط.",
            "One primary button per screen. Button text says exactly what happens."
          ))}
          <div class="stack" style="--stack-gap:var(--space-5)">
            <div class="cluster">
              <a class="btn btn--primary btn--lg" href="${route("destinations")}">${X("اكتشف الوجهات", "Discover destinations")}</a>
              <a class="btn btn--secondary btn--lg" href="${route("business")}">${X("طوّر مزرعتك", "Develop your farm")}</a>
              <button class="btn btn--primary" type="button" data-loading-demo>${X("أكّد الحجز", "Confirm booking")}</button>
              <button class="btn btn--ghost" type="button">${X("رجوع", "Back")}</button>
              <a class="btn btn--link" href="${route("experiences")}">${X("كل التجارب", "All experiences")}</a>
              <button class="btn btn--primary" type="button" disabled>${X("غير متاح", "Unavailable")}</button>
            </div>
            <div class="sg-panel sg-panel--dark cluster">
              <a class="btn btn--light btn--lg" href="${route("destinations")}">${X("اكتشف الوجهات", "Discover destinations")}</a>
              <a class="btn btn--outline-light btn--lg" href="${route("business")}">${X("طوّر مزرعتك", "Develop your farm")}</a>
              <button class="btn btn--outline-light btn--icon" type="button" aria-label="${X("التالي", "Next")}">${icon("arrow")}</button>
            </div>
          </div>
        </section>

        <!-- 06 Labels -->
        <section class="sg-section">
          ${head(6, "labels", X("الوسوم والحالات", "Tags and statuses"))}
          <div class="stack" style="--stack-gap:var(--space-5)">
            <div class="cluster"><span class="tag">نخيل</span><span class="tag">إقامة</span><span class="tag tag--solid">عائلات</span><span class="demo-tag">${t("common.demo")}</span><span class="est">${t("common.estimate")}</span></div>
            <div class="cluster">${["confirmed", "pending", "cancelled", "completed"].map((s) => html`<span class="status status--${s}">${t(`status.${s}`)}</span>`)}</div>
            <div class="cluster" style="--cluster-gap:var(--space-5)">
              <span class="availability availability--open">${t("avail.open")}</span>
              <span class="availability availability--limited">${t("avail.limited")}</span>
              <span class="availability availability--season">${t("avail.season")}</span>
            </div>
          </div>
        </section>

        <!-- 07 Forms -->
        <section class="sg-section">
          ${head(7, "forms", X("النماذج والتحقق", "Forms and validation"), X(
            "الأخطاء تظهر تحت الحقل مباشرة وتشرح طريقة الإصلاح. جرّب الإرسال فارغًا، أو رقم جوال غير صحيح.",
            "Errors appear right under the field and say how to fix them. Try sending it empty, or with a wrong mobile number."
          ))}
          <div class="sg-two">
            <form class="stack" style="--stack-gap:var(--space-5)" data-demo-form novalidate>
              ${field({ name: "name", label: X("الاسم", "Name"), autocomplete: "name", placeholder: X("مثال: لمى العيدان", "e.g. Lama Al Aidan") })}
              ${field({ name: "phone", label: X("رقم الجوال", "Mobile number"), type: "tel", inputmode: "tel", rules: "required|phone", placeholder: "05XXXXXXXX", dir: "ltr", autocomplete: "tel" })}
              ${field({ name: "email", label: X("البريد الإلكتروني", "Email"), type: "email", rules: "email", optional: true, dir: "ltr", autocomplete: "email" })}
              ${field({ name: "area", label: X("المساحة الإجمالية", "Total area"), type: "number", inputmode: "numeric", unit: "م²", rules: "required|number|min:500|max:5000000", hint: X("بالمتر المربع. مثال: 24000", "In square metres. Example: 24000") })}
              ${field({ name: "city", label: X("المدينة", "Town"), type: "select", placeholder: X("اختر المدينة", "Choose a town"), options: [{ value: "buraydah", label: "بريدة" }, { value: "unaizah", label: "عنيزة" }, { value: "rass", label: "الرس" }] })}
              ${choiceGroup({ name: "facilities", label: X("المرافق المتوفرة", "Available facilities"), type: "checkbox", options: [{ value: "electricity", title: X("كهرباء", "Electricity"), desc: X("توصيل دائم", "Permanent") }, { value: "water", title: X("مياه", "Water"), desc: X("بئر أو شبكة", "Well or mains") }, { value: "parking", title: X("مواقف", "Parking"), desc: X("١٠ سيارات أو أكثر", "10+ cars") }] })}
              ${stepper({ name: "guests", label: X("عدد الضيوف", "Guests"), value: 2, min: 1, max: 12, unitLabel: (n) => count(n, "guests") })}
              ${field({ name: "notes", label: X("ملاحظات", "Notes"), type: "textarea", optional: true })}
              <div class="cluster"><button type="submit" class="btn btn--primary">${X("أرسل للتحقق", "Send to check")}</button><span class="meta" data-form-out></span></div>
            </form>
            <div class="stack" style="--stack-gap:var(--space-6)">
              <div class="stack">
                <p class="field__label">${X("مفتاح السيناريو", "Scenario switch")}</p>
                <div class="segmented" role="group" data-seg>
                  ${SCENARIOS.map((s) => html`<button type="button" class="segmented__btn" aria-pressed="${s.id === "base"}" data-scn="${s.id}">${L(s.label)}</button>`)}
                </div>
              </div>
              <div class="stack">
                <p class="field__label">${X("التصفية السريعة", "Quick filters")}</p>
                <div class="cluster" data-chips>
                  ${[X("الكل", "All"), X("الإقامة", "Stays"), X("الطعام", "Food"), X("الفعاليات", "Events")].map((c, i) => html`<button type="button" class="chip" aria-pressed="${i === 0}">${c}</button>`)}
                </div>
              </div>
              <div class="stack">
                <div class="tabs" role="tablist" data-tabs>
                  ${[X("نظرة عامة", "Overview"), X("الإقامة", "Stay"), X("الطعام", "Food")].map((c, i) => html`<button type="button" class="tab" role="tab" aria-selected="${i === 0}">${c}</button>`)}
                </div>
              </div>
              <div class="stack">
                <p class="field__label">${X("رفع الصور (تجريبي)", "Photo upload (demo)")}</p>
                <div data-uploader></div>
              </div>
            </div>
          </div>
        </section>

        <!-- 08 Imagery -->
        <section class="sg-section">
          ${head(8, "imagery", X("نظام الصور", "Imagery system"), X(
            "كل صورة في المنتج لها مفتاح في js/data/media.js. ما دام المفتاح بلا مصدر تظهر لوحة توضيحية مرسومة بألوان ريف وعليها «صورة توضيحية». عند إضافة صورة حقيقية لنفس المفتاح تحل محلها بنفس الأبعاد.",
            "Every image in the product has a key in js/data/media.js. While a key has no source, a drawn illustration in Rif's palette is shown, labelled “Illustrative image”. Add a real photo to the key and it takes the same place at the same size."
          ))}
          <div class="sg-scenes">
            ${[
              ["dusk", "dusk", X("بستان عند الغروب", "Grove at dusk")],
              ["grove", "day", X("صفوف النخيل", "Palm rows")],
              ["field", "dawn", X("أرض زراعية", "Farmland")],
              ["dunes", "dusk", X("كثبان وغضا", "Dunes and ghada")],
              ["mudbrick", "day", X("عمارة طينية", "Mud architecture")],
              ["courtyard", "night", X("حوش الضيافة", "Courtyard")],
              ["table", "day", X("مائدة قصيمية", "Qassimi table")],
              ["craft", "day", X("سعف وخوص", "Palm weaving")],
              ["night", "night", X("ليلة في المزرعة", "Night at the farm")],
              ["channel", "dawn", X("ساقية الري", "Irrigation channel")],
              ["harvest", "day", X("صناديق التمر", "Date crates")],
            ].map(
              ([scene, tone, cap], i) => html`<figure class="sg-scene">
                <div class="media" style="--ratio:4/3;border-radius:var(--radius-sm)">${raw(sceneSVG({ scene, tone, seed: i + 3 }))}</div>
                <figcaption class="sg-scene__cap">${cap} <span class="mono" style="opacity:.7">${scene}/${tone}</span></figcaption>
              </figure>`
            )}
          </div>
        </section>

        <!-- 09 Cards -->
        <section class="sg-section">
          ${head(9, "cards", X("البطاقات", "Cards"), X(
            "بطاقة الوجهة تقرأ كضيافة لا كإعلان: الصورة أولًا، والتفاصيل قليلة. على الشاشات التي تدعم المرور يظهر الوصف عند التمرير، وعلى الجوال يظهر دائمًا.",
            "Destination cards read like hospitality, not ads: image first, few details. On hover-capable screens the description reveals on hover; on phones it's always visible."
          ))}
          <div class="grid grid--3 rail-mobile" data-dest-cards>${skeletonCards(3)}</div>
          <div class="grid grid--3" style="margin-top:var(--space-7)" data-exp-cards>${skeletonCards(3, { ratio: "3 / 2" })}</div>
        </section>

        <!-- 10 Pricing -->
        <section class="sg-section">
          ${head(10, "pricing", X("التسعير الحي", "Live pricing"), X(
            "محرك التسعير نفسه الذي يستخدمه الحجز ولوحة فريق ريف. غيّر عدد الضيوف والإضافات وراقب الإجمالي.",
            "The same pricing engine used by checkout and the Rif team dashboard. Change guests and add-ons and watch the total."
          ))}
          <div class="sg-two" data-pricing></div>
        </section>

        <!-- 11 Charts -->
        <section class="sg-section">
          ${head(11, "charts", X("الرسوم البيانية", "Charts"), X(
            "تُقرأ من محركي التقييم والجدوى على مزرعة نموذجية. بدّل السيناريو لترى الأعمدة تتحرك.",
            "Read from the scoring and feasibility engines on a sample farm. Switch the scenario to see the columns move."
          ))}
          <div data-charts></div>
        </section>

        <!-- 12 Progress -->
        <section class="sg-section">
          ${head(12, "progress", X("التقدم والمراحل", "Progress and stages"))}
          <div class="sg-two">
            <div class="stack" style="--stack-gap:var(--space-6)">
              <div class="stack">
                <div class="split"><span class="step-counter"><strong>03</strong> / 07</span><span class="meta">${X("المباني", "Buildings")}</span></div>
                <div class="progress"><div class="progress__bar" style="--value:${3 / 7}"></div></div>
              </div>
              <ol class="steps" role="list">
                ${[X("التاريخ", "Date"), X("الضيوف", "Guests"), X("الإضافات", "Add-ons"), X("المراجعة", "Review"), X("التأكيد", "Confirm")].map(
                  (s, i) => html`<li class="steps__item ${i < 2 ? "is-done" : i === 2 ? "is-current" : ""}"><span class="steps__label">${s}</span></li>`
                )}
              </ol>
            </div>
            <ol class="timeline" role="list">
              ${OWNER_TIMELINE.map(
                (s, i) => html`<li class="timeline__item ${i < 2 ? "is-done" : i === 2 ? "is-current" : ""}">
                  <span class="timeline__dot">${i < 2 ? icon("check") : ""}</span>
                  <div><p class="timeline__title">${L(s.label)}</p><p class="timeline__meta">${i < 2 ? X("مكتمل", "Complete") : i === 2 ? X("الخطوة الحالية", "Current step") : X("لاحقًا", "Later")}</p></div>
                </li>`
              )}
            </ol>
          </div>
        </section>

        <!-- 13 Overlays -->
        <section class="sg-section">
          ${head(13, "overlays", X("النوافذ والإشعارات", "Overlays and toasts"), X(
            "النافذة على الجوال تصعد من الأسفل، وعلى الشاشات الأكبر تظهر في المنتصف. اللوحة الجانبية تملأ الشاشة على الجوال. Esc يغلق، والتركيز يبقى داخلها.",
            "On phones the modal rises from the bottom; on larger screens it centres. The drawer is full-screen on phones. Esc closes, and focus stays inside."
          ))}
          <div class="cluster">
            <button class="btn btn--secondary" type="button" data-open="modal">${X("افتح نافذة", "Open modal")}</button>
            <button class="btn btn--secondary" type="button" data-open="drawer">${X("افتح لوحة جانبية", "Open drawer")}</button>
            <button class="btn btn--secondary" type="button" data-open="confirm">${X("تأكيد", "Confirm")}</button>
            <button class="btn btn--secondary" type="button" data-open="toast">${X("إشعار نجاح", "Success toast")}</button>
            <button class="btn btn--secondary" type="button" data-open="toast-error">${X("إشعار خطأ", "Error toast")}</button>
          </div>
        </section>

        <!-- 14 States -->
        <section class="sg-section">
          ${head(14, "states", X("التحميل والفراغ والخطأ", "Loading, empty and error"), X(
            "الشاشة الفارغة دعوة لفعل شيء، والخطأ يقول ما حدث وكيف نكمل.",
            "An empty screen is an invitation to act; an error says what happened and how to continue."
          ))}
          <div class="grid grid--3">
            <div>${skeletonCards(1)}</div>
            <div>${emptyState({ title: t("empty.destinations.title"), text: t("empty.destinations.text"), action: html`<button type="button" class="btn btn--secondary btn--sm">${t("common.clearFilters")}</button>` })}</div>
            <div>${errorState()}</div>
          </div>
        </section>

        <!-- 15 Loop -->
        <section class="sg-section" style="border-bottom:0">
          ${head(15, "loop", X("دورة البيانات", "The data loop"), X(
            "كل ما يُنشأ في العرض يُحفظ في هذا المتصفح ويظهر في الجهات الأخرى: حجز الزائر يظهر في حجوزات فريق ريف، وتقييم المالك يظهر فرصةً جديدة في مسار المزارع.",
            "Everything created in the demo is stored in this browser and shows up on the other sides: a visitor booking appears in the Rif team's bookings, and an owner's assessment appears as a new opportunity in the farm pipeline."
          ))}
          <div class="sg-loop" data-loop></div>
          <div class="cluster" style="margin-top:var(--space-6)">
            <button class="btn btn--primary" type="button" data-make-booking>${X("أنشئ حجزًا تجريبيًا", "Create a demo booking")}</button>
            <button class="btn btn--secondary" type="button" data-make-farm>${X("أرسل تقييمًا تجريبيًا", "Submit a demo assessment")}</button>
            <button class="btn btn--ghost" type="button" data-reset>${icon("refresh", { size: "sm" })} ${t("demo.reset")}</button>
          </div>
        </section>
      </div>
    </div>`
  );
}

/* ---- Section behaviours -------------------------------------------------- */

function wireLogoStatus() {
  const el = $("[data-logo-status]");
  setTimeout(() => {
    const found = document.querySelector("img.brand__logo");
    el.innerHTML = String(
      found
        ? html`${icon("check")}<span>${X("تم العثور على ملف الشعار، ويُستخدم في كل الصفحات.", "Logo file found and in use on every page.")}</span>`
        : html`${icon("info")}<span>${X(
            "لم يُضبط ملف الشعار بعد، لذلك يظهر الاسم المكتوب مؤقتًا. انسخ الشعار إلى assets/logo واكتب مساره في js/data/brand.js (السطر file) وسيظهر في كل الصفحات.",
            "No logo file is set yet, so the typeset name is shown for now. Copy the logo into assets/logo and put its path in js/data/brand.js (the file line); it then appears on every page."
          )}</span>`
    );
  }, 1200);
}

function wireForms() {
  const form = $("[data-demo-form]");
  initSteppers(form, { unitLabel: (n) => count(n, "guests") });
  bindLiveValidation(form);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const { valid } = validateForm(form);
    const out = $("[data-form-out]", form);
    if (!valid) {
      out.textContent = t("error.fixBelow");
      return;
    }
    const v = readForm(form);
    out.textContent = "";
    toast(X(`البيانات صحيحة: ${v.name}، ${count(v.guests, "guests")}.`, `Valid: ${v.name}, ${count(v.guests, "guests")}.`));
  });

  // Segmented, chips, tabs: single selection within each group
  on(document, "click", "[data-seg] .segmented__btn, [data-chips] .chip", (e, b) => {
    $$(":scope > button", b.parentElement).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
  on(document, "click", "[data-tabs] .tab", (e, b) => {
    $$(".tab", b.parentElement).forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  });

  createUploader($("[data-uploader]"), {
    name: "photos",
    accept: "image/*,.pdf",
    onChange: (files) => files.length && toast(X(`${formatNumber(files.length)} ملف جاهز.`, `${files.length} file(s) ready.`), { type: "info" }),
  });

  $("[data-loading-demo]").addEventListener("click", (e) => {
    const b = e.currentTarget;
    b.classList.add("is-loading");
    setTimeout(() => {
      b.classList.remove("is-loading");
      toast(X("تمت العملية (تجريبي).", "Done (demo)."));
    }, 1400);
  });
}

async function loadCards() {
  const destWrap = $("[data-dest-cards]");
  const expWrap = $("[data-exp-cards]");
  try {
    const [dests, exps] = await Promise.all([api.getDestinations(), api.getExperiences({ category: "all" })]);
    mount(destWrap, html`${dests.slice(0, 3).map((d, i) => destinationCard(d, { i }))}`);
    const picks = ["pkg-full-day", "exp-kleija", "stay-garden-room"].map((id) => exps.find((e) => e.id === id)).filter(Boolean);
    mount(expWrap, html`${picks.map((e, i) => experienceCard(e, { i }))}`);
  } catch (err) {
    console.error(err);
    mount(destWrap, errorState());
  }
}

function renderPricing() {
  const wrap = $("[data-pricing]");
  const pkg = getPackageById("pkg-full-day");
  let state = { guests: 2, addOns: ["kleija"] };

  mount(
    wrap,
    html`
    <div class="stack" style="--stack-gap:var(--space-5)" data-price-inputs>
      <p class="h3">${L(pkg.title)}</p>
      ${stepper({ name: "guests", label: X("عدد الضيوف", "Guests"), value: state.guests, min: pkg.minGuests, max: pkg.maxGuests, unitLabel: (n) => count(n, "guests") })}
      ${choiceGroup({
        name: "addOns",
        label: X("الإضافات", "Add-ons"),
        type: "checkbox",
        rules: "",
        value: state.addOns,
        cols: "1fr",
        options: pkg.addOns.map((a) => ({ value: a.id, title: L(a.title), desc: L(a.desc), price: `+${formatMoney(a.price)} ${a.unit === "person" ? t("common.perPerson") : t("common.perBooking")}` })),
      })}
    </div>
    <div class="summary-card" style="position:sticky;top:calc(var(--header-h) + var(--space-5))" data-price-out></div>`
  );

  const out = $("[data-price-out]", wrap);
  let prevIds = new Set();

  const draw = () => {
    const p = computePackagePrice(pkg, state);
    const ids = new Set(p.lines.map((l) => l.id));
    out.innerHTML = String(html`
      <div class="split"><p class="h4">${X("ملخص السعر", "Price summary")}</p><span class="demo-tag">${t("common.demo")}</span></div>
      <div class="price-breakdown">
        ${p.lines.map(
          (l) => html`<div class="price-line ${prevIds.size && !prevIds.has(l.id) ? "is-new" : ""}">
            <span class="price-line__label">${L(l.label)} <span class="num">× ${formatNumber(l.qty)}</span></span>
            <span class="price-line__value num">${formatMoney(l.amount)}</span>
          </div>`
        )}
        <div class="price-line"><span class="price-line__label">${X("ضريبة القيمة المضافة 15%", "VAT 15%")}</span><span class="price-line__value num">${formatMoney(p.vat, { decimals: p.vat % 1 ? 2 : 0 })}</span></div>
      </div>
      <div class="price-total"><span class="price-total__label">${X("الإجمالي", "Total")}</span><span class="price-total__value" data-total>${formatMoney(p.total)}</span></div>
      <p class="meta">${X(`يعادل ${formatMoney(p.perPerson)} للشخص. لا يتم أي دفع في النموذج التجريبي.`, `About ${formatMoney(p.perPerson)} per person. No payment is taken in the prototype.`)}</p>`);
    prevIds = ids;
  };

  const inputs = $("[data-price-inputs]", wrap);
  initSteppers(inputs, { unitLabel: (n) => count(n, "guests") });
  inputs.addEventListener("input", () => {
    const v = readForm(inputs);
    state = { guests: Number(v.guests) || 1, addOns: v.addOns || [] };
    draw();
  });
  inputs.addEventListener("change", () => inputs.dispatchEvent(new Event("input")));
  draw();
}

function renderCharts() {
  const wrap = $("[data-charts]");
  const readiness = computeReadiness(SAMPLE_FARM);
  const feas = computeFeasibility(SAMPLE_FARM, null, readiness.dims.infrastructure);
  const groupsFor = (id) => {
    const s = feas.scenarios[id];
    return [
      { label: X("الإيراد", "Revenue"), values: [s.revenue], titles: [formatMoney(s.revenue)] },
      { label: X("تكلفة التشغيل", "Operating cost"), values: [s.opex], titles: [formatMoney(s.opex)] },
      { label: X("ربح التشغيل", "Operating profit"), values: [Math.max(0, s.operatingProfit)], titles: [formatMoney(s.operatingProfit)] },
    ];
  };
  const maxAll = Math.max(...Object.values(feas.scenarios).map((s) => s.revenue));

  mount(
    wrap,
    html`
    <div class="grid grid--2" style="--grid-gap:var(--space-8);align-items:start">
      <div class="stack" style="--stack-gap:var(--space-6)">
        <div class="cluster" style="--cluster-gap:var(--space-6);align-items:center">
          ${scoreRing(readiness.score, { size: 200, label: X("الجاهزية", "Readiness") })}
          <div class="stack" style="--stack-gap:var(--space-2)">
            <span class="est">${t("common.estimate")}</span>
            <p class="meta" style="max-width:28ch">${X("الدرجة مجموع موزون لخمسة أبعاد، كل نقطة فيها مرتبطة بإجابة محددة.", "The score is a weighted sum of five dimensions; every point traces to a specific answer.")}</p>
          </div>
        </div>
        ${hbars(DIMENSIONS.map((d) => ({ label: L(d.label), value: readiness.dims[d.id] })))}
      </div>
      <div class="stack" style="--stack-gap:var(--space-5)">
        <div class="split" style="flex-wrap:wrap">
          <div class="segmented" role="group" data-chart-scn>
            ${SCENARIOS.map((s) => html`<button type="button" class="segmented__btn" aria-pressed="${s.id === "base"}" data-id="${s.id}">${L(s.label)}</button>`)}
          </div>
          <span class="est">${t("common.estimate")}</span>
        </div>
        <div class="grid grid--3" style="--grid-gap:var(--space-4)" data-chart-stats></div>
        ${columns(groupsFor("base"), { max: maxAll, height: 200 })}
        <div style="margin-top:var(--space-6)">
          <p class="meta" style="margin-bottom:var(--space-2)">${X("التوزيع الشهري للإيراد (الموسم الأبرد هو الذروة)", "Monthly revenue spread (cooler season peaks)")}</p>
          ${spark(feas.scenarios.base.monthly, { height: 72 })}
        </div>
      </div>
    </div>`
  );

  const stats = $("[data-chart-stats]", wrap);
  const drawStats = (id) => {
    const s = feas.scenarios[id];
    stats.innerHTML = String(html`
      <div class="stat" style="--stat-size:1.6rem"><span class="stat__value">${formatCompact(s.revenue)}</span><span class="stat__label">${X("الإيراد السنوي", "Annual revenue")}</span></div>
      <div class="stat" style="--stat-size:1.6rem"><span class="stat__value">${formatPercent(s.margin)}</span><span class="stat__label">${X("هامش التشغيل", "Operating margin")}</span></div>
      <div class="stat" style="--stat-size:1.6rem"><span class="stat__value">${formatCompact(s.investment)}</span><span class="stat__label">${X("الاستثمار الأولي", "Initial investment")}</span></div>`);
  };
  drawStats("base");

  on(wrap, "click", "[data-chart-scn] .segmented__btn", (e, b) => {
    $$("[data-chart-scn] .segmented__btn", wrap).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    updateColumns(wrap, groupsFor(b.dataset.id), maxAll);
    drawStats(b.dataset.id);
  });

  onceVisible(wrap, () => playCharts(wrap), 0.2);
}

function wireOverlays() {
  on(document, "click", "[data-open]", async (e, b) => {
    const kind = b.dataset.open;
    if (kind === "modal") {
      openModal({
        title: X("طلب دراسة تفصيلية", "Request a detailed study"),
        body: html`<div class="stack" style="--stack-gap:var(--space-4)">
          <p class="muted">${X("هذه نافذة تجريبية. الحقول تعمل، وEsc يغلقها.", "A sample modal. Fields work, and Esc closes it.")}</p>
          ${field({ name: "m-name", label: X("الاسم", "Name") })}
          ${field({ name: "m-phone", label: X("رقم الجوال", "Mobile"), type: "tel", rules: "required|phone", dir: "ltr" })}
        </div>`,
        foot: html`<button type="button" class="btn btn--primary btn--block" data-close>${X("أرسل الطلب", "Send request")}</button>`,
      });
    } else if (kind === "drawer") {
      openDrawer({
        title: X("تفاصيل الحجز", "Booking details"),
        body: html`<div class="stack"><p class="ref">RIF-2610-E2YS</p><p>${X("لوحة جانبية للتفاصيل، تُستخدم في لوحة فريق ريف.", "A side panel for details, used in the Rif team dashboard.")}</p></div>`,
      });
    } else if (kind === "confirm") {
      const ok = await confirmDialog({ title: X("إلغاء الحجز؟", "Cancel booking?"), text: X("سيتحول الحجز إلى ملغى.", "The booking will be marked cancelled."), confirmLabel: X("ألغِ الحجز", "Cancel booking"), danger: true });
      toast(ok ? X("أُلغي الحجز.", "Booking cancelled.") : X("لم يتغير شيء.", "Nothing changed."), { type: ok ? "success" : "info" });
    } else if (kind === "toast") {
      toast(t("common.saved"));
    } else {
      toast(X("تعذّر الحفظ. تحقق من الاتصال ثم أعد المحاولة.", "Couldn't save. Check your connection and try again."), { type: "error" });
    }
  });
}

async function renderLoop() {
  const wrap = $("[data-loop]");
  const [bookings, farms] = await Promise.all([api.listBookings(), api.listFarms()]);
  const userBookings = bookings.filter((b) => b.isUserCreated);
  const newFarms = farms.filter((f) => f.isUserSubmitted);
  mount(
    wrap,
    html`
    <div class="sg-panel stack">
      <span class="meta">${X("حجوزات أنشأها الزائر", "Bookings made as a visitor")}</span>
      <span class="stat__value" data-n="${userBookings.length}">${formatNumber(userBookings.length)}</span>
      ${userBookings[0] ? html`<p class="meta"><span class="ref">${userBookings[0].id}</span> ${formatMoney(userBookings[0].amount)}</p>` : html`<p class="meta">${X("لا يوجد بعد", "None yet")}</p>`}
    </div>
    <div class="sg-panel stack">
      <span class="meta">${X("مزارع أرسلها المالك (فرص جديدة)", "Farms submitted by an owner (new opportunities)")}</span>
      <span class="stat__value">${formatNumber(newFarms.length)}</span>
      ${newFarms[0] ? html`<p class="meta">${L(newFarms[0].name)}، ${X("الجاهزية", "readiness")} ${formatNumber(newFarms[0].score)}%</p>` : html`<p class="meta">${X("لا يوجد بعد", "None yet")}</p>`}
    </div>
    <div class="sg-panel stack">
      <span class="meta">${X("إجمالي الحجوزات في لوحة الفريق", "Total bookings in the team view")}</span>
      <span class="stat__value">${formatNumber(bookings.length)}</span>
      <p class="meta">${X("يشمل البيانات الأولية التجريبية", "Includes seeded demo data")}</p>
    </div>`
  );
}

function wireLoop() {
  $("[data-make-booking]").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    b.classList.add("is-loading");
    try {
      const { firstAvailableDate } = await import("../services/availability.js");
      const pkg = getPackageById("pkg-full-day");
      const booking = await api.createBooking({ packageId: pkg.id, date: firstAvailableDate(pkg), guests: 2, addOns: ["kleija", "dinner"], contact: { name: X("ضيف تجريبي", "Demo guest") } });
      toast(X(`تم تأكيد الحجز التجريبي ${booking.id}.`, `Demo booking ${booking.id} confirmed.`));
      renderLoop();
    } catch (err) {
      toast(X("تعذّر إنشاء الحجز.", "Couldn't create the booking."), { type: "error" });
    } finally {
      b.classList.remove("is-loading");
    }
  });
  $("[data-make-farm]").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    b.classList.add("is-loading");
    try {
      const res = await api.submitAssessment(SAMPLE_FARM);
      toast(X(`أُرسل التقييم. الجاهزية ${res.readiness.score}%.`, `Assessment sent. Readiness ${res.readiness.score}%.`));
      renderLoop();
    } finally {
      b.classList.remove("is-loading");
    }
  });
  $("[data-reset]").addEventListener("click", async () => {
    const ok = await confirmDialog({ title: t("demo.reset"), text: t("demo.resetConfirm"), confirmLabel: t("demo.reset"), danger: true });
    if (!ok) return;
    store.resetDemo();
    toast(t("demo.resetDone"));
    renderLoop();
  });
}

/* ---- Boot ---------------------------------------------------------------- */
render();
wireLogoStatus();
wireForms();
loadCards();
renderPricing();
renderCharts();
wireOverlays();
renderLoop();
wireLoop();
