/* ==========================================================================
   Forms
   Field markup helpers + declarative validation via data-rules:
     data-rules="required|number|min:1|max:500|email|phone|minChecked:1"
   Errors appear under the field, in the interface's voice, and say how to
   fix the problem.
   ========================================================================== */

import { html, raw, $, $$, on, esc, uid } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { formatNumber } from "../core/format.js";
import { icon } from "./icons.js";

/* ==========================================================================
   Markup helpers
   ========================================================================== */

/**
 * Text / number / email / tel / date / select / textarea field.
 * @param {{ name, label, type?, value?, placeholder?, hint?, unit?, optional?,
 *           rules?, inputmode?, options?: {value,label}[], autocomplete?, min?, max?, step?, dir? }} o
 */
export function field(o) {
  const id = `f-${o.name}-${uid(3)}`;
  const hintId = o.hint ? `${id}-hint` : "";
  const rules = o.rules || (o.optional ? "" : "required");
  const common = `id="${id}" name="${esc(o.name)}" data-rules="${esc(rules)}" ${hintId ? `aria-describedby="${hintId}"` : ""} ${o.autocomplete ? `autocomplete="${o.autocomplete}"` : ""}`;
  let control;

  if (o.type === "select") {
    control = `<select class="select" ${common}>
      <option value="">${esc(o.placeholder || "")}</option>
      ${(o.options || []).map((opt) => `<option value="${esc(opt.value)}" ${String(o.value ?? "") === String(opt.value) ? "selected" : ""}>${esc(opt.label)}</option>`).join("")}
    </select>`;
  } else if (o.type === "textarea") {
    control = `<textarea class="textarea" ${common} placeholder="${esc(o.placeholder || "")}" rows="${o.rows || 4}">${esc(o.value ?? "")}</textarea>`;
  } else {
    const type = o.type || "text";
    const attrs = [
      o.inputmode ? `inputmode="${o.inputmode}"` : "",
      o.min !== undefined ? `min="${o.min}"` : "",
      o.max !== undefined ? `max="${o.max}"` : "",
      o.step !== undefined ? `step="${o.step}"` : "",
      o.dir ? `dir="${o.dir}"` : "",
      type === "number" ? 'data-type="number"' : "",
    ].join(" ");
    control = `<input class="input" type="${type}" ${common} ${attrs} value="${esc(o.value ?? "")}" placeholder="${esc(o.placeholder || "")}">`;
    if (o.unit) control = `<div class="input-group">${control}<span class="input-group__unit">${esc(o.unit)}</span></div>`;
  }

  return raw(`
    <div class="field" data-field="${esc(o.name)}">
      <label class="field__label" for="${id}">${esc(o.label)}${o.optional ? `<span class="optional">${esc(t("common.optional"))}</span>` : ""}</label>
      ${control}
      ${o.hint ? `<p class="field__hint" id="${hintId}">${esc(o.hint)}</p>` : ""}
    </div>`);
}

/**
 * A group of choice cards (radio or checkbox).
 * @param {{ name, label, type?: "radio"|"checkbox", options: {value,title,desc?,price?,icon?}[],
 *           value?: string|string[], rules?, hint?, cols?: string }} o
 */
export function choiceGroup(o) {
  const type = o.type || "radio";
  const selected = new Set(Array.isArray(o.value) ? o.value : o.value !== undefined && o.value !== null ? [o.value] : []);
  const rules = o.rules ?? (type === "checkbox" ? "minChecked:1" : "required");
  const legendId = `lg-${o.name}-${uid(3)}`;
  return raw(`
    <fieldset class="field" data-field="${esc(o.name)}" data-group="${esc(o.name)}" data-rules="${esc(rules)}" style="border:0;padding:0;margin:0">
      ${o.label ? `<legend class="field__label" id="${legendId}" style="padding:0;margin-bottom:var(--space-2)">${esc(o.label)}</legend>` : ""}
      ${o.hint ? `<p class="field__hint" style="margin-bottom:var(--space-3)">${esc(o.hint)}</p>` : ""}
      <div class="choice-grid" ${o.cols ? `style="grid-template-columns:${o.cols}"` : ""}>
        ${o.options
          .map(
            (opt) => `
          <label class="choice">
            <input type="${type}" name="${esc(o.name)}" value="${esc(opt.value)}" ${selected.has(opt.value) ? "checked" : ""}>
            <span class="choice__box">
              <span class="choice__mark">${icon("check")}</span>
              <span class="choice__text">
                <span class="choice__title">${esc(opt.title)}</span>
                ${opt.desc ? `<span class="choice__desc">${esc(opt.desc)}</span>` : ""}
              </span>
              ${opt.price ? `<span class="choice__price">${esc(opt.price)}</span>` : ""}
            </span>
          </label>`
          )
          .join("")}
      </div>
    </fieldset>`);
}

