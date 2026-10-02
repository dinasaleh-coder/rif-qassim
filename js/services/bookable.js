/* ==========================================================================
   Bookable items
   One shape for everything a visitor can book: packages, and individual
   experiences / stays. The pricing engine, availability rules, booking page
   and admin view all work with this shape, so there is one booking engine.

   Products (priceUnit "item") are not booked by date; they are added to a
   visit, so they are not bookable on their own.
   ========================================================================== */

import { getPackageById } from "../data/packages.js";
import { getExperienceById } from "../data/experiences.js";
import { store } from "../core/store.js";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function experienceAsBookable(e) {
  const perPerson = e.priceUnit === "person";
  return {
    id: e.id,
    kind: "experience",
    category: e.category,
    destinationId: e.destinationId,
    title: e.title,
    summary: e.desc,
    durationHours: e.durationHours,
    timeWindow: null,
    // A stay is priced per night for up to its capacity; experiences per person
    pricing: perPerson
      ? { model: "person", basePrice: e.price, ...(e.minBillable ? { minBillable: e.minBillable } : {}) }
      : { model: "booking", basePrice: e.price, includedGuests: e.maxGuests, extraGuestPrice: 0 },
    minGuests: e.minGuests,
    maxGuests: e.maxGuests,
    availability: {
      days: e.availability?.days || ALL_DAYS,
      season: e.availability?.season || null,
      dates: e.availability?.dates || null,
      leadDays: 1,
      windowDays: 150,
    },
    includes: [],
    schedule: [],
    addOns: [],
    policy: {
      ar: "الإلغاء مجاني حتى ٢٤ ساعة قبل الموعد (سياسة توضيحية في النموذج).",
      en: "Free cancellation up to 24 hours before (illustrative policy in the prototype).",
    },
    media: e.media,
    tags: e.tags,
  };
}

/** Admin demo edits (store: contentOverrides) on top of the static data. */
export function contentOverride(kind, id) {
  return store.get("contentOverrides")?.[kind]?.[id] || null;
}

/**
 * Resolve any bookable id (package or experience). Returns null if it isn't
 * bookable — including items the Rif team has paused, unless includeInactive
 * is set (used for pricing existing bookings, which must not change).
 */
export function getBookable(id, { includeInactive = false } = {}) {
  if (!id) return null;
  const pkg = getPackageById(id);
  const exp = pkg ? null : getExperienceById(id);
  if (!pkg && (!exp || exp.priceUnit === "item")) return null;
  const kind = pkg ? "packages" : "experiences";
  const o = contentOverride(kind, id);
  if (o?.active === false && !includeInactive) return null;
  const item = pkg ? { ...pkg, kind: "package" } : experienceAsBookable(exp);
  if (o?.text) item.summary = o.text;
  if (o?.active === false) item.inactive = true;
  return item;
}
