/* ==========================================================================
   i18n
   Arabic is the primary experience. English swaps direction, fonts and
   strings. Data content uses { ar, en } objects where translated; plain
   strings are Arabic-only content and are shown as-is.
   ========================================================================== */

import { store } from "./store.js";
import { STRINGS } from "../data/strings.js";

const dictionaries = { ar: { ...STRINGS.ar }, en: { ...STRINGS.en } };

export const LANGS = ["ar", "en"];

export function getLang() {
  const lang = store.get("lang");
  return LANGS.includes(lang) ? lang : "ar";
}

export const isRTL = () => getLang() === "ar";

/** Apply lang + dir to <html> (called before first paint by each page). */
export function applyDocumentLanguage() {
  const lang = getLang();
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ar" ? "rtl" : "ltr";
}

/**
 * Change language. Pages render from data on load, so a reload is the most
 * reliable way to re-render everything; the view transition keeps it calm.
 */
export function setLang(lang) {
  if (!LANGS.includes(lang) || lang === getLang()) return;
  store.set("lang", lang);
  window.location.reload();
}

/** Add page-specific strings: register({ ar: {...}, en: {...} }) */
export function register(dict) {
  LANGS.forEach((l) => Object.assign(dictionaries[l], dict[l] || {}));
}

/** Translate a key, with {placeholders}. Falls back to Arabic, then the key. */
export function t(key, vars) {
  const lang = getLang();
  let str = dictionaries[lang][key] ?? dictionaries.ar[key] ?? key;
  if (vars) {
    str = str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  }
  return str;
}

/** Localise a data value: { ar, en } → current language; strings pass through. */
export function L(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && !Array.isArray(value) && ("ar" in value || "en" in value)) {
    return value[getLang()] ?? value.ar ?? value.en ?? "";
  }
  return value;
}

/** Fill [data-i18n] elements (static page markup). */
export function translateDOM(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    // format: "placeholder:key;aria-label:key"
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

/** Inline bilingual copy for page-specific text: tr("عربي", "English") */
export const tr = (ar, en) => (getLang() === "en" ? en ?? ar : ar);
