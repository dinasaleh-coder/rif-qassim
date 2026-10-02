/* ==========================================================================
   Homepage
   The scroll tells the RIF story:
   الأرض → الإمكانات → التقييم → التطوير → التشغيل → الوجهة → التجربة → الزائر → الإيراد والأثر
   and shows which side of RIF carries each step:
   RIF Business → RIF Core → RIF Experiences (→ back to better decisions).
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, mount, $, $$, onceVisible, prefersReducedMotion, clamp, debounce, observeReveals } from "../core/dom.js";
import { L, t, isRTL } from "../core/i18n.js";
import { formatMoney } from "../core/format.js";
import { route } from "../core/paths.js";
import { renderMedia } from "../components/media.js";
import { icon } from "../components/icons.js";
import { destinationCard, skeletonCards, errorState } from "../components/cards.js";
import { scoreRing, hbars, playCharts } from "../components/charts.js";
import * as api from "../services/api.js";
import { getFeaturedPackage } from "../services/api.js";
import { DIMENSIONS } from "../data/assessment.js";

initShell({ page: "home", header: "overlay", bottomNav: true, footer: "full" });

const X = (ar, en) => L({ ar, en });

/* ---- The story ----------------------------------------------------------- */
const SIDES = {
  business: { brand: "RIF Business", who: X("للملاك", "For owners") },
  core: { brand: "RIF Core", who: X("التطوير والتشغيل", "Development & operations") },
  experiences: { brand: "RIF Experiences", who: X("للزوار", "For visitors") },
  impact: { brand: "Impact", who: X("الأثر", "Impact") },
};

const CHAPTERS = [
  {
    side: "business",
    title: X("الأرض", "The land"),
    text: X(
      "كل شيء يبدأ من أصل قائم: مزرعة نخيل، أو بستان، أو بيت طين، أو أرض لم تُستثمر بعد.",
      "Everything starts with an asset that already exists: a palm farm, an orchard, a mud house, land not yet put to work."
    ),
    media: "story-land",
  },
  {
    side: "business",
    title: X("الإمكانات", "The potential"),
    text: X(
      "ننظر إلى ما يمكن أن تصبح عليه: ممر بين النخيل، وغرفة ضيافة، وورشة، ومائدة.",
      "We look at what it could become: a path between palms, a guest room, a workshop, a table."
    ),
    media: "story-potential",
  },
  {
    side: "business",
    title: X("التقييم", "The assessment"),
    text: X(
      "نقرأ الأصل بالأرقام: البنية التحتية، والوصول، والمباني، والتشغيل. تقييم أولي خلال دقائق، ودراسة تفصيلية عند الحاجة.",
      "We read the asset in numbers: infrastructure, access, buildings, operations. An initial read in minutes, a detailed study when it's needed."
    ),
    media: "story-assessment",
    link: { href: () => route("business"), label: X("كيف نقيّم المزرعة", "How we assess a farm") },
  },
  {
    side: "core",
    title: X("التطوير", "Development"),
    text: X(
      "نرمّم القائم قبل أن نبني الجديد، ونحافظ على طابع المكان ومواده.",
      "We restore what exists before building anything new, and keep the place's character and materials."
    ),
    media: "story-development",
  },
  {
    side: "core",
    title: X("التشغيل", "Operation"),
    text: X(
      "نشغّل الوجهة بمعايير ضيافة: فريق مدرّب، وصيانة، وتسعير، وحجوزات، وجودة تُقاس.",
      "We run the destination to hospitality standards: a trained team, maintenance, pricing, bookings and measured quality."
    ),
    media: "story-operation",
  },
  {
    side: "experiences",
    title: X("الوجهة", "The destination"),
    text: X(
      "تصبح المزرعة وجهة لها اسم وقصة وتجارب يمكن حجزها.",
      "The farm becomes a destination with a name, a story and experiences you can book."
    ),
    media: "story-destination",
    link: { href: () => route("destinations"), label: X("الوجهات", "Destinations") },
  },
  {
    side: "experiences",
    title: X("التجربة", "The experience"),
    text: X(
      "تجارب من طبيعة المكان: قطف التمر، وخبز الكليجا، وسعف النخيل، وعشاء تحت النخيل.",
      "Experiences drawn from the place: date picking, baking kleija, weaving fronds, dinner under the palms."
    ),
    media: "story-experience",
    link: { href: () => route("experiences"), label: X("التجارب", "Experiences") },
  },
  {
    side: "experiences",
    title: X("الزائر", "The visitor"),
    text: X(
      "يأتي الزائر ليوم واحد أو لعطلة كاملة، ويحجز كل شيء من مكان واحد.",
      "Visitors come for a day or a whole weekend, and book everything in one place."
    ),
    media: "story-visitor",
  },
  {
    side: "impact",
    title: X("الإيراد والأثر", "Revenue and impact"),
    text: X(
      "دخل جديد للمالك، وعمل لأهل المنطقة، وبيانات تعود لتحسّن القرار التالي.",
      "New income for the owner, work for local people, and data that comes back to improve the next decision."
    ),
    media: "story-impact",
  },
];

