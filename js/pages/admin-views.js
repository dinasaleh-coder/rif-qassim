/* ==========================================================================
   RIF OS — bookings, content, people, analytics, settings
   Reads the same lists the public site writes; edits go through the API
   into the shared store (no second admin data layer).
   ========================================================================== */

import { html, raw, mount, $, $$, on, debounce } from "../core/dom.js";
import { L, t, getLang, setLang } from "../core/i18n.js";
import { formatNumber, formatDate, formatMoney, formatCompact, formatPercent, count } from "../core/format.js";
import { route } from "../core/paths.js";
import { store } from "../core/store.js";
import { icon } from "../components/icons.js";
import { renderMedia } from "../components/media.js";
import { openDrawer, confirmDialog } from "../components/overlay.js";
import { toast } from "../components/toast.js";
import { field, readForm } from "../components/forms.js";
import { computePackagePrice } from "../services/pricing.js";
import { getBookable } from "../services/bookable.js";
import { bookingSummary, byMonth, rank, addOnUptake, pipelineCounts, studyCounts, vatOf } from "../services/analytics.js";
import { DESTINATIONS, DESTINATION_TYPES, getDestinationById } from "../data/destinations.js";
import { EXPERIENCES, EXPERIENCE_CATEGORIES } from "../data/experiences.js";
import { PACKAGES, VAT_RATE } from "../data/packages.js";
import { packageBreakdown } from "../data/prices.js";
import { OWNERS, PIPELINE_STAGES } from "../data/farms.js";
import * as api from "../services/api.js";
import { X, EST, viewHead, load, empty, selectMarkup, searchBox, chip, keepSearch, stageLabel, stageTone, scoreClass, STUDY_STATUS } from "./admin-common.js";

const BOOKING_STATUS = ["confirmed", "pending", "completed", "cancelled"].map((id) => ({ id, label: { ar: t(`status.${id}`), en: t(`status.${id}`) } }));
const overrides = (kind) => store.get("contentOverrides")?.[kind] || {};

/* ==========================================================================
   Bookings
   ========================================================================== */

export async function viewBookings(el, { refreshCounts, param }) {
  const state = { status: "all", dest: "all", q: param || "" }; // #bookings/<reference>
  await load(el, async () => {
    let list = await api.listBookings();
    const render = () => {
      const q = state.q.trim().toLowerCase();
      const shown = list
        .filter((b) => state.status === "all" || b.status === state.status)
        .filter((b) => state.dest === "all" || b.destinationId === state.dest)
        .filter((b) => !q || `${b.id} ${b.customer} ${L(b.packageTitle)}`.toLowerCase().includes(q));
      const sum = bookingSummary(shown);
      const statusCounts = Object.fromEntries(BOOKING_STATUS.map((s) => [s.id, list.filter((b) => b.status === s.id).length]));
      mount(
        el,
        html`${viewHead({ title: X("الحجوزات", "Bookings"), desc: X("حجوزات الموقع العام (المحفوظة في هذا المتصفح) مع البيانات الأولية. المبالغ من محرك التسعير نفسه، شاملة ضريبة ١٥٪.", "Public-site bookings (saved in this browser) plus seed data. Amounts come from the same pricing engine, including 15% VAT.") })}
        <div class="ad-tools">
          ${searchBox(X("ابحث بالمرجع أو العميل أو الباقة", "Search reference, customer or package"), state.q)}
          <select class="select" data-dest aria-label="${X("الوجهة", "Destination")}"><option value="all">${X("كل الوجهات", "All destinations")}</option>${DESTINATIONS.filter((d) => d.status !== "soon").map((d) => html`<option value="${d.id}" ${state.dest === d.id ? "selected" : ""}>${L(d.name)}</option>`)}</select>
          <div class="chips">${chip("all", X("الكل", "All"), list.length, state.status === "all")}${BOOKING_STATUS.map((s) => chip(s.id, L(s.label), statusCounts[s.id], state.status === s.id))}</div>
        </div>
        <p class="meta" style="margin-bottom:var(--space-3)">${X(`${formatNumber(shown.length)} حجز، إيراد قائم ${formatMoney(sum.gross)} منها ضريبة ${formatMoney(sum.vat)}`, `${shown.length} bookings, live revenue ${formatMoney(sum.gross)} incl. VAT ${formatMoney(sum.vat)}`)} <span class="est">${EST()}</span></p>
        ${shown.length
          ? html`<div class="table-wrap"><table class="table ad-table table--stack">
            <thead><tr><th>${X("المرجع", "Reference")}</th><th>${X("العميل", "Customer")}</th><th>${X("الوجهة", "Destination")}</th><th>${X("الباقة أو التجربة", "Package / experience")}</th><th>${X("التاريخ", "Date")}</th><th>${X("الضيوف", "Guests")}</th><th>${X("الإضافات", "Add-ons")}</th><th>${X("الإجمالي", "Total")}</th><th>${X("الضريبة", "VAT")}</th><th>${X("الحالة", "Status")}</th></tr></thead>
            <tbody>${shown.map((b) => html`<tr class="${b.isUserCreated ? "is-mine" : ""}">
              <td class="cell--primary"><button type="button" class="btn btn--link ref" data-booking="${b.id}">${b.id}</button>${b.isUserCreated ? html` <span class="ad-mine">${X("من الموقع، هذا المتصفح", "Site, this browser")}</span>` : ""}</td>
              <td data-label="${X("العميل", "Customer")}">${b.customer}</td>
              <td data-label="${X("الوجهة", "Destination")}">${L(b.destinationName)}</td>
              <td data-label="${X("الباقة", "Package")}">${L(b.packageTitle)}</td>
              <td data-label="${X("التاريخ", "Date")}">${formatDate(b.date, { day: "numeric", month: "short" })}</td>
              <td data-label="${X("الضيوف", "Guests")}" class="num">${formatNumber(b.guests)}</td>
              <td data-label="${X("الإضافات", "Add-ons")}">${(b.addOns || []).length ? formatNumber(b.addOns.length) : "—"}</td>
              <td data-label="${X("الإجمالي", "Total")}" class="num">${formatMoney(b.amount, { decimals: b.amount % 1 ? 2 : 0 })}</td>
              <td data-label="${X("الضريبة", "VAT")}" class="num">${formatMoney(vatOf(b.amount), { decimals: 2 })}</td>
              <td data-label="${X("الحالة", "Status")}" class="cell--action">${selectMarkup({ options: BOOKING_STATUS, value: b.status, attrs: raw(`data-bstatus="${b.id}"`), label: X(`حالة ${b.id}`, `Status of ${b.id}`) })}</td>
            </tr>`)}</tbody></table></div>`
          : empty(t("empty.bookings.title"), X("غيّر التصفية، أو أنشئ حجزًا من الموقع العام.", "Change the filters, or make a booking on the public site."))}`
      );
    };
    render();
    on(el, "click", "[data-filter]", (e, b) => { state.status = b.dataset.filter; render(); });
    on(el, "change", "[data-dest]", (e, s) => { state.dest = s.value; render(); });
    el.addEventListener("input", debounce((e) => { if (e.target.matches("[data-q]")) { state.q = e.target.value; keepSearch(el, render); } }, 200));
    on(el, "change", "[data-bstatus]", async (e, s) => {
      await api.updateBookingStatus(s.dataset.bstatus, s.value);
      list = await api.listBookings();
      toast(X(`حُدّثت حالة ${s.dataset.bstatus}.`, `${s.dataset.bstatus} updated.`));
      refreshCounts();
      render();
    });
    on(el, "click", "[data-booking]", (e, btn) => openBooking(list.find((b) => b.id === btn.dataset.booking)));
  });
}

