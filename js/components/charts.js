/* ==========================================================================
   Charts
   Small, hand-built, on-brand. Render first at zero, then call playCharts()
   (usually when scrolled into view) so values animate in. Update functions
   move existing bars rather than re-rendering, so changes read as changes.
   ========================================================================== */

import { html, raw, $$, animateNumber, prefersReducedMotion } from "../core/dom.js";
import { formatNumber } from "../core/format.js";

/* ---- Score ring -------------------------------------------------------- */
const R = 52;
const C = 2 * Math.PI * R;

/**
 * @param {number} value 0–100
 * @param {{ size?: number, label?: string, color?: string }} o
 */
export function scoreRing(value, o = {}) {
  const ticks = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    const r1 = R + 9;
    const r2 = R + (i % 5 === 0 ? 14 : 11);
    return `<line x1="${60 + Math.cos(a) * r1}" y1="${60 + Math.sin(a) * r1}" x2="${60 + Math.cos(a) * r2}" y2="${60 + Math.sin(a) * r2}"/>`;
  }).join("");
  return html`
    <div class="ring" data-ring="${value}" style="--ring-size:${o.size || 220}px;${o.color ? `--ring-color:${o.color}` : ""}">
      <svg viewBox="-8 -8 136 136" aria-hidden="true">
        <g class="ring__ticks">${raw(ticks)}</g>
        <circle class="ring__track" cx="60" cy="60" r="${R}" stroke-width="5"/>
        <circle class="ring__value" cx="60" cy="60" r="${R}" stroke-width="5"
          stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
      </svg>
      <div class="ring__center">
        <span class="ring__num"><span data-count="${value}">0</span><small>%</small></span>
        ${o.label ? html`<span class="ring__label">${o.label}</span>` : ""}
      </div>
    </div>`;
}

export function setRing(el, value) {
  const ring = el.matches("[data-ring]") ? el : el.querySelector("[data-ring]");
  if (!ring) return;
  ring.dataset.ring = value;
  ring.querySelector(".ring__value").style.strokeDashoffset = C * (1 - Math.max(0, Math.min(100, value)) / 100);
  animateNumber(ring.querySelector("[data-count]"), value, { format: (n) => formatNumber(Math.round(n)) });
}

/* ---- Measured horizontal bars ---------------------------------------- */
/**
 * @param {{ label: string, value: number, display?: string, note?: string, color?: string }[]} items
 * value 0–100
 */
export function hbars(items) {
  return html`
    <ul class="hbars" role="list">
      ${items.map(
        (it, i) => html`
          <li class="hbar" style="--i:${i}">
            <div class="hbar__head">
              <span class="hbar__label">${it.label}</span>
              <span class="hbar__value" data-count="${it.value}">0</span>
            </div>
            <div class="hbar__track" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${it.value}" aria-label="${it.label}">
              <span class="hbar__fill" data-v="${it.value / 100}" style="${it.color ? `--bar-color:${it.color}` : ""}"></span>
            </div>
            ${it.note ? html`<p class="hbar__note">${it.note}</p>` : ""}
          </li>`
      )}
    </ul>`;
}

/* ---- Columns (grouped) ------------------------------------------------- */
/**
 * @param {{ label: string, values: number[] }[]} groups
 * @param {{ max?: number, height?: number, variants?: string[] }} o
 * variants: per-series class suffix ("", "alt", "accent")
 */
export function columns(groups, o = {}) {
  const max = o.max || Math.max(1, ...groups.flatMap((g) => g.values));
  return html`
    <div class="columns" data-columns data-max="${max}" style="--n:${groups.length};${o.height ? `--h:${o.height}px` : ""}">
      ${groups.map(
        (g) => html`
          <div class="columns__group">
            ${g.values.map(
              (v, si) => html`<span class="columns__bar ${o.variants?.[si] ? `columns__bar--${o.variants[si]}` : ""}" data-v="${v / max}" title="${g.titles?.[si] || ""}"></span>`
            )}
            <span class="columns__label">${g.label}</span>
          </div>`
      )}
    </div>`;
}

/** Move existing column bars to new values (same group/series layout). */
export function updateColumns(el, groups, max) {
  const wrap = el.matches("[data-columns]") ? el : el.querySelector("[data-columns]");
  if (!wrap) return;
  const m = max || Math.max(1, ...groups.flatMap((g) => g.values));
  const bars = $$(".columns__bar", wrap);
  let k = 0;
  groups.forEach((g) =>
    g.values.forEach((v, si) => {
      const bar = bars[k++];
      if (!bar) return;
      bar.style.setProperty("--v", v / m);
      if (g.titles?.[si]) bar.title = g.titles[si];
    })
  );
}

/* ---- Sparkline / area ------------------------------------------------- */
export function spark(values, { height = 64, area = true } = {}) {
  const w = 300;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, height - ((v - min) / (max - min || 1)) * (height - 6) - 3]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const a = `${d} L${w} ${height} L0 ${height} Z`;
  return raw(`<svg class="spark" viewBox="0 0 ${w} ${height}" preserveAspectRatio="none" style="--spark-h:${height}px" aria-hidden="true">
    ${area ? `<path class="spark__area" d="${a}"/>` : ""}<path class="spark__line" d="${d}"/></svg>`);
}

/* ---- Play ---------------------------------------------------------------- */
/** Animate every chart inside root to its target values. */
export function playCharts(root = document) {
  const run = () => {
    $$("[data-v]", root).forEach((el) => el.style.setProperty("--v", el.dataset.v));
    $$("[data-ring]", root).forEach((el) => setRing(el, Number(el.dataset.ring)));
    $$(".hbar__value[data-count]", root).forEach((el) =>
      animateNumber(el, Number(el.dataset.count), { format: (n) => formatNumber(Math.round(n)), duration: 900 })
    );
  };
  if (prefersReducedMotion()) run();
  else requestAnimationFrame(() => requestAnimationFrame(run));
}