/* ---- Sections ------------------------------------------------------------ */

function hero() {
  return html`
    <section class="hero" data-hero aria-labelledby="hero-title">
      <div class="hero__media">${renderMedia("home-hero", { fill: true, eager: true, label: false })}</div>
      <div class="hero__veil"></div>
      <div class="container container--wide hero__inner">
        <h1 class="hero__title" id="hero-title">
          <span class="line-mask"><span style="--i:0">${X("من الأرض", "From the land,")}</span></span>
          <span class="line-mask"><span style="--i:1">${X("تبدأ الحكاية.", "the story begins.")}</span></span>
        </h1>
        <p class="hero__lead" data-hero-in style="--d:700">${X(
          "نحوّل الأصول الريفية القائمة إلى وجهات متكاملة قابلة للتشغيل والاستثمار.",
          "We turn existing rural assets into complete destinations, ready to operate and invest in."
        )}</p>
        <div class="hero__actions" data-hero-in style="--d:900">
          <a class="btn btn--light btn--lg" href="${route("destinations")}">${X("اكتشف الوجهات", "Discover destinations")}</a>
          <a class="btn btn--outline-light btn--lg" href="${route("business")}">${X("طوّر مزرعتك", "Develop your farm")}</a>
        </div>
        <div class="hero__foot" data-hero-in style="--d:1100">
          <span class="cluster" style="--cluster-gap:var(--space-3)">${X("منطقة القصيم، المملكة العربية السعودية", "Qassim Region, Saudi Arabia")} <span class="hero__label">${t("common.demoImage")}</span></span>
          <span class="hero__coords hide-mobile">26.3° N  43.9° E</span>
          <a class="hero__cue" href="#thesis">${X("ابدأ الحكاية", "Begin the story")} ${icon("chevron-down", { size: "sm" })}</a>
        </div>
      </div>
    </section>`;
}

function thesis() {
  return html`
    <section class="thesis container" id="thesis">
      <div class="thesis__grid">
        <p class="thesis__text" data-reveal>
          ${X("في القصيم آلاف المزارع والبساتين والبيوت الطينية.", "Qassim holds thousands of farms, orchards and mud houses.")}
          <span class="muted">${X(
            "أغلبها يعمل للحصاد وحده، أو لا يعمل. نرى في كل منها وجهة ممكنة، ونعرف الطريق من الأرض إلى الضيف.",
            "Most work only for the harvest, or not at all. We see a possible destination in each, and we know the way from the land to the guest."
          )}</span>
        </p>
        <div class="thesis__aside" data-reveal style="--i:1">
          <p class="kicker">${X("ريف القصيم", "Rif Qassim")}</p>
          <p class="muted">${X(
            "ريف شركة سعودية للحلول السياحية الريفية: نقيّم الأصل، ونطوّره، ونشغّله، ونسوّق تجاربه.",
            "Rif is a Saudi rural tourism company: we assess the asset, develop it, operate it and sell its experiences."
          )}</p>
        </div>
      </div>
    </section>`;
}