/**
 * Numeric stepper (guests, rooms, staff).
 * @param {{ name, label, value?, min?, max?, hint?, unitLabel?: (n) => string }} o
 */
export function stepper(o) {
  const id = `st-${o.name}-${uid(3)}`;
  const min = o.min ?? 0;
  const max = o.max ?? 999;
  const value = o.value ?? min;
  return raw(`
    <div class="field" data-field="${esc(o.name)}">
      <label class="field__label" for="${id}">${esc(o.label)}</label>
      <div class="cluster" style="--cluster-gap:var(--space-4)">
        <div class="stepper" data-stepper data-min="${min}" data-max="${max}">
          <button type="button" class="stepper__btn" data-step="-1" aria-label="${esc(t("stepper.decrease"))}" ${value <= min ? "disabled" : ""}>${icon("minus")}</button>
          <input class="stepper__value num" id="${id}" name="${esc(o.name)}" type="number" inputmode="numeric" data-type="number"
            data-rules="required|number|min:${min}|max:${max}" min="${min}" max="${max}" value="${value}">
          <button type="button" class="stepper__btn" data-step="1" aria-label="${esc(t("stepper.increase"))}" ${value >= max ? "disabled" : ""}>${icon("plus")}</button>
        </div>
        ${o.unitLabel ? `<span class="muted small" data-stepper-label>${esc(o.unitLabel(value))}</span>` : ""}
      </div>
      ${o.hint ? `<p class="field__hint">${esc(o.hint)}</p>` : ""}
    </div>`);
}

