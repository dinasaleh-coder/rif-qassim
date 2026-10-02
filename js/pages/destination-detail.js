/* ==========================================================================
   Destination detail  (pages/destination-detail.html?id=sidr)
   Everything reads from the mock API. Every "احجز" action opens the full
   booking flow (pages/booking.html), which uses the shared booking engine.
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, mount, $, $$, on, observeReveals, getParam, animateNumber } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatMoney, formatNumber, formatDate, count, formatDuration } from "../core/format.js";
import { route } from "../core/paths.js";
import { renderMedia } from "../components/media.js";
import { icon } from "../components/icons.js";
import { experienceCard, destinationCard, emptyState, errorState } from "../components/cards.js";
import { renderQassimMap } from "../components/qassim-map.js";
import { openLightbox } from "../components/lightbox.js";
import { field, readForm, validateForm, bindLiveValidation } from "../components/forms.js";
import { toast } from "../components/toast.js";
import { DESTINATION_TYPES, AMENITIES, DESTINATIONS } from "../data/destinations.js";
import * as api from "../services/api.js";

initShell({ page: "destinations", header: "overlay", bottomNav: false, footer: "full" });

const X = (ar, en) => L({ ar, en });
const id = getParam("id") || "sidr";
const main = $("#main");

/* ---- Loading skeleton ---------------------------------------------------- */
function skeleton() {
  return html`
    <section class="dd-hero" aria-busy="true">
      <div class="container container--wide dd-hero__inner">
        <div class="skeleton" style="height:1em;width:160px;opacity:.25"></div>
        <div class="skeleton" style="height:5rem;width:min(520px,80%);opacity:.25"></div>
        <div class="skeleton" style="height:1.2em;width:280px;opacity:.25"></div>
      </div>
    </section>
    <div class="container" style="padding-block:var(--space-8)">
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--text" style="width:80%"></div>
      <div class="skeleton skeleton--text" style="width:60%"></div>
    </div>`;
}

/* ---- Sections -------------------------------------------------------------- */

function hero(d, pkgs) {
  const unit = d.priceUnit === "night" ? t("common.perNight") : t("common.perPerson");
  const best = d.facts.find((f) => /وقت|موسم|Season|time/i.test(`${f.label.ar} ${f.label.en}`)) || d.facts[1];
  return html`
    <section class="dd-hero" aria-labelledby="dd-name">
      <div class="dd-hero__media">${renderMedia(d.media.hero, { fill: true, eager: true, label: false })}</div>
      <div class="dd-hero__veil"></div>
      <div class="container container--wide dd-hero__inner">
        <nav class="dd-crumbs" aria-label="${X("مسار التنقل", "Breadcrumb")}">
          <a href="${route("destinations")}">${t("nav.destinations")}</a>
          ${icon("chevron", { size: "sm" })}
          <span aria-current="page">${L(d.name)}</span>
        </nav>
        <h1 class="dd-hero__name" id="dd-name">${L(d.name)}</h1>
        <p class="dd-hero__line"><span>${L(d.town)}، ${L(d.region)}</span><span>${L(DESTINATION_TYPES[d.type])}</span></p>
        <dl class="dd-hero__facts">
          ${d.status === "soon"
            ? html`<div><dt>${X("الحالة", "Status")}</dt><dd>${X("قيد التطوير", "In development")}</dd></div>`
            : html`<div><dt>${t("common.from")}</dt><dd><span class="num">${formatMoney(d.priceFrom)}</span> ${unit}</dd></div>`}
          ${d.capacity.rooms ? html`<div><dt>${X("الإقامة", "Stay")}</dt><dd>${count(d.capacity.rooms, "rooms")}</dd></div>` : html`<div><dt>${X("الزيارة", "Visit")}</dt><dd>${X("نهارية", "Day visits")}</dd></div>`}
          <div><dt>${X("السعة اليومية", "Daily capacity")}</dt><dd>${count(d.capacity.dayGuests, "guests")}</dd></div>
          <div><dt>${L(best.label)}</dt><dd>${L(best.value)}</dd></div>
          ${d.status !== "soon" && pkgs.length
            ? html`<a class="btn btn--light hide-mobile" href="#packages">${X("الباقات والحجز", "Packages & booking")}</a>`
            : html`<span class="dd-hero__label">${t("common.demoImage")}</span>`}
        </dl>
      </div>
    </section>`;
}

