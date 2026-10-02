/* ==========================================================================
   Farm assessment schema
   Shared by the 7-step wizard (UI) and the scoring engine (services), so the
   questions asked and the way they are scored can never drift apart.
   ========================================================================== */

export const CITIES = [
  { id: "buraydah", label: { ar: "بريدة", en: "Buraydah" }, access: 1 },
  { id: "unaizah", label: { ar: "عنيزة", en: "Unaizah" }, access: 1 },
  { id: "rass", label: { ar: "الرس", en: "Al Rass" }, access: 0.85 },
  { id: "badaea", label: { ar: "البدائع", en: "Al Badaea" }, access: 0.85 },
  { id: "bukayriyah", label: { ar: "البكيرية", en: "Al Bukayriyah" }, access: 0.8 },
  { id: "mithnab", label: { ar: "المذنب", en: "Al Mithnab" }, access: 0.75 },
  { id: "khabra", label: { ar: "رياض الخبراء", en: "Riyadh Al Khabra" }, access: 0.75 },
  { id: "shimasiyah", label: { ar: "الشماسية", en: "Al Shimasiyah" }, access: 0.7 },
  { id: "jiwa", label: { ar: "عيون الجواء", en: "Uyun Al Jiwa" }, access: 0.7 },
  { id: "other", label: { ar: "مدينة أو مركز آخر في القصيم", en: "Another town in Qassim" }, access: 0.6 },
];

export const BUILDING_CONDITIONS = [
  { id: "excellent", label: { ar: "ممتازة", en: "Excellent" }, desc: { ar: "صالحة للضيافة الآن", en: "Ready for guests now" }, factor: 1 },
  { id: "good", label: { ar: "جيدة", en: "Good" }, desc: { ar: "تحتاج تحسينات بسيطة", en: "Needs light improvements" }, factor: 0.75 },
  { id: "fair", label: { ar: "متوسطة", en: "Fair" }, desc: { ar: "تحتاج ترميمًا جزئيًا", en: "Needs partial restoration" }, factor: 0.45 },
  { id: "poor", label: { ar: "تحتاج تأهيلًا كاملًا", en: "Needs full rework" }, desc: { ar: "أو لا توجد مبانٍ صالحة", en: "Or no usable buildings" }, factor: 0.15 },
];

/* Facilities: weight is their share of the infrastructure score */
export const FACILITIES = [
  { id: "electricity", label: { ar: "كهرباء", en: "Electricity" }, desc: { ar: "توصيل دائم", en: "Permanent connection" }, icon: "bolt", infra: 24 },
  { id: "water", label: { ar: "مياه", en: "Water" }, desc: { ar: "بئر أو شبكة", en: "Well or mains" }, icon: "drop", infra: 24 },
  { id: "restrooms", label: { ar: "دورات مياه", en: "Restrooms" }, desc: { ar: "صالحة للزوار", en: "Suitable for guests" }, icon: "door", infra: 14 },
  { id: "parking", label: { ar: "مواقف", en: "Parking" }, desc: { ar: "١٠ سيارات أو أكثر", en: "10+ cars" }, icon: "car", infra: 10 },
  { id: "kitchen", label: { ar: "مطبخ", en: "Kitchen" }, desc: { ar: "يمكن تجهيزه للضيافة", en: "Can serve guests" }, icon: "pot", infra: 10 },
  { id: "outdoor", label: { ar: "مساحات خارجية", en: "Outdoor areas" }, desc: { ar: "جلسات، ظل، ممرات", en: "Seating, shade, paths" }, icon: "palm", infra: 0 },
  { id: "accommodation", label: { ar: "مكان للإقامة", en: "Accommodation" }, desc: { ar: "غرف يمكن المبيت فيها", en: "Rooms guests can sleep in" }, icon: "bed", infra: 0 },
];

