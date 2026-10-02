/* ==========================================================================
   Shell
   Every page calls initShell() once. It renders the header (logo, nav,
   language, CTA), the full-screen mobile menu, the mobile bottom nav,
   the footer and the demo perspective switcher, then wires scroll
   behaviour and reveals.

   initShell({
     page: "home" | "destinations" | "experiences" | "business" | "owner" | "admin" | …,
     header: "overlay" | "solid",   // overlay = transparent over a dark hero
     bottomNav: true,               // mobile bottom navigation (visitor pages)
     footer: "full" | "minimal" | false,
     demo: true                     // floating demo switcher
   })
   ========================================================================== */

import { html, raw, fragment, $, $$, trapFocus, observeReveals, esc } from "../core/dom.js";
import { applyDocumentLanguage, getLang, setLang, t, L, translateDOM } from "../core/i18n.js";
import { asset, route, pendingPart } from "../core/paths.js";
import { store } from "../core/store.js";
import { BRAND } from "../data/brand.js";
import { icon } from "./icons.js";
import { openDrawer, openModal, confirmDialog } from "./overlay.js";
import { toast } from "./toast.js";

/* ==========================================================================
   Logo
   ========================================================================== */

const LOGO_CACHE_KEY = `rif:logo:v2:${BRAND.logo.file || "none"}:${BRAND.logo.fileOnDark || "none"}`;
let logoState = null; // { main: url|null, light: url|null }

function probe(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0 ? url : null);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function firstLoadable(list) {
  for (const path of list) {
    const ok = await probe(asset(path));
    if (ok) return ok;
  }
  return null;
}

async function resolveLogo() {
  if (logoState) return logoState;
  try {
    const cached = JSON.parse(sessionStorage.getItem(LOGO_CACHE_KEY) || "null");
    if (cached) return (logoState = cached);
  } catch {
    /* ignore */
  }
  const main = BRAND.logo.file ? await firstLoadable([BRAND.logo.file]) : null;
  const light = main && BRAND.logo.fileOnDark ? await firstLoadable([BRAND.logo.fileOnDark]) : null;
  logoState = { main, light };
  if (BRAND.logo.file && !main) console.warn(`Rif logo not found at ${BRAND.logo.file} — showing the wordmark.`);
  try {
    sessionStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(logoState));
  } catch {
    /* ignore */
  }
  return logoState;
}

/** Typographic fallback shown until the logo file exists. */
function wordmark() {
  return html`<span class="brand__wordmark" aria-hidden="true">
    <span class="brand__wordmark-ar">ريف القصيم</span>
    <span class="brand__wordmark-en">RIF QASSIM</span>
  </span>`;
}

function brandLink({ dark = false } = {}) {
  return html`<a class="brand" href="${route("home")}" aria-label="${t("brand.home")}" data-brand data-dark="${dark ? "1" : "0"}">${wordmark()}</a>`;
}

/** Replace wordmarks with the real logo once it's known to load. */
function applyLogo(state) {
  if (!state?.main) return;
  $$("[data-brand]").forEach((a) => {
    const onDark = a.closest(".on-dark") !== null;
    const useLight = onDark && state.light;
    const src = useLight ? state.light : state.main;
    let img = $("img.brand__logo", a);
    if (!img) {
      a.innerHTML = "";
      img = document.createElement("img");
      img.className = "brand__logo";
      img.alt = L(BRAND.logo.alt);
      img.decoding = "async";
      a.append(img);
    }
    img.src = src;
    img.dataset.onDark = !useLight && BRAND.logo.onDark === "invert" ? "invert" : "none";
  });
}

/* ==========================================================================
   Markup
   ========================================================================== */

const NAV = [
  { id: "destinations", key: "nav.destinations", href: () => route("destinations") },
  { id: "experiences", key: "nav.experiences", href: () => route("experiences") },
  { id: "business", key: "nav.owners", href: () => route("business") },
  { id: "about", key: "nav.about", href: () => route("about") },
];

function langToggle() {
  const lang = getLang();
  return html`<div class="lang-toggle" role="group" aria-label="${t("nav.language")}">
    <button type="button" data-lang="ar" aria-pressed="${lang === "ar"}" lang="ar"><span>ع</span></button>
    <button type="button" data-lang="en" aria-pressed="${lang === "en"}" lang="en"><span>EN</span></button>
  </div>`;
}