function journey() {
  const sideOrder = ["business", "core", "experiences", "impact"];
  return html`
    <section class="journey" id="journey" data-journey aria-labelledby="journey-title">
      <div class="container container--wide journey__intro">
        <p class="kicker" data-reveal>${X("من الأرض إلى الأثر", "From land to impact")}</p>
        <h2 class="h1" id="journey-title" data-reveal style="--i:1;max-inline-size:18ch">${X("نرى ما يمكن أن تصبح عليه الأرض.", "We see what the land could become.")}</h2>
      </div>
      <div class="journey__stage" data-stage>
        <div class="journey__pin" data-pin>
          <div class="container container--wide journey__rail" aria-hidden="true">
            <div class="rail__sides">
              ${sideOrder.map((s) => html`<div class="rail__side" data-rail-side="${s}"><b>${SIDES[s].brand}</b><span>${SIDES[s].who}</span></div>`)}
            </div>
            <ol class="rail__steps" role="list">
              ${CHAPTERS.map(
                (c, i) => html`<li class="rail__step" data-rail-step="${i}">
                  <button type="button" tabindex="-1" data-goto="${i}"><span class="rail__bar"><span></span></span><span>${c.title}</span></button>
                </li>`
              )}
            </ol>
          </div>
          <div class="journey__track" data-track>
            ${CHAPTERS.map(
              (c, i) => html`
              <article class="chapter" data-chapter="${i}" aria-labelledby="ch-${i}">
                ${renderMedia(c.media, { cls: "chapter__media" })}
                <div class="chapter__body">
                  <div class="chapter__meta">
                    <span class="chapter__num">${String(i + 1).padStart(2, "0")} / 09</span>
                    <span class="chapter__side">${SIDES[c.side].brand}</span>
                  </div>
                  <h3 class="chapter__title" id="ch-${i}">${c.title}</h3>
                  <p class="chapter__text">${c.text}</p>
                  ${c.link ? html`<a class="btn btn--link chapter__link" href="${c.link.href()}">${c.link.label}</a>` : ""}
                </div>
              </article>`
            )}
          </div>
        </div>
      </div>
    </section>`;
}