function sectionNav(d, sections, pkgs) {
  const pkg = pkgs[0];
  return html`
    <nav class="dd-nav" aria-label="${X("أقسام الصفحة", "On this page")}">
      <div class="container container--wide dd-nav__inner">
        <div class="tabs" role="list">
          ${sections.map(([sid, label]) => html`<a class="tab" role="listitem" href="#${sid}" data-nav="${sid}">${label}</a>`)}
        </div>
        ${pkg
          ? html`<div class="dd-nav__book">
              <span class="meta">${t("common.from")} <strong class="num" style="color:var(--color-text)">${formatMoney(pkg.pricing.basePrice)}</strong></span>
              <a class="btn btn--primary btn--sm" href="${route("booking", { package: pkg.id })}">${X("احجز", "Book")}</a>
            </div>`
          : ""}
      </div>
    </nav>`;
}

function story(d) {
  return html`
    <section class="dd-section container container--wide" id="story" aria-labelledby="story-title">
      <div class="dd-story">
        <p class="dd-story__pull" id="story-title">${L(d.headline)}</p>
        <div class="dd-story__text">
          <p class="lead">${L(d.story)}</p>
          ${d.about.map((p) => html`<p class="muted">${L(p)}</p>`)}
          <dl class="dd-facts">${d.facts.map((f) => html`<div><dt>${L(f.label)}</dt><dd>${L(f.value)}</dd></div>`)}</dl>
        </div>
      </div>
    </section>`;
}

function gallery(d) {
  const keys = [d.media.hero, ...d.gallery].slice(0, 6);
  return html`
    <section class="container container--wide" id="gallery" aria-label="${X("معرض الصور", "Gallery")}" style="scroll-margin-top:140px">
      <div class="dd-gallery">
        ${keys.slice(0, 5).map(
          (k, i) => html`<button type="button" class="dd-gallery__item" data-gallery="${i}" aria-label="${X("افتح الصورة", "Open image")} ${formatNumber(i + 1)}">
            ${renderMedia(k)}
            ${i === Math.min(4, keys.length - 1) ? html`<span class="dd-gallery__more">${icon("image", { size: "sm" })} ${X(`كل الصور (${formatNumber(keys.length)})`, `All photos (${keys.length})`)}</span>` : ""}
          </button>`
        )}
      </div>
    </section>`;
}

function stays(d, pkgs) {
  if (!d.accommodation.length) return "";
  const stayPkg = pkgs.find((p) => p.durationHours >= 24);
  return html`
    <section class="dd-section container container--wide" id="stays" aria-labelledby="stays-title">
      <div class="dd-head">
        <p class="kicker">${X("الإقامة", "Stay")}</p>
        <h2 class="h1" id="stays-title">${X("أين تنام.", "Where you sleep.")}</h2>
      </div>
      <div class="dd-stays">
        ${d.accommodation.map(
          (a) => html`<article class="dd-stay" data-reveal>
            ${renderMedia(a.media, { cls: "dd-stay__media" })}
            <div class="dd-stay__body">
              <h3 class="h3">${L(a.name)}</h3>
              <p class="muted">${L(a.desc)}</p>
              <p class="dd-stay__meta"><span>${icon("users", { size: "sm" })} ${L(a.capacity)}</span><span>${t("common.from")} <strong class="num" style="color:var(--color-text)">${formatMoney(a.priceFrom)}</strong> ${t("common.perNight")}</span></p>
            </div>
          </article>`
        )}
      </div>
      <p class="note note--neutral" style="margin-top:var(--space-6)">${icon("info")}<span>${
        stayPkg
          ? X(`الإقامة تُحجز حاليًا ضمن باقة «${stayPkg.title.ar}». يُفتح حجز الليالي المنفردة عند الإطلاق.`, `Stays are currently booked through the “${stayPkg.title.en}” package. Single nights open at launch.`)
          : X("يُفتح حجز الإقامة المباشر عند الإطلاق.", "Direct stay booking opens at launch.")
      }</span></p>
    </section>`;
}

