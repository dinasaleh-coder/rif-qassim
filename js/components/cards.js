/* ==========================================================================
   Cards
   Destination cards read like hospitality, not marketplace listings: the
   photograph leads, details are few, and the price sits quietly.
   ========================================================================== */

import { html, raw } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatMoney, formatDuration, count } from "../core/format.js";
import { route } from "../core/paths.js";
import { DESTINATION_TYPES } from "../data/destinations.js";
import { EXPERIENCE_CATEGORIES } from "../data/experiences.js";
import { renderMedia } from "./media.js";
import { icon } from "./icons.js";

const STATUS_LABEL = { open: "avail.open", limited: "avail.limited", season: "avail.season", soon: "avail.soon" };

export function priceLabel(amount, unit) {
  const unitKey = { person: "common.perPerson", night: "common.perNight", booking: "common.perBooking" }[unit];
  return { amount: formatMoney(amount), unit: unitKey ? t(unitKey) : "" };
}

/**
 * @param {object} d  destination
 * @param {{ eager?: boolean, ratio?: string, i?: number }} o
 */
export function destinationCard(d, o = {}) {
  const href = route("destination", { id: d.id });
  const price = priceLabel(d.priceFrom, d.priceUnit);
  const overlay = html`
    <span class="dest-card__veil"></span>
    <div class="dest-card__over">
      <div class="cluster" style="--cluster-gap:var(--space-2)">
        ${d.tags.slice(0, 3).map((tag) => html`<span class="tag tag--on-dark">${L(tag)}</span>`)}
      </div>
      <div class="dest-card__reveal"><div>
        <p class="dest-card__desc">${L(d.short)}</p>
        <span class="dest-card__cta">${d.status === "soon" ? t("common.details") : t("card.explore")} ${icon("arrow", { size: "sm" })}</span>
      </div></div>
    </div>`;

  return html`
    <article class="dest-card" style="--i:${o.i ?? 0}">
      ${renderMedia(d.media.card, { ratio: o.ratio, cls: "dest-card__media media--label-top", eager: o.eager, children: overlay })}
      <div class="dest-card__body">
        <div class="dest-card__head">
          <h3 class="dest-card__name"><a class="dest-card__link" href="${href}">${L(d.name)}</a></h3>
          ${d.status === "soon"
            ? ""
            : html`<span class="dest-card__price">${t("common.from")} <strong class="num">${price.amount}</strong> ${price.unit}</span>`}
        </div>
        <div class="dest-card__line">
          <span>${L(d.town)}</span>
          <span>${L(DESTINATION_TYPES[d.type])}</span>
          <span class="availability availability--${d.status === "soon" ? "season" : d.status}">${t(STATUS_LABEL[d.status])}</span>
        </div>
      </div>
    </article>`;
}

/**
 * Experience card. The title books (or opens the destination for products);
 * the destination line links back to the place the experience belongs to,
 * so every card stays connected to a destination's story.
 * @param {object} e  experience listing (from api.getExperiences)
 */
export function experienceCard(e, o = {}) {
  const cat = EXPERIENCE_CATEGORIES.find((c) => c.id === e.category);
  const bookable = e.priceUnit !== "item";
  const href = bookable ? route("booking", { package: e.id }) : route("destination", { id: e.destinationId, exp: e.id });
  const unitKey = { person: "common.perPerson", night: "common.perNight", booking: "common.perBooking", item: "card.perItem" }[e.priceUnit];
  return html`
    <article class="exp-card" style="--i:${o.i ?? 0}" data-exp-card="${e.id}">
      ${renderMedia(e.media, { cls: "exp-card__media" })}
      <div class="exp-card__body">
        <span class="exp-card__cat">${L(cat?.label)}${e.destinationName && o.showDestination !== false
          ? html` <a class="exp-card__dest" href="${route("destination", { id: e.destinationId })}">${t("card.at")} ${L(e.destinationName)}</a>`
          : ""}</span>
        <h3 class="exp-card__title"><a href="${href}">${L(e.title)}</a></h3>
        <p class="exp-card__desc">${L(e.desc)}</p>
        <div class="exp-card__facts">
          ${e.durationHours > 0 ? html`<span>${icon("clock", { size: "sm" })} ${formatDuration(e.durationHours)}</span>` : ""}
          ${bookable ? html`<span>${icon("users", { size: "sm" })} ${t("card.upTo")} ${count(e.maxGuests, "guests")}</span>` : html`<span>${t("card.pickup")}</span>`}
          ${e.minBillable > 1 ? html`<span>${L({ ar: `الحد الأدنى للحجز سعر ${e.minBillable === 2 ? "ضيفين" : `${e.minBillable} ضيوف`}`, en: `Minimum booking: ${e.minBillable} guests` })}</span>` : ""}
          <span class="exp-card__price"><span class="num">${formatMoney(e.price)}</span> <span class="muted">${unitKey ? t(unitKey) : ""}</span></span>
        </div>
      </div>
    </article>`;
}