function ecosystem() {
  const node = (cls, brand, who, desc, items, cta) => html`
    <article class="eco__node ${cls}" data-reveal>
      <div class="eco__name"><span class="eco__brand">${brand}</span><span class="eco__who">${who}</span></div>
      <p class="eco__desc">${desc}</p>
      <ul class="eco__list" role="list">${items.map(([ic, txt]) => html`<li>${icon(ic, { size: "sm" })}<span>${txt}</span></li>`)}</ul>
      ${cta}
    </article>`;
  const arrow = html`<div class="eco__arrow" aria-hidden="true">${icon("arrow", { size: "lg" })}</div>`;

  return html`
    <section class="section eco contours contours--light" id="about" aria-labelledby="eco-title">
      <div class="container container--wide">
        <div class="eco__head">
          <p class="kicker">${X("كيف تعمل ريف", "How Rif works")}</p>
          <h2 class="h1" id="eco-title">${X("منظومة واحدة، ثلاث جهات.", "One system, three sides.")}</h2>
          <p class="lead">${X(
            "يدخل المالك من جهة، ويخرج الزائر من الجهة الأخرى. وبينهما فريق يطوّر ويشغّل، ويعيد ما يتعلمه إلى الملاك.",
            "Owners come in on one side and visitors leave from the other. In between, a team develops and operates, and feeds what it learns back to owners."
          )}</p>
        </div>
        <div class="eco__flow">
          ${node(
            "",
            "RIF Business",
            X("للملاك والمستثمرين", "For owners and investors"),
            X("نقرأ المزرعة ونقدّر فرصتها قبل أي التزام.", "We read the farm and size its opportunity before any commitment."),
            [
              ["survey", X("تقييم أولي للجاهزية", "Initial readiness assessment")],
              ["chart", X("سيناريوهات إيراد تقديرية", "Estimated revenue scenarios")],
              ["file", X("دراسة تفصيلية وشراكة", "Detailed study and partnership")],
            ],
            html`<a class="btn btn--outline-light btn--sm" href="${route("business")}">${X("طوّر مزرعتك", "Develop your farm")}</a>`
          )}
          ${arrow}
          ${node(
            "eco__node--core",
            "RIF Core",
            X("التطوير والتشغيل", "Development & operations"),
            X("نحوّل الأصل إلى وجهة ونديرها يومًا بيوم.", "We turn the asset into a destination and run it day to day."),
            [
              ["home", X("تصميم وترميم وتجهيز", "Design, restoration and fit-out")],
              ["users", X("فريق تشغيل وضيافة", "Operations and hospitality team")],
              ["target", X("جودة وتسعير وبيانات", "Quality, pricing and data")],
            ],
            html`<span class="meta" style="color:var(--color-on-dark-muted)">${X("يعمل خلف كل وجهة في ريف", "Works behind every Rif destination")}</span>`
          )}
          ${arrow}
          ${node(
            "",
            "RIF Experiences",
            X("للزوار", "For visitors"),
            X("الوجهات والتجارب والحجز في مكان واحد.", "Destinations, experiences and booking in one place."),
            [
              ["compass", X("وجهات ريفية مختارة", "Selected rural destinations")],
              ["leaf", X("تجارب وطعام ومنتجات محلية", "Experiences, food and local products")],
              ["calendar", X("حجز مباشر وواضح", "Clear, direct booking")],
            ],
            html`<a class="btn btn--light btn--sm" href="${route("destinations")}">${X("اكتشف الوجهات", "Discover destinations")}</a>`
          )}
        </div>
        <p class="eco__loop" data-reveal>${icon("refresh")}<span>${X(
          "كل حجز يعود بيانات: أي التجارب تُطلب، ومتى، وبأي سعر. وهذه البيانات تجعل التقييم التالي أدق.",
          "Every booking comes back as data: which experiences sell, when, and at what price. That data makes the next assessment sharper."
        )}</span></p>
      </div>
    </section>`;
}

function showcase() {
  return html`
    <section class="section" aria-labelledby="dest-title">
      <div class="container container--wide">
        <div class="showcase__head">
          <div class="stack">
            <p class="kicker">${X("الوجهات", "Destinations")}</p>
            <h2 class="h1" id="dest-title">${X("وجهات تستحق أن تُعاش.", "Destinations worth living.")}</h2>
          </div>
          <a class="btn btn--secondary" href="${route("destinations")}">${X("كل الوجهات", "All destinations")}</a>
        </div>
        <div class="showcase__grid rail-mobile" data-showcase aria-busy="true">${skeletonCards(3)}</div>
      </div>
    </section>`;
}

function featuredDay() {
  const pkg = getFeaturedPackage();
  return html`
    <section class="section section--sand" aria-labelledby="day-title">
      <div class="container container--wide day">
        ${renderMedia(pkg.media, { cls: "day__media" })}
        <div class="day__body">
          <p class="kicker">${X("باقة مزرعة السدر", "An Al Sidr package")}</p>
          <h2 class="h1" id="day-title">${L(pkg.title)}</h2>
          <p class="lead">${L(pkg.summary)}</p>
          <ol class="schedule" role="list">
            ${pkg.schedule.map((s) => html`<li><time>${s.time}</time><span>${L(s.title)}</span></li>`)}
          </ol>
          <div class="day__price">
            <span class="meta">${t("common.from")}</span>
            <span class="stat__value">${formatMoney(pkg.pricing.basePrice)}</span>
            <span class="meta">${t("common.perPerson")}، ${X("قبل الضريبة", "before VAT")}</span>
          </div>
          <div class="cluster">
            <a class="btn btn--primary btn--lg" href="${route("booking", { package: pkg.id })}">${X("احجز يومك", "Book your day")}</a>
            <a class="btn btn--secondary btn--lg" href="${route("destination", { id: pkg.destinationId })}">${X("عن مزرعة السدر", "About Al Sidr")}</a>
          </div>
          <p class="meta">${X("حجز تجريبي: لا يتم أي دفع.", "Demo booking: no payment is taken.")}</p>
        </div>
      </div>
    </section>`;
}

