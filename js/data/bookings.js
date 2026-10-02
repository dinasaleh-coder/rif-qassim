/* ==========================================================================
   Bookings — FICTIONAL DEMO DATA (seed for the admin view)
   Amounts are not stored: the services layer computes them from the package
   and add-ons with the same pricing engine visitors use, so admin totals and
   checkout totals can never disagree.

   Bookings created by a visitor in the demo are stored separately
   (store: userBookings) and merged in by the services layer.
   ========================================================================== */

export const BOOKING_STATUSES = ["confirmed", "pending", "cancelled", "completed"];

export const SEED_BOOKINGS = [
  { id: "RIF-2608-A3KD", customer: "سارة الحربي", city: "الرياض", packageId: "pkg-full-day", date: "2026-08-14", guests: 4, addOns: ["kleija"], status: "completed", createdAt: "2026-07-29", channel: "web" },
  { id: "RIF-2608-H7QM", customer: "فهد المطيري", city: "بريدة", packageId: "pkg-harvest-family", date: "2026-08-22", guests: 5, addOns: [], status: "completed", createdAt: "2026-08-10", channel: "web" },
  { id: "RIF-2608-T2WN", customer: "نورة السبيعي", city: "الرياض", packageId: "pkg-weekend", date: "2026-08-27", guests: 2, addOns: ["sukkari"], status: "completed", createdAt: "2026-08-02", channel: "web" },
  { id: "RIF-2609-B8LP", customer: "عبدالرحمن القحطاني", city: "الدمام", packageId: "pkg-full-day", date: "2026-09-05", guests: 2, addOns: ["dinner", "photographer"], status: "completed", createdAt: "2026-08-21", channel: "web" },
  { id: "RIF-2609-K4ZE", customer: "ريم العنزي", city: "حائل", packageId: "pkg-mud-evening", date: "2026-09-10", guests: 3, addOns: [], status: "cancelled", createdAt: "2026-08-30", channel: "phone" },
  { id: "RIF-2609-M5RX", customer: "خالد الشمري", city: "بريدة", packageId: "pkg-harvest-family", date: "2026-09-12", guests: 6, addOns: ["seedlings"], status: "completed", createdAt: "2026-09-01", channel: "web" },
  { id: "RIF-2609-P9GA", customer: "هيا الدوسري", city: "الرياض", packageId: "pkg-full-day", date: "2026-09-19", guests: 6, addOns: ["kleija", "transfer"], status: "completed", createdAt: "2026-09-03", channel: "web" },
  { id: "RIF-2609-C3VJ", customer: "محمد الرشيدي", city: "عنيزة", packageId: "pkg-mud-evening", date: "2026-09-24", guests: 2, addOns: ["walk"], status: "completed", createdAt: "2026-09-15", channel: "web" },
  { id: "RIF-2609-W6TB", customer: "لولوة التميمي", city: "جدة", packageId: "pkg-weekend", date: "2026-09-24", guests: 3, addOns: [], status: "completed", createdAt: "2026-09-04", channel: "web" },
  { id: "RIF-2610-E2YS", customer: "عبدالله البقمي", city: "الرياض", packageId: "pkg-full-day", date: "2026-10-03", guests: 3, addOns: ["dinner"], status: "confirmed", createdAt: "2026-09-20", channel: "web" },
  { id: "RIF-2610-G8NF", customer: "منيرة الغامدي", city: "بريدة", packageId: "pkg-harvest-family", date: "2026-10-04", guests: 4, addOns: [], status: "confirmed", createdAt: "2026-09-26", channel: "web" },
  { id: "RIF-2610-R5DK", customer: "تركي العتيبي", city: "الرياض", packageId: "pkg-weekend", date: "2026-10-08", guests: 2, addOns: ["kleija", "sukkari"], status: "confirmed", createdAt: "2026-09-18", channel: "web" },
  { id: "RIF-2610-J3HU", customer: "أمل الزهراني", city: "الخبر", packageId: "pkg-full-day", date: "2026-10-10", guests: 8, addOns: ["kleija", "photographer"], status: "pending", createdAt: "2026-09-29", channel: "web" },
  { id: "RIF-2610-N7CX", customer: "سلطان الحربي", city: "بريدة", packageId: "pkg-mud-evening", date: "2026-10-15", guests: 4, addOns: [], status: "confirmed", createdAt: "2026-09-27", channel: "phone" },
  { id: "RIF-2610-Q4AL", customer: "دانة المالكي", city: "الرياض", packageId: "pkg-full-day", date: "2026-10-17", guests: 2, addOns: ["dinner"], status: "pending", createdAt: "2026-09-30", channel: "web" },
  { id: "RIF-2610-S2EM", customer: "ماجد السهلي", city: "المدينة المنورة", packageId: "pkg-harvest-family", date: "2026-10-24", guests: 7, addOns: ["seedlings"], status: "confirmed", createdAt: "2026-09-28", channel: "web" },
  { id: "RIF-2610-V8PZ", customer: "غادة العمري", city: "الرياض", packageId: "pkg-weekend", date: "2026-10-29", guests: 4, addOns: ["sukkari"], status: "pending", createdAt: "2026-10-01", channel: "web" },
  { id: "RIF-2611-Y3BR", customer: "بندر الخالدي", city: "بريدة", packageId: "pkg-full-day", date: "2026-11-06", guests: 5, addOns: ["kleija", "dinner"], status: "confirmed", createdAt: "2026-09-25", channel: "web" },
  { id: "RIF-2611-F6KT", customer: "جواهر القرني", city: "الرياض", packageId: "pkg-mud-evening", date: "2026-11-11", guests: 2, addOns: [], status: "cancelled", createdAt: "2026-09-22", channel: "web" },
];
