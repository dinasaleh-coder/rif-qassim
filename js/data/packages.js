/* ==========================================================================
   Packages — FICTIONAL DEMO DATA
   pricing.model:
     "person"  → basePrice × guests
     "booking" → basePrice covers `includedGuests`; each extra guest adds
                 `extraGuestPrice`, and stays add `extraRoomPrice` for each
                 room needed beyond the included ones (roomCapacity per room).
   All values come from js/data/prices.js (see packageBreakdown there).
   Add-on unit: "person" (× guests) or "booking" (once).
   All prices exclude 15% VAT, which is added at checkout.
   ========================================================================== */

import { packagePricing, addOnPrice } from "./prices.js";

export const VAT_RATE = 0.15;

export const PACKAGES = [
  {
    id: "pkg-full-day",
    destinationId: "sidr",
    title: { ar: "يوم ريفي كامل", en: "A full rural day" },
    summary: {
      ar: "من قهوة الصباح إلى عشاء الحوش: يوم واحد يجمع أجمل ما في السدر.",
      en: "From morning coffee to courtyard dinner: one day with the best of Al Sidr.",
    },
    durationHours: 12,
    timeWindow: { ar: "٨:٠٠ ص حتى ٨:٠٠ م", en: "8:00 am to 8:00 pm" },
    pricing: packagePricing("pkg-full-day"),
    minGuests: 1,
    maxGuests: 12,
    availability: { days: [0, 1, 2, 3, 4, 5, 6], leadDays: 1, windowDays: 120 },
    includes: [
      { ar: "جولة البستان مع المزارع", en: "Grove walk with the grower" },
      { ar: "فطور قصيمي", en: "Qassimi breakfast" },
      { ar: "ورشة سعف النخيل", en: "Palm frond workshop" },
      { ar: "عشاء ريفي في الحوش", en: "Rural dinner in the courtyard" },
      { ar: "مسار الغروب", en: "Sunset trail" },
    ],
    schedule: [
      { time: "08:00", title: { ar: "الوصول وقهوة الترحيب", en: "Arrival and welcome coffee" } },
      { time: "08:30", title: { ar: "فطور قصيمي بين النخيل", en: "Qassimi breakfast among the palms" } },
      { time: "10:00", title: { ar: "جولة البستان وقت السقي", en: "Grove walk at watering time" } },
      { time: "12:30", title: { ar: "ورشة سعف النخيل", en: "Palm frond workshop" } },
      { time: "14:00", title: { ar: "وقت حر وراحة في الجلسات", en: "Free time in the shaded seating" } },
      { time: "17:00", title: { ar: "مسار الغروب إلى الكثيب", en: "Sunset trail to the dune" } },
      { time: "18:45", title: { ar: "عشاء ريفي في الحوش", en: "Rural dinner in the courtyard" } },
    ],
    addOns: [
      {
        id: "kleija",
        title: { ar: "ورشة الكليجا", en: "Kleija workshop" },
        desc: { ar: "ساعتان في فرن المزرعة، وتأخذ ما تخبزه معك.", en: "Two hours at the farm oven; take your bake home." },
        ...addOnPrice("pkg-full-day", "kleija"),
      },
      {
        id: "dinner",
        title: { ar: "ترقية العشاء", en: "Dinner upgrade" },
        desc: { ar: "عشاء خاص تحت النخيل بقائمة الموسم بدل العشاء الجماعي.", en: "A private dinner under the palms with the seasonal menu instead of the shared dinner." },
        ...addOnPrice("pkg-full-day", "dinner"),
      },
      {
        id: "sukkari",
        title: { ar: "صندوق سكري للعودة", en: "Sukkari box to take home" },
        desc: { ar: "٣ كيلو من تمر المزرعة.", en: "3 kg of the farm's dates." },
        ...addOnPrice("pkg-full-day", "sukkari"),
      },
      {
        id: "photographer",
        title: { ar: "مصوّر للعائلة", en: "Family photographer" },
        desc: { ar: "ساعة تصوير عند الغروب، و٣٠ صورة معدّلة.", en: "One hour at sunset, 30 edited photos." },
        ...addOnPrice("pkg-full-day", "photographer"),
      },
      {
        id: "transfer",
        title: { ar: "نقل من بريدة وإليها", en: "Transfer from and to Buraydah" },
        desc: { ar: "سيارة خاصة حتى ٦ ركاب.", en: "Private car for up to 6 passengers." },
        ...addOnPrice("pkg-full-day", "transfer"),
      },
    ],
    policy: {
      ar: "الإلغاء مجاني حتى ٤٨ ساعة قبل الموعد (سياسة توضيحية في النموذج).",
      en: "Free cancellation up to 48 hours before (illustrative policy in the prototype).",
    },
    media: "pkg-full-day",
    featured: true,
  },
  {
    id: "pkg-weekend",
    destinationId: "sidr",
    title: { ar: "عطلة نهاية الأسبوع في السدر", en: "A weekend at Al Sidr" },
    summary: {
      ar: "ليلتان في غرف البستان مع الفطور وعشاء واحد تحت النخيل.",
      en: "Two nights in the garden rooms with breakfast and one dinner under the palms.",
    },
    durationHours: 48,
    timeWindow: { ar: "من الخميس ٣ م إلى السبت ١٢ م", en: "Thursday 3 pm to Saturday 12 pm" },
    pricing: packagePricing("pkg-weekend"),
    minGuests: 1,
    maxGuests: 4,
    availability: { days: [4], leadDays: 2, windowDays: 120 },
    includes: [
      { ar: "ليلتان في غرف البستان", en: "Two nights in a garden room" },
      { ar: "فطور قصيمي يوميًا", en: "Daily Qassimi breakfast" },
      { ar: "عشاء تحت النخيل", en: "Dinner under the palms" },
      { ar: "جولة البستان", en: "Grove walk" },
    ],
    schedule: [
      { time: "15:00", title: { ar: "الوصول يوم الخميس", en: "Thursday arrival" } },
      { time: "19:30", title: { ar: "عشاء تحت النخيل", en: "Dinner under the palms" } },
      { time: "08:00", title: { ar: "الجمعة: فطور وجولة البستان", en: "Friday: breakfast and grove walk" } },
      { time: "12:00", title: { ar: "السبت: المغادرة", en: "Saturday: check-out" } },
    ],
    addOns: [
      { id: "kleija", title: { ar: "ورشة الكليجا", en: "Kleija workshop" }, desc: { ar: "صباح الجمعة.", en: "Friday morning." }, ...addOnPrice("pkg-weekend", "kleija") },
      { id: "sukkari", title: { ar: "صندوق سكري للعودة", en: "Sukkari box to take home" }, desc: { ar: "٣ كيلو من تمر المزرعة.", en: "3 kg of the farm's dates." }, ...addOnPrice("pkg-weekend", "sukkari") },
    ],
    policy: { ar: "الإلغاء مجاني حتى ٧ أيام قبل الوصول (سياسة توضيحية).", en: "Free cancellation up to 7 days before arrival (illustrative)." },
    media: "pkg-weekend",
  },
  {
    id: "pkg-mud-evening",
    destinationId: "tin",
    title: { ar: "مساء الطين", en: "An evening at Al Tin" },
    summary: {
      ar: "أمسية في حوش نُزل الطين: قهوة على السطح، وقصص المكان، وعشاء تراثي.",
      en: "An evening in Nuzul Al Tin's courtyard: roof-top coffee, local stories and a heritage dinner.",
    },
    durationHours: 4,
    timeWindow: { ar: "٥:٠٠ م حتى ٩:٠٠ م", en: "5:00 pm to 9:00 pm" },
    pricing: packagePricing("pkg-mud-evening"),
    minGuests: 2,
    maxGuests: 10,
    availability: { days: [3, 4, 5], leadDays: 1, windowDays: 90 },
    includes: [
      { ar: "قهوة العصر على السطح", en: "Afternoon coffee on the roof" },
      { ar: "جلسة حكايات مع راوٍ من عنيزة", en: "Stories with a storyteller from Unaizah" },
      { ar: "عشاء تراثي", en: "Heritage dinner" },
    ],
    schedule: [
      { time: "17:00", title: { ar: "قهوة على السطح", en: "Coffee on the roof" } },
      { time: "18:30", title: { ar: "حكايات البلدة القديمة", en: "Old town stories" } },
      { time: "19:30", title: { ar: "عشاء تراثي", en: "Heritage dinner" } },
    ],
    addOns: [
      { id: "walk", title: { ar: "مشي في البلدة القديمة", en: "Old town walk" }, desc: { ar: "قبل الأمسية، ساعة مع الراوي.", en: "Before the evening, an hour with the storyteller." }, ...addOnPrice("pkg-mud-evening", "walk") },
    ],
    policy: { ar: "الإلغاء مجاني حتى ٢٤ ساعة قبل الموعد (سياسة توضيحية).", en: "Free cancellation up to 24 hours before (illustrative)." },
    media: "pkg-mud-evening",
  },
  {
    id: "pkg-harvest-family",
    destinationId: "hasad",
    title: { ar: "يوم العائلة في الحصاد", en: "Family harvest day" },
    summary: {
      ar: "يوم للعائلة بين الحقول: قطف، وغداء المزرعة، وسلة خضار تعود بها.",
      en: "A family day in the fields: picking, a farm lunch and a basket of produce to take home.",
    },
    durationHours: 6,
    timeWindow: { ar: "٩:٠٠ ص حتى ٣:٠٠ م", en: "9:00 am to 3:00 pm" },
    pricing: packagePricing("pkg-harvest-family"),
    minGuests: 1,
    maxGuests: 10,
    availability: { days: [0, 2, 4, 5, 6], leadDays: 1, windowDays: 90 },
    includes: [
      { ar: "يوم الحصاد مع مهندس المزرعة", en: "Harvest day with the agronomist" },
      { ar: "غداء المزرعة", en: "Farm lunch" },
      { ar: "سلة خضار وفاكهة", en: "A produce basket" },
    ],
    schedule: [
      { time: "09:00", title: { ar: "الوصول والتعريف بالمزرعة", en: "Arrival and farm intro" } },
      { time: "09:30", title: { ar: "القطف والفرز", en: "Picking and sorting" } },
      { time: "12:30", title: { ar: "غداء المزرعة", en: "Farm lunch" } },
    ],
    addOns: [
      { id: "seedlings", title: { ar: "شتلات للمنزل", en: "Seedlings for home" }, desc: { ar: "٥ شتلات مع دليل عناية.", en: "5 seedlings with a care guide." }, ...addOnPrice("pkg-harvest-family", "seedlings") },
    ],
    policy: { ar: "الإلغاء مجاني حتى ٢٤ ساعة قبل الموعد (سياسة توضيحية).", en: "Free cancellation up to 24 hours before (illustrative)." },
    media: "pkg-harvest-family",
  },
];

export const getPackageById = (id) => PACKAGES.find((p) => p.id === id) || null;
