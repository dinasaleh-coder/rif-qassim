/* ==========================================================================
   DOM helpers
   A tiny, safe templating layer: interpolated values are escaped unless they
   come from html`` or raw(). This keeps user-entered text (farm names, notes)
   safe when rendered.
   ========================================================================== */

class SafeHTML {
  constructor(str) {
    this.str = str;
  }
  toString() {
    return this.str;
  }
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESC[c]);

/** Mark a string as trusted HTML (only for markup we generate ourselves). */
export const raw = (str) => new SafeHTML(String(str ?? ""));

function renderValue(v) {
  if (v === null || v === undefined || v === false) return "";
  if (v === true) return "true";
  if (v instanceof SafeHTML) return v.str;
  if (Array.isArray(v)) return v.map(renderValue).join("");
  return esc(v);
}

/** Tagged template: html`<p>${userText}</p>` escapes userText. */
export function html(strings, ...values) {
  let out = "";
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += renderValue(values[i]);
  });
  return new SafeHTML(out);
}

/** Replace an element's content with a template. */
export function mount(el, template) {
  if (!el) return null;
  el.innerHTML = String(template);
  return el;
}

/** Build a single element from a template. */
export function fragment(template) {
  const t = document.createElement("template");
  t.innerHTML = String(template).trim();
  return t.content.firstElementChild;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Delegated event listener. Returns an unsubscribe function. */
export function on(root, type, selector, handler, options) {
  const listener = (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  };
  root.addEventListener(type, listener, options);
  return () => root.removeEventListener(type, listener, options);
}

export function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;

/** Short readable id, e.g. for booking references. Avoids look-alike chars. */
export function uid(len = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const rand = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(len))
    : Array.from({ length: len }, () => Math.floor(Math.random() * 1e9));
  for (let i = 0; i < len; i++) s += chars[rand[i] % chars.length];
  return s;
}

/* ---- Scroll reveal ---------------------------------------------------- */
let revealObserver;

export function observeReveals(root = document) {
  const items = $$("[data-reveal]:not(.is-revealed)", root);
  if (!items.length) return;
  if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
    items.forEach((el) => el.classList.add("is-revealed"));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            entry.target.dispatchEvent(new CustomEvent("reveal"));
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
  }
  items.forEach((el) => revealObserver.observe(el));
}

/** Run a callback once when an element scrolls into view. */
export function onceVisible(el, cb, threshold = 0.3) {
  if (!el) return;
  if (!("IntersectionObserver" in window)) {
    cb();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        cb();
      }
    },
    { threshold }
  );
  io.observe(el);
}

/* ---- Number tween ----------------------------------------------------- */
const tweens = new WeakMap();

/**
 * Animate an element's number from its current value to `to`.
 * `format` turns a number into display text.
 */
export function animateNumber(el, to, { duration = 700, format = (n) => Math.round(n), from } = {}) {
  if (!el) return;
  const start = from ?? tweens.get(el) ?? 0;
  tweens.set(el, to);
  if (prefersReducedMotion() || start === to) {
    el.textContent = format(to);
    return;
  }
  const t0 = performance.now();
  el.classList.add("is-ticking");
  const step = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = format(start + (to - start) * eased);
    if (p < 1 && tweens.get(el) === to) requestAnimationFrame(step);
    else if (p >= 1) setTimeout(() => el.classList.remove("is-ticking"), 300);
  };
  requestAnimationFrame(step);
}

/* ---- Focus management -------------------------------------------------- */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container) {
  const handler = (e) => {
    if (e.key !== "Tab") return;
    const nodes = $$(FOCUSABLE, container).filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  container.addEventListener("keydown", handler);
  return () => container.removeEventListener("keydown", handler);
}

export function focusFirst(container) {
  const node = $("[autofocus]", container) || $(FOCUSABLE, container);
  node?.focus({ preventScroll: true });
}

/* ---- URL helpers ------------------------------------------------------- */
export const getParam = (name) => new URLSearchParams(window.location.search).get(name);