function experiences(d, exps) {
  if (!exps.length) return "";
  return html`
    <section class="dd-section section--sand" id="experiences" aria-labelledby="exp-title">
      <div class="container container--wide">
        <div class="split" style="flex-wrap:wrap;align-items:end;margin-bottom:var(--space-7)">
          <div class="dd-head" style="margin:0">
            <p class="kicker">${X("التجارب", "Experiences")}</p>
            <h2 class="h1" id="exp-title">${X(`ماذا تفعل في ${d.name.ar}.`, `What to do at ${d.name.en}.`)}</h2>
          </div>
          <a class="btn btn--secondary" href="${route("experiences", { destination: d.id })}">${X("كل التجارب", "All experiences")}</a>
        </div>
        <div class="grid grid--3 rail-mobile" data-exps>
          ${exps.map((e, i) => html`<div data-exp="${e.id}">${experienceCard({ ...e, destinationName: null }, { i })}</div>`)}
        </div>
      </div>
    </section>`;
}

function foodAndActivities(d) {
  if (!d.food.length && !d.activities.length) return "";
  const list = (items) => html`<ul class="dd-list" role="list">${items.map((it) => html`<li><h3>${L(it.name)}</h3><p>${L(it.desc)}</p></li>`)}</ul>`;
  return html`
    <section class="dd-section container container--wide" aria-label="${X("الطعام والأنشطة", "Food and activities")}">
      <div class="dd-pair">
        ${d.food.length
          ? html`<div id="food" style="scroll-margin-top:140px">
              <div class="dd-head"><p class="kicker">${X("الطعام", "Food")}</p><h2 class="h2">${X("من المزرعة إلى المائدة.", "From the farm to the table.")}</h2></div>
              ${list(d.food)}
            </div>`
          : ""}
        ${d.activities.length
          ? html`<div id="activities" style="scroll-margin-top:140px">
              <div class="dd-head"><p class="kicker">${X("الأنشطة", "Activities")}</p><h2 class="h2">${X("أيام لا تشبه المدينة.", "Days unlike the city.")}</h2></div>
              ${list(d.activities)}
            </div>`
          : ""}
      </div>
    </section>`;
}

function amenities(d) {
  return html`
    <section class="dd-section container container--wide" id="amenities" style="padding-top:0" aria-labelledby="amen-title">
      <div class="dd-head"><p class="kicker">${X("المرافق", "Amenities")}</p><h2 class="h2" id="amen-title">${X("ما تجده هنا.", "What you'll find here.")}</h2></div>
      <ul class="dd-amen" role="list">
        ${d.amenities.map((k) => html`<li>${icon(AMENITIES[k].icon)}<span>${L(AMENITIES[k])}</span></li>`)}
      </ul>
    </section>`;
}