function openBooking(b) {
  const item = getBookable(b.packageId, { includeInactive: true });
  const q = item ? computePackagePrice(item, { guests: b.guests, addOns: b.addOns }) : null;
  openDrawer({
    title: b.id,
    body: html`<div class="stack" style="--stack-gap:var(--space-5)">
      <dl class="ad-kv">
        <div><dt>${X("العميل", "Customer")}</dt><dd>${b.customer}${b.city ? `، ${b.city}` : ""}</dd></div>
        <div><dt>${X("الوجهة", "Destination")}</dt><dd>${L(b.destinationName)}</dd></div>
        <div><dt>${X("الباقة أو التجربة", "Package / experience")}</dt><dd>${L(b.packageTitle)}</dd></div>
        <div><dt>${X("التاريخ", "Date")}</dt><dd>${formatDate(b.date)}</dd></div>
        <div><dt>${X("الضيوف", "Guests")}</dt><dd>${count(b.guests, "guests")}</dd></div>
        <div><dt>${X("أُنشئ", "Created")}</dt><dd>${formatDate(b.createdAt)}</dd></div>
        <div><dt>${X("المصدر", "Source")}</dt><dd>${b.isUserCreated ? X("الموقع العام في هذا المتصفح (تجريبي)", "Public site in this browser (demo)") : b.channel === "phone" ? X("هاتف (بيانات أولية)", "Phone (seed data)") : X("الموقع (بيانات أولية)", "Website (seed data)")}</dd></div>
        <div><dt>${X("الحالة", "Status")}</dt><dd><span class="status status--${b.status}">${t(`status.${b.status}`)}</span></dd></div>
        ${b.notes ? html`<div style="grid-column:1/-1"><dt>${X("ملاحظات الضيف", "Guest notes")}</dt><dd>${b.notes}</dd></div>` : ""}
      </dl>
      ${q ? html`<div class="price-breakdown">${q.lines.map((l) => html`<div class="price-line"><span class="price-line__label">${L(l.label)} × ${formatNumber(l.qty)}</span><span class="price-line__value num">${formatMoney(l.amount)}</span></div>`)}
        <div class="price-line"><span class="price-line__label">${X("ضريبة القيمة المضافة ١٥٪", "VAT 15%")}</span><span class="price-line__value num">${formatMoney(q.vat, { decimals: 2 })}</span></div></div>
        <div class="price-total"><span class="price-total__label">${X("الإجمالي", "Total")}</span><span class="price-total__value">${formatMoney(b.amount, { decimals: b.amount % 1 ? 2 : 0 })}</span></div>` : ""}
      <p class="meta">${X("حجز تجريبي، لم تتم أي عملية دفع.", "Demo booking. No payment was made.")}</p>
    </div>`,
  });
}

/* ==========================================================================
   Content: destinations, experiences, packages
   ========================================================================== */

