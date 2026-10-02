/* ==========================================================================
   Scenario view (shared by the assessment report and the owner dashboard)
   Presentation only. Numbers come from services/feasibility.js with the
   seven assumptions in data/assumptions.js; this module never computes
   money itself beyond formatting.

   const model = createScenarioModel({ answers, infra, assumptions, scenario,
                                       persist, onChange })
   model.scenariosMarkup()  model.assumptionsMarkup()  model.wire(root)
   model.range("revenue")   model.feas
   ========================================================================== */

import { html, mount, $, $$, on, debounce } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatMoney, formatCompact, formatPercent, formatNumber } from "../core/format.js";
import { icon } from "./icons.js";
import { columns, updateColumns, spark } from "./charts.js";
import { field, readForm, validateForm, bindLiveValidation } from "./forms.js";
import { toast } from "./toast.js";
import { computeFeasibility } from "../services/feasibility.js";
import { ASSUMPTIONS, MODEL_CONSTANTS, SCENARIOS, defaultAssumptions } from "../data/assumptions.js";

const X = (ar, en) => L({ ar, en });
const EST = () => t("common.estimate");

/**
 * @param {{ answers: object, infra: number, assumptions?: object, scenario?: string,
 *           persist?: boolean, store?: object, note?: string, onChange?: () => void }} o
 *   persist: save assumption and scenario changes to the shared store
 */
