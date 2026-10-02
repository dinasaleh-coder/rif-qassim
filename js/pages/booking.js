/* ==========================================================================
   Booking  (pages/booking.html?package=pkg-full-day | ?package=exp-kleija)
   01 التاريخ → 02 الضيوف → 03 الإضافات → 04 المراجعة → 05 التأكيد

   Uses the shared engine (services/booking.js): the draft is saved on every
   change, prices come from the one pricing engine, and the saved booking is
   the same record the Rif team sees in admin. ?ref=RIF-… reopens a
   confirmation made in this browser.
   ========================================================================== */

import { initShell } from "../components/shell.js";
import { html, mount, $, $$, on, getParam, debounce } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { formatMoney, formatNumber, formatDate, count, formatDuration } from "../core/format.js";
import { route } from "../core/paths.js";
import { store } from "../core/store.js";
import { renderMedia } from "../components/media.js";
import { icon } from "../components/icons.js";
import { emptyState, errorState, pageBand, playBand } from "../components/cards.js";
import { createCalendar } from "../components/calendar.js";
import { stepper, initSteppers, choiceGroup, readForm, validateForm, bindLiveValidation, showError, clearError } from "../components/forms.js";
import { openModal } from "../components/overlay.js";
import { toast } from "../components/toast.js";
import { priceBreakdown, addOnsGroup, contactFields, bookingDetails } from "../components/booking-parts.js";
import { BOOKING_STEPS, loadDraft, saveDraft, quote, suggestDate, clampGuests, submitBooking } from "../services/booking.js";
import { packageDateStatus, isBookable } from "../services/availability.js";
import { getBookable } from "../services/bookable.js";
import { getDestinationById } from "../data/destinations.js";
import * as api from "../services/api.js";

initShell({ page: "booking", header: "overlay", bottomNav: false, footer: "minimal" });

const X = (ar, en) => L({ ar, en });
const main = $("#main");
const DEMO_NOTICE = X("حجز تجريبي، لم تتم أي عملية دفع.", "Demo booking. No payment was made.");

let item;
let destination;
let s; // booking state: { date, guests, addOns, step, contact }

/* ==========================================================================
   Frame
   ========================================================================== */

function band() {
  const p = item.pricing;
  const unit = p.model === "person" ? t("common.perPerson") : t("common.perBooking");
  return pageBand({
    compact: true,
    media: item.media,
    crumbs: [
      { label: t("nav.home"), href: route("home") },
      { label: L(destination?.name), href: route("destination", { id: item.destinationId }) },
      { label: item.kind === "package" ? X("حجز باقة", "Book a package") : X("حجز تجربة", "Book an experience") },
    ],
    title: L(item.title),
    lead: L(item.summary),
    facts: html`
      <span>${t("common.from")} <strong class="num">${formatMoney(p.basePrice)}</strong> ${unit}</span>
      <span>${item.timeWindow ? L(item.timeWindow) : formatDuration(item.durationHours)}</span>
      <span>${formatNumber(item.minGuests)}–${formatNumber(item.maxGuests)} ${X("ضيوف", "guests")}</span>`,
  });
}

function frame() {
  return html`
    ${band()}
    <div class="container container--wide bk-page">
      <div class="bk-progress">
        <div class="split"><span class="step-counter" data-counter></span><span class="demo-tag">${X("حجز تجريبي", "Demo booking")}</span></div>
        <ol class="steps" role="list" data-steps>
          ${BOOKING_STEPS.map((st, i) => html`<li class="steps__item" data-step-item="${i + 1}"><span class="steps__num">${String(i + 1).padStart(2, "0")}</span><span class="steps__label">${L(st.label)}</span></li>`)}
        </ol>
      </div>
      <div class="bk-layout" data-layout>
        <div class="bk-main">
          <div data-step-root></div>
          <div class="bk-nav" data-nav>
            <button type="button" class="btn btn--ghost" data-back>${icon("arrow", { size: "sm", cls: "cal__prev" })} ${t("common.back")}</button>
            <button type="button" class="btn btn--primary btn--lg" data-next></button>
          </div>
        </div>
        <aside class="bk-aside" aria-label="${X("ملخص الحجز", "Booking summary")}" data-aside></aside>
      </div>
    </div>
    <div class="bk-bar" data-bar>
      <button type="button" class="btn btn--secondary btn--icon" data-back aria-label="${t("common.back")}">${icon("arrow", { cls: "cal__prev" })}</button>
      <button type="button" class="bk-bar__total" data-breakdown><strong data-bar-total></strong><span>${X("تفاصيل السعر", "Price details")}</span></button>
      <button type="button" class="btn btn--primary" data-next></button>
    </div>`;
}