function editTextDrawer({ title, value, onSave, onReset }) {
  const { el, close } = openDrawer({
    title,
    body: html`<form class="stack" style="--stack-gap:var(--space-5)" data-edit novalidate>
      <p class="muted small">${X("تعديل تجريبي يُحفظ في هذا المتصفح ويظهر في الموقع العام. لا يُعدّل الملفات الأصلية.", "A demo edit saved in this browser and shown on the public site. The source files aren't changed.")}</p>
      ${field({ name: "ar", label: X("النص بالعربية", "Arabic text"), type: "textarea", rows: 4, value: value?.ar || "" })}
      ${field({ name: "en", label: X("النص بالإنجليزية", "English text"), type: "textarea", rows: 4, value: value?.en || "", dir: "ltr" })}
    </form>`,
    foot: html`<div class="cluster" style="justify-content:space-between"><button type="button" class="btn btn--ghost btn--sm" data-reset-edit>${X("استعد النص الأصلي", "Restore original")}</button><button type="button" class="btn btn--primary" data-save-edit>${t("common.save")}</button></div>`,
  });
  $("[data-save-edit]", el).addEventListener("click", async () => {
    const v = readForm($("[data-edit]", el));
    if (!v.ar.trim()) return toast(X("النص العربي مطلوب.", "Arabic text is required."), { type: "error" });
    await onSave({ ar: v.ar.trim(), en: v.en.trim() || v.ar.trim() });
    close();
  });
  $("[data-reset-edit]", el).addEventListener("click", async () => {
    await onReset();
    close();
  });
}

const DEST_STATUS = [
  { id: "open", label: { ar: "متاح", en: "Open" } },
  { id: "limited", label: { ar: "أماكن محدودة", en: "Limited" } },
  { id: "season", label: { ar: "موسمي", en: "Seasonal" } },
  { id: "soon", label: { ar: "قريبًا", en: "Coming soon" } },
];

export async function viewDestinations(el) {
  const state = { status: "all", q: "" };
  await load(el, async () => {
    const bookings = await api.listBookings();
    const byDest = rank(bookings, "destinationId");
    const render = () => {
      const ov = overrides("destinations");
      const rows = DESTINATIONS.map((d) => ({ ...d, status: ov[d.id]?.status || d.status, short: ov[d.id]?.text || d.short, edited: !!ov[d.id] }));
      const q = state.q.trim();
      const shown = rows.filter((d) => state.status === "all" || d.status === state.status).filter((d) => !q || `${L(d.name)} ${L(d.town)}`.includes(q));
      mount(
        el,
        html`${viewHead({ title: X("الوجهات", "Destinations"), desc: X("الحالة والوصف القصير يظهران فورًا في صفحات الوجهات والبطاقات.", "Status and the short description show immediately on destination pages and cards.") })}
        <div class="ad-tools">${searchBox(X("ابحث بالوجهة أو المدينة", "Search destination or town"), state.q)}<div class="chips">${chip("all", X("الكل", "All"), rows.length, state.status === "all")}${DEST_STATUS.map((s) => chip(s.id, L(s.label), rows.filter((d) => d.status === s.id).length, state.status === s.id))}</div></div>
        ${shown.length ? html`<div class="table-wrap"><table class="table ad-table table--stack">
          <thead><tr><th></th><th>${X("الوجهة", "Destination")}</th><th>${X("النوع", "Type")}</th><th>${X("التجارب والباقات", "Experiences & packages")}</th><th>${X("الحجوزات", "Bookings")}</th><th>${X("الإيراد", "Revenue")}</th><th>${X("الحالة", "Status")}</th><th></th></tr></thead>
          <tbody>${shown.map((d) => {
            const r = byDest.find((x) => x.id === d.id);
            return html`<tr>
              <td class="hide-mobile"><div class="ad-thumb">${renderMedia(d.media.card, { label: false })}</div></td>
              <td class="cell--primary"><a class="ad-open" href="${route("destination", { id: d.id })}" target="_blank" rel="noopener">${L(d.name)}</a> <span class="muted">${L(d.town)}</span>${d.edited ? html` <span class="ad-mine">${X("معدّل", "edited")}</span>` : ""}<br><span class="meta">${L(d.short)}</span></td>
              <td data-label="${X("النوع", "Type")}">${L(DESTINATION_TYPES[d.type])}</td>
              <td data-label="${X("التجارب والباقات", "Exp. & packages")}" class="num">${formatNumber(d.experiences.length)} / ${formatNumber(d.packages.length)}</td>
              <td data-label="${X("الحجوزات", "Bookings")}" class="num">${formatNumber(r?.count || 0)}</td>
              <td data-label="${X("الإيراد", "Revenue")}" class="num">${formatMoney(r?.gross || 0, { compact: true })}</td>
              <td data-label="${X("الحالة", "Status")}">${selectMarkup({ options: DEST_STATUS, value: d.status, attrs: raw(`data-dstatus="${d.id}"`), label: X("حالة الوجهة", "Destination status") })}</td>
              <td class="cell--action"><button type="button" class="btn btn--secondary btn--sm" data-edit-dest="${d.id}">${icon("edit", { size: "sm" })} ${X("الوصف", "Text")}</button></td>
            </tr>`;
          })}</tbody></table></div>` : empty(t("empty.destinations.title"), t("empty.destinations.text"))}
        <p class="meta">${X("الإيراد شامل الضريبة، من الحجوزات القائمة.", "Revenue incl. VAT, from live bookings.")} <span class="est">${EST()}</span></p>`
      );
    };
    render();
    on(el, "click", "[data-filter]", (e, b) => { state.status = b.dataset.filter; render(); });
    el.addEventListener("input", debounce((e) => { if (e.target.matches("[data-q]")) { state.q = e.target.value; keepSearch(el, render); } }, 200));
    on(el, "change", "[data-dstatus]", async (e, s) => {
      await api.updateContent("destinations", s.dataset.dstatus, { status: s.value });
      toast(X("حُدّثت حالة الوجهة في الموقع العام.", "Destination status updated on the public site."));
      render();
    });
    on(el, "click", "[data-edit-dest]", (e, b) => {
      const d = DESTINATIONS.find((x) => x.id === b.dataset.editDest);
      editTextDrawer({
        title: X(`وصف ${d.name.ar}`, `${d.name.en} text`),
        value: overrides("destinations")[d.id]?.text || d.short,
        onSave: async (text) => { await api.updateContent("destinations", d.id, { text }); toast(X("حُفظ الوصف.", "Text saved.")); render(); },
        onReset: async () => { await api.updateContent("destinations", d.id, { text: null }); toast(X("استُعيد النص الأصلي.", "Original text restored.")); render(); },
      });
    });
  });
}