function headerMarkup(page, variant) {
  return html`
    <a class="skip-link" href="#main">${t("nav.skip")}</a>
    <header class="site-header site-header--${variant}" data-header>
      <div class="container container--wide site-header__inner">
        ${brandLink()}
        <nav class="site-nav" aria-label="${t("nav.main")}">
          <ul class="site-nav__list" role="list">
            ${NAV.map(
              (n) => html`<li><a class="site-nav__link" href="${n.href()}" ${page === n.id ? raw('aria-current="page"') : ""}>${t(n.key)}</a></li>`
            )}
          </ul>
        </nav>
        <div class="site-header__actions">
          ${langToggle()}
          <a class="btn btn--sm site-header__cta ${variant === "overlay" ? "btn--outline-light" : "btn--primary"}" href="${route("business")}" data-header-cta>${t("nav.cta")}</a>
          <button class="menu-button" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="${t("nav.openMenu")}" data-menu-open>
            <span class="menu-button__bars"></span>
          </button>
        </div>
      </div>
    </header>`;
}

function mobileMenuMarkup(page) {
  const items = [
    { id: "home", key: "nav.home", hint: null, href: route("home") },
    { id: "destinations", key: "nav.destinations", hint: "menu.destinations.hint", href: route("destinations") },
    { id: "experiences", key: "nav.experiences", hint: "menu.experiences.hint", href: route("experiences") },
    { id: "business", key: "nav.develop", hint: "menu.develop.hint", href: route("business") },
    { id: "about", key: "nav.about", hint: "menu.about.hint", href: route("about") },
    { id: "contact", key: "nav.contact", hint: "menu.contact.hint", href: route("contact") },
  ];
  return html`
    <div class="mobile-menu on-dark contours contours--light" id="mobile-menu" role="dialog" aria-modal="true" aria-label="${t("nav.menu")}" data-menu hidden>
      <div class="mobile-menu__top">
        ${brandLink({ dark: true })}
        <button class="mobile-menu__close" type="button" aria-label="${t("nav.closeMenu")}" data-menu-close>${icon("close", { size: "lg" })}</button>
      </div>
      <ul class="mobile-menu__list" role="list">
        ${items.map(
          (it, i) => html`<li style="--i:${i}">
            <a class="mobile-menu__link" href="${it.href}" ${page === it.id ? raw('aria-current="page"') : ""}>
              <span>${t(it.key)}</span>
              ${it.hint ? html`<small>${t(it.hint)}</small>` : ""}
            </a>
          </li>`
        )}
      </ul>
      <div class="mobile-menu__foot">
        <a class="btn btn--light" href="${route("business")}">${t("nav.cta")}</a>
        ${langToggle()}
      </div>
    </div>`;
}

function bottomNavMarkup(page) {
  const items = [
    { id: "home", key: "nav.home", icon: "home", href: route("home") },
    { id: "destinations", key: "nav.destinations", icon: "compass", href: route("destinations") },
    { id: "experiences", key: "nav.experiences", icon: "grid", href: route("experiences") },
    { id: "business", key: "nav.owners", icon: "sprout", href: route("business") },
  ];
  return html`
    <nav class="bottom-nav" aria-label="${t("nav.main")}" data-bottom-nav>
      <ul class="bottom-nav__list" role="list">
        ${items.map(
          (it) => html`<li><a class="bottom-nav__item" href="${it.href}" ${page === it.id ? raw('aria-current="page"') : ""}>${icon(it.icon)}<span>${t(it.key)}</span></a></li>`
        )}
        <li><button type="button" class="bottom-nav__item" style="inline-size:100%" data-menu-open aria-controls="mobile-menu" aria-expanded="false">${icon("menu")}<span>${t("nav.menu")}</span></button></li>
      </ul>
    </nav>`;
}