function owners() {
  const demoDims = { infrastructure: 82, accessibility: 88, accommodation: 71, operations: 68, experiences: 63 };
  return html`
    <section class="section contours" style="--contour-opacity:.06" aria-labelledby="owners-title">
      <div class="container container--wide owners">
        <div class="stack" style="--stack-gap:var(--space-5)">
          <p class="kicker">${X("لملاك المزارع", "For farm owners")}</p>
          <h2 class="h1" id="owners-title">${X("لديك مزرعة؟", "Own a farm?")}</h2>
          <p class="lead">${X("قد تكون وجهتك القادمة أقرب مما تتخيل.", "Your next destination may be closer than you think.")}</p>
          <ol class="owners__steps" role="list">
            ${[
              [X("أخبرنا عن مزرعتك", "Tell us about your farm"), X("سبع خطوات قصيرة: المساحة، والمباني، والمرافق، والتشغيل.", "Seven short steps: area, buildings, facilities, operations.")],
              [X("احصل على تقييم أولي", "Get an initial assessment"), X("درجة جاهزية مفسّرة، وسيناريوهات إيراد تقديرية يمكنك تعديل افتراضاتها.", "An explained readiness score and estimated revenue scenarios with editable assumptions.")],
              [X("ابدأ مع ريف", "Start with Rif"), X("مراجعة، ومعاينة، ودراسة تفصيلية، ثم تطوير وتشغيل.", "Review, site visit, detailed study, then development and operation.")],
            ].map(
              ([h, p], i) => html`<li><span class="chapter__num">${String(i + 1).padStart(2, "0")}</span><div><h3>${h}</h3><p>${p}</p></div></li>`
            )}
          </ol>
          <div class="cluster">
            <a class="btn btn--primary btn--lg" href="${route("assessment")}">${X("ابدأ تقييم مزرعتك", "Start your farm assessment")}</a>
            <a class="btn btn--link" href="${route("business")}">${X("كيف يعمل التقييم", "How the assessment works")}</a>
          </div>
        </div>
        <figure class="report-preview" data-report aria-label="${X("مثال على تقرير التقييم الأولي", "Example initial assessment report")}">
          <div class="report-preview__head">
            <div>
              <p class="meta">${X("تقرير تقييم أولي", "Initial assessment report")}</p>
              <p class="h3">${X("مزرعة الريحان، بريدة", "Al Raihan Farm, Buraydah")}</p>
            </div>
            <span class="demo-tag">${X("مثال توضيحي", "Example")}</span>
          </div>
          <div class="report-preview__body">
            ${scoreRing(78, { size: 168, label: X("الجاهزية", "Readiness") })}
            ${hbars(DIMENSIONS.slice(0, 4).map((d) => ({ label: L(d.label), value: demoDims[d.id] })))}
          </div>
          <p class="note" style="font-size:var(--fs-meta)">${icon("info", { size: "sm" })}<span>${X(
            "هذا التقييم أولي ومحاكى لأغراض النموذج التجريبي، ولا يمثل دراسة جدوى نهائية.",
            "This assessment is initial and simulated for the prototype, and is not a final feasibility study."
          )}</span></p>
        </figure>
      </div>
    </section>`;
}