/* ==========================================================================
   Steps
   ========================================================================== */

const head = (title, desc) => html`<div class="bk-step__head"><h2 class="bk-step__title" tabindex="-1" data-step-title>${title}</h2>${desc ? html`<p class="muted">${desc}</p>` : ""}</div>`;

function stepDate() {
  return html`<div class="bk-step">
    ${head(X("متى تأتي؟", "When are you coming?"), item.timeWindow ? X(`اليوم من ${L(item.timeWindow)}.`, `The day runs ${L(item.timeWindow)}.`) : X(`المدة ${formatDuration(item.durationHours)}.`, `Duration: ${formatDuration(item.durationHours)}.`))}
    <div class="field" data-field="date">
      <div class="bk-panel" data-cal-host></div>
    </div>
    <div class="bk-picked" data-picked></div>
    <p class="meta">${X("التوافر محاكى لأغراض النموذج ولا يمثل توافرًا حقيقيًا.", "Availability is simulated for the prototype and isn't real availability.")}</p>
  </div>`;
}

function stepGuests() {
  const p = item.pricing;
  const how =
    p.model === "person"
      ? X(`السعر ${formatMoney(p.basePrice)} للشخص.`, `${formatMoney(p.basePrice)} per person.`)
      : p.extraGuestPrice
        ? X(`السعر ${formatMoney(p.basePrice)} للحجز ويشمل ${formatNumber(p.includedGuests)} ضيوف، وكل ضيف إضافي ${formatMoney(p.extraGuestPrice)}.`, `${formatMoney(p.basePrice)} per booking including ${p.includedGuests} guests; each extra guest ${formatMoney(p.extraGuestPrice)}.`)
        : X(`السعر ${formatMoney(p.basePrice)} للحجز حتى ${count(item.maxGuests, "guests")}.`, `${formatMoney(p.basePrice)} per booking, up to ${count(item.maxGuests, "guests")}.`);
  const rules = [];
  if (p.minBillable > 1)
    rules.push(X(`تجربة بمرشد مخصص: الحد الأدنى للحجز سعر ${p.minBillable === 2 ? "ضيفين" : `${formatNumber(p.minBillable)} ضيوف`}، ويمكن الحجز لشخص واحد بهذا السعر.`, `A guided session with a dedicated host: the minimum booking is ${p.minBillable} guests' price; one person can book at that price.`));
  if (p.roomCapacity)
    rules.push(X(`كل غرفة تتسع لضيفين. من الضيف الثالث تُضاف غرفة ثانية بسعر الغرفة (${formatMoney(p.extraRoomPrice)} عن ${count(p.nights, "nights")})، ويُضاف لكل ضيف إضافي ما يخصه من الباقة (${formatMoney(p.extraGuestPrice)}).`, `Each room sleeps ${p.roomCapacity}. From the third guest a second room is added at the room price (${formatMoney(p.extraRoomPrice)} for ${p.nights} nights), plus each extra guest's share of the package (${formatMoney(p.extraGuestPrice)}).`));
  else if (p.model === "booking" && p.extraGuestPrice)
    rules.push(X(`السعر يشمل ${formatNumber(p.includedGuests)} ضيوف. كل ضيف إضافي يدفع ما يخصه من الباقة بالسعر المنفرد (${formatMoney(p.extraGuestPrice)}).`, `The price covers ${p.includedGuests} guests. Each extra guest pays their share of the package at standalone prices (${formatMoney(p.extraGuestPrice)}).`));
  return html`<div class="bk-step">
    ${head(X("كم شخصًا؟", "How many people?"), how)}
    ${rules.map((r) => html`<p class="note note--neutral">${icon("info")}<span>${r}</span></p>`)}
    <div class="bk-panel">
      ${stepper({ name: "guests", label: X("عدد الضيوف", "Guests"), value: s.guests, min: item.minGuests, max: item.maxGuests, unitLabel: (n) => count(n, "guests"), hint: X(`من ${formatNumber(item.minGuests)} إلى ${formatNumber(item.maxGuests)} ضيوف لهذا الحجز.`, `${item.minGuests} to ${item.maxGuests} guests for this booking.`) })}
    </div>
  </div>`;
}

