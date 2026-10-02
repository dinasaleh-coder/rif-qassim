/* ==========================================================================
   Booking engine (one for the whole product)
   Draft handling + quoting + submission. The booking page uses it; any
   future quick-book entry point must use it too, so drafts, prices and
   saved bookings always agree with the admin view.
   ========================================================================== */

import { store } from "../core/store.js";
import { computePackagePrice } from "./pricing.js";
import { packageDateStatus, isBookable, firstAvailableDate } from "./availability.js";
import { createBooking } from "./api.js";

export const BOOKING_STEPS = [
  { id: "date", label: { ar: "التاريخ", en: "Date" } },
  { id: "guests", label: { ar: "الضيوف", en: "Guests" } },
  { id: "addons", label: { ar: "الإضافات", en: "Add-ons" } },
  { id: "review", label: { ar: "المراجعة", en: "Review" } },
  { id: "done", label: { ar: "التأكيد", en: "Confirmation" } },
];

const clampGuests = (item, n) => Math.min(item.maxGuests, Math.max(item.minGuests, Math.floor(Number(n) || item.minGuests)));

/**
 * Turn whatever is saved into a valid state for this item.
 * A saved draft for a different item is ignored (but contact details carry over).
 */
export function loadDraft(item) {
  const d = store.get("bookingDraft");
  const same = d.packageId === item.id;
  const date = same && d.date && isBookable(packageDateStatus(item, d.date)) ? d.date : null;
  const valid = new Set(item.addOns.map((a) => a.id));
  return {
    date,
    guests: clampGuests(item, same ? d.guests : Math.max(item.minGuests, Math.min(2, item.maxGuests))),
    addOns: same ? (d.addOns || []).filter((id) => valid.has(id)) : [],
    step: same ? Math.min(4, Math.max(1, d.step || 1)) : 1,
    contact: { name: "", phone: "", email: "", notes: "", ...(d.contact || {}) },
  };
}

export function saveDraft(item, state) {
  store.set("bookingDraft", {
    packageId: item.id,
    destinationId: item.destinationId,
    date: state.date,
    guests: state.guests,
    addOns: state.addOns,
    step: state.step,
    contact: state.contact,
  });
}

export const quote = (item, state) => computePackagePrice(item, { guests: state.guests, addOns: state.addOns });

export const suggestDate = (item) => firstAvailableDate(item);

export { clampGuests };

/** Create the demo booking and clear the draft (contact details are kept). */
export async function submitBooking(item, state) {
  const booking = await createBooking({
    packageId: item.id,
    date: state.date,
    guests: state.guests,
    addOns: state.addOns,
    contact: state.contact,
  });
  const contact = state.contact;
  store.reset("bookingDraft");
  store.set("bookingDraft", { contact: { ...contact, notes: "" } });
  return booking;
}
