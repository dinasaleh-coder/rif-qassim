/* ==========================================================================
   Readiness scoring — SIMULATED FOR THE PROTOTYPE
   A transparent, rule-based score. Every point comes from a specific answer,
   and each dimension returns the "drivers" that explain it, so the result
   page can show why a farm scored what it did. This is an initial read, not a
   feasibility study.

   answers = {
     farmName, city, assetType, distanceKm,
     totalArea, usableArea,
     buildings, rooms, buildingCondition,
     facilities: string[],
     services: string[], currentPrice?, visitorsPerYear?, bookingsPerYear?,
     staff, maintenance, annualCosts,
     uploads: { photos: n, documents: n, pricing: n }
   }
   ========================================================================== */

import { BUILDING_CONDITIONS, CITIES, DIMENSIONS, FACILITIES, MAINTENANCE_LEVELS } from "../data/assessment.js";

const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const num = (v) => (Number.isFinite(Number(v)) && v !== "" && v !== null ? Number(v) : 0);
const ratio = (v, full) => Math.min(1, Math.max(0, num(v) / full));

const ASSET_BONUS = { "palm-farm": 25, heritage: 25, "mixed-farm": 22, estate: 14, land: 12 };

/* Recommendations shown when a dimension is weak */
const RECOMMENDATIONS = {
  infrastructure: {
    ar: "استكمال الكهرباء والمياه ودورات المياه قبل أي تطوير سياحي.",
    en: "Complete power, water and restrooms before any tourism development.",
  },
  accessibility: {
    ar: "تحسين الطريق المؤدي ولوحات الإرشاد، وتجهيز مواقف واضحة.",
    en: "Improve the access road and signage, and set out clear parking.",
  },
  accommodation: {
    ar: "تأهيل المباني القائمة كغرف ضيافة، أو البدء بنموذج نهاري دون مبيت.",
    en: "Convert existing buildings into guest rooms, or start with a day-visit model.",
  },
  operations: {
    ar: "بناء فريق تشغيل صغير وجدول صيانة، أو ترك التشغيل لريف.",
    en: "Build a small operations team and a maintenance schedule, or let Rif operate.",
  },
  experiences: {
    ar: "تصميم تجارب من طبيعة المزرعة: قطف، ورش، طعام من المحصول.",
    en: "Design experiences from the farm itself: picking, workshops, food from the harvest.",
  },
};

const STRENGTH_COPY = {
  infrastructure: { ar: "المرافق الأساسية جاهزة أو قريبة من الجاهزية.", en: "Core utilities are ready or close to it." },
  accessibility: { ar: "الوصول سهل من المدن الرئيسية.", en: "Easy to reach from the main towns." },
  accommodation: { ar: "يوجد أساس جيد للإقامة يمكن البناء عليه.", en: "A good base for stays to build on." },
  operations: { ar: "إدارة قائمة يمكن تطويرها بدل البدء من الصفر.", en: "Existing management to build on rather than starting from zero." },
  experiences: { ar: "طبيعة المزرعة تصلح لتجارب متنوعة.", en: "The farm's character suits a range of experiences." },
};

/**
 * @returns {{
 *   score: number,
 *   dims: Record<string, number>,
 *   drivers: Record<string, {label:{ar,en}, points:number, max:number}[]>,
 *   strengths: {id, text}[], gaps: {id, text}[], missing: {id, label}[],
 *   confidence: "high"|"medium"|"low"
 * }}
 */
