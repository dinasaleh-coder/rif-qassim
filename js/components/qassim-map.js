/* ==========================================================================
   Qassim map — an illustrative survey map, not a navigation map.
   Towns and destinations sit at approximate relative positions; the UI
   always labels it as approximate. Maps are never mirrored in RTL: west
   stays on the left.

   renderQassimMap(destinations, { activeId, compact })
   wireQassimMap(root, { onSelect })
   ========================================================================== */

import { html, raw, $$, on } from "../core/dom.js";
import { L } from "../core/i18n.js";

const W = 1000;
const H = 720;

export const TOWNS = [
  { id: "buraydah", name: { ar: "بريدة", en: "Buraydah" }, x: 0.47, y: 0.33, major: true },
  { id: "unaizah", name: { ar: "عنيزة", en: "Unaizah" }, x: 0.57, y: 0.56, major: true },
  { id: "rass", name: { ar: "الرس", en: "Al Rass" }, x: 0.2, y: 0.64 },
  { id: "bukayriyah", name: { ar: "البكيرية", en: "Al Bukayriyah" }, x: 0.25, y: 0.24 },
  { id: "badaea", name: { ar: "البدائع", en: "Al Badaea" }, x: 0.34, y: 0.47 },
  { id: "mithnab", name: { ar: "المذنب", en: "Al Mithnab" }, x: 0.65, y: 0.8 },
  { id: "shimasiyah", name: { ar: "الشماسية", en: "Al Shimasiyah" }, x: 0.77, y: 0.27 },
];

const ROADS = [
  ["bukayriyah", "buraydah"],
  ["buraydah", "shimasiyah"],
  ["buraydah", "unaizah"],
  ["buraydah", "badaea"],
  ["badaea", "rass"],
  ["unaizah", "mithnab"],
  ["unaizah", "badaea"],
];

const P = (v, d) => Math.round(v * d);

/* A hand-tuned region outline with soft edges */
const OUTLINE =
  "M92 210 C150 120 260 70 380 64 C520 56 640 86 760 120 C860 150 930 210 946 300 C960 390 920 470 880 540 C840 610 760 664 650 680 C540 696 430 690 330 664 C230 640 140 600 90 520 C50 450 40 300 92 210 Z";

function contours() {
  let s = "";
  for (let i = 1; i <= 7; i++) {
    const k = 1 - i * 0.11;
    s += `<path d="${OUTLINE}" transform="translate(${W / 2} ${H / 2}) scale(${k.toFixed(2)} ${(k * 0.96).toFixed(2)}) translate(${-W / 2} ${-H / 2})" />`;
  }
  return s;
}

/**
 * @param {object[]} destinations
 * @param {{ activeId?: string, compact?: boolean, label?: string }} o
 */
export function renderQassimMap(destinations, o = {}) {
  const town = Object.fromEntries(TOWNS.map((t) => [t.id, t]));
  return html`
    <div class="qmap ${o.compact ? "qmap--compact" : ""}" dir="ltr" data-qmap>
      <svg class="qmap__svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.label || ""}">
        <defs>
          <pattern id="qmap-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" class="qmap__gridline"/>
          </pattern>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#qmap-grid)"/>
        <path class="qmap__region" d="${OUTLINE}"/>
        <g class="qmap__contours">${raw(contours())}</g>
        <path class="qmap__wadi" d="M120 420 C240 400 300 470 420 450 C540 430 600 380 720 400 C800 414 860 380 930 350"/>
        <g class="qmap__roads">
          ${ROADS.map(([a, b]) => raw(`<line x1="${P(town[a].x, W)}" y1="${P(town[a].y, H)}" x2="${P(town[b].x, W)}" y2="${P(town[b].y, H)}"/>`))}
        </g>
        <g class="qmap__towns">
          ${TOWNS.map(
            (t) => html`<g transform="translate(${P(t.x, W)} ${P(t.y, H)})">
              <rect x="-4" y="-4" width="8" height="8" class="qmap__town ${t.major ? "is-major" : ""}"/>
              <text y="-12" text-anchor="middle" class="qmap__town-label ${t.major ? "is-major" : ""}">${L(t.name)}</text>
            </g>`
          )}
        </g>
        <g class="qmap__compass" transform="translate(${W - 60} ${H - 70})">
          <circle r="22"/><path d="M0 -16 L5 0 L0 16 L-5 0 Z"/><text y="-28" text-anchor="middle">N</text>
        </g>
      </svg>
      <div class="qmap__pins">
        ${destinations.map(
          (d) => html`<button type="button" class="qmap__pin ${d.id === o.activeId ? "is-active" : ""} qmap__pin--${d.status}"
            style="left:${(d.map.x * 100).toFixed(1)}%;top:${(d.map.y * 100).toFixed(1)}%"
            data-pin="${d.id}" aria-pressed="${d.id === o.activeId}" aria-label="${L(d.name)}، ${L(d.town)}">
            <span class="qmap__dot"></span>
            <span class="qmap__pin-label">${L(d.name)}</span>
          </button>`
        )}
      </div>
    </div>`;
}

/** Selecting a pin marks it active and calls onSelect(id). */
export function wireQassimMap(root, { onSelect } = {}) {
  return on(root, "click", "[data-pin]", (e, pin) => {
    $$("[data-pin]", root).forEach((p) => {
      const active = p === pin;
      p.classList.toggle("is-active", active);
      p.setAttribute("aria-pressed", String(active));
    });
    onSelect?.(pin.dataset.pin);
  });
}

export function setActivePin(root, id) {
  $$("[data-pin]", root).forEach((p) => {
    const active = p.dataset.pin === id;
    p.classList.toggle("is-active", active);
    p.setAttribute("aria-pressed", String(active));
  });
}