function stepAddons() {
  return html`<div class="bk-step">
    ${head(X("أضف ما يكمل يومك.", "Add what completes your day."), X("كل الإضافات اختيارية، ويتغير السعر فورًا في الملخص.", "All add-ons are optional; the summary updates as you choose."))}
    ${item.addOns.length
      ? addOnsGroup(item, s.addOns)
      : html`<p class="note note--neutral">${icon("info")}<span>${X("لا توجد إضافات لهذا الحجز. انتقل إلى المراجعة.", "There are no add-ons for this booking. Continue to review.")}</span></p>`}
  </div>`;
}

function stepReview() {
  const addOnNames = s.addOns.map((id) => L(item.addOns.find((a) => a.id === id)?.title)).filter(Boolean);
  const edit = (n) => html`<button type="button" class="btn btn--link" data-goto="${n}" style="font-size:var(--fs-small)">${t("common.edit")}</button>`;
  return html`<div class="bk-step">
    ${head(X("راجع حجزك.", "Review your booking."))}
    <dl class="bk-review">
      <div><dt>${X("التاريخ", "Date")}</dt><dd>${formatDate(s.date)}</dd>${edit(1)}</div>
      <div><dt>${X("الضيوف", "Guests")}</dt><dd>${count(s.guests, "guests")}</dd>${edit(2)}</div>
      <div><dt>${X("الإضافات", "Add-ons")}</dt><dd>${addOnNames.length ? addOnNames.join("، ") : X("بدون إضافات", "None")}</dd>${item.addOns.length ? edit(3) : html`<span></span>`}</div>
    </dl>
    <form class="bk-form" data-contact novalidate>
      <h3 class="h4" style="grid-column:1/-1;margin-top:var(--space-4)">${X("بيانات التواصل", "Contact details")}</h3>
      ${contactFields(s.contact)}
      ${choiceGroup({ name: "agree", type: "checkbox", rules: "minChecked:1", cols: "1fr", value: s.contact.agree ? ["yes"] : [], options: [{ value: "yes", title: X("أفهم أن هذا حجز تجريبي في نموذج ما قبل الإطلاق، ولن تتم أي عملية دفع.", "I understand this is a demo booking in a pre-launch prototype, and no payment will be taken.") }] })}
    </form>
    <p class="meta">${L(item.policy)}</p>
  </div>`;
}

function confirmation(booking) {
  return html`
    <div class="bk-done contours" role="status" aria-live="polite">
      <span class="bk-done__mark">${icon("check")}</span>
      <div class="stack" style="--stack-gap:var(--space-3)">
        <h2 class="h1" tabindex="-1" data-step-title>${X("تم تأكيد تجربتك.", "Your experience is confirmed.")}</h2>
        <p class="muted">${X("احتفظ برقم الحجز. تجده أيضًا في حجوزات فريق ريف.", "Keep your reference. It also appears in the Rif team's bookings.")}</p>
      </div>
      <span class="bk-done__notice">${icon("info", { size: "sm" })} ${DEMO_NOTICE}</span>
      ${bookingDetails(booking, item, destination)}
      <div class="bk-done__actions">
        <a class="btn btn--primary" href="${route("destination", { id: item.destinationId })}">${X(`عودة إلى ${destination?.name.ar}`, `Back to ${destination?.name.en}`)}</a>
        <a class="btn btn--secondary" href="${route("experiences")}">${X("تصفّح تجارب أخرى", "Browse more experiences")}</a>
        <a class="btn btn--ghost" href="${route("booking", { package: item.id })}">${X("حجز جديد", "New booking")}</a>
      </div>
    </div>`;
}

const STEP_VIEWS = [null, stepDate, stepGuests, stepAddons, stepReview];

