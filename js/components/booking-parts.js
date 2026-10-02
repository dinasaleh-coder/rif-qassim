/* ==========================================================================
   Booking UI parts shared by the booking page (and any summary elsewhere)
   ========================================================================== */

import { html } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatMoney, formatNumber, formatDate, count } from "../core/format.js";
import { choiceGroup, field } from "./forms.js";

const X = (ar, en) => L({ ar, en });

/** Full price breakdown from a quote (computePackagePrice result). */
export function priceBreakdown(q, { date } = {}) {
  return html`
    <div class="price-breakdown">
      ${q.lines.map(
        (l) => html`<div class="price-line" data-line="${l.id}">
          <span class="price-line__label">${L(l.label)}${l.qty > 1 || l.unit === "person" ? html` <span class="num">× ${formatNumber(l.qty)}</span>` : ""}${l.note ? html`<span class="meta" style="display:block">${L(l.note)}</span>` : ""}</span>
          <span class="price-line__value num">${formatMoney(l.amount)}</span>
        </div>`
      )}
      <div class="price-line"><span class="price-line__label">${X("المجموع قبل الضريبة", "Subtotal before VAT")}</span><span class="price-line__value num">${formatMoney(q.subtotal)}</span></div>
      <div class="price-line"><span class="price-line__label">${X(`ضريبة القيمة المضافة ${Math.round(q.vatRate * 100)}%`, `VAT ${Math.round(q.vatRate * 100)}%`)}</span><span class="price-line__value num">${formatMoney(q.vat, { decimals: q.vat % 1 ? 2 : 0 })}</span></div>
    </div>
    <div class="price-total">
      <span class="price-total__label">${X("الإجمالي", "Total")}${date ? html`<span class="meta" style="display:block">${formatDate(date)}</span>` : ""}</span>
      <span class="price-total__value" data-total>${formatMoney(q.total, { decimals: q.total % 1 ? 2 : 0 })}</span>
    </div>`;
}

export function addOnsGroup(item, value) {
  return choiceGroup({
    name: "addOns",
    label: X("إضافات اختيارية", "Optional add-ons"),
    type: "checkbox",
    rules: "",
    cols: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
    value,
    options: item.addOns.map((a) => ({
      value: a.id,
      title: L(a.title),
      desc: L(a.desc),
      price: `+${formatMoney(a.price)} ${a.unit === "person" ? t("common.perPerson") : t("common.perBooking")}`,
    })),
  });
}

export function contactFields(c = {}) {
  return html`
    ${field({ name: "name", label: X("الاسم الكامل", "Full name"), autocomplete: "name", value: c.name, rules: "required" })}
    ${field({ name: "phone", label: X("رقم الجوال", "Mobile number"), type: "tel", inputmode: "tel", rules: "required|phone", dir: "ltr", placeholder: "05XXXXXXXX", autocomplete: "tel", value: c.phone, hint: X("نرسل تأكيد الحجز على هذا الرقم عند الإطلاق.", "At launch, confirmations go to this number.") })}
    ${field({ name: "email", label: X("البريد الإلكتروني", "Email"), type: "email", rules: "email", optional: true, dir: "ltr", autocomplete: "email", value: c.email })}
    ${field({ name: "notes", label: X("ملاحظات للمضيف", "Notes for the host"), type: "textarea", optional: true, rows: 3, value: c.notes, placeholder: X("حساسية طعام، مناسبة خاصة، احتياج للوصول…", "Food allergies, a special occasion, access needs…") })}`;
}

/** Definition list of a confirmed booking. */
export function bookingDetails(booking, item, destination) {
  return html`
    <dl class="bk-details">
      <div><dt>${X("رقم الحجز", "Reference")}</dt><dd class="ref">${booking.id}</dd></div>
      <div><dt>${X("الوجهة", "Destination")}</dt><dd>${L(destination?.name)}</dd></div>
      <div><dt>${item.kind === "package" ? X("الباقة", "Package") : X("التجربة", "Experience")}</dt><dd>${L(item.title)}</dd></div>
      <div><dt>${X("التاريخ", "Date")}</dt><dd>${formatDate(booking.date)}</dd></div>
      <div><dt>${X("الضيوف", "Guests")}</dt><dd>${count(booking.guests, "guests")}</dd></div>
      ${booking.addOns?.length
        ? html`<div><dt>${X("الإضافات", "Add-ons")}</dt><dd>${booking.addOns.map((id) => L(item.addOns.find((a) => a.id === id)?.title)).join("، ")}</dd></div>`
        : ""}
      <div><dt>${X("الإجمالي شامل الضريبة", "Total incl. VAT")}</dt><dd class="num">${formatMoney(booking.amount, { decimals: booking.amount % 1 ? 2 : 0 })}</dd></div>
    </dl>`;
}
