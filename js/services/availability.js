/* ==========================================================================
   Availability (DEMO)
   Rules come from the data (weekdays, seasons, event dates, booking window).
   On top of that, a deterministic hash marks some dates "limited" or "full"
   so the calendar feels realistic — it is the same every visit and is NOT
   real availability. The UI labels it as demo.
   ========================================================================== */

import { parseISODate, toISODate } from "../core/format.js";

/** The prototype's "today". Uses the real clock so dates stay sensible. */
export function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** "MM-DD" season check that supports wrapping across the new year. */
export function inSeason(date, season) {
  if (!season) return true;
  const md = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const { from, to } = season;
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}

/**
 * Status of one date for a package.
 * returns: "available" | "limited" | "full" | "closed" | "past" | "outside"
 */
export function packageDateStatus(pkg, dateInput, ref = today()) {
  const date = typeof dateInput === "string" ? parseISODate(dateInput) : dateInput;
  if (!pkg || !date) return "closed";
  const { days, season, dates, leadDays = 1, windowDays = 120 } = pkg.availability;
  if (date < addDays(ref, leadDays)) return "past";
  if (date > addDays(ref, windowDays)) return "outside";
  if (dates) {
    if (!dates.includes(toISODate(date))) return "closed";
  } else {
    if (days && !days.includes(date.getDay())) return "closed";
    if (season && !inSeason(date, season)) return "closed";
  }
  const h = hash(`${pkg.id}:${toISODate(date)}`);
  if (h < 0.08) return "full";
  if (h < 0.28) return "limited";
  return "available";
}

export const isBookable = (status) => status === "available" || status === "limited";

/** Build a month grid for the calendar: weeks starting on Sunday. */
export function monthGrid(year, month, statusFn) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // Sunday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, iso: toISODate(date), day: d, status: statusFn(date) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** First bookable date for a package (used to suggest a date). */
export function firstAvailableDate(pkg, ref = today()) {
  for (let i = 0; i <= (pkg.availability.windowDays || 120); i++) {
    const d = addDays(ref, i);
    if (isBookable(packageDateStatus(pkg, d, ref))) return toISODate(d);
  }
  return null;
}

/** Is an experience offered on a given date? (filters on the experiences page) */
export function experienceAvailableOn(exp, dateInput) {
  const date = typeof dateInput === "string" ? parseISODate(dateInput) : dateInput;
  if (!date) return true;
  const { days, season, dates } = exp.availability || {};
  if (dates) return dates.includes(toISODate(date));
  if (season && !inSeason(date, season)) return false;
  if (days && !days.includes(date.getDay())) return false;
  return true;
}

/** Is an experience offered at all in the next N days? */
export function experienceUpcoming(exp, horizonDays = 120, ref = today()) {
  for (let i = 0; i <= horizonDays; i++) {
    if (experienceAvailableOn(exp, addDays(ref, i))) return true;
  }
  return false;
}
