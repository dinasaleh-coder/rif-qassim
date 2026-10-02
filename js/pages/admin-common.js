/* ==========================================================================
   RIF OS — shared helpers for the admin views
   ========================================================================== */

import { html, mount, $, on } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatNumber } from "../core/format.js";
import { icon } from "../components/icons.js";
import { emptyState, errorState } from "../components/cards.js";
import { PIPELINE_STAGES } from "../data/farms.js";

export const X = (ar, en) => L({ ar, en });
export const EST = () => t("common.estimate");

/* Stage tone: early (just arrived), mid (being studied), late (building/live) */
export const stageTone = (id) => (["new", "assessment", "review"].includes(id) ? "early" : ["visit", "feasibility", "contract"].includes(id) ? "mid" : "late");
export const stageLabel = (id) => L(PIPELINE_STAGES.find((s) => s.id === id)?.label) || "—";
export const scoreClass = (s) => (s >= 75 ? "is-high" : s >= 60 ? "is-mid" : "is-low");

export const STUDY_STATUS = [
  { id: "received", label: { ar: "تم الإرسال", en: "Sent" }, tone: "pending" },
  { id: "reviewing", label: { ar: "قيد المراجعة", en: "Under review" }, tone: "pending" },
  { id: "contacted", label: { ar: "تم التواصل", en: "Contacted" }, tone: "confirmed" },
  { id: "completed", label: { ar: "مكتمل", en: "Completed" }, tone: "completed" },
];
export const studyLabel = (id) => L(STUDY_STATUS.find((s) => s.id === id)?.label) || "—";

/** Page header for a view */
export function viewHead({ title, desc, actions, crumb }) {
  return html`<header class="ad-head">
    <div>
      ${crumb ? html`<a class="ad-crumb" href="${crumb.href}">${icon("arrow", { size: "sm" })} ${crumb.label}</a>` : ""}
      <h1 class="ad-head__title" tabindex="-1" data-view-title>${title}</h1>
      ${desc ? html`<p>${desc}</p>` : ""}
    </div>
    ${actions ? html`<div class="cluster">${actions}</div>` : ""}
  </header>`;
}

export const loading = (rows = 4) =>
  html`<div aria-busy="true" class="stack">${Array.from({ length: rows }, (_, i) => html`<div class="skeleton" style="height:${i ? 44 : 120}px"></div>`)}</div>`;

/** Run a loader; show skeleton, then content or an error with retry. */
export async function load(container, fn) {
  mount(container, loading());
  try {
    await fn();
  } catch (err) {
    console.error(err);
    mount(container, errorState(X("تعذّر تحميل هذا القسم. أعد المحاولة.", "Couldn't load this section. Try again.")));
    const retry = $("[data-retry]", container);
    retry?.addEventListener("click", () => {
      const u = new URL(location.href);
      u.searchParams.delete("simulate");
      history.replaceState(null, "", u);
      load(container, fn);
    });
  }
}

export const empty = (title, text, action) => emptyState({ title, text, action, icon: "survey" });

/** A status <select> for tables (data-* carries the target) */
export function selectMarkup({ options, value, attrs, label }) {
  return html`<select class="select" aria-label="${label}" ${attrs}>${options.map((o) => html`<option value="${o.id}" ${o.id === value ? "selected" : ""}>${L(o.label)}</option>`)}</select>`;
}

export const searchBox = (placeholder, value = "", attr = "data-q") =>
  html`<label class="ad-search"><span class="visually-hidden">${t("common.search")}</span>${icon("search", { size: "sm" })}<input class="input" type="search" ${attr} value="${value}" placeholder="${placeholder}" autocomplete="off"></label>`;

export const chip = (id, label, count, pressed, attr = "data-filter") =>
  html`<button type="button" class="chip" ${attr}="${id}" aria-pressed="${pressed}">${label}${count !== undefined ? html` <span class="chip__count">${formatNumber(count)}</span>` : ""}</button>`;

export { on };

/** Re-render a list without losing the caret in its search box. */
export function keepSearch(el, renderFn) {
  const active = document.activeElement;
  const typing = active && active.matches?.("[data-q]") && el.contains(active);
  const pos = typing ? active.selectionStart : null;
  renderFn();
  if (typing) {
    const input = el.querySelector("[data-q]");
    if (input) {
      input.focus({ preventScroll: true });
      try {
        input.setSelectionRange(pos, pos);
      } catch {
        /* type=search may not support selection in every browser */
      }
    }
  }
}
