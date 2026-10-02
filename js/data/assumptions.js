/* ==========================================================================
   Feasibility assumptions — MODEL ASSUMPTIONS, ILLUSTRATIVE FOR THE PROTOTYPE
   None of these is a measured cost or price for a specific item; each needs
   operational validation (يحتاج تحقق تشغيلي).
   These are editable by the owner on the result page. They are not market
   research, and every figure derived from them is labelled
   "تقديري · محاكاة" (estimate · simulated).
   ========================================================================== */

import { BENCHMARKS } from "./prices.js";
import { getExperienceById } from "./experiences.js";

/* Nights in a "MM-DD" → "MM-DD" season (non-leap year) */
function seasonNights({ from, to }) {
  const day = (md) => {
    const [m, d] = md.split("-").map(Number);
    return Math.round((Date.UTC(2027, m - 1, d) - Date.UTC(2027, 0, 1)) / 864e5);
  };
  const a = day(from);
  const b = day(to);
  return b >= a ? b - a + 1 : 365 - a + b + 1;
}

/* A winter camp's open nights, read from Rawdat Al Ghada's tent season */
export const WINTER_SEASON_NIGHTS = seasonNights(getExperienceById("stay-desert-tent").availability.season);

export const ASSUMPTIONS = [
  {
    key: "avgBookingValue",
    label: { ar: "متوسط قيمة الليلة", en: "Average night value" },
    help: { ar: "متوسط ما يدفعه الضيف لليلة إقامة واحدة.", en: "What a guest pays on average for one night." },
    unit: "sar",
    default: BENCHMARKS.avgNightValue,
    min: 200,
    max: 3000,
    step: 25,
  },
  {
    key: "occupancy",
    label: { ar: "نسبة الإشغال", en: "Occupancy" },
    help: { ar: "نسبة الليالي المحجوزة من ليالي فتح الإقامة. افتراض نموذج.", en: "Share of open nights that are booked. A model assumption." },
    unit: "percent",
    default: 0.42,
    min: 0.1,
    max: 0.9,
    step: 0.01,
  },
  {
    key: "stayNights",
    label: { ar: "ليالي فتح الإقامة في السنة", en: "Nights open for stays per year" },
    help: {
      ar: `افتراض نموذج. ٣٦٥ للإقامة على مدار العام. للإقامة الموسمية، مثل مخيم شتوي من نوفمبر إلى مارس، ${WINTER_SEASON_NIGHTS} ليلة، وتُطبَّق نسبة الإشغال على هذه الليالي فقط.`,
      en: `A model assumption. 365 for year-round stays. For seasonal stays, such as a November–March winter camp, ${WINTER_SEASON_NIGHTS} nights; occupancy applies to these nights only.`,
    },
    unit: "nights",
    default: 365,
    min: 30,
    max: 365,
    step: 1,
  },
  {
    key: "utilization",
    label: { ar: "نسبة استخدام الطاقة النهارية", en: "Day-capacity utilisation" },
    help: { ar: "كم يُستخدم من سعة الزوار النهارية في أيام التشغيل.", en: "How much of the daily visitor capacity is used on operating days." },
    unit: "percent",
    default: 0.35,
    min: 0.05,
    max: 0.9,
    step: 0.01,
  },
  {
    key: "avgSpend",
    label: { ar: "متوسط إنفاق الزائر النهاري", en: "Average day-visitor spend" },
    help: { ar: "يشمل التجارب والطعام والمنتجات.", en: "Includes experiences, food and products." },
    unit: "sar",
    default: BENCHMARKS.avgDayVisitorSpend,
    min: 40,
    max: 1000,
    step: 10,
  },
  {
    key: "opexRatio",
    label: { ar: "تكلفة التشغيل من الإيراد", en: "Operating cost as share of revenue" },
    help: {
      ar: "رواتب، صيانة، مواد، تسويق، وعمولة التشغيل. نسبة افتراضية واحدة لكل الأنشطة، وليست تكلفة فعلية لكل تجربة أو وجبة؛ يحتاج تحقق تشغيلي.",
      en: "Staff, maintenance, supplies, marketing and operating fee. One assumed share for every activity, not the actual cost of each experience or meal; needs operational validation.",
    },
    unit: "percent",
    default: 0.55,
    min: 0.25,
    max: 0.85,
    step: 0.01,
  },
  {
    key: "devCostPerSqm",
    label: { ar: "تكلفة التطوير للمتر", en: "Development cost per m²" },
    help: { ar: "لكل متر مربع من المساحة السياحية: ممرات، جلسات، إنارة، تنسيق.", en: "Per m² of tourism area: paths, seating, lighting, landscaping." },
    unit: "sarPerSqm",
    default: 380,
    min: 50,
    max: 2000,
    step: 10,
  },
  {
    key: "newRoomCost",
    label: { ar: "تكلفة الغرفة الجديدة", en: "Cost per new room" },
    help: { ar: "بناء أو تأهيل غرفة ضيافة واحدة بتجهيزها.", en: "Building or converting one furnished guest room." },
    unit: "sar",
    default: 140000,
    min: 30000,
    max: 600000,
    step: 5000,
  },
];

/** Fixed modelling constants (shown in the method note, not editable) */
export const MODEL_CONSTANTS = {
  operatingDays: 300, // days a year open to day visitors
  sqmPerDayVisitor: 150, // usable m² per simultaneous day visitor
  maxDayCapacity: 120,
  sqmPerNewRoom: 2000, // one new room per 2,000 m² usable, when rooms are few
  maxNewRooms: 6,
  targetRooms: 6, // below this, the model plans new rooms
  continuingCostShare: 0.4, // share of current annual costs that continue
  refurbishShare: 0.18, // refurbishment of existing rooms, as share of new-room cost
};

export const SCENARIOS = [
  {
    id: "conservative",
    label: { ar: "متحفظ", en: "Conservative" },
    desc: { ar: "طلب أبطأ وتكاليف أعلى من المتوقع.", en: "Slower demand and higher costs than expected." },
    factors: { price: 0.9, occupancy: 0.75, utilization: 0.75, opex: 1.08, capex: 1.12 },
  },
  {
    id: "base",
    label: { ar: "أساسي", en: "Base" },
    desc: { ar: "الافتراضات كما هي.", en: "The assumptions as entered." },
    factors: { price: 1, occupancy: 1, utilization: 1, opex: 1, capex: 1 },
  },
  {
    id: "optimistic",
    label: { ar: "متفائل", en: "Optimistic" },
    desc: { ar: "طلب أقوى وتشغيل أكفأ.", en: "Stronger demand and leaner operations." },
    factors: { price: 1.1, occupancy: 1.2, utilization: 1.25, opex: 0.95, capex: 0.95 },
  },
];

export const defaultAssumptions = () =>
  Object.fromEntries(ASSUMPTIONS.map((a) => [a.key, a.default]));
