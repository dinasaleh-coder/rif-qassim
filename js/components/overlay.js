/* ==========================================================================
   Overlays: modal (sheet on phones, dialog on tablet+) and drawer
   (full-screen on phones, side panel on tablet+). Focus is trapped while
   open and returned to the trigger on close. Escape and backdrop close.
   ========================================================================== */

import { fragment, html, trapFocus, raw } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { icon } from "./icons.js";

let openCount = 0;

/**
 * @param {{
 *   kind?: "modal"|"drawer", title: string, body: string|SafeHTML,
 *   foot?: string|SafeHTML, wide?: boolean, onOpen?: (panel) => void,
 *   onClose?: () => void, labelledBy?: string
 * }} opts
 * @returns {{ el: HTMLElement, close: () => void }}
 */
export function openPanel(opts) {
  const kind = opts.kind || "modal";
  const titleId = `panel-title-${Date.now()}`;
  const trigger = document.activeElement;

  const overlay = fragment(html`<div class="overlay" data-overlay></div>`);
  const panel = fragment(html`
    <div class="${kind} ${opts.wide ? `${kind}--wide` : ""}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <div class="panel__head">
        <h2 class="panel__title" id="${titleId}">${opts.title}</h2>
        <button class="panel__close" type="button" data-close aria-label="${t("common.close")}">${icon("close")}</button>
      </div>
      <div class="panel__body">${raw(String(opts.body ?? ""))}</div>
      ${opts.foot ? html`<div class="panel__foot">${raw(String(opts.foot))}</div>` : ""}
    </div>
  `);

  document.body.append(overlay, panel);
  openCount++;
  document.body.classList.add("no-scroll");

  const releaseTrap = trapFocus(panel);

  requestAnimationFrame(() => {
    overlay.classList.add("is-open");
    panel.classList.add("is-open");
    // Focus an explicit [autofocus] field if the content asks for one,
    // otherwise the close button (avoids a focus ring jumping onto content)
    const auto = panel.querySelector(".panel__body [autofocus]");
    (auto || panel.querySelector("[data-close]")).focus({ preventScroll: true });
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.classList.remove("is-open");
    panel.classList.remove("is-open");
    releaseTrap();
    document.removeEventListener("keydown", onKey);
    openCount = Math.max(0, openCount - 1);
    if (!openCount) document.body.classList.remove("no-scroll");
    const done = () => {
      overlay.remove();
      panel.remove();
    };
    panel.addEventListener("transitionend", done, { once: true });
    setTimeout(done, 600); // fallback when transitions are disabled
    trigger?.focus?.({ preventScroll: true });
    opts.onClose?.();
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", close);
  panel.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) close();
  });

  opts.onOpen?.(panel, close);
  return { el: panel, close };
}

export const openModal = (opts) => openPanel({ ...opts, kind: "modal" });
export const openDrawer = (opts) => openPanel({ ...opts, kind: "drawer" });

/**
 * A simple confirm dialog that resolves true/false.
 */
export function confirmDialog({ title, text, confirmLabel, cancelLabel, danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const { el, close } = openModal({
      title,
      body: html`<p class="muted">${text}</p>`,
      foot: html`<div class="cluster" style="justify-content:flex-end">
        <button type="button" class="btn btn--secondary" data-answer="no">${cancelLabel || t("common.cancel")}</button>
        <button type="button" class="btn btn--primary" data-answer="yes" ${danger ? 'style="--btn-bg:var(--status-cancelled);--btn-border:var(--status-cancelled)"' : ""}>${confirmLabel}</button>
      </div>`,
      onClose: () => {
        if (!answered) resolve(false);
      },
    });
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-answer]");
      if (!b) return;
      answered = true;
      resolve(b.dataset.answer === "yes");
      close();
    });
  });
}