function activeToggle(kind, id, active) {
  return html`<label class="ad-toggle"><input type="checkbox" data-active="${kind}:${id}" ${active ? "checked" : ""}><span>${active ? X("متاح للحجز", "Bookable") : X("موقوف", "Paused")}</span></label>`;
}

export async function viewExperiences(el) {
  const state = { cat: "all", q: "" };
  await load(el, async () => {
    const bookings = await api.listBookings();
    const counts = rank(bookings, "packageId");
    const render = () => {
      const ov = overrides("experiences");
      const q = state.q.trim();
      const shown = EXPERIENCES.filter((e) => state.cat === "all" || e.category === state.cat).filter((e) => !q || `${L(e.title)} ${L(getDestinationById(e.destinationId)?.name)}`.includes(q));
      mount(
        el,
        html`${viewHead({ title: X("التجارب", "Experiences"), desc: X("إيقاف تجربة يخفيها من الموقع ويمنع حجزها الجديد؛ الحجوزات القائمة لا تتأثر.", "Pausing an experience hides it on the site and stops new bookings; existing bookings aren't affected.") })}
        <div class="ad-tools">${searchBox(X("ابحث بالتجربة أو الوجهة", "Search experience or destination"), state.q)}<div class="chips">${chip("all", X("الكل", "All"), EXPERIENCES.length, state.cat === "all")}${EXPERIENCE_CATEGORIES.filter((c) => c.id !== "package").map((c) => chip(c.id, L(c.label), EXPERIENCES.filter((e) => e.category === c.id).length, state.cat === c.id))}</div></div>
        ${shown.length ? html`<div class="table-wrap"><table class="table ad-table table--stack">
          <thead><tr><th></th><th>${X("التجربة", "Experience")}</th><th>${X("الوجهة", "Destination")}</th><th>${X("السعر", "Price")}</th><th>${X("الحجوزات", "Bookings")}</th><th>${X("الإتاحة", "Availability")}</th><th></th></tr></thead>
          <tbody>${shown.map((e) => {
            const o = ov[e.id] || {};
            const active = o.active !== false;
            return html`<tr>
              <td class="hide-mobile"><div class="ad-thumb">${renderMedia(e.media, { label: false })}</div></td>
              <td class="cell--primary">${L(e.title)} <span class="muted">${L(EXPERIENCE_CATEGORIES.find((c) => c.id === e.category)?.label)}</span>${o.text ? html` <span class="ad-mine">${X("معدّل", "edited")}</span>` : ""}<br><span class="meta">${L(o.text || e.desc)}</span></td>
              <td data-label="${X("الوجهة", "Destination")}">${L(getDestinationById(e.destinationId)?.name)}</td>
              <td data-label="${X("السعر", "Price")}" class="num">${formatMoney(e.price)}</td>
              <td data-label="${X("الحجوزات", "Bookings")}" class="num">${formatNumber(counts.find((c) => c.id === e.id)?.count || 0)}</td>
              <td data-label="${X("الإتاحة", "Availability")}">${e.priceUnit === "item" ? html`<span class="muted small">${X("منتج يُستلم عند الزيارة", "Product, collected on visit")}</span>` : activeToggle("experiences", e.id, active)}</td>
              <td class="cell--action"><button type="button" class="btn btn--secondary btn--sm" data-edit-exp="${e.id}">${icon("edit", { size: "sm" })} ${X("الوصف", "Text")}</button></td>
            </tr>`;
          })}</tbody></table></div>` : empty(t("empty.experiences.title"), t("empty.experiences.text"))}`
      );
    };
    render();
    on(el, "click", "[data-filter]", (e, b) => { state.cat = b.dataset.filter; render(); });
    el.addEventListener("input", debounce((e) => { if (e.target.matches("[data-q]")) { state.q = e.target.value; keepSearch(el, render); } }, 200));
    wireActive(el, render);
    on(el, "click", "[data-edit-exp]", (e, b) => {
      const ex = EXPERIENCES.find((x) => x.id === b.dataset.editExp);
      editTextDrawer({
        title: L(ex.title),
        value: overrides("experiences")[ex.id]?.text || ex.desc,
        onSave: async (text) => { await api.updateContent("experiences", ex.id, { text }); toast(X("حُفظ الوصف.", "Text saved.")); render(); },
        onReset: async () => { await api.updateContent("experiences", ex.id, { text: null }); toast(X("استُعيد النص الأصلي.", "Original text restored.")); render(); },
      });
    });
  });
}

function wireActive(el, render) {
  on(el, "change", "[data-active]", async (e, input) => {
    const [kind, id] = input.dataset.active.split(":");
    await api.updateContent(kind, id, { active: input.checked });
    toast(input.checked ? X("عاد متاحًا للحجز في الموقع.", "Bookable on the site again.") : X("أُوقف: لم يعد يظهر في الموقع ولا يُحجز.", "Paused: hidden on the site and not bookable."));
    render();
  });
}