/* ==========================================================================
   Rendering
   ========================================================================== */

function renderProgress(step) {
  $("[data-counter]").innerHTML = String(html`<strong>${String(step).padStart(2, "0")}</strong> / 05`);
  $$("[data-step-item]").forEach((li) => {
    const n = Number(li.dataset.stepItem);
    li.classList.toggle("is-done", n < step || step === 5);
    li.classList.toggle("is-current", n === step && step !== 5);
    n === step ? li.setAttribute("aria-current", "step") : li.removeAttribute("aria-current");
  });
}

function renderSummary() {
  const q = quote(item, s);
  const addOnCount = s.addOns.length;
  mount(
    $("[data-aside]"),
    html`<div class="bk-summary">
      <div class="bk-summary__head">
        ${renderMedia(item.media, { label: false })}
        <div class="stack" style="--stack-gap:var(--space-1)">
          <p class="h4">${L(item.title)}</p>
          <p class="meta">${L(destination?.name)}، ${L(destination?.town)}</p>
        </div>
      </div>
      <dl class="bk-summary__facts">
        <div><dt>${X("التاريخ", "Date")}</dt><dd class="${s.date ? "" : "is-empty"}">${s.date ? formatDate(s.date, { weekday: "short", day: "numeric", month: "long" }) : X("لم يُختر بعد", "Not chosen yet")}</dd></div>
        <div><dt>${X("الضيوف", "Guests")}</dt><dd>${count(s.guests, "guests")}</dd></div>
        <div><dt>${X("الإضافات", "Add-ons")}</dt><dd class="${addOnCount ? "" : "is-empty"}">${addOnCount ? formatNumber(addOnCount) : X("لا شيء", "None")}</dd></div>
      </dl>
      ${priceBreakdown(q)}
      <p class="bk-demo">${icon("info", { size: "sm" })}<span>${X("حجز تجريبي: لا يتم أي دفع، والأسعار توضيحية.", "Demo booking: no payment is taken and prices are illustrative.")}</span></p>
    </div>`
  );
  $$("[data-bar-total]").forEach((el) => (el.textContent = formatMoney(q.total, { decimals: q.total % 1 ? 2 : 0 })));
}

function renderNav() {
  const label = s.step === 4 ? X("أكّد الحجز التجريبي", "Confirm demo booking") : t("common.next");
  $$("[data-next]").forEach((b) => (b.innerHTML = String(html`${label}${s.step < 4 ? html` ${icon("arrow", { size: "sm" })}` : ""}`)));
  $$("[data-back]").forEach((b) => {
    b.disabled = s.step === 1;
    b.style.visibility = s.step === 1 ? "hidden" : "";
  });
}

function renderPicked() {
  const el = $("[data-picked]");
  if (!el) return;
  mount(
    el,
    s.date
      ? html`<span>${formatDate(s.date)}</span><span class="meta">${packageDateStatus(item, s.date) === "limited" ? X("أماكن محدودة في هذا اليوم", "Limited places this day") : X("متاح للحجز التجريبي", "Open for demo booking")}</span>`
      : html`<span class="muted">${X("اختر يومًا من التقويم.", "Pick a day on the calendar.")}</span>`
  );
}

function renderStep({ focus = true } = {}) {
  const root = $("[data-step-root]");
  mount(root, STEP_VIEWS[s.step]());
  renderProgress(s.step);
  renderNav();
  renderSummary();

  if (s.step === 1) {
    createCalendar($("[data-cal-host]", root), {
      value: s.date,
      month: suggestDate(item),
      statusFn: (d) => packageDateStatus(item, d),
      onSelect: (iso) => {
        s.date = iso;
        clearError($('[data-field="date"]', root));
        persist();
        renderPicked();
        renderSummary();
      },
    });
    renderPicked();
  }
  if (s.step === 4) bindLiveValidation($("[data-contact]", root));

  if (focus) {
    $(".bk-progress")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => $("[data-step-title]", root)?.focus({ preventScroll: true }), 50);
  }
}

const persist = () => saveDraft(item, s);
const persistSoon = debounce(persist, 250);

/* ==========================================================================
   Validation & navigation
   ========================================================================== */

