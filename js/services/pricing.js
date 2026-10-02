/* ==========================================================================
   Pricing engine
   Pure functions, no DOM, no language: used by checkout, the booking summary
   and the admin bookings table so every total in the product agrees.
   Labels are returned as { ar, en } objects; the UI localises them.
   ========================================================================== */

import { VAT_RATE } from "../data/packages.js";

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {object} pkg     package from data/packages.js
 * @param {object} input   { guests: number, addOns: string[] }
 * @returns {{ lines, subtotal, vat, total, perPerson, guests, valid, errors }}
 */
export function computePackagePrice(pkg, { guests = 1, addOns = [] } = {}) {
  const errors = [];
  if (!pkg) return { lines: [], subtotal: 0, vat: 0, total: 0, perPerson: 0, guests, valid: false, errors: ["package"] };

  const g = Math.floor(Number(guests));
  if (!Number.isFinite(g) || g < pkg.minGuests) errors.push("guests-min");
  if (g > pkg.maxGuests) errors.push("guests-max");
  const safeGuests = Math.min(pkg.maxGuests, Math.max(pkg.minGuests, Number.isFinite(g) ? g : pkg.minGuests));

  const lines = [];
  const { pricing } = pkg;

  if (pricing.model === "person") {
    // Guided sessions may bill a minimum number of guests (a solo guest can book)
    const billed = Math.max(safeGuests, pricing.minBillable || 0);
    lines.push({
      id: "base",
      kind: "base",
      label: pkg.title,
      qty: billed,
      unit: "person",
      unitPrice: pricing.basePrice,
      amount: pricing.basePrice * billed,
      note: billed > safeGuests ? { ar: `حد أدنى للحجز: سعر ${billed === 2 ? "ضيفين" : `${billed} ضيوف`}`, en: `Minimum booking: ${billed} guests` } : undefined,
    });
  } else {
    lines.push({
      id: "base",
      kind: "base",
      label: pkg.title,
      qty: 1,
      unit: "booking",
      unitPrice: pricing.basePrice,
      amount: pricing.basePrice,
      note: { ar: `يشمل ${pricing.includedGuests} ضيوف`, en: `Includes ${pricing.includedGuests} guests` },
    });
    const extra = Math.max(0, safeGuests - pricing.includedGuests);
    if (extra > 0) {
      lines.push({
        id: "extra-guests",
        kind: "extra",
        label: { ar: "ضيوف إضافيون", en: "Extra guests" },
        qty: extra,
        unit: "person",
        unitPrice: pricing.extraGuestPrice,
        amount: pricing.extraGuestPrice * extra,
      });
    }
    // Stays: a room sleeps roomCapacity guests; more guests need more rooms
    if (pricing.roomCapacity) {
      const included = Math.ceil(pricing.includedGuests / pricing.roomCapacity);
      const extraRooms = Math.max(0, Math.ceil(safeGuests / pricing.roomCapacity) - included);
      if (extraRooms > 0) {
        lines.push({
          id: "extra-rooms",
          kind: "extra",
          label: { ar: "غرفة إضافية", en: "Extra room" },
          qty: extraRooms,
          unit: "booking",
          unitPrice: pricing.extraRoomPrice,
          amount: pricing.extraRoomPrice * extraRooms,
          note: { ar: `${pricing.nights} ليالٍ، تتسع لضيفين`, en: `${pricing.nights} nights, sleeps ${pricing.roomCapacity}` },
        });
      }
    }
  }

  const selected = new Set(addOns);
  pkg.addOns
    .filter((a) => selected.has(a.id))
    .forEach((a) => {
      const qty = a.unit === "person" ? safeGuests : 1;
      lines.push({
        id: `addon-${a.id}`,
        kind: "addon",
        label: a.title,
        qty,
        unit: a.unit,
        unitPrice: a.price,
        amount: a.price * qty,
      });
    });

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const vat = round2(subtotal * VAT_RATE);
  const total = round2(subtotal + vat);

  return {
    lines,
    subtotal,
    vat,
    vatRate: VAT_RATE,
    total,
    perPerson: round2(total / safeGuests),
    guests: safeGuests,
    valid: errors.length === 0,
    errors,
  };
}

/** Simple per-unit experience price (for experience cards and quick quotes). */
export function computeExperiencePrice(exp, guests = 1) {
  const qty = exp.priceUnit === "person" ? Math.max(1, guests, exp.minBillable || 0) : 1;
  const subtotal = exp.price * qty;
  const vat = round2(subtotal * VAT_RATE);
  return { subtotal, vat, total: round2(subtotal + vat), qty };
}