function packages(d, pkgs) {
  if (d.status === "soon") return soonBlock(d);
  if (!pkgs.length) {
    return html`
      <section class="dd-section container container--wide" id="packages">
        <div class="dd-head"><p class="kicker">${X("الحجز", "Booking")}</p><h2 class="h2">${X("احجز تجربة في هذه الوجهة.", "Book an experience here.")}</h2>
        <p class="muted">${X("لا توجد باقات لهذه الوجهة حاليًا. يمكنك حجز تجاربها المنفردة من صفحة التجارب.", "No packages here yet. You can book its individual experiences from the experiences page.")}</p></div>
        <a class="btn btn--primary" href="${route("experiences", { destination: d.id })}">${X("تصفّح التجارب", "Browse experiences")}</a>
      </section>`;
  }
  return html`
    <section class="dd-section section--paper" id="packages" aria-labelledby="pkg-title">
      <div class="container container--wide">
        <div class="dd-head">
          <p class="kicker">${X("الباقات", "Packages")}</p>
          <h2 class="h1" id="pkg-title">${X("اختر يومك أو عطلتك.", "Choose your day or weekend.")}</h2>
          <p class="muted">${X("الأسعار قبل ضريبة القيمة المضافة. الحجز تجريبي ولا يتم أي دفع.", "Prices before VAT. Booking is a demo; no payment is taken.")}</p>
        </div>
        <div class="dd-packages">
          ${pkgs.map((p) => {
            const unit = p.pricing.model === "person" ? t("common.perPerson") : X(`للحجز، يشمل ${formatNumber(p.pricing.includedGuests)} ضيوف`, `per booking, ${p.pricing.includedGuests} guests included`);
            return html`<article class="dd-pkg" data-reveal aria-labelledby="pkg-${p.id}">
              ${renderMedia(p.media, { cls: "dd-pkg__media" })}
              <div class="dd-pkg__body">
                <h3 class="dd-pkg__title" id="pkg-${p.id}">${L(p.title)}</h3>
                <p class="muted">${L(p.summary)}</p>
                <ul class="dd-pkg__includes" role="list">${p.includes.map((inc) => html`<li>${icon("check", { size: "sm" })}${L(inc)}</li>`)}</ul>
                <div class="accordion">
                  <div class="accordion__item" data-acc>
                    <button type="button" class="accordion__trigger" aria-expanded="false" style="font-size:var(--fs-body)">${X("برنامج اليوم", "Schedule")} ${icon("plus", { size: "sm" })}</button>
                    <div class="accordion__panel"><div><ol class="schedule accordion__content" role="list" style="border-top:0">
                      ${p.schedule.map((s) => html`<li style="display:grid;grid-template-columns:4.5rem 1fr;gap:var(--space-4);padding-block:var(--space-2);font-size:var(--fs-small)"><time class="mono" style="color:var(--rif-date);direction:ltr;text-align:start">${s.time}</time><span>${L(s.title)}</span></li>`)}
                    </ol></div></div>
                  </div>
                </div>
              </div>
              <aside class="dd-pkg__side">
                <div class="dd-pkg__price stack" style="--stack-gap:var(--space-1)">
                  <span class="meta">${t("common.from")}</span>
                  <span class="stat__value">${formatMoney(p.pricing.basePrice)}</span>
                  <span class="meta">${unit}</span>
                </div>
                <p class="small"><span class="muted">${X("المدة", "Duration")}:</span> ${formatDuration(p.durationHours)}</p>
                <p class="small"><span class="muted">${X("الوقت", "Time")}:</span> ${L(p.timeWindow)}</p>
                <p class="small"><span class="muted">${X("الضيوف", "Guests")}:</span> ${formatNumber(p.minGuests)}–${formatNumber(p.maxGuests)}</p>
                ${p.pricing.roomCapacity ? html`<p class="meta">${X(`الغرفة لضيفين؛ الضيف الثالث يضيف غرفة (${formatMoney(p.pricing.extraRoomPrice)}).`, `A room sleeps ${p.pricing.roomCapacity}; a third guest adds a room (${formatMoney(p.pricing.extraRoomPrice)}).`)}</p>` : ""}
                <a class="btn btn--primary btn--block btn--lg" href="${route("booking", { package: p.id })}">${X("احجز", "Book")}</a>
                <p class="meta">${L(p.policy)}</p>
              </aside>
            </article>`;
          })}
        </div>
      </div>
    </section>`;
}

function soonBlock(d) {
  return html`
    <section class="dd-section container container--wide" id="packages" aria-labelledby="soon-title">
      <div class="dd-soon contours contours--light" style="--contour-opacity:.08">
        <p class="kicker" style="color:var(--color-on-dark-muted)">${X("قريبًا", "Coming soon")}</p>
        <h2 class="h1" id="soon-title">${X("هذه الوجهة قيد التطوير.", "This destination is in development.")}</h2>
        <p class="lead">${X("الحجز غير متاح بعد. اترك رقمك ونخبرك عند فتح الحجز.", "Booking isn't open yet. Leave your number and we'll tell you when it opens.")}</p>
        <form class="grid grid--2" data-interest novalidate style="--grid-gap:var(--space-4);max-inline-size:680px">
          ${field({ name: "name", label: X("الاسم", "Name"), autocomplete: "name" })}
          ${field({ name: "phone", label: X("رقم الجوال", "Mobile number"), type: "tel", inputmode: "tel", rules: "required|phone", dir: "ltr", placeholder: "05XXXXXXXX", autocomplete: "tel" })}
          <div><button type="submit" class="btn btn--light">${X("أخبرني عند الافتتاح", "Tell me when it opens")}</button></div>
        </form>
      </div>
    </section>`;
}

