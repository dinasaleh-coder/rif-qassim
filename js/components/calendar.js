/* ==========================================================================
   Calendar — month view with demo availability.
   Weeks start on Sunday. In RTL the grid flows right-to-left naturally,
   and the previous/next buttons follow reading direction.

   const cal = createCalendar(el, {
     statusFn: (date) => "available" | "limited" | "full" | "closed" | "past" | "outside",
     value: "2026-10-16", onSelect: (iso) => {}
   })
   ========================================================================== */

import { html, mount, on } from "../core/dom.js";
import { t, L } from "../core/i18n.js";
import { formatMonth, formatDate, parseISODate, weekdayNames } from "../core/format.js";
import { monthGrid, isBookable, today } from "../services/availability.js";
import { icon } from "./icons.js";

const STATUS_TEXT = {
  available: { ar: "متاح", en: "Available" },
  limited: { ar: "أماكن محدودة", en: "Limited" },
  full: { ar: "مكتمل", en: "Full" },
  closed: { ar: "غير متاح في هذا اليوم", en: "Not offered this day" },
  past: { ar: "غير متاح", en: "Unavailable" },
  outside: { ar: "خارج فترة الحجز", en: "Outside booking window" },
};

export function createCalendar(el, { statusFn, value = null, onSelect, minMonth, month: startMonth } = {}) {
  // Opens on the selected date, else on a suggested month, else today
  const start = value ? parseISODate(value) : startMonth ? parseISODate(startMonth) : today();
  let year = start.getFullYear();
  let month = start.getMonth();
  let selected = value;
  const floor = minMonth || today();

  const render = () => {
    const cells = monthGrid(year, month, statusFn);
    const canPrev = year > floor.getFullYear() || (year === floor.getFullYear() && month > floor.getMonth());
    mount(
      el,
      html`
      <div class="cal" data-cal>
        <div class="cal__head">
          <button type="button" class="cal__nav" data-cal-prev ${canPrev ? "" : "disabled"} aria-label="${t("cal.prev")}">${icon("chevron", { cls: "cal__prev" })}</button>
          <p class="cal__month" aria-live="polite">${formatMonth(new Date(year, month, 1))}</p>
          <button type="button" class="cal__nav" data-cal-next aria-label="${t("cal.next")}">${icon("chevron")}</button>
        </div>
        <div class="cal__grid" role="grid">
          ${weekdayNames("narrow").map((w) => html`<span class="cal__wd" role="columnheader">${w}</span>`)}
          ${cells.map((c) =>
            c
              ? html`<button type="button" role="gridcell" class="cal__day is-${c.status} ${c.iso === selected ? "is-selected" : ""}"
                  data-iso="${c.iso}" ${isBookable(c.status) ? "" : "disabled"}
                  aria-pressed="${c.iso === selected}"
                  aria-label="${formatDate(c.date)}، ${L(STATUS_TEXT[c.status])}"><span class="num">${c.day}</span></button>`
              : html`<span class="cal__day is-empty" aria-hidden="true"></span>`
          )}
        </div>
        <div class="cal__legend">
          <span><i class="is-available"></i>${L(STATUS_TEXT.available)}</span>
          <span><i class="is-limited"></i>${L(STATUS_TEXT.limited)}</span>
          <span><i class="is-full"></i>${L(STATUS_TEXT.full)}</span>
        </div>
      </div>`
    );
  };

  on(el, "click", "[data-cal-prev]", () => {
    month -= 1;
    if (month < 0) { month = 11; year -= 1; }
    render();
  });
  on(el, "click", "[data-cal-next]", () => {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    render();
  });
  on(el, "click", "[data-iso]", (e, b) => {
    selected = b.dataset.iso;
    render();
    el.querySelector(`[data-iso="${selected}"]`)?.focus();
    onSelect?.(selected);
  });

  render();
  return {
    get value() {
      return selected;
    },
    set(iso) {
      selected = iso;
      if (iso) {
        const d = parseISODate(iso);
        year = d.getFullYear();
        month = d.getMonth();
      }
      render();
    },
  };
}