function validateStep() {
  const root = $("[data-step-root]");
  if (s.step === 1) {
    if (!s.date || !isBookable(packageDateStatus(item, s.date))) {
      showError($('[data-field="date"]', root), X("اختر تاريخًا متاحًا من التقويم.", "Choose an available date on the calendar."));
      $('[data-field="date"]', root).scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
  }
  if (s.step === 2) {
    const { valid } = validateForm(root);
    if (!valid) return false;
  }
  if (s.step === 4) {
    const form = $("[data-contact]", root);
    const { valid } = validateForm(form);
    if (!valid) {
      toast(t("error.fixBelow"), { type: "error" });
      return false;
    }
  }
  return true;
}

function goTo(step) {
  s.step = Math.min(4, Math.max(1, step));
  persist();
  renderStep();
}

async function next() {
  if (!validateStep()) return;
  if (s.step < 4) return goTo(s.step + 1);
  await submit();
}

async function submit() {
  const buttons = $$("[data-next]");
  buttons.forEach((b) => {
    b.classList.add("is-loading");
    b.disabled = true;
  });
  try {
    const booking = await submitBooking(item, s);
    const u = new URL(location.href);
    u.search = new URLSearchParams({ ref: booking.id }).toString();
    history.replaceState(null, "", u);
    showConfirmation(booking);
  } catch (err) {
    if (err.message === "date-unavailable") {
      s.date = null;
      goTo(1);
      setTimeout(() => showError($('[data-field="date"]'), X("لم يعد هذا التاريخ متاحًا. اختر تاريخًا آخر.", "That date is no longer available. Choose another.")), 120);
    } else {
      toast(X("تعذّر تأكيد الحجز. أعد المحاولة.", "Couldn't confirm the booking. Try again."), { type: "error" });
    }
  } finally {
    buttons.forEach((b) => {
      b.classList.remove("is-loading");
      b.disabled = false;
    });
  }
}

function showConfirmation(booking) {
  renderProgress(5);
  $("[data-layout]").classList.add("is-done");
  $("[data-aside]").remove();
  $("[data-nav]").remove();
  $("[data-bar]")?.remove();
  document.body.classList.remove("has-bk-bar");
  mount($("[data-step-root]"), confirmation(booking));
  $(".bk-progress")?.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => $("[data-step-title]")?.focus({ preventScroll: true }), 60);
  toast(X(`تم تأكيد الحجز ${booking.id}.`, `Booking ${booking.id} confirmed.`));
}

function wire() {
  on(main, "click", "[data-next]", next);
  on(main, "click", "[data-back]", () => goTo(s.step - 1));
  on(main, "click", "[data-goto]", (e, b) => goTo(Number(b.dataset.goto)));
  on(main, "click", "[data-breakdown]", () =>
    openModal({ title: X("تفاصيل السعر", "Price details"), body: html`<div class="stack" style="--stack-gap:var(--space-5)">${priceBreakdown(quote(item, s), { date: s.date })}<p class="bk-demo">${icon("info", { size: "sm" })}<span>${DEMO_NOTICE}</span></p></div>` })
  );

  initSteppers(main, { unitLabel: (n) => count(n, "guests") });

  main.addEventListener("input", (e) => {
    const root = $("[data-step-root]");
    if (e.target.name === "guests") {
      if (e.target.value === "") return;
      s.guests = clampGuests(item, e.target.value);
      persist();
      renderSummary();
    } else if (e.target.closest("[data-contact]")) {
      const v = readForm($("[data-contact]", root));
      s.contact = { name: v.name, phone: v.phone, email: v.email, notes: v.notes, agree: (v.agree || []).includes("yes") };
      persistSoon();
    }
  });
  main.addEventListener("change", (e) => {
    if (e.target.name === "addOns") {
      s.addOns = $$('input[name="addOns"]:checked', main).map((i) => i.value);
      persist();
      renderSummary();
    } else if (e.target.name === "agree") {
      main.dispatchEvent(new Event("input", { bubbles: true }));
      s.contact.agree = e.target.checked;
      persist();
    }
  });
  main.addEventListener("submit", (e) => {
    e.preventDefault();
    next();
  });
}