export const CURRENT_SERVICES = [
  { id: "day-visits", label: { ar: "زيارات نهارية", en: "Day visits" } },
  { id: "stays", label: { ar: "مبيت", en: "Overnight stays" } },
  { id: "events", label: { ar: "مناسبات وفعاليات", en: "Events" } },
  { id: "produce", label: { ar: "بيع منتجات المزرعة", en: "Selling farm produce" } },
  { id: "workshops", label: { ar: "ورش أو أنشطة", en: "Workshops or activities" } },
  { id: "none", label: { ar: "لا توجد خدمات حاليًا", en: "No services yet" } },
];

export const MAINTENANCE_LEVELS = [
  { id: "regular", label: { ar: "منتظمة", en: "Regular" }, desc: { ar: "جدول صيانة وعمالة ثابتة", en: "Schedule and steady crew" }, score: 26 },
  { id: "occasional", label: { ar: "عند الحاجة", en: "When needed" }, desc: { ar: "إصلاحات متفرقة", en: "Ad hoc repairs" }, score: 15 },
  { id: "none", label: { ar: "لا توجد", en: "None" }, desc: { ar: "المزرعة غير مُدارة حاليًا", en: "The farm isn't managed now" }, score: 4 },
];

/* Dimension weights. Physical fundamentals (infrastructure, access) are the
   hardest and most expensive to change, so they carry the most weight;
   experiences are what Rif can most easily build on top. */
export const DIMENSIONS = [
  { id: "infrastructure", label: { ar: "البنية التحتية", en: "Infrastructure" }, weight: 0.3 },
  { id: "accessibility", label: { ar: "سهولة الوصول", en: "Accessibility" }, weight: 0.3 },
  { id: "accommodation", label: { ar: "الإقامة", en: "Accommodation" }, weight: 0.15 },
  { id: "operations", label: { ar: "الجاهزية التشغيلية", en: "Operational readiness" }, weight: 0.15 },
  { id: "experiences", label: { ar: "التجارب", en: "Experiences" }, weight: 0.1 },
];

/* Required fields per wizard step (UI uses this for validation) */
export const WIZARD_STEPS = [
  { id: "basics", title: { ar: "معلومات أساسية", en: "Basics" }, required: ["farmName", "city", "assetType", "distanceKm"] },
  { id: "area", title: { ar: "المساحة", en: "Area" }, required: ["totalArea", "usableArea"] },
  { id: "buildings", title: { ar: "المباني", en: "Buildings" }, required: ["buildings", "rooms", "buildingCondition"] },
  { id: "facilities", title: { ar: "المرافق", en: "Facilities" }, required: ["facilities"] },
  { id: "services", title: { ar: "الخدمات الحالية", en: "Current services" }, required: ["services"] },
  { id: "operations", title: { ar: "التشغيل", en: "Operations" }, required: ["staff", "maintenance", "annualCosts"] },
  { id: "uploads", title: { ar: "الصور والمستندات", en: "Photos & documents" }, required: ["photos"] },
];

/* The sample farm behind the clearly labelled "example report" (owners see
   what they'll receive before starting). Scored live by the same engine as a
   real submission; it is the demo owner's farm (مزرعة الريحان, 78). */
export const SAMPLE_ANSWERS = {
  ownerName: "أحمد السالم",
  farmName: { ar: "مزرعة الريحان", en: "Al Raihan Farm" },
  city: "buraydah",
  assetType: "palm-farm",
  distanceKm: 8,
  totalArea: 24000,
  usableArea: 5000,
  buildings: 3,
  rooms: 3,
  buildingCondition: "good",
  facilities: ["electricity", "water", "parking", "kitchen", "accommodation"],
  services: ["day-visits", "produce"],
  currentPrice: 150,
  visitorsPerYear: 800,
  bookingsPerYear: 0,
  staff: 3,
  maintenance: "regular",
  annualCosts: 120000,
  uploads: { photos: 6, documents: 1, pricing: 0 },
};
