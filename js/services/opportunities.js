/* ==========================================================================
   Development opportunities
   Read from the existing development plan (feasibility.derivePlan) and the
   owner's answers. No new numbers: room counts and day capacity come from
   the same plan the scenarios use. Status follows the farm's pipeline stage.
   ========================================================================== */

import { derivePlan } from "./feasibility.js";
import { MODEL_CONSTANTS } from "../data/assumptions.js";

const IDEAS = {
  "palm-farm": { ar: "قطف التمر، وورش السعف، وعشاء تحت النخيل", en: "Date picking, frond workshops, dinner under the palms" },
  "mixed-farm": { ar: "يوم الحصاد، وغداء المزرعة، وزيارات المدارس", en: "Harvest days, farm lunches, school visits" },
  heritage: { ar: "إقامة تراثية، وأمسيات الحكايات، وعشاء تراثي", en: "Heritage stays, storytelling evenings, heritage dinners" },
  estate: { ar: "إقامة عائلية، ومناسبات صغيرة، وعطلات نهاية الأسبوع", en: "Family stays, small events, weekends" },
  land: { ar: "مخيم موسمي، ومسار الغروب، وليالي النجوم", en: "A seasonal camp, sunset trails, stargazing nights" },
};

/** Where an opportunity stands, from the farm's pipeline stage. */
export function opportunityStatus(stage) {
  if (stage === "operating") return { id: "live", label: { ar: "قيد التشغيل", en: "Live" } };
  if (stage === "development") return { id: "building", label: { ar: "قيد التطوير", en: "In development" } };
  if (["visit", "feasibility", "contract"].includes(stage)) return { id: "study", label: { ar: "قيد الدراسة", en: "Being studied" } };
  return { id: "proposed", label: { ar: "مقترحة", en: "Proposed" } };
}

/**
 * @returns {{ id, icon, title:{ar,en}, what:{ar,en}, why:{ar,en}, next:{ar,en} }[]}
 */
export function buildOpportunities(answers = {}) {
  const plan = derivePlan(answers);
  const fac = new Set(answers.facilities || []);
  const services = answers.services || [];
  const list = [];

  if (plan.newRooms > 0) {
    list.push({
      id: "rooms",
      icon: "bed",
      title: { ar: `${plan.plannedRooms} غرف للضيافة`, en: `${plan.plannedRooms} guest rooms` },
      what: { ar: `تأهيل ${plan.rooms} قائمة وإضافة ${plan.newRooms} بحسب المساحة القابلة للاستخدام.`, en: `Convert ${plan.rooms} existing rooms and add ${plan.newRooms}, based on usable area.` },
      why: { ar: "الإقامة ترفع متوسط قيمة الزيارة وتمد الموسم إلى عطلات نهاية الأسبوع.", en: "Stays raise visit value and stretch the season into weekends." },
      next: { ar: "تُقاس المباني في المعاينة الميدانية لتأكيد العدد والتكلفة.", en: "Buildings are measured at the site visit to confirm count and cost." },
    });
  } else if (plan.rooms > 0) {
    list.push({
      id: "rooms",
      icon: "bed",
      title: { ar: `${plan.rooms} غرف جاهزة للتأهيل`, en: `${plan.rooms} rooms ready to convert` },
      what: { ar: "عدد الغرف القائم يكفي لنموذج إقامة دون بناء جديد.", en: "Existing rooms are enough for a stay model without new building." },
      why: { ar: "تأهيل القائم أسرع وأقل تكلفة من البناء.", en: "Converting is faster and cheaper than building." },
      next: { ar: "تقدير تكلفة التأهيل في الدراسة التفصيلية.", en: "Refurbishment cost is estimated in the detailed study." },
    });
  }

  if (plan.dayCapacity > 0) {
    list.push({
      id: "day",
      icon: "users",
      title: { ar: `حتى ${plan.dayCapacity} زائر يوميًا`, en: `Up to ${plan.dayCapacity} day guests` },
      what: { ar: `سعة نهارية تقديرية بمعدل زائر لكل ${MODEL_CONSTANTS.sqmPerDayVisitor} م² قابلة للاستخدام.`, en: `Estimated day capacity at one guest per ${MODEL_CONSTANTS.sqmPerDayVisitor} m² usable.` },
      why: { ar: "الزيارات النهارية أسرع طريق إلى أول إيراد، دون انتظار الغرف.", en: "Day visits are the fastest route to first revenue, without waiting for rooms." },
      next: { ar: "تحديد مسارات الزوار والجلسات والمواقف.", en: "Lay out guest paths, seating and parking." },
    });
  }

  list.push({
    id: "experiences",
    icon: "leaf",
    title: { ar: "تجارب من طبيعة الأرض", en: "Experiences from the land itself" },
    what: IDEAS[answers.assetType] || IDEAS.land,
    why: { ar: "التجارب هي ما يميز الوجهة عن استراحة عادية، وما يحجزه الزائر فعلًا.", en: "Experiences set a destination apart from a rest house, and they are what guests book." },
    next: { ar: "يصمم فريق ريف التجارب بعد المعاينة، مع أهل المكان.", en: "The Rif team designs experiences after the visit, with local people." },
  });

  if (fac.has("kitchen")) {
    list.push({
      id: "food",
      icon: "pot",
      title: { ar: "طعام من المزرعة", en: "Food from the farm" },
      what: { ar: "المطبخ القائم يسمح بفطور وعشاء ضمن الباقات.", en: "The existing kitchen allows breakfast and dinner in packages." },
      why: { ar: "الطعام يرفع الإنفاق ويجعل اليوم الريفي كاملًا.", en: "Food raises spend and makes a full rural day." },
      next: { ar: "فحص المطبخ وتجهيزاته في المعاينة.", en: "Kitchen and equipment checked at the visit." },
    });
  }

  if (services.includes("produce")) {
    list.push({
      id: "products",
      icon: "coin",
      title: { ar: "منتجات للزوار", en: "Products for visitors" },
      what: { ar: "بيع المحصول للزوار مباشرة، كصندوق تمر أو سلة خضار.", en: "Sell the harvest straight to visitors, as a box of dates or a basket." },
      why: { ar: "يرفع متوسط الإنفاق دون تكلفة تطوير تذكر.", en: "Raises average spend with almost no development cost." },
      next: { ar: "اختيار المنتجات وتغليفها.", en: "Choose products and packaging." },
    });
  }

  return list;
}