/* ==========================================================================
   Boot
   ========================================================================== */

function frameSkeleton() {
  return html`<section class="band band--compact" aria-busy="true"><div class="band__veil"></div>
    <div class="container container--wide band__inner">
      <div class="skeleton" style="height:1em;width:200px;opacity:.2"></div>
      <div class="skeleton" style="height:3.5rem;width:min(560px,80%);opacity:.2"></div>
      <div class="skeleton" style="height:1em;width:min(420px,70%);opacity:.2"></div>
    </div></section>
  <div class="container container--wide bk-page">
    <div class="bk-layout"><div class="stack"><div class="skeleton" style="height:2.2rem;width:50%"></div><div class="skeleton" style="height:360px"></div></div><div class="skeleton" style="height:420px"></div></div>
  </div>`;
}

function stateScreen(content) {
  // No band on these screens: switch the header to its solid form
  $("[data-header]")?.classList.add("is-scrolled");
  mount(main, html`<div class="container" style="padding-block:calc(var(--header-h) + var(--space-8)) var(--space-9)">${content}</div>`);
}

async function boot() {
  const ref = getParam("ref");
  mount(main, frameSkeleton());

  // Reopen a confirmation made in this browser
  if (ref) {
    const booking = await api.getUserBooking(ref);
    item = booking && getBookable(booking.packageId, { includeInactive: true });
    if (!booking || !item) {
      stateScreen(emptyState({
        title: X("لم نجد هذا الحجز في هذا المتصفح", "This booking isn't in this browser"),
        text: X("الحجوزات التجريبية تُحفظ في المتصفح الذي أُنشئت فيه فقط.", "Demo bookings are stored only in the browser they were made in."),
        icon: "calendar",
        action: html`<a class="btn btn--primary btn--sm" href="${route("experiences")}">${X("تصفّح التجارب", "Browse experiences")}</a>`,
      }));
      return;
    }
    destination = getDestinationById(item.destinationId);
    document.title = `${X("تم تأكيد الحجز", "Booking confirmed")} — ${t("brand.name")}`;
    mount(main, frame());
    playBand(main);
    showConfirmation(booking);
    return;
  }

  const id = getParam("package") || store.get("bookingDraft").packageId;
  if (!id) {
    stateScreen(emptyState({
      title: X("ماذا تريد أن تحجز؟", "What would you like to book?"),
      text: X("اختر باقة أو تجربة، وسنكمل الحجز من هنا.", "Choose a package or experience, and we'll continue from here."),
      icon: "calendar",
      action: html`<div class="cluster" style="justify-content:center"><a class="btn btn--primary btn--sm" href="${route("experiences")}">${X("تصفّح التجارب", "Browse experiences")}</a><a class="btn btn--secondary btn--sm" href="${route("destinations")}">${t("nav.destinations")}</a></div>`,
    }));
    return;
  }

  let data;
  try {
    data = await api.getBookableItem(id);
  } catch {
    stateScreen(errorState(X("تعذّر تحميل تفاصيل الحجز. تحقق من اتصالك ثم أعد المحاولة.", "Couldn't load the booking details. Check your connection and try again.")));
    on(main, "click", "[data-retry]", () => {
      const u = new URL(location.href);
      u.searchParams.delete("simulate");
      location.replace(u);
    });
    return;
  }
  if (!data) {
    stateScreen(emptyState({
      title: X("هذا العنصر غير متاح للحجز", "This can't be booked"),
      text: X("ربما تغيّر الرابط، أو أن المنتج يُستلم عند الزيارة ولا يُحجز بتاريخ.", "The link may have changed, or it's a product collected on a visit rather than booked by date."),
      icon: "calendar",
      action: html`<a class="btn btn--primary btn--sm" href="${route("experiences")}">${X("تصفّح التجارب", "Browse experiences")}</a>`,
    }));
    return;
  }

  item = data.item;
  destination = data.destination;
  document.title = `${L(item.title)} — ${X("الحجز", "Booking")} — ${t("brand.name")}`;
  s = loadDraft(item);
  persist();
  mount(main, frame());
  playBand(main);
  document.body.classList.add("has-bk-bar");
  wire();
  renderStep({ focus: false });
}

boot();