/* How the package price is built from its components (prices.js) */
function traceLine(id) {
  const b = packageBreakdown(id);
  const who = b.model === "person" ? X("للشخص", "per person") : X(`لـ ${formatNumber(b.guests)} ضيوف`, `for ${b.guests} guests`);
  if (b.untraced) return html`<br><span class="meta">${X("مكونات بلا قيمة في النموذج: يحتاج تحقق تشغيلي", "Components without a model value: needs operational validation")}</span>`;
  const diff = b.difference;
  return html`<br><span class="meta">${X("مجموع المكونات", "Components")} ${formatMoney(b.componentsTotal)} ${who}، ${diff <= 0 ? X(`خصم الباقة ${formatMoney(-diff)}`, `bundle saving ${formatMoney(-diff)}`) : X(`أعلى من المكونات بـ ${formatMoney(diff)}`, `${formatMoney(diff)} above components`)}</span>`;
}

export async function viewPackages(el) {
  await load(el, async () => {
    const bookings = await api.listBookings();
    const perf = rank(bookings, "packageId");
    const uptake = addOnUptake(bookings);
    const render = () => {
      const ov = overrides("packages");
      mount(
        el,
        html`${viewHead({ title: X("الباقات", "Packages"), desc: X("الأداء من الحجوزات القائمة. الأسعار ثابتة في النموذج حتى لا تتغير قيم الحجوزات السابقة.", "Performance from live bookings. Prices are fixed in the prototype so past booking values don't change.") })}
        <div class="table-wrap"><table class="table ad-table table--stack">
          <thead><tr><th>${X("الباقة", "Package")}</th><th>${X("الوجهة", "Destination")}</th><th>${X("السعر الأساسي", "Base price")}</th><th>${X("الحجوزات", "Bookings")}</th><th>${X("الضيوف", "Guests")}</th><th>${X("الإيراد", "Revenue")}</th><th>${X("متوسط الحجز", "Avg booking")}</th><th>${X("حجوزات بإضافات", "With add-ons")}</th><th>${X("الإتاحة", "Availability")}</th><th></th></tr></thead>
          <tbody>${PACKAGES.map((p) => {
            const r = perf.find((x) => x.id === p.id);
            const o = ov[p.id] || {};
            const top = p.addOns.map((a) => [a, uptake[a.id] || 0]).sort((a, b) => b[1] - a[1])[0];
            return html`<tr>
              <td class="cell--primary">${L(p.title)}${o.text ? html` <span class="ad-mine">${X("معدّل", "edited")}</span>` : ""}${traceLine(p.id)}${top && top[1] ? html`<br><span class="meta">${X("الإضافة الأكثر طلبًا", "Top add-on")}: ${L(top[0].title)} (${formatNumber(top[1])})</span>` : ""}</td>
              <td data-label="${X("الوجهة", "Destination")}">${L(getDestinationById(p.destinationId)?.name)}</td>
              <td data-label="${X("السعر", "Price")}" class="num">${formatMoney(p.pricing.basePrice)} <span class="muted">${p.pricing.model === "person" ? t("common.perPerson") : t("common.perBooking")}</span></td>
              <td data-label="${X("الحجوزات", "Bookings")}" class="num">${formatNumber(r?.count || 0)}</td>
              <td data-label="${X("الضيوف", "Guests")}" class="num">${formatNumber(r?.guests || 0)}</td>
              <td data-label="${X("الإيراد", "Revenue")}" class="num">${formatMoney(r?.gross || 0, { compact: true })}</td>
              <td data-label="${X("المتوسط", "Avg")}" class="num">${r ? formatMoney(r.gross / r.count) : "—"}</td>
              <td data-label="${X("بإضافات", "Add-ons")}" class="num">${r ? formatPercent(r.addOnRate) : "—"}</td>
              <td data-label="${X("الإتاحة", "Availability")}">${activeToggle("packages", p.id, o.active !== false)}</td>
              <td class="cell--action"><button type="button" class="btn btn--secondary btn--sm" data-edit-pkg="${p.id}">${icon("edit", { size: "sm" })} ${X("الملخص", "Summary")}</button></td>
            </tr>`;
          })}</tbody></table></div>
        <p class="meta">${X("الإيراد شامل الضريبة.", "Revenue incl. VAT.")} <span class="est">${EST()}</span></p>`
      );
    };
    render();
    wireActive(el, render);
    on(el, "click", "[data-edit-pkg]", (e, b) => {
      const p = PACKAGES.find((x) => x.id === b.dataset.editPkg);
      editTextDrawer({
        title: L(p.title),
        value: overrides("packages")[p.id]?.text || p.summary,
        onSave: async (text) => { await api.updateContent("packages", p.id, { text }); toast(X("حُفظ الملخص.", "Summary saved.")); render(); },
        onReset: async () => { await api.updateContent("packages", p.id, { text: null }); toast(X("استُعيد النص الأصلي.", "Original text restored.")); render(); },
      });
    });
  });
}

/* ==========================================================================
   Customers & owners
   ========================================================================== */

