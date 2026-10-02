/* ==========================================================================
   Media registry
   ---------------------------------------------------------------------------
   Every image in the product is referenced by a key (e.g. "sidr-hero").
   Components never hard-code an image; they ask for a key.

   TO ADD REAL PHOTOGRAPHY
   1. Put the photo in /assets/images/ (any size; 2400px wide is ideal for
      heroes, 1600px for cards).
   2. Set `src` for that key below, e.g.
        "sidr-hero": photo("sidr-hero.jpg", ...)
      or edit an entry's src directly: src: "assets/images/sidr-hero.jpg"
   3. Optional: adjust `focal` ("50% 30%") to keep the subject in frame.

   Layout never changes: slots keep their aspect ratio whether they show a
   photo or the demo scene. Entries without `src` render the DEMO scene,
   labelled "صورة توضيحية".
   ========================================================================== */

/**
 * scene: which demo composition to draw (see components/media.js)
 * tone:  dawn | day | dusk | night  (light/colour of the scene)
 * seed:  varies the composition so repeated scenes don't look identical
 */
const m = (scene, tone, alt, seed = 1, extra = {}) => ({
  src: null,
  focal: "50% 50%",
  scene,
  tone,
  seed,
  alt,
  ...extra,
});

export const MEDIA = {
  /* ---- Homepage story ------------------------------------------------ */
  "home-hero": m("dusk", "dusk", { ar: "بستان نخيل عند الغروب في القصيم", en: "A palm grove at sunset in Qassim" }, 3),
  "story-land": m("field", "dawn", { ar: "أرض زراعية مفتوحة عند الفجر", en: "Open farmland at dawn" }, 2),
  "story-potential": m("grove", "day", { ar: "صفوف النخيل في بستان قائم", en: "Rows of palms in an existing grove" }, 4),
  "story-assessment": m("field", "day", { ar: "قطعة أرض تُقرأ للتقييم", en: "A plot being read for assessment" }, 5),
  "story-development": m("mudbrick", "day", { ar: "مبنى طيني يُعاد تأهيله", en: "A mud-brick building being restored" }, 2),
  "story-operation": m("courtyard", "dusk", { ar: "حوش ضيافة جاهز لاستقبال الزوار", en: "A hospitality courtyard ready for guests" }, 1),
  "story-destination": m("dusk", "dusk", { ar: "وجهة ريفية مكتملة عند الغروب", en: "A finished rural destination at sunset" }, 7),
  "story-experience": m("craft", "day", { ar: "يدان تعملان على سعف النخيل", en: "Hands weaving palm fronds" }, 1),
  "story-visitor": m("table", "dusk", { ar: "مائدة قصيمية معدّة للضيوف", en: "A Qassimi table set for guests" }, 2),
  "story-impact": m("harvest", "day", { ar: "صناديق تمر من حصاد المزرعة", en: "Crates of dates from the farm harvest" }, 1),
  "owners-hero": m("grove", "dawn", { ar: "بستان في الصباح الباكر", en: "A grove in the early morning" }, 9),

  /* ---- مزرعة السدر --------------------------------------------------- */
  "sidr-hero": m("grove", "dusk", { ar: "مزرعة السدر: ممر بين النخيل عند الغروب", en: "Al Sidr Farm: a path between palms at sunset" }, 11),
  "sidr-card": m("dusk", "dusk", { ar: "مزرعة السدر", en: "Al Sidr Farm" }, 12),
  "sidr-stay": m("mudbrick", "dusk", { ar: "غرف البستان في مزرعة السدر", en: "Garden rooms at Al Sidr" }, 3),
  "sidr-suite": m("courtyard", "night", { ar: "جناح الحوش ليلًا", en: "The courtyard suite at night" }, 4),
  "sidr-guesthouse": m("mudbrick", "day", { ar: "بيت الضيافة العائلي", en: "The family guesthouse" }, 6),
  "sidr-food": m("table", "day", { ar: "فطور قصيمي: كليجا وتمر وقهوة", en: "Qassimi breakfast: kleija, dates and coffee" }, 3),
  "sidr-dinner": m("night", "night", { ar: "عشاء تحت النخيل", en: "Dinner under the palms" }, 2),
  "sidr-channel": m("channel", "dawn", { ar: "ساقية ماء بين صفوف النخيل", en: "A water channel between palm rows" }, 1),
  "sidr-craft": m("craft", "day", { ar: "ورشة سعف النخيل", en: "Palm frond workshop" }, 5),
  "sidr-sunset": m("dunes", "dusk", { ar: "مسار الغروب على طرف المزرعة", en: "The sunset trail at the farm's edge" }, 2),
  "sidr-harvest": m("harvest", "day", { ar: "تمر السكري بعد القطف", en: "Sukkari dates after picking" }, 4),

  /* ---- نُزل الطين ------------------------------------------------------ */
  "tin-hero": m("mudbrick", "dusk", { ar: "نُزل الطين في عنيزة", en: "Nuzul Al Tin in Unaizah" }, 21),
  "tin-card": m("mudbrick", "dawn", { ar: "واجهة نُزل الطين", en: "Nuzul Al Tin facade" }, 22),
  "tin-room": m("courtyard", "day", { ar: "غرفة طينية بسقف من الأثل", en: "A mud room with a tamarisk ceiling" }, 23),
  "tin-evening": m("night", "night", { ar: "مساء في الحوش", en: "Evening in the courtyard" }, 24),
  "tin-food": m("table", "dusk", { ar: "عشاء تراثي", en: "A heritage dinner" }, 25),

  /* ---- ظلال النخيل ---------------------------------------------------- */
  "dilal-hero": m("grove", "day", { ar: "ظلال النخيل في البكيرية", en: "Dilal Al Nakheel in Al Bukayriyah" }, 31),
  "dilal-card": m("grove", "dawn", { ar: "بستان ظلال النخيل", en: "Dilal Al Nakheel grove" }, 32),
  "dilal-craft": m("craft", "day", { ar: "ورشة خوص", en: "A palm-leaf weaving workshop" }, 33),
  "dilal-lunch": m("table", "day", { ar: "غداء في الظل", en: "Lunch in the shade" }, 34),

  /* ---- روضة الغضا ----------------------------------------------------- */
  "ghada-hero": m("dunes", "dusk", { ar: "روضة الغضا عند الغروب", en: "Rawdat Al Ghada at sunset" }, 41),
  "ghada-card": m("dunes", "night", { ar: "مخيم روضة الغضا ليلًا", en: "Rawdat Al Ghada camp at night" }, 42),
  "ghada-tent": m("night", "night", { ar: "خيمة الغضا", en: "The Ghada tent" }, 43),
  "ghada-stars": m("night", "night", { ar: "ليلة النجوم", en: "Stargazing night" }, 44),

  /* ---- دار الحصاد ------------------------------------------------------ */
  "hasad-hero": m("field", "day", { ar: "حقول دار الحصاد في المذنب", en: "Dar Al Hasad fields in Al Mithnab" }, 51),
  "hasad-card": m("harvest", "day", { ar: "حصاد اليوم", en: "Today's harvest" }, 52),
  "hasad-field": m("field", "dawn", { ar: "صفوف الخضار", en: "Vegetable rows" }, 53),
  "hasad-lunch": m("table", "day", { ar: "غداء المزرعة", en: "Farm lunch" }, 54),

  /* ---- مزرعة الوسم ----------------------------------------------------- */
  "wasm-hero": m("mudbrick", "day", { ar: "مزرعة الوسم قيد التطوير", en: "Al Wasm Farm under development" }, 61),
  "wasm-card": m("grove", "dusk", { ar: "مزرعة الوسم", en: "Al Wasm Farm" }, 62),
  "wasm-channel": m("channel", "day", { ar: "قناة الري في الوسم", en: "Irrigation channel at Al Wasm" }, 63),

  /* ---- Experiences & products ---------------------------------------- */
  "exp-palm-morning": m("grove", "dawn", { ar: "صباح بين النخيل", en: "Morning among the palms" }, 71),
  "exp-kleija": m("table", "day", { ar: "ورشة الكليجا", en: "Kleija workshop" }, 72),
  "exp-date-picking": m("harvest", "day", { ar: "قطف التمر", en: "Date picking" }, 73),
  "exp-sunset": m("dunes", "dusk", { ar: "مسار الغروب", en: "Sunset trail" }, 74),
  "exp-harvest-day": m("field", "day", { ar: "يوم الحصاد", en: "Harvest day" }, 75),
  "exp-stars": m("night", "night", { ar: "ليلة النجوم", en: "Stargazing night" }, 76),
  "exp-date-nights": m("night", "dusk", { ar: "ليالي موسم التمور", en: "Date season nights" }, 77),
  "product-sukkari": m("harvest", "dusk", { ar: "صندوق سكري", en: "Sukkari box" }, 78),
  "product-kleija": m("table", "dusk", { ar: "علبة كليجا", en: "Kleija box" }, 79),
  "pkg-full-day": m("dusk", "dusk", { ar: "يوم ريفي كامل", en: "A full rural day" }, 81),
  "pkg-weekend": m("courtyard", "night", { ar: "عطلة نهاية أسبوع", en: "A weekend stay" }, 82),
  "pkg-mud-evening": m("night", "dusk", { ar: "مساء الطين", en: "An evening at Al Tin" }, 83),
  "pkg-harvest-family": m("field", "day", { ar: "يوم العائلة في الحصاد", en: "Family harvest day" }, 84),
};

/** Look up a media entry, falling back to a neutral scene for unknown keys. */
export function getMedia(key) {
  return MEDIA[key] || m("grove", "day", { ar: "صورة توضيحية", en: "Illustrative image" }, (key || "").length);
}
