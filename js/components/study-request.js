/* ==========================================================================
   Rif study request (shared by the report and the owner dashboard)
   One form, one API call (api.requestStudy), one status vocabulary.
   ========================================================================== */

import { html, $ } from "../core/dom.js";
import { L } from "../core/i18n.js";
import { formatDate } from "../core/format.js";
import { field, readForm, validateForm, bindLiveValidation } from "./forms.js";
import { openDrawer } from "./overlay.js";
import { toast } from "./toast.js";
import { icon } from "./icons.js";
import * as api from "../services/api.js";

const X = (ar, en) => L({ ar, en });

export const CONTACT_TIMES = [
  { value: "morning", label: X("صباحًا (٩–١٢)", "Morning (9–12)") },
  { value: "afternoon", label: X("بعد الظهر (١–٤)", "Afternoon (1–4)") },
  { value: "evening", label: X("مساءً (٤–٨)", "Evening (4–8)") },
];
export const contactTimeLabel = (v) => CONTACT_TIMES.find((c) => c.value === v)?.label || "";

/** Study request states, in order. "none" = not requested yet. */
export const STUDY_STATES = [
  { id: "none", label: { ar: "لم يُطلب", en: "Not requested" } },
  { id: "received", label: { ar: "تم الإرسال", en: "Sent" } },
  { id: "reviewing", label: { ar: "قيد المراجعة", en: "Under review" } },
  { id: "contacted", label: { ar: "تم التواصل", en: "Contacted" } },
  { id: "completed", label: { ar: "مكتمل", en: "Completed" } },
];

export const studyStateIndex = (req) => Math.max(0, STUDY_STATES.findIndex((s) => s.id === (req?.status || "none")));

/** The confirmation block shown after a request (dark grounds). */
export function receivedMarkup(req) {
  return html`<div class="rp-received" role="status">
    <span class="rp-received__mark">${icon("check")}</span>
    <h2 class="h2">${X("وصلنا طلبك.", "We received your request.")}</h2>
    <p class="lead" style="color:var(--color-on-dark-muted)">${X("سيتواصل معك فريق ريف لمراجعة البيانات والخطوة التالية.", "The Rif team will contact you to review the details and the next step.")}</p>
    <p>${X("رقم الطلب", "Request reference")}: <span class="ref">${req.id}</span></p>
    <p class="meta" style="color:var(--color-on-dark-muted)">${X("وقت التواصل المفضل", "Preferred contact time")}: ${contactTimeLabel(req.contactTime)}، ${formatDate(req.createdAt.slice(0, 10))}</p>
  </div>`;
}

/**
 * Open the request form.
 * @param {{ answers: object, reference: string, onDone: (req) => void }} o
 */
export function openStudyForm({ answers = {}, reference, onDone }) {
  const { el, close } = openDrawer({
    title: X("اطلب دراسة ريف", "Request a Rif study"),
    body: html`<form class="stack" style="--stack-gap:var(--space-5)" data-study-form novalidate>
      <p class="muted">${X("نراجع التقرير معك، ثم نرتب المعاينة. لا رسوم ولا التزام في هذه المرحلة.", "We review the report with you, then arrange the visit. No fee or commitment at this stage.")}</p>
      ${field({ name: "name", label: X("الاسم", "Name"), autocomplete: "name", value: answers.ownerName || "" })}
      ${field({ name: "phone", label: X("رقم الجوال", "Mobile number"), type: "tel", inputmode: "tel", rules: "required|phone", dir: "ltr", placeholder: "05XXXXXXXX", autocomplete: "tel", value: answers.phone || "" })}
      ${field({ name: "email", label: X("البريد الإلكتروني", "Email"), type: "email", rules: "email", optional: true, dir: "ltr", autocomplete: "email", value: answers.email || "" })}
      ${field({ name: "farm", label: X("المزرعة", "Farm"), value: answers.farmName })}
      ${field({ name: "contactTime", label: X("الوقت المناسب للتواصل", "Best time to contact you"), type: "select", placeholder: X("اختر وقتًا", "Choose a time"), options: CONTACT_TIMES })}
      ${field({ name: "notes", label: X("ملاحظات", "Notes"), type: "textarea", optional: true, rows: 3, placeholder: X("ما الذي يهمك أن تعرفه في الدراسة؟", "What would you most like the study to answer?") })}
    </form>`,
    foot: html`<button type="button" class="btn btn--primary btn--block btn--lg" data-send-study>${X("أرسل الطلب", "Send request")}</button>
      <p class="meta" style="text-align:center;margin-top:var(--space-2)">${X("طلب تجريبي يُحفظ في متصفحك، ويظهر لدى فريق ريف.", "A demo request saved in your browser and shown to the Rif team.")}</p>`,
  });
  const form = $("[data-study-form]", el);
  bindLiveValidation(form);
  $("[data-send-study]", el).addEventListener("click", async (e) => {
    if (!validateForm(form).valid) return;
    const btn = e.currentTarget;
    btn.classList.add("is-loading");
    try {
      const req = await api.requestStudy({ ...readForm(form), assessmentRef: reference });
      close();
      toast(X(`وصلنا طلبك ${req.id}.`, `Request ${req.id} received.`));
      onDone?.(req);
    } catch {
      toast(X("تعذّر إرسال الطلب. أعد المحاولة.", "Couldn't send the request. Try again."), { type: "error" });
    } finally {
      btn.classList.remove("is-loading");
    }
  });
}