export function createScenarioModel(o) {
  let A = { ...defaultAssumptions(), ...(o.assumptions || {}) };
  let scenario = o.scenario || "base";
  let root = null;
  let answers = o.answers;
  let infra = o.infra;
  const model = { feas: null };

  const recompute = () => (model.feas = computeFeasibility(answers, A, infra));
  recompute();

  const saveAssumptions = debounce(() => o.persist && o.store?.set("assumptions", A), 300);

  model.range = (key, fmt = (n) => formatCompact(n)) => {
    const lo = model.feas.scenarios.conservative[key];
    const hi = model.feas.scenarios.optimistic[key];
    return `${fmt(Math.min(lo, hi))} – ${fmt(Math.max(lo, hi))}`;
  };

  model.current = () => model.feas.scenarios[scenario];
  model.scenarioId = () => scenario;

  /** Answers changed elsewhere (farm edits): recompute and redraw */
  model.update = (nextAnswers, nextInfra) => {
    answers = nextAnswers;
    infra = nextInfra;
    recompute();
    if (root) render();
  };

  model.scenariosMarkup = () => html`
    <div class="rp-scn-head">
      <div class="segmented" role="group" aria-label="${X("السيناريو", "Scenario")}">
        ${SCENARIOS.map((s) => html`<button type="button" class="segmented__btn" data-scn="${s.id}" aria-pressed="${s.id === scenario}">${L(s.label)}</button>`)}
      </div>
      <span class="est">${EST()}</span>
    </div>
    <p class="muted" data-scn-desc style="margin-bottom:var(--space-5)"></p>
    <div class="rp-figs" data-figs></div>
    <div class="rp-charts">
      <div>
        <p class="meta" style="margin-bottom:var(--space-3)">${X("الإيراد والتكلفة وربح التشغيل في السنة", "Yearly revenue, cost and operating profit")}</p>
        <div data-cols></div>
        <ul class="legend" role="list"><li><i style="--c:var(--rif-olive)"></i>${X("السيناريو المختار", "Selected scenario")}</li></ul>
      </div>
      <div>
        <p class="meta" style="margin-bottom:var(--space-3)">${X("توزيع الإيراد على أشهر السنة: الشتاء موسم الذروة في القصيم", "Revenue across the year: winter is Qassim's peak")}</p>
        <div data-spark></div>
      </div>
    </div>
    <div class="rp-compare">
      <p class="h4" style="margin-bottom:var(--space-3)">${X("مقارنة السيناريوهات", "Scenario comparison")}</p>
      <div class="table-wrap" data-compare></div>
    </div>
    <p class="note" style="margin-top:var(--space-6)">${icon("info")}<span>${X("النتائج تقديرية وتعتمد على الافتراضات والبيانات المدخلة.", "Results are estimates and depend on the assumptions and data entered.")}</span></p>`;

  model.assumptionsMarkup = () => {
    const asPct = (a) => a.unit === "percent";
    return html`
      <form class="rp-assume" data-assume novalidate>
        ${ASSUMPTIONS.map((a) =>
          field({
            name: a.key,
            label: L(a.label),
            type: "number",
            inputmode: "decimal",
            unit: asPct(a) ? "%" : a.unit === "sarPerSqm" ? X("ر.س/م²", "SAR/m²") : a.unit === "nights" ? X("ليلة", "nights") : X("ر.س", "SAR"),
            rules: `required|number|min:${asPct(a) ? Math.round(a.min * 100) : a.min}|max:${asPct(a) ? Math.round(a.max * 100) : a.max}`,
            value: asPct(a) ? Math.round(A[a.key] * 100) : A[a.key],
            step: asPct(a) ? 1 : a.step,
            hint: L(a.help),
          })
        )}
      </form>
      <p class="note note--neutral" style="margin-top:var(--space-5)">${icon("info")}<span>${X(
        "كل ما سبق افتراضات نموذج للتقدير، وليست تكاليف أو أسعارًا فعلية لكل عنصر. يحتاج تحقق تشغيلي قبل أي قرار.",
        "All of the above are model assumptions for estimating; they are not actual costs or prices for each item. Operational validation is needed before any decision."
      )}</span></p>
      <div class="cluster" style="margin-top:var(--space-5)">
        <button type="button" class="btn btn--secondary btn--sm" data-reset-assume>${icon("refresh", { size: "sm" })} ${X("استعد الافتراضات الأصلية", "Restore original assumptions")}</button>
        <span class="meta" data-assume-status>${o.note || ""}</span>
      </div>
      <p class="h4" style="margin-top:var(--space-7)">${X("ثوابت النموذج", "Model constants")}</p>
      <dl class="rp-constants">
        <div><dt>${X("أيام التشغيل للزوار", "Operating days for visitors")}</dt><dd>${formatNumber(MODEL_CONSTANTS.operatingDays)}</dd></div>
        <div><dt>${X("م² لكل زائر نهاري", "m² per day visitor")}</dt><dd>${formatNumber(MODEL_CONSTANTS.sqmPerDayVisitor)}</dd></div>
        <div><dt>${X("أقصى سعة نهارية", "Max day capacity")}</dt><dd>${formatNumber(MODEL_CONSTANTS.maxDayCapacity)}</dd></div>
        <div><dt>${X("غرفة جديدة لكل", "One new room per")}</dt><dd>${formatNumber(MODEL_CONSTANTS.sqmPerNewRoom)} م²</dd></div>
        <div><dt>${X("الغرف المستهدفة", "Target rooms")}</dt><dd>${formatNumber(MODEL_CONSTANTS.targetRooms)}</dd></div>
        <div><dt>${X("التكاليف الحالية المستمرة", "Current costs that continue")}</dt><dd>${formatPercent(MODEL_CONSTANTS.continuingCostShare)}</dd></div>
      </dl>`;
  };

  /* ---- Rendering of the live parts -------------------------------------- */
  const figs = (s) => {
    const fig = (value, label, note) => html`<div class="rp-fig"><span class="rp-fig__value">${value}</span><span class="rp-fig__label">${label}</span>${note ? html`<span class="rp-fig__note">${note}</span>` : ""}</div>`;
    return html`
      ${fig(formatCompact(s.revenue), X("الإيراد السنوي (ر.س)", "Annual revenue (SAR)"), X(`إقامة ${formatCompact(s.stayRevenue)} ونهاري ${formatCompact(s.dayRevenue)}`, `Stays ${formatCompact(s.stayRevenue)}, day ${formatCompact(s.dayRevenue)}`))}
      ${fig(formatCompact(s.opex), X("تكلفة التشغيل (ر.س)", "Operating cost (SAR)"))}
      ${fig(formatCompact(s.operatingProfit), X("ربح التشغيل (ر.س)", "Operating profit (SAR)"))}
      ${fig(formatPercent(s.margin), X("هامش التشغيل", "Operating margin"))}
      ${fig(formatCompact(s.investment), X("الاستثمار الأولي (ر.س)", "Initial investment (SAR)"), X(`تطوير ${formatCompact(s.investmentParts.developmentCost)} وغرف ${formatCompact(s.investmentParts.roomsCost + s.investmentParts.refurbCost)}`, `Development ${formatCompact(s.investmentParts.developmentCost)}, rooms ${formatCompact(s.investmentParts.roomsCost + s.investmentParts.refurbCost)}`))}
      ${fig(s.paybackYears ? X(`${formatNumber(s.paybackYears, { decimals: 1 })} سنة`, `${formatNumber(s.paybackYears, { decimals: 1 })} yrs`) : "—", X("استرداد الاستثمار", "Payback"))}
      ${fig(formatPercent(s.occupancy), X("نسبة الإشغال", "Occupancy"), X(`${formatNumber(Math.round(s.nightsSold))} ليلة في السنة`, `${Math.round(s.nightsSold)} nights a year`))}
      ${fig(formatPercent(s.utilization), X("استخدام الطاقة النهارية", "Day utilisation"), X(`${formatNumber(Math.round(s.dayVisitors))} زائر في السنة`, `${Math.round(s.dayVisitors)} visitors a year`))}`;
  };

  const compare = () => {
    const rows = [
      [X("الإيراد السنوي", "Annual revenue"), (s) => formatMoney(s.revenue, { compact: true })],
      [X("تكلفة التشغيل", "Operating cost"), (s) => formatMoney(s.opex, { compact: true })],
      [X("ربح التشغيل", "Operating profit"), (s) => formatMoney(s.operatingProfit, { compact: true })],
      [X("الهامش", "Margin"), (s) => formatPercent(s.margin)],
      [X("الاستثمار الأولي", "Initial investment"), (s) => formatMoney(s.investment, { compact: true })],
      [X("الاسترداد", "Payback"), (s) => (s.paybackYears ? X(`${formatNumber(s.paybackYears, { decimals: 1 })} سنة`, `${formatNumber(s.paybackYears, { decimals: 1 })} yrs`) : "—")],
    ];
    return html`<table class="table">
      <thead><tr><th scope="col">${EST()}</th>${SCENARIOS.map((s) => html`<th scope="col" class="${s.id === scenario ? "is-sel" : ""}">${L(s.label)}</th>`)}</tr></thead>
      <tbody>${rows.map(([label, f]) => html`<tr><th scope="row" style="background:transparent;font-weight:400;color:var(--color-text)">${label}</th>${SCENARIOS.map((s) => html`<td class="num-cell ${s.id === scenario ? "is-sel" : ""}">${f(model.feas.scenarios[s.id])}</td>`)}</tr>`)}</tbody>
    </table>`;
  };

  const groups = (s) => [
    { label: X("الإيراد", "Revenue"), values: [s.revenue], titles: [formatMoney(s.revenue)] },
    { label: X("تكلفة التشغيل", "Operating cost"), values: [s.opex], titles: [formatMoney(s.opex)] },
    { label: X("ربح التشغيل", "Operating profit"), values: [Math.max(0, s.operatingProfit)], titles: [formatMoney(s.operatingProfit)] },
  ];
  const chartMax = () => Math.max(...SCENARIOS.map((s) => model.feas.scenarios[s.id].revenue), 1);

  let drawn = false;
  function render() {
    if (!root) return;
    const s = model.current();
    const figsEl = $("[data-figs]", root);
    if (figsEl) {
      const prev = $$(".rp-fig__value", figsEl).map((el) => el.textContent);
      mount(figsEl, figs(s));
      $$(".rp-fig__value", figsEl).forEach((el, i) => {
        if (drawn && prev[i] !== undefined && prev[i] !== el.textContent) {
          el.classList.add("is-changed");
          setTimeout(() => el.classList.remove("is-changed"), 900);
        }
      });
      $("[data-scn-desc]", root).textContent = L(SCENARIOS.find((x) => x.id === scenario).desc);
      mount($("[data-compare]", root), compare());
      const cols = $("[data-cols]", root);
      if (!cols.firstElementChild) mount(cols, columns(groups(s), { max: chartMax(), height: 200 }));
      else updateColumns(cols, groups(s), chartMax());
      mount($("[data-spark]", root), spark(s.monthly, { height: 96 }));
      drawn = true;
    }
    $$("[data-range]", root).forEach((el) => (el.textContent = model.range(el.dataset.range)));
    $$("[data-scn]", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scn === scenario)));
    o.onChange?.(model);
  }
  model.render = render;

  /** Attach behaviour inside root (call once after mounting the markup) */
  model.wire = (el) => {
    root = el;
    on(root, "click", "[data-scn]", (e, b) => {
      scenario = b.dataset.scn;
      if (o.persist) o.store?.set("scenario", scenario);
      render();
    });

    const form = $("[data-assume]", root);
    if (form) {
      bindLiveValidation(form);
      form.addEventListener("input", () => {
        const v = readForm(form);
        let valid = true;
        ASSUMPTIONS.forEach((a) => {
          const raw = v[a.key];
          if (raw === "" || !Number.isFinite(raw)) return (valid = false);
          const val = a.unit === "percent" ? raw / 100 : raw;
          if (val < a.min || val > a.max) return (valid = false);
          A[a.key] = val;
        });
        if (!valid) validateForm(form);
        recompute();
        render();
        saveAssumptions();
        if (o.persist) $("[data-assume-status]", root).textContent = t("common.saved");
      });
      on(root, "click", "[data-reset-assume]", () => {
        A = defaultAssumptions();
        ASSUMPTIONS.forEach((a) => {
          form.querySelector(`[name="${a.key}"]`).value = a.unit === "percent" ? Math.round(A[a.key] * 100) : A[a.key];
        });
        $$(".field", form).forEach((f) => f.classList.remove("is-invalid"));
        $$(".field__error", form).forEach((er) => er.remove());
        recompute();
        render();
        if (o.persist) o.store?.set("assumptions", null);
        toast(X("استُعيدت الافتراضات الأصلية.", "Original assumptions restored."), { type: "info" });
      });
    }
    render();
  };

  return model;
}