/* ---- Loading & empty --------------------------------------------------- */

export function skeletonCards(n = 3, { ratio = "4 / 5" } = {}) {
  return html`${Array.from({ length: n }, () => html`
    <div class="skeleton-card" aria-hidden="true" style="--ratio:${ratio}">
      <div class="skeleton skeleton--media"></div>
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--text" style="width:85%"></div>
      <div class="skeleton skeleton--text" style="width:50%"></div>
    </div>`)}`;
}

/**
 * @param {{ title: string, text?: string, action?: SafeHTML, icon?: string }} o
 */
export function emptyState(o) {
  return html`
    <div class="empty-state contours" role="status">
      <span class="empty-state__mark">${icon(o.icon || "survey", { cls: "icon--lg" })}</span>
      <p class="empty-state__title">${o.title}</p>
      ${o.text ? html`<p class="empty-state__text">${o.text}</p>` : ""}
      ${o.action || ""}
    </div>`;
}

/** Error state with a retry button (data-retry). */
export function errorState(message) {
  return emptyState({
    title: t("error.loadTitle"),
    text: message || t("error.loadText"),
    icon: "alert",
    action: html`<button type="button" class="btn btn--secondary btn--sm" data-retry>${icon("refresh", { size: "sm" })} ${t("error.retry")}</button>`,
  });
}

export { raw };

/* ---- Page band (inner-page hero, homepage language) ------------------- */
/**
 * @param {{ media: string, crumbs: {label:string, href?:string}[], kicker?: string,
 *           title: string, lead?: string, facts?: SafeHTML, actions?: SafeHTML, compact?: boolean }} o
 */
export function pageBand(o) {
  return html`
    <section class="band ${o.compact ? "band--compact" : ""} ${o.tall ? "band--tall" : ""} ${o.cls || ""}" data-band aria-labelledby="band-title">
      <div class="band__media">${renderMedia(o.media, { fill: true, eager: true, label: false })}</div>
      <div class="band__veil"></div>
      <div class="container container--wide band__inner">
        <nav class="crumbs" aria-label="${L({ ar: "مسار التنقل", en: "Breadcrumb" })}" data-band-in>
          ${o.crumbs.map((c, i) => html`${i ? icon("chevron", { size: "sm" }) : ""}${c.href ? html`<a href="${c.href}">${c.label}</a>` : html`<span aria-current="page">${c.label}</span>`}`)}
        </nav>
        <h1 class="band__title" id="band-title"><span class="line-mask"><span>${o.title}</span></span></h1>
        ${o.lead ? html`<p class="band__lead" data-band-in style="--d:500">${o.lead}</p>` : ""}
        ${o.actions ? html`<div class="hero__actions cluster" data-band-in style="--d:650">${o.actions}</div>` : ""}
        <div class="band__foot" data-band-in style="--d:700">
          <div class="band__facts">${o.facts || ""}</div>
          <span class="band__label">${t("common.demoImage")}</span>
        </div>
      </div>
    </section>`;
}

/** Play the band's entrance once it is in the DOM. */
export function playBand(root = document) {
  const band = root.querySelector("[data-band]");
  if (!band) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      band.classList.add("is-in");
      band.querySelectorAll(".line-mask").forEach((m) => m.classList.add("is-revealed"));
    })
  );
}