/** Wire up every stepper inside root (delegated; safe to call once per page). */
export function initSteppers(root = document, { unitLabel } = {}) {
  const sync = (wrap, input) => {
    const min = Number(wrap.dataset.min);
    const max = Number(wrap.dataset.max);
    const v = Number(input.value);
    wrap.querySelector('[data-step="-1"]').disabled = !(v > min);
    wrap.querySelector('[data-step="1"]').disabled = !(v < max);
    const label = wrap.parentElement.querySelector("[data-stepper-label]");
    if (label && unitLabel) label.textContent = unitLabel(v, input.name);
  };

  on(root, "click", "[data-stepper] [data-step]", (e, btn) => {
    const wrap = btn.closest("[data-stepper]");
    const input = wrap.querySelector("input");
    const min = Number(wrap.dataset.min);
    const max = Number(wrap.dataset.max);
    const next = Math.min(max, Math.max(min, (Number(input.value) || 0) + Number(btn.dataset.step)));
    input.value = next;
    sync(wrap, input);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  on(root, "input", "[data-stepper] input", (e, input) => sync(input.closest("[data-stepper]"), input));
}

/* ==========================================================================
   Validation
   ========================================================================== */

const PHONE_RE = /^05\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Normalise Arabic-Indic digits and spaces in phone/number input. */
export function normaliseDigits(value) {
  return String(value ?? "")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function checkRules(value, rules, { checkedCount } = {}) {
  const list = (rules || "").split("|").filter(Boolean);
  const v = normaliseDigits(value).trim();
  for (const rule of list) {
    const [name, arg] = rule.split(":");
    switch (name) {
      case "required":
        if (checkedCount !== undefined ? checkedCount === 0 : v === "") return checkedCount !== undefined ? t("error.choose") : t("error.required");
        break;
      case "minChecked":
        if ((checkedCount || 0) < Number(arg)) return t("error.choose");
        break;
      case "number":
        if (v !== "" && !Number.isFinite(Number(v))) return t("error.number");
        break;
      case "min":
        if (v !== "" && Number(v) < Number(arg)) return t("error.min", { min: formatNumber(Number(arg)) });
        break;
      case "max":
        if (v !== "" && Number(v) > Number(arg)) return t("error.max", { max: formatNumber(Number(arg)) });
        break;
      case "email":
        if (v !== "" && !EMAIL_RE.test(v)) return t("error.email");
        break;
      case "phone":
        if (v !== "" && !PHONE_RE.test(v.replace(/[\s-]/g, ""))) return t("error.phone");
        break;
      default:
        break;
    }
  }
  return null;
}

export function showError(fieldEl, message) {
  if (!fieldEl) return;
  fieldEl.classList.add("is-invalid");
  fieldEl.classList.remove("is-valid");
  let err = fieldEl.querySelector(":scope > .field__error");
  if (!err) {
    err = document.createElement("p");
    err.className = "field__error";
    err.id = `err-${uid(4)}`;
    fieldEl.append(err);
  }
  err.innerHTML = `${icon("alert", { size: "sm" })}<span>${esc(message)}</span>`;
  $$("input, select, textarea", fieldEl).forEach((c) => {
    c.setAttribute("aria-invalid", "true");
    const ids = new Set((c.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
    ids.add(err.id);
    c.setAttribute("aria-describedby", [...ids].join(" "));
  });
}

export function clearError(fieldEl) {
  if (!fieldEl) return;
  fieldEl.classList.remove("is-invalid");
  const err = fieldEl.querySelector(":scope > .field__error");
  if (err) {
    $$("input, select, textarea", fieldEl).forEach((c) => {
      c.removeAttribute("aria-invalid");
      const ids = (c.getAttribute("aria-describedby") || "").split(" ").filter((x) => x && x !== err.id);
      ids.length ? c.setAttribute("aria-describedby", ids.join(" ")) : c.removeAttribute("aria-describedby");
    });
    err.remove();
  }
}

/** Validate a single .field element. Returns the error message or null. */
export function validateField(fieldEl, extra) {
  if (!fieldEl) return null;
  let message;
  if (fieldEl.dataset.group) {
    const checked = $$(`input[name="${fieldEl.dataset.group}"]:checked`, fieldEl).length;
    message = checkRules("", fieldEl.dataset.rules, { checkedCount: checked });
  } else {
    const control = $("input, select, textarea", fieldEl);
    if (!control) return null;
    message = checkRules(control.value, control.dataset.rules);
  }
  if (!message && extra) message = extra(fieldEl) || null;
  message ? showError(fieldEl, message) : clearError(fieldEl);
  return message;
}

/**
 * Validate every field in a container.
 * @param {HTMLElement} root
 * @param {Record<string, (fieldEl) => string|null>} custom  extra checks by field name
 */
export function validateForm(root, custom = {}) {
  const fields = $$(".field[data-field]", root).filter((f) => f.offsetParent !== null || f.closest("[data-validate-hidden]"));
  let firstInvalid = null;
  fields.forEach((f) => {
    const msg = validateField(f, custom[f.dataset.field]);
    if (msg && !firstInvalid) firstInvalid = f;
  });
  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    const control = $("input, select, textarea", firstInvalid);
    setTimeout(() => control?.focus({ preventScroll: true }), 300);
  }
  return { valid: !firstInvalid, firstInvalid };
}

/** Validate on blur; clear an error as soon as the value becomes valid. */
export function bindLiveValidation(root, custom = {}) {
  root.addEventListener(
    "blur",
    (e) => {
      const f = e.target.closest?.(".field[data-field]");
      if (f && !f.dataset.group && e.target.value !== "") validateField(f, custom[f.dataset.field]);
    },
    true
  );
  const recheck = (e) => {
    const f = e.target.closest?.(".field[data-field]");
    if (f && f.classList.contains("is-invalid")) validateField(f, custom[f.dataset.field]);
  };
  root.addEventListener("input", recheck);
  root.addEventListener("change", recheck);
}

/* ==========================================================================
   Read / write values
   ========================================================================== */

export function readForm(root) {
  const values = {};
  $$("input, select, textarea", root).forEach((c) => {
    if (!c.name || c.type === "file") return;
    if (c.type === "checkbox") {
      if (!Array.isArray(values[c.name])) values[c.name] = [];
      if (c.checked) values[c.name].push(c.value);
    } else if (c.type === "radio") {
      if (c.checked) values[c.name] = c.value;
      else if (!(c.name in values)) values[c.name] = "";
    } else if (c.dataset.type === "number") {
      const v = normaliseDigits(c.value).trim();
      values[c.name] = v === "" ? "" : Number(v);
    } else {
      values[c.name] = c.type === "tel" ? normaliseDigits(c.value).replace(/[\s-]/g, "") : c.value;
    }
  });
  return values;
}

export function fillForm(root, values = {}) {
  Object.entries(values).forEach(([name, value]) => {
    $$(`[name="${CSS.escape(name)}"]`, root).forEach((c) => {
      if (c.type === "checkbox") c.checked = Array.isArray(value) && value.includes(c.value);
      else if (c.type === "radio") c.checked = String(value) === c.value;
      else if (value !== undefined && value !== null) c.value = value;
    });
  });
}

/* ==========================================================================
   Mock uploader
   Files never leave the device. Only names/sizes are saved (for drafts);
   image thumbnails exist for the current session only.
   ========================================================================== */

const fmtSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

/**
 * @param {HTMLElement} el     container
 * @param {{ name, label, accept?, multiple?, initial?: {name,size,type}[],
 *           onChange?: (files) => void, hint? }} o
 */
export function createUploader(el, o) {
  let files = [...(o.initial || [])].map((f) => ({ ...f, id: f.id || uid(5), done: true }));
  const inputId = `up-${o.name}-${uid(3)}`;

  el.innerHTML = String(html`
    <div class="uploader">
      <label class="uploader__drop" for="${inputId}">
        ${icon("upload")}
        <span>${o.label || t("upload.drop")}</span>
        <span class="meta">${o.hint || t("upload.hint")}</span>
        <input id="${inputId}" type="file" ${o.multiple !== false ? "multiple" : ""} accept="${o.accept || ""}">
      </label>
      <ul class="uploader__list" role="list"></ul>
    </div>
  `);

  const list = $(".uploader__list", el);
  const drop = $(".uploader__drop", el);
  const input = $("input", el);

  const emit = () => o.onChange?.(files.filter((f) => f.done).map(({ id, name, size, type }) => ({ id, name, size, type })));

  const render = () => {
    list.innerHTML = files
      .map(
        (f) => `
      <li class="upload-item ${f.done ? "is-done" : ""}" data-id="${f.id}">
        <span class="upload-item__thumb">${f.thumb ? `<img src="${f.thumb}" alt="">` : String(icon(f.type?.startsWith("image") ? "image" : "file"))}</span>
        <span style="min-width:0">
          <span class="upload-item__name" style="display:block">${esc(f.name)}</span>
          <span class="meta">${fmtSize(f.size)}${f.done ? `<span class="visually-hidden">${esc(t("upload.done"))}</span>` : ""}</span>
          <span class="upload-item__bar"><span style="--p:${f.progress ?? 1}"></span></span>
        </span>
        <button type="button" class="upload-item__remove" data-remove aria-label="${esc(t("common.remove"))} ${esc(f.name)}">${icon("close", { size: "sm" })}</button>
      </li>`
      )
      .join("");
  };

  const simulate = (f) => {
    f.progress = 0;
    const tick = () => {
      f.progress = Math.min(1, f.progress + 0.18 + Math.random() * 0.2);
      const bar = list.querySelector(`[data-id="${f.id}"] .upload-item__bar span`);
      if (bar) bar.style.setProperty("--p", f.progress);
      if (f.progress < 1) setTimeout(tick, 160);
      else {
        f.done = true;
        render();
        emit();
      }
    };
    setTimeout(tick, 120);
  };

  const add = (fileList) => {
    Array.from(fileList).forEach((file) => {
      const f = { id: uid(5), name: file.name, size: file.size, type: file.type, done: false };
      if (file.type.startsWith("image/")) f.thumb = URL.createObjectURL(file);
      files.push(f);
      render();
      simulate(f);
    });
  };

  input.addEventListener("change", () => {
    add(input.files);
    input.value = "";
  });
  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("is-dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove("is-dragover")));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files) add(e.dataTransfer.files);
  });
  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    const id = btn.closest("[data-id]").dataset.id;
    files = files.filter((f) => f.id !== id);
    render();
    emit();
  });

  render();
  return {
    get files() {
      return files.filter((f) => f.done);
    },
  };
}
