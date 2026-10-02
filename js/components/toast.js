/* ==========================================================================
   Toasts — short confirmations of an action ("حُفظت المسودة").
   Announced to screen readers through a polite live region.
   ========================================================================== */

import { fragment, html } from "../core/dom.js";
import { icon } from "./icons.js";

function region() {
  let el = document.querySelector(".toast-region");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast-region";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.append(el);
  }
  return el;
}

/**
 * @param {string} message
 * @param {{ type?: "success"|"error"|"info", duration?: number,
 *           action?: { label: string, onClick: () => void } }} opts
 */
export function toast(message, { type = "success", duration = 3200, action } = {}) {
  const iconName = type === "error" ? "alert" : type === "info" ? "info" : "check";
  const el = fragment(html`
    <div class="toast toast--${type}">
      <span class="toast__icon">${icon(iconName)}</span>
      <span class="toast__msg">${message}</span>
      ${action ? html`<button type="button" class="toast__action">${action.label}</button>` : ""}
    </div>
  `);
  if (action) {
    el.querySelector(".toast__action").addEventListener("click", () => {
      action.onClick();
      dismiss();
    });
  }
  region().append(el);

  let timer = setTimeout(dismiss, duration);
  // Pause while a mouse rests on it; touch screens never "hover", so a
  // toast there always leaves on time and never blocks what's beneath it
  if (window.matchMedia?.("(hover: hover)").matches) {
    el.addEventListener("mouseenter", () => clearTimeout(timer));
    el.addEventListener("mouseleave", () => (timer = setTimeout(dismiss, 1600)));
  }

  function dismiss() {
    clearTimeout(timer);
    el.classList.add("is-leaving");
    setTimeout(() => el.remove(), 260);
  }
  return dismiss;
}