export async function viewPeople(el, { param }) {
  const state = { tab: param === "owners" ? "owners" : "customers", q: "" };
  await load(el, async () => {
    const [bookings, farms] = await Promise.all([api.listBookings(), api.listFarms()]);
    const customers = Object.values(
      bookings.reduce((acc, b) => {
        const c = (acc[b.customer] ||= { name: b.customer, city: b.city, bookings: 0, guests: 0, spend: 0, last: "", mine: false });
        c.bookings += 1;
        if (b.status !== "cancelled") {
          c.guests += b.guests;
          c.spend += b.amount;
        }
        c.last = b.date > c.last ? b.date : c.last;
        c.mine ||= !!b.isUserCreated;
        return acc;
      }, {})
    ).sort((a, b) => b.spend - a.spend);
    const owners = [
      ...farms.filter((f) => f.isUserSubmitted).map((f) => ({ name: L(f.ownerName), city: f.city, farms: [f], since: f.submittedAt, mine: true })),
      ...OWNERS.map((o) => ({ name: L(o.name), city: o.city, farms: farms.filter((f) => f.ownerId === o.id), since: o.since, mine: false })),
    ];
    const render = () => {
      const q = state.q.trim();
      const tab = (id, label, n) => html`<button type="button" class="segmented__btn" data-tab="${id}" aria-pressed="${state.tab === id}">${label} (${formatNumber(n)})</button>`;
      mount(
        el,
        html`${viewHead({ title: X("العملاء والملاك", "Customers & owners"), desc: X("العملاء من الحجوزات، والملاك من مسار المزارع. لا تُعرض بيانات تواصل كاملة.", "Customers from bookings, owners from the farm pipeline. Full contact details aren't shown.") })}
        <div class="ad-tools"><div class="segmented" role="group">${tab("customers", X("العملاء", "Customers"), customers.length)}${tab("owners", X("الملاك", "Owners"), owners.length)}</div>${searchBox(X("ابحث بالاسم أو المدينة", "Search name or town"), state.q)}</div>
        ${state.tab === "customers"
          ? html`<div class="table-wrap"><table class="table ad-table table--stack">
              <thead><tr><th>${X("العميل", "Customer")}</th><th>${X("المدينة", "Town")}</th><th>${X("الحجوزات", "Bookings")}</th><th>${X("الضيوف", "Guests")}</th><th>${X("الإنفاق", "Spend")}</th><th>${X("آخر زيارة", "Last visit")}</th></tr></thead>
              <tbody>${customers.filter((c) => !q || `${c.name} ${c.city}`.includes(q)).map((c) => html`<tr class="${c.mine ? "is-mine" : ""}">
                <td class="cell--primary">${c.name}${c.mine ? html` <span class="ad-mine">${X("هذا المتصفح", "this browser")}</span>` : ""}</td>
                <td data-label="${X("المدينة", "Town")}">${c.city || "—"}</td>
                <td data-label="${X("الحجوزات", "Bookings")}" class="num">${formatNumber(c.bookings)}</td>
                <td data-label="${X("الضيوف", "Guests")}" class="num">${formatNumber(c.guests)}</td>
                <td data-label="${X("الإنفاق", "Spend")}" class="num">${formatMoney(c.spend)}</td>
                <td data-label="${X("آخر زيارة", "Last visit")}">${formatDate(c.last, { day: "numeric", month: "short" })}</td>
              </tr>`)}</tbody></table></div>`
          : html`<div class="table-wrap"><table class="table ad-table table--stack">
              <thead><tr><th>${X("المالك", "Owner")}</th><th>${X("المدينة", "Town")}</th><th>${X("المزرعة", "Farm")}</th><th>${X("الجاهزية", "Readiness")}</th><th>${X("المرحلة", "Stage")}</th><th>${X("منذ", "Since")}</th></tr></thead>
              <tbody>${owners.filter((o) => !q || `${o.name} ${o.city}`.includes(q)).map((o) => html`<tr class="${o.mine ? "is-mine" : ""}">
                <td class="cell--primary">${o.name}${o.mine ? html` <span class="ad-mine">${X("من البوابة", "portal")}</span>` : ""}</td>
                <td data-label="${X("المدينة", "Town")}">${o.city}</td>
                <td data-label="${X("المزرعة", "Farm")}">${o.farms.length ? o.farms.map((f) => html`<a class="ad-open" href="#farm/${f.id}">${L(f.name)}</a>`) : "—"}</td>
                <td data-label="${X("الجاهزية", "Readiness")}">${o.farms[0] ? html`<span class="ad-score ${scoreClass(o.farms[0].score)}">${formatNumber(o.farms[0].score)}</span>` : "—"}</td>
                <td data-label="${X("المرحلة", "Stage")}">${o.farms[0] ? stageLabel(o.farms[0].stage) : "—"}</td>
                <td data-label="${X("منذ", "Since")}">${formatDate(o.since, { month: "short", year: "numeric" })}</td>
              </tr>`)}</tbody></table></div>`}`
      );
    };
    render();
    on(el, "click", "[data-tab]", (e, b) => { state.tab = b.dataset.tab; render(); });
    el.addEventListener("input", debounce((e) => { if (e.target.matches("[data-q]")) { state.q = e.target.value; keepSearch(el, render); } }, 200));
  });
}

/* ==========================================================================
   Analytics
   ========================================================================== */

const rankList = (rows, label, value, note) => {
  const max = Math.max(1, ...rows.map(value));
  return html`<ol class="ad-rank" role="list">${rows.map((r) => html`<li>
    <div class="ad-rank__top"><span>${label(r)}</span><span class="num">${note(r)}</span></div>
    <span class="ad-rank__bar" aria-hidden="true"><span style="--v:${value(r) / max}"></span></span>
  </li>`)}</ol>`;
};