function principles() {
  const items = [
    [X("نبدأ من الأصل القائم", "We start from what exists"), X("لا نبحث عن أرض جديدة. نبحث في ما يملكه الناس فعلًا، ونبني عليه.", "We don't look for new land. We look at what people already own, and build on it.")],
    [X("نقيس قبل أن نبني", "We measure before we build"), X("كل قرار تطوير يمر بتقييم وأرقام وافتراضات مكتوبة يمكن للمالك مراجعتها.", "Every development decision goes through an assessment, numbers and written assumptions the owner can review.")],
    [X("نشغّل بمعايير ضيافة", "We operate to hospitality standards"), X("الوجهة الريفية تستحق ما تستحقه أي وجهة: نظافة، وانضباط، ودقة في الحجز.", "A rural destination deserves what any destination does: cleanliness, discipline, accuracy in booking.")],
    [X("نُبقي القيمة في المكان", "We keep value in the place"), X("الطعام من المزرعة، والحرفة من أهلها، والعمل لسكان المنطقة.", "Food from the farm, craft from its people, work for those who live nearby.")],
  ];
  return html`
    <section class="section section--paper" aria-labelledby="principles-title">
      <div class="container container--wide">
        <div class="grid" style="--grid-gap:var(--space-7)">
          <div class="stack" style="max-inline-size:40ch">
            <p class="kicker">${X("عن ريف", "About Rif")}</p>
            <h2 class="h1" id="principles-title">${X("ما نلتزم به.", "What we hold to.")}</h2>
          </div>
          <div class="principles">
            ${items.map(([h, p]) => html`<div class="principle" data-reveal><h3>${h}</h3><p>${p}</p></div>`)}
          </div>
          <p class="note note--neutral">${icon("info")}<span>${X(
            "ريف في مرحلة ما قبل الإطلاق. الوجهات والأسعار والأرقام في هذا الموقع توضيحية، ولا يتم أي حجز أو دفع حقيقي.",
            "Rif is preparing for launch. Destinations, prices and figures on this site are illustrative, and no real booking or payment takes place."
          )}</span></p>
        </div>
      </div>
    </section>`;
}

function closing() {
  return html`
    <section class="closing" aria-labelledby="closing-title">
      <div class="closing__media">${renderMedia("story-destination", { fill: true, label: false })}</div>
      <div class="closing__veil"></div>
      <div class="container container--wide closing__inner">
        <h2 class="closing__title" id="closing-title">${X("من أين تبدأ حكايتك؟", "Where does your story start?")}</h2>
        <div class="closing__split">
          <a class="closing__path" href="${route("destinations")}">
            <span>${X("أبحث عن مكان", "I'm looking for a place")}</span>
            <strong>${X("اكتشف الوجهات", "Discover destinations")} ${icon("arrow")}</strong>
          </a>
          <a class="closing__path" href="${route("business")}">
            <span>${X("أملك مزرعة", "I own a farm")}</span>
            <strong>${X("طوّر مزرعتك", "Develop your farm")} ${icon("arrow")}</strong>
          </a>
        </div>
      </div>
    </section>`;
}

/* ---- Behaviour ----------------------------------------------------------- */

function playHero() {
  const el = $("[data-hero]");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.classList.add("is-in");
    $$(".line-mask", el).forEach((m) => m.classList.add("is-revealed"));
  }));
}

async function loadShowcase() {
  const wrap = $("[data-showcase]");
  const load = async () => {
    try {
      const list = await api.getDestinations();
      const picks = ["sidr", "tin", "ghada"].map((id) => list.find((d) => d.id === id)).filter(Boolean);
      mount(wrap, html`${picks.map((d, i) => destinationCard(d, { i }))}`);
    } catch {
      mount(wrap, errorState());
    } finally {
      wrap.removeAttribute("aria-busy");
    }
  };
  wrap.addEventListener("click", (e) => {
    if (e.target.closest("[data-retry]")) {
      mount(wrap, skeletonCards(3));
      load();
    }
  });
  load();
}

