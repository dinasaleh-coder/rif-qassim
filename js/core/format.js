/* ==========================================================================
   Formatting
   Western digits in both languages (common in Saudi product UI and easier to
   scan in numbers-heavy screens). Dates are always Gregorian — the default
   ar-SA calendar is Hijri, so the calendar is set explicitly.
   ========================================================================== */

import { getLang } from "./i18n.js";

const localeFor = (lang = getLang()) => (lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB-u-ca-gregory");

export function formatNumber(n, { decimals = 0 } = {}) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(localeFor(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** 850 → "850 ر.س" / "SAR 850" */
export function formatMoney(n, { decimals = 0, compact = false } = {}) {
  if (!Number.isFinite(n)) return "—";
  const num = compact ? formatCompact(n) : formatNumber(n, { decimals });
  return getLang() === "ar" ? `${num} ر.س` : `SAR ${num}`;
}

/** 1 250 000 → "1.25 مليون" / "1.25M" */
export function formatCompact(n) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const ar = getLang() === "ar";
  const fmt = (v) => formatNumber(v, { decimals: v < 10 ? 2 : 1 }).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  if (abs >= 1e6) return `${fmt(n / 1e6)}${ar ? " مليون" : "M"}`;
  if (abs >= 1e3) return `${fmt(n / 1e3)}${ar ? " ألف" : "K"}`;
  return formatNumber(n);
}

export function formatPercent(ratio, { decimals = 0 } = {}) {
  if (!Number.isFinite(ratio)) return "—";
  return `${formatNumber(ratio * 100, { decimals })}%`;
}

/** Parse "yyyy-mm-dd" as a local date (no timezone shift). */
export function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "الجمعة، 16 أكتوبر 2026" */
export function formatDate(input, opts = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  const date = typeof input === "string" ? parseISODate(input) : input;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(localeFor(), opts).format(date);
}

export const formatDateShort = (input) => formatDate(input, { day: "numeric", month: "short", year: "numeric" });

export const formatMonth = (date) => formatDate(date, { month: "long", year: "numeric" });

export function weekdayNames(style = "short") {
  // Week starts on Sunday, as in Saudi calendars. 4 Jan 2026 is a Sunday.
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(localeFor(), { weekday: style }).format(new Date(2026, 0, 4 + i))
  );
}

/**
 * Arabic count agreement.
 * forms: { one, two, few, many } e.g. ضيف / ضيفان / ضيوف / ضيفًا
 * English forms: { one, other }
 */
export function plural(n, forms) {
  const lang = getLang();
  const num = formatNumber(n);
  if (lang === "en") {
    const word = n === 1 ? forms.one : forms.other ?? forms.one;
    return `${num} ${word}`;
  }
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  const mod100 = n % 100;
  if (mod100 >= 3 && mod100 <= 10) return `${num} ${forms.few}`;
  return `${num} ${forms.many}`;
}

export const PLURALS = {
  guests: {
    ar: { one: "ضيف واحد", two: "ضيفان", few: "ضيوف", many: "ضيفًا" },
    en: { one: "guest", other: "guests" },
  },
  hours: {
    ar: { one: "ساعة", two: "ساعتان", few: "ساعات", many: "ساعة" },
    en: { one: "hour", other: "hours" },
  },
  nights: {
    ar: { one: "ليلة واحدة", two: "ليلتان", few: "ليالٍ", many: "ليلة" },
    en: { one: "night", other: "nights" },
  },
  rooms: {
    ar: { one: "غرفة واحدة", two: "غرفتان", few: "غرف", many: "غرفة" },
    en: { one: "room", other: "rooms" },
  },
  years: {
    ar: { one: "سنة واحدة", two: "سنتان", few: "سنوات", many: "سنة" },
    en: { one: "year", other: "years" },
  },
  bookings: {
    ar: { one: "حجز واحد", two: "حجزان", few: "حجوزات", many: "حجزًا" },
    en: { one: "booking", other: "bookings" },
  },
};

/** plural helper bound to a known noun: count(3, "guests") */
export const count = (n, noun) => plural(n, PLURALS[noun][getLang()]);

/** Duration in hours (supports fractions and multi-day) */
export function formatDuration(hours) {
  const lang = getLang();
  if (hours >= 24) {
    const nights = Math.round(hours / 24);
    return count(nights, "nights");
  }
  if (hours < 1) return lang === "ar" ? `${formatNumber(hours * 60)} دقيقة` : `${formatNumber(hours * 60)} min`;
  if (!Number.isInteger(hours)) {
    return lang === "ar" ? `${formatNumber(hours, { decimals: 1 })} ساعة` : `${formatNumber(hours, { decimals: 1 })} hours`;
  }
  return count(hours, "hours");
}