function reviews() {
  return html`
    <section class="dd-section container container--wide" id="reviews" style="padding-top:0" aria-labelledby="rev-title">
      <div class="dd-reviews contours">
        <p class="kicker">${X("تقييمات الضيوف", "Guest reviews")}</p>
        <h2 class="h2" id="rev-title">${X("لا تقييمات بعد.", "No reviews yet.")}</h2>
        <p class="muted" style="max-inline-size:56ch">${X(
          "تظهر تقييمات الضيوف هنا بعد الإطلاق، من حجوزات مؤكدة فقط. لا نعرض تقييمات أو نجومًا توضيحية حتى لا تبدو حقيقية.",
          "Guest reviews appear here after launch, from confirmed bookings only. We don't show sample reviews or stars, so nothing looks real when it isn't."
        )}</p>
        <div class="dd-reviews__scale" aria-hidden="true">${Array.from({ length: 5 }, () => html`<span></span>`)}</div>
      </div>
    </section>`;
}

function locationSection(d) {
  return html`
    <section class="dd-section section--sand" id="location" aria-labelledby="loc-title">
      <div class="container container--wide dd-loc">
        ${renderQassimMap(DESTINATIONS.filter((x) => x.id === d.id), { activeId: d.id, compact: true, label: X("موقع الوجهة التقريبي", "Approximate location") })}
        <div class="stack" style="--stack-gap:var(--space-4)">
          <p class="kicker">${X("الموقع", "Location")}</p>
          <h2 class="h2" id="loc-title">${L(d.town)}</h2>
          <p class="muted">${L(d.mapNote)}</p>
          <dl class="dd-facts" style="grid-template-columns:1fr">
            ${d.facts.filter((f) => /من|From/.test(`${f.label.ar} ${f.label.en}`)).map((f) => html`<div><dt>${L(f.label)}</dt><dd>${L(f.value)}</dd></div>`)}
            <div><dt>${X("الوصول", "Getting there")}</dt><dd>${X("بالسيارة. مواقف داخل الوجهة.", "By car. Parking on site.")}</dd></div>
          </dl>
          <p class="meta">${X("خريطة توضيحية، والموقع تقريبي.", "Illustrative map; location is approximate.")}</p>
        </div>
      </div>
    </section>`;
}

function more(d) {
  const others = DESTINATIONS.filter((x) => x.id !== d.id && x.status !== "soon").slice(0, 3);
  return html`
    <section class="dd-section container container--wide" aria-labelledby="more-title">
      <div class="split" style="flex-wrap:wrap;align-items:end;margin-bottom:var(--space-7)">
        <h2 class="h2" id="more-title">${X("وجهات أخرى في القصيم", "More destinations in Qassim")}</h2>
        <a class="btn btn--secondary" href="${route("destinations")}">${X("كل الوجهات", "All destinations")}</a>
      </div>
      <div class="grid grid--3 rail-mobile">${others.map((x, i) => destinationCard(x, { i, ratio: "4 / 3.4" }))}</div>
    </section>`;
}

function bookBar(d, pkgs) {
  if (d.status === "soon" || !pkgs.length) return "";
  const p = pkgs[0];
  return html`
    <div class="book-bar" data-book-bar>
      <div class="book-bar__price">
        <span>${L(p.title)}</span>
        <strong>${formatMoney(p.pricing.basePrice)} <span style="font-family:var(--font-body);font-size:var(--fs-micro);font-weight:400">${p.pricing.model === "person" ? t("common.perPerson") : t("common.perBooking")}</span></strong>
      </div>
      <a class="btn btn--primary" href="${route("booking", { package: p.id })}">${X("احجز", "Book")}</a>
    </div>`;
}

/* ---- Behaviour -------------------------------------------------------- */