export async function viewAnalytics(el) {
  await load(el, async () => {
    const [bookings, farms, studies] = await Promise.all([api.listBookings(), api.listFarms(), api.listStudyRequests()]);
    const sum = bookingSummary(bookings);
    const months = byMonth(bookings);
    const dests = rank(bookings, "destinationId");
    const items = rank(bookings, "packageId");
    const pc = pipelineCounts(farms);
    const sc = studyCounts(studies);
    const avgScore = farms.reduce((s, f) => s + f.score, 0) / Math.max(1, farms.length);
    mount(
      el,
      html`${viewHead({ title: X("التحليلات", "Analytics"), desc: X("أرقام فعلية من بيانات النموذج المشتركة. الأرقام المالية تقديرية ومحاكاة.", "Actual values from the prototype's shared data. Financial figures are simulated estimates.") })}
      <section class="ad-section">
        <div class="ad-section__head"><h2>${X("الحجوزات والإيراد", "Bookings & revenue")}</h2><span class="est">${EST()}</span></div>
        <div class="ad-figs">
          <div class="ad-fig"><span class="ad-fig__v">${formatNumber(sum.count)}</span><span class="ad-fig__l">${X("حجوزات قائمة", "Live bookings")}</span><span class="ad-fig__n">${X(`من ${formatNumber(sum.all)} إجمالًا`, `of ${sum.all} total`)}</span></div>
          <div class="ad-fig"><span class="ad-fig__v">${formatCompact(sum.gross)}</span><span class="ad-fig__l">${X("الإيراد شامل الضريبة", "Revenue incl. VAT")}</span></div>
          <div class="ad-fig"><span class="ad-fig__v">${formatCompact(sum.vat)}</span><span class="ad-fig__l">${X(`ضريبة القيمة المضافة ${formatNumber(VAT_RATE * 100)}٪`, `VAT ${VAT_RATE * 100}%`)}</span></div>
          <div class="ad-fig"><span class="ad-fig__v">${formatCompact(sum.net)}</span><span class="ad-fig__l">${X("الإيراد قبل الضريبة", "Revenue before VAT")}</span></div>
          <div class="ad-fig"><span class="ad-fig__v">${formatMoney(sum.avgValue)}</span><span class="ad-fig__l">${X("متوسط قيمة الحجز", "Average booking")}</span></div>
        </div>
      </section>
      <div class="ad-cols ad-cols--even">
        <section class="ad-section">
          <div class="ad-section__head"><h2>${X("حجم الحجوزات حسب شهر الزيارة", "Booking volume by month of visit")}</h2></div>
          ${rankList(months, (m) => formatDate(`${m.month}-01`, { month: "long", year: "numeric" }), (m) => m.count, (m) => X(`${formatNumber(m.count)} حجوزات، ${formatCompact(m.gross)}`, `${m.count} bookings, ${formatCompact(m.gross)}`))}
          <p class="meta">${X("الحالات", "Statuses")}: ${["confirmed", "pending", "completed", "cancelled"].map((s) => `${t(`status.${s}`)} ${formatNumber(sum.statusCounts[s])}`).join("، ")}</p>
        </section>
        <section class="ad-section">
          <div class="ad-section__head"><h2>${X("الوجهات الأكثر طلبًا", "Most booked destinations")}</h2></div>
          ${dests.length ? rankList(dests, (r) => L(getDestinationById(r.id)?.name), (r) => r.gross, (r) => X(`${formatNumber(r.count)} حجوزات، ${formatCompact(r.gross)}`, `${r.count} bookings, ${formatCompact(r.gross)}`)) : empty(t("empty.bookings.title"))}
        </section>
      </div>
      <section class="ad-section">
        <div class="ad-section__head"><h2>${X("أداء الباقات والتجارب", "Package & experience performance")}</h2><a class="btn btn--link" href="#packages">${X("الباقات", "Packages")}</a></div>
        <div class="table-wrap"><table class="table ad-table table--stack">
          <thead><tr><th>${X("الباقة أو التجربة", "Package / experience")}</th><th>${X("الحجوزات", "Bookings")}</th><th>${X("الضيوف", "Guests")}</th><th>${X("الإيراد", "Revenue")}</th><th>${X("الضريبة", "VAT")}</th><th>${X("بإضافات", "With add-ons")}</th></tr></thead>
          <tbody>${items.map((r) => html`<tr>
            <td class="cell--primary">${L(r.sample.packageTitle)}</td>
            <td data-label="${X("الحجوزات", "Bookings")}" class="num">${formatNumber(r.count)}</td>
            <td data-label="${X("الضيوف", "Guests")}" class="num">${formatNumber(r.guests)}</td>
            <td data-label="${X("الإيراد", "Revenue")}" class="num">${formatMoney(r.gross)}</td>
            <td data-label="${X("الضريبة", "VAT")}" class="num">${formatMoney(vatOf(r.gross), { decimals: 2 })}</td>
            <td data-label="${X("بإضافات", "Add-ons")}" class="num">${formatPercent(r.addOnRate)}</td>
          </tr>`)}</tbody></table></div>
      </section>
      <div class="ad-cols ad-cols--even">
        <section class="ad-section">
          <div class="ad-section__head"><h2>${X("مسار المزارع", "Farm pipeline")}</h2><span class="ad-q">${X(`متوسط الجاهزية ${formatNumber(Math.round(avgScore))}`, `Average readiness ${Math.round(avgScore)}`)}</span></div>
          ${rankList(PIPELINE_STAGES.map((s) => ({ ...s, n: pc[s.id] || 0 })), (s) => L(s.label), (s) => s.n, (s) => formatNumber(s.n))}
        </section>
        <section class="ad-section">
          <div class="ad-section__head"><h2>${X("طلبات الدراسة", "Study requests")}</h2><a class="btn btn--link" href="#studies">${X("الطلبات", "Requests")}</a></div>
          ${rankList(STUDY_STATUS.map((s) => ({ ...s, n: sc[s.id] || 0 })), (s) => L(s.label), (s) => s.n, (s) => formatNumber(s.n))}
        </section>
      </div>`
    );
  });
}