/** Pinned horizontal journey on desktop; a vertical sequence elsewhere. */
function setupJourney() {
  const section = $("[data-journey]");
  const stage = $("[data-stage]", section);
  const track = $("[data-track]", section);
  const chapters = $$("[data-chapter]", section);
  const steps = $$("[data-rail-step]", section);
  const sides = $$("[data-rail-side]", section);
  const mq = window.matchMedia("(min-width: 1024px)");
  let dist = 0;
  let stageTop = 0;
  let stageH = 0;
  let raf = 0;
  let xs = []; // translate that centres chapter i in the viewport

  const canPin = () => mq.matches && !prefersReducedMotion();

  const measure = () => {
    if (!canPin()) {
      section.classList.remove("is-pinned");
      section.style.removeProperty("--stage-h");
      track.style.removeProperty("--x");
      chapters.forEach((c) => c.classList.remove("is-active"));
      return;
    }
    section.classList.add("is-pinned");
    track.style.setProperty("--x", "0px");
    const vw = document.documentElement.clientWidth;
    // Works in both directions: measure where each chapter's centre sits
    // with no translation, and how far it must move to reach the centre.
    xs = chapters.map((c) => {
      const r = c.getBoundingClientRect();
      return vw / 2 - (r.left + r.width / 2);
    });
    dist = Math.abs(xs[xs.length - 1] - xs[0]);
    section.style.setProperty("--stage-h", `${dist + window.innerHeight}px`);
    stageTop = stage.getBoundingClientRect().top + window.scrollY;
    stageH = dist + window.innerHeight;
    update();
  };

  const update = () => {
    raf = 0;
    if (!section.classList.contains("is-pinned") || !xs.length) return;
    const p = clamp((window.scrollY - stageTop) / Math.max(1, stageH - window.innerHeight), 0, 1);
    const raw = p * (chapters.length - 1);
    const i0 = Math.min(chapters.length - 1, Math.floor(raw));
    const i1 = Math.min(chapters.length - 1, i0 + 1);
    // Each chapter rests in the centre for part of the scroll, then glides on
    const f = clamp((raw - i0 - 0.3) / 0.4, 0, 1);
    const eased = f * f * (3 - 2 * f);
    const pos = i0 + eased;
    const x = xs[i0] + (xs[i1] - xs[i0]) * eased;
    track.style.setProperty("--x", `${x.toFixed(1)}px`);
    const active = Math.round(pos);
    chapters.forEach((c, i) => c.classList.toggle("is-active", i === active));
    steps.forEach((s, i) => {
      const fill = clamp(pos - i + 1, 0, 1);
      s.querySelector(".rail__bar span").style.setProperty("--p", fill.toFixed(3));
      s.classList.toggle("is-active", i === active);
      s.classList.toggle("is-done", i < active);
    });
    const side = CHAPTERS[active].side;
    sides.forEach((s) => s.classList.toggle("is-active", s.dataset.railSide === side));
  };

  window.addEventListener("scroll", () => {
    if (!raf) raf = requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener("resize", debounce(measure, 150));
  mq.addEventListener?.("change", measure);

  section.addEventListener("click", (e) => {
    const b = e.target.closest("[data-goto]");
    if (!b || !section.classList.contains("is-pinned")) return;
    const i = Number(b.dataset.goto);
    window.scrollTo({ top: stageTop + (i / (chapters.length - 1)) * (stageH - window.innerHeight) + 2, behavior: "smooth" });
  });

  // Keyboard users tabbing into a chapter link: bring that chapter into view
  section.addEventListener("focusin", (e) => {
    const ch = e.target.closest("[data-chapter]");
    if (!ch || !section.classList.contains("is-pinned")) return;
    const i = Number(ch.dataset.chapter);
    window.scrollTo({ top: stageTop + (i / (chapters.length - 1)) * (stageH - window.innerHeight) + 2 });
  });

  // Images and fonts change widths; measure once things settle
  measure();
  window.addEventListener("load", measure);
  document.fonts?.ready.then(measure);
}

/* ---- Boot ---------------------------------------------------------------- */
mount(
  $("#main"),
  html`${hero()}${thesis()}${journey()}${ecosystem()}${showcase()}${featuredDay()}${owners()}${principles()}${closing()}`
);
playHero();
setupJourney();
loadShowcase();
onceVisible($("[data-report]"), () => playCharts($("[data-report]")), 0.3);

observeReveals();