function footerMarkup(kind) {
  const year = 2026;
  if (kind === "minimal") {
    return html`
      <footer class="site-footer on-dark" style="padding-block:var(--space-6)">
        <div class="container">
          <div class="footer__bottom" style="margin-top:0;border-top:0;padding-top:0;align-items:center">
            ${brandLink({ dark: true })}
            <span>${t("footer.demo")}</span>
            <span>${t("footer.rights")}</span>
          </div>
        </div>
      </footer>`;
  }
  return html`
    <footer class="site-footer on-dark contours contours--light" id="contact">
      <div class="container">
        <div class="footer__grid">
          <div class="footer__brand">
            ${brandLink({ dark: true })}
            <p>${t("brand.about")}</p>
            <p class="ltr" style="text-align:start"><a href="mailto:${BRAND.contact.email}">${BRAND.contact.email}</a></p>
          </div>
          <nav aria-label="${t("footer.links")}">
            <ul class="footer__links" role="list">
              <li><a href="${route("destinations")}">${t("nav.destinations")}</a></li>
              <li><a href="${route("experiences")}">${t("nav.experiences")}</a></li>
              <li><a href="${route("business")}">${t("nav.develop")}</a></li>
              <li><a href="${route("about")}">${t("nav.about")}</a></li>
              <li><a href="${route("owner")}">${t("nav.ownerPortal")}</a></li>
              <li><a href="${route("admin")}">${t("nav.team")}</a></li>
            </ul>
          </nav>
          <div>
            <p class="meta" style="color:var(--color-on-dark-muted);margin-bottom:var(--space-3)">${t("footer.social")}</p>
            <ul class="footer__social" role="list">
              ${BRAND.social.map(
                (s) => html`<li><span class="footer__social-item" title="${t("footer.socialSoon")}" aria-label="${s.label}: ${t("footer.socialSoon")}" style="display:inline-flex;align-items:center;justify-content:center;inline-size:40px;block-size:40px;border:1px solid var(--color-line-on-dark);border-radius:50%;opacity:.6">${icon(s.key)}</span></li>`
              )}
            </ul>
            <p class="meta" style="color:var(--color-on-dark-muted);margin-top:var(--space-3)">${t("footer.socialSoon")}</p>
          </div>
        </div>
        <div class="footer__bottom">
          <span>${t("footer.rights")}</span>
          <span>${t("footer.demo")}</span>
          <div class="footer__legal">
            <button type="button" data-legal="privacy" style="color:inherit">${t("footer.privacy")}</button>
            <button type="button" data-legal="terms" style="color:inherit">${t("footer.terms")}</button>
          </div>
        </div>
      </div>
    </footer>`;
}

/* ==========================================================================
   Behaviour
   ========================================================================== */

function wireMenu() {
  const menu = $("[data-menu]");
  if (!menu) return;
  let release = null;
  let lastTrigger = null;

  const open = (trigger) => {
    lastTrigger = trigger;
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
    document.body.classList.add("no-scroll");
    $$("[data-menu-open]").forEach((b) => b.setAttribute("aria-expanded", "true"));
    release = trapFocus(menu);
    setTimeout(() => $("[data-menu-close]", menu).focus(), 60);
  };
  const close = () => {
    menu.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    $$("[data-menu-open]").forEach((b) => b.setAttribute("aria-expanded", "false"));
    release?.();
    setTimeout(() => (menu.hidden = true), 700);
    lastTrigger?.focus?.();
  };

  $$("[data-menu-open]").forEach((b) => b.addEventListener("click", () => open(b)));
  $("[data-menu-close]", menu).addEventListener("click", close);
  menu.addEventListener("keydown", (e) => e.key === "Escape" && close());
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) close();
  });
}

function wireLanguage() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]");
    if (b) setLang(b.dataset.lang);
  });
}