/* ==========================================================================
   Settings
   ========================================================================== */

export async function viewSettings(el, { refreshCounts }) {
  const lang = getLang();
  mount(
    el,
    html`${viewHead({ title: X("الإعدادات", "Settings"), desc: X("إعدادات النموذج التجريبي. لا توجد حسابات أو صلاحيات حقيقية.", "Prototype settings. There are no real accounts or permissions.") })}
    <div class="ad-settings">
      <div class="ad-setting"><div><h3>${X("الصلاحيات", "Permissions")}</h3><p>${X("هذه المساحة مفتوحة لأي زائر للنموذج. في المنتج الفعلي تحتاج تسجيل دخول للفريق وأدوارًا وصلاحيات وسجل تعديلات.", "This workspace is open to anyone using the prototype. The real product needs team sign-in, roles, permissions and an audit log.")}</p></div><span class="tag">${X("غير مفعّلة في النموذج", "Not active in the prototype")}</span></div>
      <div class="ad-setting"><div><h3>${X("اللغة", "Language")}</h3><p>${X("العربية هي اللغة الأساسية، والإنجليزية متاحة.", "Arabic is primary; English is available.")}</p></div>
        <div class="segmented" role="group"><button type="button" class="segmented__btn" data-set-lang="ar" aria-pressed="${lang === "ar"}">العربية</button><button type="button" class="segmented__btn" data-set-lang="en" aria-pressed="${lang === "en"}">English</button></div></div>
      <div class="ad-setting"><div><h3>${X("ضريبة القيمة المضافة", "VAT")}</h3><p>${X("تُطبَّق على كل الحجوزات في محرك التسعير. للقراءة فقط في النموذج.", "Applied to every booking by the pricing engine. Read-only in the prototype.")}</p></div><span class="num">${formatNumber(VAT_RATE * 100)}%</span></div>
      <div class="ad-setting"><div><h3>${X("تعديلات المحتوى", "Content edits")}</h3><p>${X("أعد الوجهات والتجارب والباقات إلى حالتها ونصوصها الأصلية.", "Return destinations, experiences and packages to their original status and text.")}</p></div><button type="button" class="btn btn--secondary btn--sm" data-reset-content>${X("استعد المحتوى الأصلي", "Restore original content")}</button></div>
      <div class="ad-setting"><div><h3>${X("تصدير البيانات المشتركة", "Export shared data")}</h3><p>${X("ملف JSON بكل ما حُفظ في هذا المتصفح: الحجوزات، والتقييمات، وطلبات الدراسة، والحالات. يفيد عند ربط واجهة خلفية لاحقًا.", "A JSON file of everything saved in this browser: bookings, assessments, study requests and statuses. Useful when a backend is connected later.")}</p></div><button type="button" class="btn btn--secondary btn--sm" data-export>${icon("upload", { size: "sm" })} ${X("صدّر JSON", "Export JSON")}</button></div>
      <div class="ad-setting"><div><h3>${X("إعادة ضبط بيانات العرض", "Reset demo data")}</h3><p>${X("يحذف كل ما أُنشئ في النموذج من هذا المتصفح، ويعيد البيانات الأولية.", "Deletes everything created in the prototype in this browser and restores the seed data.")}</p></div><button type="button" class="btn btn--secondary btn--sm" data-reset-all style="color:var(--status-cancelled)">${t("demo.reset")}</button></div>
      <div class="ad-setting"><div><h3>${X("مرجع التصميم", "Design reference")}</h3><p>${X("نظام التصميم والمكونات المشتركة.", "The design system and shared components.")}</p></div><a class="btn btn--link" href="${route("styleguide")}">${X("افتح المرجع", "Open the reference")}</a></div>
    </div>`
  );
  on(el, "click", "[data-set-lang]", (e, b) => setLang(b.dataset.setLang));
  on(el, "click", "[data-reset-content]", async () => {
    const ok = await confirmDialog({ title: X("استعادة المحتوى الأصلي", "Restore original content"), text: X("ستُحذف كل تعديلات الحالة والنصوص.", "All status and text edits will be removed."), confirmLabel: X("استعد", "Restore") });
    if (!ok) return;
    store.reset("contentOverrides");
    toast(X("استُعيد المحتوى الأصلي.", "Original content restored."));
  });
  on(el, "click", "[data-export]", () => {
    const keys = ["userBookings", "bookingStatuses", "assessmentResult", "submittedFarms", "farmStages", "studyRequests", "studyStatuses", "assumptions", "scenario", "contentOverrides", "interests"];
    const data = Object.fromEntries(keys.map((k) => [k, store.get(k)]));
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), note: "RIF Qassim prototype demo data", data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rif-demo-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    toast(X("صُدّر الملف.", "File exported."));
  });
  on(el, "click", "[data-reset-all]", async () => {
    const ok = await confirmDialog({ title: t("demo.reset"), text: t("demo.resetConfirm"), confirmLabel: t("demo.reset"), danger: true });
    if (!ok) return;
    store.resetDemo();
    toast(t("demo.resetDone"));
    refreshCounts();
  });
}
