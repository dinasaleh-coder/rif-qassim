/* ==========================================================================
   Lightbox — full-screen gallery viewer.
   Arrow keys, Esc, swipe, thumbnails. Images come from media keys, so real
   photography drops in exactly as everywhere else.
   ========================================================================== */

import { html, fragment, $, $$, trapFocus } from "../core/dom.js";
import { L, t, isRTL } from "../core/i18n.js";
import { formatNumber } from "../core/format.js";
import { getMedia } from "../data/media.js";
import { renderMedia } from "./media.js";
import { icon } from "./icons.js";

export function openLightbox(keys, start = 0, { title = "" } = {}) {
  let index = start;
  const trigger = document.activeElement;

  const el = fragment(html`
    <div class="lightbox" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="lightbox__bar">
        <span data-lb-count></span>
        <button type="button" class="panel__close" data-lb-close aria-label="${t("common.close")}" style="color:inherit">${icon("close", { size: "lg" })}</button>
      </div>
      <div class="lightbox__stage" data-lb-stage>
        <button type="button" class="lightbox__nav lightbox__nav--prev" data-lb-prev aria-label="${L({ ar: "الصورة السابقة", en: "Previous image" })}">${icon("chevron", { cls: "cal__prev" })}</button>
        <figure class="lightbox__figure" data-lb-figure></figure>
        <button type="button" class="lightbox__nav lightbox__nav--next" data-lb-next aria-label="${L({ ar: "الصورة التالية", en: "Next image" })}">${icon("chevron")}</button>
      </div>
      <div class="lightbox__thumbs" role="group" aria-label="${L({ ar: "الصور", en: "Images" })}">
        ${keys.map((k, i) => html`<button type="button" class="lightbox__thumb" data-lb-go="${i}" aria-label="${formatNumber(i + 1)}">${renderMedia(k, { label: false })}</button>`)}
      </div>
    </div>`);

  const show = (i) => {
    index = (i + keys.length) % keys.length;
    const key = keys[index];
    $("[data-lb-figure]", el).innerHTML = String(html`${renderMedia(key, { eager: true })}<figcaption class="lightbox__cap">${L(getMedia(key).alt)}</figcaption>`);
    $("[data-lb-count]", el).textContent = `${formatNumber(index + 1)} / ${formatNumber(keys.length)}`;
    $$("[data-lb-go]", el).forEach((b, j) => {
      b.classList.toggle("is-active", j === index);
      b.setAttribute("aria-current", j === index ? "true" : "false");
    });
    $(`[data-lb-go="${index}"]`, el)?.scrollIntoView({ block: "nearest", inline: "center" });
  };

  const close = () => {
    el.classList.remove("is-open");
    document.removeEventListener("keydown", onKey);
    release();
    document.body.classList.remove("no-scroll");
    setTimeout(() => el.remove(), 320);
    trigger?.focus?.();
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
    // Visual direction: in RTL the "next" image sits to the left
    if (e.key === "ArrowLeft") show(index + (isRTL() ? 1 : -1));
    if (e.key === "ArrowRight") show(index + (isRTL() ? -1 : 1));
  };

  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-lb-close]")) close();
    else if (e.target.closest("[data-lb-prev]")) show(index - 1);
    else if (e.target.closest("[data-lb-next]")) show(index + 1);
    else if (e.target.closest("[data-lb-go]")) show(Number(e.target.closest("[data-lb-go]").dataset.lbGo));
  });

  // Swipe
  let x0 = null;
  const stage = $("[data-lb-stage]", el);
  stage.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(index + ((dx < 0) !== isRTL() ? 1 : -1));
    x0 = null;
  });

  document.body.append(el);
  document.body.classList.add("no-scroll");
  document.addEventListener("keydown", onKey);
  const release = trapFocus(el);
  show(start);
  requestAnimationFrame(() => el.classList.add("is-open"));
  $("[data-lb-close]", el).focus();
  return close;
}
