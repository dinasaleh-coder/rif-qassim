/* ==========================================================================
   Operational analytics (Rif team)
   Pure summaries of the shared lists (bookings, farms, study requests).
   Amounts are the bookings' own totals from the pricing engine (VAT
   included); VAT is the 15% share inside those totals. Nothing is invented.
   ========================================================================== */

import { VAT_RATE } from "../data/packages.js";
import { PIPELINE_STAGES } from "../data/farms.js";

export const vatOf = (total) => Math.round((total - total / (1 + VAT_RATE)) * 100) / 100;

const groupBy = (list, key) =>
  list.reduce((acc, item) => {
    const k = typeof key === "function" ? key(item) : item[key];
    (acc[k] ||= []).push(item);
    return acc;
  }, {});

/** Bookings that count towards revenue (cancelled excluded). */
export const liveBookings = (bookings) => bookings.filter((b) => b.status !== "cancelled");

export function bookingSummary(bookings) {
  const live = liveBookings(bookings);
  const gross = live.reduce((s, b) => s + b.amount, 0);
  const vat = live.reduce((s, b) => s + vatOf(b.amount), 0);
  const guests = live.reduce((s, b) => s + b.guests, 0);
  const byStatus = groupBy(bookings, "status");
  return {
    count: live.length,
    all: bookings.length,
    gross,
    vat,
    net: gross - vat,
    guests,
    avgValue: live.length ? gross / live.length : 0,
    statusCounts: Object.fromEntries(["confirmed", "pending", "completed", "cancelled"].map((s) => [s, (byStatus[s] || []).length])),
  };
}

/** Bookings and revenue by month of visit (yyyy-mm), oldest first. */
export function byMonth(bookings) {
  const g = groupBy(liveBookings(bookings), (b) => b.date.slice(0, 7));
  return Object.keys(g)
    .sort()
    .map((m) => ({ month: m, count: g[m].length, gross: g[m].reduce((s, b) => s + b.amount, 0) }));
}

/** Ranking by a key (destinationId, packageId), with count, guests and revenue. */
export function rank(bookings, key) {
  const g = groupBy(liveBookings(bookings), key);
  return Object.entries(g)
    .map(([id, list]) => ({
      id,
      count: list.length,
      guests: list.reduce((s, b) => s + b.guests, 0),
      gross: list.reduce((s, b) => s + b.amount, 0),
      addOnRate: list.filter((b) => (b.addOns || []).length).length / list.length,
      sample: list[0],
    }))
    .sort((a, b) => b.gross - a.gross);
}

/** Add-on uptake across bookings: id → count. */
export function addOnUptake(bookings) {
  const counts = {};
  liveBookings(bookings).forEach((b) => (b.addOns || []).forEach((a) => (counts[a] = (counts[a] || 0) + 1)));
  return counts;
}

export function pipelineCounts(farms) {
  const counts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.id, 0]));
  farms.forEach((f) => (counts[f.stage] = (counts[f.stage] || 0) + 1));
  return counts;
}

export function studyCounts(requests) {
  const counts = { received: 0, reviewing: 0, contacted: 0, completed: 0 };
  requests.forEach((r) => (counts[r.status || "received"] = (counts[r.status || "received"] || 0) + 1));
  return counts;
}