export function computeReadiness(answers = {}) {
  const facilities = new Set(answers.facilities || []);
  const services = (answers.services || []).filter((s) => s !== "none");
  const condition = BUILDING_CONDITIONS.find((c) => c.id === answers.buildingCondition) || BUILDING_CONDITIONS[3];
  const city = CITIES.find((c) => c.id === answers.city) || CITIES[CITIES.length - 1];
  const maintenance = MAINTENANCE_LEVELS.find((m) => m.id === answers.maintenance) || MAINTENANCE_LEVELS[2];
  const usable = num(answers.usableArea);
  const rooms = num(answers.rooms);
  const buildings = num(answers.buildings);
  const distance = num(answers.distanceKm);

  const drivers = {};
  const add = (dim, label, points, max) => {
    (drivers[dim] ||= []).push({ label, points: Math.round(points), max });
    return points;
  };

  /* Infrastructure: utilities (82) + building condition (18) */
  let infra = 0;
  FACILITIES.filter((f) => f.infra > 0).forEach((f) => {
    infra += add("infrastructure", f.label, facilities.has(f.id) ? f.infra : 0, f.infra);
  });
  infra += add("infrastructure", { ar: "حالة المباني", en: "Building condition" }, condition.factor * 18, 18);

  /* Accessibility: distance (45) + town access (25) + parking (18) + restrooms (12) */
  let access = 0;
  const distPts = distance <= 10 ? 45 : distance <= 25 ? 38 : distance <= 50 ? 28 : distance <= 90 ? 18 : 8;
  access += add("accessibility", { ar: "المسافة عن المدينة", en: "Distance from town" }, answers.distanceKm === undefined || answers.distanceKm === "" ? 0 : distPts, 45);
  access += add("accessibility", { ar: "موقع المدينة أو المركز", en: "Town location" }, city.access * 25, 25);
  access += add("accessibility", { ar: "المواقف", en: "Parking" }, facilities.has("parking") ? 18 : 0, 18);
  access += add("accessibility", { ar: "دورات المياه للزوار", en: "Visitor restrooms" }, facilities.has("restrooms") ? 12 : 0, 12);

  /* Accommodation: rooms (45) + condition (25) + accommodation facility (15) + buildings (15) */
  let accom = 0;
  accom += add("accommodation", { ar: "عدد الغرف", en: "Number of rooms" }, ratio(rooms, 6) * 45, 45);
  accom += add("accommodation", { ar: "حالة المباني", en: "Building condition" }, buildings > 0 ? condition.factor * 25 : 0, 25);
  accom += add("accommodation", { ar: "مكان مهيأ للمبيت", en: "Space for overnight stays" }, facilities.has("accommodation") ? 15 : 0, 15);
  accom += add("accommodation", { ar: "عدد المباني", en: "Number of buildings" }, ratio(buildings, 3) * 15, 15);

  /* Operations: staff (25) + maintenance (26) + kitchen (12) + visitors (17) + bookings (10) + pricing (10) */
  let ops = 0;
  ops += add("operations", { ar: "العاملون", en: "Staff" }, ratio(answers.staff, 5) * 25, 25);
  ops += add("operations", { ar: "الصيانة", en: "Maintenance" }, maintenance.score, 26);
  ops += add("operations", { ar: "مطبخ قابل للضيافة", en: "Hospitality kitchen" }, facilities.has("kitchen") ? 12 : 0, 12);
  ops += add("operations", { ar: "زوار حاليون", en: "Current visitors" }, ratio(answers.visitorsPerYear, 3000) * 17, 17);
  ops += add("operations", { ar: "حجوزات حالية", en: "Current bookings" }, ratio(answers.bookingsPerYear, 150) * 10, 10);
  ops += add("operations", { ar: "تسعير قائم", en: "Existing pricing" }, num(answers.currentPrice) > 0 ? 10 : 0, 10);

  /* Experiences: asset character (25) + usable area (28) + outdoor (22) + current services (25) */
  let exp = 0;
  exp += add("experiences", { ar: "طبيعة الأصل", en: "Asset character" }, ASSET_BONUS[answers.assetType] ?? 12, 25);
  exp += add("experiences", { ar: "المساحة القابلة للاستخدام", en: "Usable area" }, ratio(usable, 8000) * 28, 28);
  exp += add("experiences", { ar: "مساحات خارجية", en: "Outdoor areas" }, facilities.has("outdoor") ? 22 : 0, 22);
  exp += add("experiences", { ar: "خدمات قائمة", en: "Existing services" }, Math.min(services.length * 10, 25), 25);

  const dims = {
    infrastructure: Math.round(clamp(infra)),
    accessibility: Math.round(clamp(access)),
    accommodation: Math.round(clamp(accom)),
    operations: Math.round(clamp(ops)),
    experiences: Math.round(clamp(exp)),
  };

  const score = Math.round(DIMENSIONS.reduce((s, d) => s + dims[d.id] * d.weight, 0));

  const ranked = DIMENSIONS.map((d) => ({ id: d.id, value: dims[d.id] })).sort((a, b) => b.value - a.value);
  const strengths = ranked.filter((d) => d.value >= 72).slice(0, 3).map((d) => ({ id: d.id, value: d.value, text: STRENGTH_COPY[d.id] }));
  const gaps = ranked
    .filter((d) => d.value < 70)
    .reverse()
    .slice(0, 3)
    .map((d) => ({ id: d.id, value: d.value, text: RECOMMENDATIONS[d.id] }));

  /* Optional information that would sharpen the estimate */
  const missing = [];
  const uploads = answers.uploads || {};
  if (!num(answers.currentPrice)) missing.push({ id: "currentPrice", label: { ar: "الأسعار الحالية", en: "Current pricing" } });
  if (!num(answers.visitorsPerYear)) missing.push({ id: "visitorsPerYear", label: { ar: "عدد الزوار الحاليين", en: "Current visitor numbers" } });
  if (!num(uploads.documents)) missing.push({ id: "documents", label: { ar: "صك الملكية أو المستندات", en: "Title deed or documents" } });
  if (num(uploads.photos) < 5) missing.push({ id: "photos", label: { ar: "صور إضافية للمباني والمساحات (٥ على الأقل)", en: "More photos of buildings and spaces (at least 5)" } });

  const confidence = missing.length <= 1 ? "high" : missing.length <= 2 ? "medium" : "low";

  return { score, dims, drivers, strengths, gaps, missing, confidence };
}

/** A short verdict for the score band (used as the report's headline). */
export function scoreBand(score) {
  if (score >= 80) return { id: "strong", label: { ar: "جاهزية عالية", en: "High readiness" }, text: { ar: "المزرعة قريبة من أن تصبح وجهة، وتحتاج تطويرًا محدودًا.", en: "The farm is close to being a destination and needs limited development." } };
  if (score >= 65) return { id: "promising", label: { ar: "فرصة واعدة", en: "Promising opportunity" }, text: { ar: "أساس جيد مع فجوات واضحة يمكن معالجتها في مرحلة التطوير.", en: "A good base with clear gaps that development can close." } };
  if (score >= 45) return { id: "developing", label: { ar: "تحتاج تطويرًا", en: "Needs development" }, text: { ar: "الفرصة قائمة، لكنها تحتاج استثمارًا أوليًا أكبر.", en: "The opportunity exists but needs a larger first investment." } };
  return { id: "early", label: { ar: "مرحلة مبكرة", en: "Early stage" }, text: { ar: "تحتاج المزرعة أساسيات قبل التفكير في التشغيل السياحي.", en: "The farm needs fundamentals before tourism operation." } };
}