function wireScroll(header, variant) {
  if (!header) return;
  let lastY = window.scrollY;
  let ticking = false;
  const cta = $("[data-header-cta]", header);

  const update = () => {
    const y = window.scrollY;
    const scrolled = y > 40;
    header.classList.toggle("is-scrolled", scrolled);
    if (variant === "overlay") {
      header.classList.toggle("on-dark", !scrolled);
      if (cta) {
        cta.classList.toggle("btn--outline-light", !scrolled);
        cta.classList.toggle("btn--primary", scrolled);
      }
      applyLogo(logoState);
    }
    const goingDown = y > lastY;
    const menuOpen = !$("[data-menu]")?.hidden;
    const hide = goingDown && y > 480 && !menuOpen;
    header.classList.toggle("is-hidden", hide);
    document.body.classList.toggle("header-hidden", hide);
    lastY = y;
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
  // When keyboard focus lands in the header, make sure it's visible
  header.addEventListener("focusin", () => {
    header.classList.remove("is-hidden");
    document.body.classList.remove("header-hidden");
  });
  update();
}

function openDemoSwitcher() {
  const body = html`
    <p class="muted" style="margin-bottom:var(--space-5)">${t("demo.intro")}</p>
    <ul class="perspective-list" role="list">
      <li><a class="perspective" href="${route("destination", { id: "sidr" })}">
        <span class="perspective__icon">${icon("compass")}</span>
        <span><span class="perspective__title" style="display:block">${t("demo.visitor")}</span><span class="perspective__desc">${t("demo.visitor.desc")}</span></span>
        ${icon("chevron")}
      </a></li>
      <li><a class="perspective" href="${route("business")}">
        <span class="perspective__icon">${icon("sprout")}</span>
        <span><span class="perspective__title" style="display:block">${t("demo.owner")}</span><span class="perspective__desc">${t("demo.owner.desc")}</span></span>
        ${icon("chevron")}
      </a></li>
      <li><a class="perspective" href="${route("admin")}">
        <span class="perspective__icon">${icon("layers")}</span>
        <span><span class="perspective__title" style="display:block">${t("demo.team")}</span><span class="perspective__desc">${t("demo.team.desc")}</span></span>
        ${icon("chevron")}
      </a></li>
    </ul>`;
  const foot = html`<button type="button" class="btn btn--ghost btn--sm" data-reset-demo>${icon("refresh", { size: "sm" })} ${t("demo.reset")}</button>`;
  openDrawer({
    title: t("demo.title"),
    body,
    foot,
    onOpen(panel, close) {
      panel.querySelector("[data-reset-demo]").addEventListener("click", async () => {
        const ok = await confirmDialog({ title: t("demo.reset"), text: t("demo.resetConfirm"), confirmLabel: t("demo.reset"), danger: true });
        if (!ok) return;
        store.resetDemo();
        close();
        toast(t("demo.resetDone"));
        setTimeout(() => window.location.reload(), 900);
      });
    },
  });
}

/* Links to pages that later build parts deliver: explain instead of 404 */
function wirePendingLinks() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented) return;
    const part = pendingPart(a.href);
    if (!part) return;
    e.preventDefault();
    toast(L({ ar: `هذه الصفحة تُبنى في الجزء ${part} من النموذج.`, en: `This page arrives in part ${part} of the prototype.` }), { type: "info" });
  });
}

function wireLegal() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-legal]");
    if (!b) return;
    const kind = b.dataset.legal;
    openModal({
      title: t(kind === "privacy" ? "footer.privacy" : "footer.terms"),
      body: html`<div class="prose stack"><p>${t(`legal.${kind}.1`)}</p><p class="muted">${t(`legal.${kind}.2`)}</p></div>`,
    });
  });
}

/* ==========================================================================
   Init
   ========================================================================== */

export function initShell(opts = {}) {
  const { page = "", header = "solid", bottomNav = true, footer = "full", demo = true } = opts;
  applyDocumentLanguage();
  document.documentElement.classList.add("js");

  const main = $("#main") || $("main");
  if (main && !main.id) main.id = "main";
  main?.setAttribute("tabindex", "-1");

  // header: "none" → the page brings its own chrome (internal workspace)
  if (header !== "none") {
    const headerEl = fragment(html`<div data-shell-top>${headerMarkup(page, header)}</div>`);
    document.body.prepend(...headerEl.childNodes);
  } else {
    document.body.prepend(fragment(html`<a class="skip-link" href="#main">${t("nav.skip")}</a>`));
  }
  document.body.append(fragment(mobileMenuMarkup(page)));

  if (footer) document.body.append(fragment(footerMarkup(footer)));

  if (bottomNav) {
    document.body.append(fragment(bottomNavMarkup(page)));
    document.body.classList.add("has-bottom-nav");
  }

  if (demo) {
    const fab = fragment(html`<button type="button" class="demo-fab" data-demo-fab aria-haspopup="dialog">
      <span class="demo-fab__dot"></span><span class="demo-fab__text">${t("demo.fab")}</span><span class="visually-hidden">${t("demo.title")}</span>
    </button>`);
    fab.addEventListener("click", openDemoSwitcher);
    document.body.append(fab);
  }

  const headerNode = $("[data-header]");
  if (header === "overlay") headerNode.classList.add("on-dark");
  else if (headerNode) document.body.classList.add("has-solid-header");

  if (headerNode) wireMenu();
  wireLanguage();
  wireScroll(headerNode, header);
  wireLegal();
  wirePendingLinks();
  translateDOM();
  observeReveals();

  resolveLogo().then(applyLogo);

  return { header: headerNode };
}

/** Re-scan for reveal elements after a page renders new content. */
export const refreshReveals = (root) => observeReveals(root);