function wire(d, pkgs, galleryKeys) {
  on(main, "click", "[data-gallery]", (e, b) => openLightbox(galleryKeys, Number(b.dataset.gallery), { title: L(d.name) }));

  on(main, "click", "[data-acc] .accordion__trigger", (e, b) => {
    const item = b.closest("[data-acc]");
    const open = !item.classList.contains("is-open");
    item.classList.toggle("is-open", open);
    b.setAttribute("aria-expanded", String(open));
  });

  // Interest form for upcoming destinations
  const interest = $("[data-interest]");
  if (interest) {
    bindLiveValidation(interest);
    interest.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(interest).valid) return;
      const btn = interest.querySelector("[type=submit]");
      btn.classList.add("is-loading");
      await api.registerInterest({ destinationId: d.id, ...readForm(interest) });
      mount(interest, html`<p class="lead" role="status" style="grid-column:1/-1;color:var(--color-on-dark)">${X("سجّلنا اهتمامك. سنخبرك عند فتح الحجز (تجريبي).", "You're on the list. We'll tell you when booking opens (demo).")}</p>`);
    });
  }

  // Section nav: highlight the section in view
  const links = $$("[data-nav]");
  if ("IntersectionObserver" in window && links.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) links.forEach((l) => l.setAttribute("aria-selected", String(l.dataset.nav === en.target.id)));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    links.forEach((l) => {
      const target = document.getElementById(l.dataset.nav);
      if (target) io.observe(target);
    });
  }

  // Sticky mobile booking bar appears once the hero is passed
  const bar = $("[data-book-bar]");
  if (bar) {
    document.body.classList.add("has-book-bar");
    const heroEl = $(".dd-hero");
    const io = new IntersectionObserver(([en]) => bar.classList.toggle("is-visible", !en.isIntersecting), { threshold: 0.15 });
    io.observe(heroEl);
  }

  // Deep link to an experience: ?exp=exp-kleija
  const exp = getParam("exp");
  if (exp) {
    const el = $(`[data-exp="${exp}"]`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.firstElementChild.style.outline = "2px solid var(--rif-date)";
        el.firstElementChild.style.outlineOffset = "4px";
      }, 400);
    }
  }
}

/* ---- Load ---------------------------------------------------------------- */

async function load() {
  mount(main, skeleton());
  let data;
  try {
    data = await api.getDestination(id);
  } catch {
    // Errors render on a solid ground; switch the header so it stays readable
    $("[data-header]")?.classList.add("is-scrolled");
    mount(main, html`<div class="container" style="padding-block:calc(var(--header-h) + var(--space-8)) var(--space-9)">${errorState(X("تعذّر تحميل الوجهة. تحقق من اتصالك ثم أعد المحاولة.", "Couldn't load this destination. Check your connection and try again."))}</div>`);
    on(main, "click", "[data-retry]", () => {
      const u = new URL(window.location.href);
      u.searchParams.delete("simulate");
      window.location.replace(u);
    });
    return;
  }

  if (!data) {
    $("[data-header]")?.classList.add("is-scrolled");
    mount(main, html`<div class="container" style="padding-block:calc(var(--header-h) + var(--space-8)) var(--space-9)">${emptyState({
      title: X("لم نجد هذه الوجهة", "We couldn't find this destination"),
      text: X("ربما تغيّر الرابط. تصفّح الوجهات المتاحة في القصيم.", "The link may have changed. Browse the destinations in Qassim."),
      icon: "compass",
      action: html`<a class="btn btn--primary btn--sm" href="${route("destinations")}">${X("كل الوجهات", "All destinations")}</a>`,
    })}</div>`);
    return;
  }

  const { destination: d, packages: pkgs, experiences: exps } = data;
  document.title = `${L(d.name)} — ${t("brand.name")}`;
  const galleryKeys = [d.media.hero, ...d.gallery];

  const sections = [
    ["story", X("القصة", "Story")],
    d.accommodation.length && ["stays", X("الإقامة", "Stay")],
    exps.length && ["experiences", X("التجارب", "Experiences")],
    d.food.length && ["food", X("الطعام", "Food")],
    d.activities.length && ["activities", X("الأنشطة", "Activities")],
    ["amenities", X("المرافق", "Amenities")],
    ["packages", d.status === "soon" ? X("قريبًا", "Coming soon") : X("الباقات", "Packages")],
    ["location", X("الموقع", "Location")],
  ].filter(Boolean);

  mount(
    main,
    html`${hero(d, pkgs)}${sectionNav(d, sections, d.status === "soon" ? [] : pkgs)}${story(d)}${gallery(d)}${stays(d, pkgs)}${experiences(d, exps)}${foodAndActivities(d)}${amenities(d)}${packages(d, pkgs)}${reviews()}${locationSection(d)}${more(d)}${bookBar(d, pkgs)}`
  );
  observeReveals(main);
  wire(d, pkgs, galleryKeys);

  // Old quick-book links (?book=…) now go to the full booking flow
  const bookId = getParam("book");
  if (bookId && pkgs.some((p) => p.id === bookId)) window.location.replace(route("booking", { package: bookId }));
}

load();
