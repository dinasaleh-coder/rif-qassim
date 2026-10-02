/* ==========================================================================
   Destinations — FICTIONAL DEMO DATA
   Names, places, capacities and prices are invented for the prototype.
   Town names indicate a setting inside Qassim; no real property is implied.
   ========================================================================== */

import { destinationFrom, stayPrice } from "./prices.js";

export const DESTINATION_TYPES = {
  retreat: { ar: "ملاذ ريفي", en: "Farm retreat" },
  heritage: { ar: "إقامة تراثية", en: "Heritage stay" },
  day: { ar: "يوم ريفي", en: "Day escape" },
  camp: { ar: "مخيم صحراوي", en: "Desert camp" },
  agri: { ar: "تجربة زراعية", en: "Agri experience" },
  family: { ar: "مزرعة عائلية", en: "Family farm" },
};

export const AMENITIES = {
  parking: { ar: "مواقف", en: "Parking", icon: "car" },
  prayer: { ar: "مصلى", en: "Prayer room", icon: "moon" },
  family: { ar: "جلسات عائلية", en: "Family seating", icon: "users" },
  wifi: { ar: "إنترنت", en: "Wi-Fi", icon: "wifi" },
  firepit: { ar: "مشب", en: "Fire pit", icon: "flame" },
  kitchen: { ar: "مطبخ ضيافة", en: "Hospitality kitchen", icon: "pot" },
  accessible: { ar: "ممرات ميسّرة", en: "Step-free paths", icon: "path" },
  kids: { ar: "مساحة للأطفال", en: "Kids' area", icon: "sun" },
  shade: { ar: "جلسات مظللة", en: "Shaded seating", icon: "palm" },
  restrooms: { ar: "دورات مياه", en: "Restrooms", icon: "drop" },
};

export const DESTINATIONS = [
  {
    id: "sidr",
    name: { ar: "مزرعة السدر", en: "Al Sidr Farm" },
    town: { ar: "ضواحي بريدة", en: "Outskirts of Buraydah" },
    region: { ar: "القصيم", en: "Qassim" },
    type: "retreat",
    status: "open", // open | limited | season | soon
    ...destinationFrom("sidr"),
    capacity: { dayGuests: 24, rooms: 6 },
    tags: [
      { ar: "نخيل", en: "Palms" },
      { ar: "إقامة", en: "Stay" },
      { ar: "ورش", en: "Workshops" },
      { ar: "عائلات", en: "Families" },
    ],
    short: {
      ar: "ملاذ بين ٤٠٠ نخلة، بغرف طينية مطوّرة ومسار مشي يدور حول البستان.",
      en: "A retreat among 400 palms, with restored mud rooms and a walking loop around the grove.",
    },
    headline: { ar: "مكان هادئ بين النخيل.", en: "A quiet place among the palms." },
    story: {
      ar: "يبدأ الصباح هنا بصوت الماء في السواقي، وينتهي بقهوة على حافة البستان. كانت السدر مزرعة نخيل عائلية تعمل للحصاد فقط، ثم أعادت ريف قراءتها: غرف طينية قديمة صارت غرف ضيافة، وممر الري صار مسار مشي، والحوش صار مكان العشاء.",
      en: "Mornings start with water running through the channels and end with coffee at the edge of the grove. Al Sidr was a family palm farm that worked only for the harvest, until Rif read it differently: old mud rooms became guest rooms, the irrigation path became a walking trail, and the courtyard became the place for dinner.",
    },
    about: [
      {
        ar: "تمتد المزرعة على ٣٢ ألف متر مربع، منها ٨ آلاف متر مخصصة للضيافة. بقي الجزء الأكبر بستانًا عاملًا، ولهذا يرى الضيف المزرعة كما هي: سقي، وتلقيح، وقطف في موسمه.",
        en: "The farm covers 32,000 m², of which 8,000 m² are given to hospitality. Most of it is still a working grove, so guests see the farm as it is: watering, pollination, and picking in season.",
      },
      {
        ar: "تُدار الوجهة بفريق تشغيل من ريف بالشراكة مع العائلة المالكة، التي ما زالت تشرف على البستان وتقدّم ورشة السعف بنفسها.",
        en: "The destination is run by a Rif operations team in partnership with the owning family, who still look after the grove and lead the frond workshop themselves.",
      },
    ],
    facts: [
      { label: { ar: "النخيل", en: "Palms" }, value: { ar: "٤٠٠ نخلة سكري وخلاص", en: "400 Sukkari & Khalas palms" } },
      { label: { ar: "الإقامة", en: "Stay" }, value: { ar: "٦ غرف وجناح", en: "6 rooms and a suite" } },
      { label: { ar: "من بريدة", en: "From Buraydah" }, value: { ar: "قرابة ٢٥ دقيقة بالسيارة", en: "About 25 minutes by car" } },
      { label: { ar: "أفضل وقت", en: "Best time" }, value: { ar: "أكتوبر إلى مارس", en: "October to March" } },
    ],
    accommodation: [
      {
        name: { ar: "غرف البستان", en: "Garden rooms" },
        desc: { ar: "أربع غرف طينية مطوّرة تطل على صفوف النخيل، بسقف من خشب الأثل وفناء صغير لكل غرفة.", en: "Four restored mud rooms facing the palm rows, with tamarisk ceilings and a small patio each." },
        capacity: { ar: "حتى ضيفين", en: "Up to 2 guests" },
        priceFrom: stayPrice("sidr-garden-rooms"),
        media: "sidr-stay",
      },
      {
        name: { ar: "جناح الحوش", en: "Courtyard suite" },
        desc: { ar: "جناح بغرفتين حول حوش خاص فيه مشب، مناسب لعائلة صغيرة.", en: "A two-room suite around a private courtyard with a fire pit, suited to a small family." },
        capacity: { ar: "حتى ٤ ضيوف", en: "Up to 4 guests" },
        priceFrom: stayPrice("sidr-courtyard-suite"),
        media: "sidr-suite",
      },
      {
        name: { ar: "بيت الضيافة", en: "Guesthouse" },
        desc: { ar: "بيت مستقل بمطبخ ومجلس، يُحجز كاملًا للعائلات والمجموعات.", en: "A standalone house with a kitchen and majlis, booked whole for families and groups." },
        capacity: { ar: "حتى ٨ ضيوف", en: "Up to 8 guests" },
        priceFrom: stayPrice("sidr-guesthouse"),
        media: "sidr-guesthouse",
      },
    ],
    food: [
      { name: { ar: "فطور قصيمي", en: "Qassimi breakfast" }, desc: { ar: "كليجا من فرن المزرعة، وتمر سكري، ومراصيع، وقهوة بالهيل.", en: "Kleija from the farm oven, Sukkari dates, marasee' and cardamom coffee." } },
      { name: { ar: "غداء المزرعة", en: "Farm lunch" }, desc: { ar: "طبق اليوم من خضار البستان، يتغير حسب ما نضج.", en: "A dish of the day from the garden, changing with what's ripe." } },
      { name: { ar: "عشاء تحت النخيل", en: "Dinner under the palms" }, desc: { ar: "عشاء على الحطب في الحوش، بإضاءة خافتة وجلسة أرضية.", en: "A wood-fired dinner in the courtyard, low-lit, with floor seating." } },
    ],
    activities: [
      { name: { ar: "جولة البستان صباحًا", en: "Morning grove walk" }, desc: { ar: "مع مزارع المزرعة: كيف يُسقى النخيل ويُلقَّح ويُعتنى به.", en: "With the farm's grower: how palms are watered, pollinated and cared for." } },
      { name: { ar: "قطف التمر", en: "Date picking" }, desc: { ar: "في موسمه من أغسطس إلى أكتوبر، وتأخذ صندوقك معك.", en: "In season, August to October, and you take your box home." } },
      { name: { ar: "ورشة سعف النخيل", en: "Palm frond workshop" }, desc: { ar: "تصنع سلة صغيرة بيدك مع أم عبدالله.", en: "Weave a small basket by hand with Umm Abdullah." } },
      { name: { ar: "مسار الغروب", en: "Sunset trail" }, desc: { ar: "مشي هادئ إلى الكثيب على طرف المزرعة قبل المغرب.", en: "A quiet walk to the dune at the farm's edge before sunset." } },
    ],
    amenities: ["parking", "prayer", "family", "wifi", "firepit", "restrooms", "accessible", "shade"],
    experiences: ["exp-palm-morning", "exp-kleija", "exp-date-picking", "food-breakfast", "food-dinner", "stay-garden-room", "product-sukkari"],
    packages: ["pkg-full-day", "pkg-weekend"],
    media: { hero: "sidr-hero", card: "sidr-card" },
    gallery: ["sidr-channel", "sidr-food", "sidr-craft", "sidr-stay", "sidr-sunset", "sidr-harvest"],
    mapNote: { ar: "الموقع التقريبي: شمال غرب بريدة. يُرسل الموقع الدقيق مع تأكيد الحجز.", en: "Approximate area: north-west of Buraydah. Exact location is shared with booking confirmation." },
    map: { x: 0.42, y: 0.38 }, // position on the stylised Qassim map (0–1)
  },

  {
    id: "tin",
    name: { ar: "نُزل الطين", en: "Nuzul Al Tin" },
    town: { ar: "عنيزة", en: "Unaizah" },
    region: { ar: "القصيم", en: "Qassim" },
    type: "heritage",
    status: "limited",
    ...destinationFrom("tin"),
    capacity: { dayGuests: 16, rooms: 5 },
    tags: [
      { ar: "تراث", en: "Heritage" },
      { ar: "إقامة", en: "Stay" },
      { ar: "أزواج", en: "Couples" },
    ],
    short: {
      ar: "بيت طيني قديم أُعيد بناؤه بمواده الأصلية، بخمس غرف حول حوش واحد.",
      en: "An old mud house rebuilt with its original materials, five rooms around one courtyard.",
    },
    headline: { ar: "بيت عاد إلى الحياة.", en: "A house brought back to life." },
    story: {
      ar: "جدران سمكها نصف متر تحفظ برودة الصباح حتى العصر. أعاد فريق الترميم بناء النُزل بالطين والأثل والجريد، وأضاف ما يحتاجه الضيف اليوم دون أن يظهر: تكييف هادئ، وحمامات حديثة، وضوء دافئ.",
      en: "Half-metre walls hold the morning cool until the afternoon. The restoration team rebuilt the house with mud, tamarisk and palm ribs, and added what a guest needs today without it showing: quiet cooling, modern bathrooms, warm light.",
    },
    about: [
      { ar: "يقع النُزل على أطراف البلدة القديمة، ويمكن الوصول منه مشيًا إلى السوق الشعبي.", en: "The house sits on the edge of the old town, a walk from the traditional market." },
      { ar: "الإقامة للبالغين والعائلات الصغيرة، بحد أقصى ١٦ ضيفًا في اليوم.", en: "Stays are for adults and small families, with a maximum of 16 guests a day." },
    ],
    facts: [
      { label: { ar: "الغرف", en: "Rooms" }, value: { ar: "٥ غرف", en: "5 rooms" } },
      { label: { ar: "البناء", en: "Built with" }, value: { ar: "طين، أثل، جريد", en: "Mud, tamarisk, palm ribs" } },
      { label: { ar: "أفضل وقت", en: "Best time" }, value: { ar: "طوال العام", en: "Year-round" } },
    ],
    accommodation: [
      { name: { ar: "غرفة الطين", en: "Mud room" }, desc: { ar: "غرفة بسقف أثل ونافذة على الحوش.", en: "A room with a tamarisk ceiling and a window on the courtyard." }, capacity: { ar: "حتى ضيفين", en: "Up to 2 guests" }, priceFrom: stayPrice("tin-mud-room"), media: "tin-room" },
      { name: { ar: "جناح الطين", en: "Mud suite" }, desc: { ar: "جناح في الدور العلوي بسطح خاص.", en: "An upper-floor suite with a private roof terrace." }, capacity: { ar: "حتى ٣ ضيوف", en: "Up to 3 guests" }, priceFrom: stayPrice("tin-mud-suite"), media: "tin-hero" },
    ],
    food: [
      { name: { ar: "عشاء تراثي", en: "Heritage dinner" }, desc: { ar: "مطازيز وجريش وقرصان، تطبخها سيدات من الحي.", en: "Matazeez, jareesh and qursan, cooked by women from the neighbourhood." } },
      { name: { ar: "قهوة العصر", en: "Afternoon coffee" }, desc: { ar: "على السطح مع تمر الموسم.", en: "On the roof with dates of the season." } },
    ],
    activities: [
      { name: { ar: "مشي في البلدة القديمة", en: "Old town walk" }, desc: { ar: "مع راوٍ من أهل عنيزة.", en: "With a storyteller from Unaizah." } },
      { name: { ar: "مساء الطين", en: "An evening at Al Tin" }, desc: { ar: "أمسية في الحوش بقصص المكان وعشاء خفيف.", en: "A courtyard evening of local stories and a light dinner." } },
    ],
    amenities: ["prayer", "wifi", "restrooms", "family", "kitchen"],
    experiences: ["stay-mud-suite", "product-kleija"],
    packages: ["pkg-mud-evening"],
    media: { hero: "tin-hero", card: "tin-card" },
    gallery: ["tin-room", "tin-evening", "tin-food", "tin-card"],
    mapNote: { ar: "الموقع التقريبي: البلدة القديمة في عنيزة.", en: "Approximate area: Unaizah old town." },
    map: { x: 0.55, y: 0.58 },
  },

  {
    id: "dilal",
    name: { ar: "ظلال النخيل", en: "Dilal Al Nakheel" },
    town: { ar: "البكيرية", en: "Al Bukayriyah" },
    region: { ar: "القصيم", en: "Qassim" },
    type: "day",
    status: "open",
    ...destinationFrom("dilal"),
    capacity: { dayGuests: 60, rooms: 0 },
    tags: [
      { ar: "يوم واحد", en: "Day trip" },
      { ar: "عائلات", en: "Families" },
      { ar: "ورش", en: "Workshops" },
    ],
    short: {
      ar: "بستان مظلل ليوم كامل: جلسات تحت النخيل، وورشة خوص، وغداء من المزرعة.",
      en: "A shaded grove for a full day: seating under the palms, a weaving workshop and a farm lunch.",
    },
    headline: { ar: "يوم كامل في الظل.", en: "A whole day in the shade." },
    story: {
      ar: "وجهة نهارية بلا إقامة، صُممت للعائلات التي تريد الخروج من المدينة دون سفر. الجلسات موزعة بين النخيل بحيث تجد كل عائلة مساحتها.",
      en: "A day destination with no overnight stay, designed for families who want to leave the city without travelling. Seating is spread among the palms so every family has its own space.",
    },
    about: [
      { ar: "تفتح الوجهة من الثامنة صباحًا حتى المغرب، وتستقبل حتى ٦٠ ضيفًا يوميًا.", en: "Open from 8am to sunset, for up to 60 guests a day." },
    ],
    facts: [
      { label: { ar: "الساعات", en: "Hours" }, value: { ar: "٨ صباحًا حتى المغرب", en: "8am to sunset" } },
      { label: { ar: "السعة", en: "Capacity" }, value: { ar: "٦٠ ضيفًا يوميًا", en: "60 guests a day" } },
    ],
    accommodation: [],
    food: [
      { name: { ar: "غداء في الظل", en: "Lunch in the shade" }, desc: { ar: "كبسة بلحم محلي وسلطة من البستان.", en: "Kabsa with local meat and a garden salad." } },
    ],
    activities: [
      { name: { ar: "ورشة الخوص", en: "Palm-leaf weaving" }, desc: { ar: "ساعتان مع حرفية من البكيرية.", en: "Two hours with a craftswoman from Al Bukayriyah." } },
      { name: { ar: "ألعاب المزرعة للأطفال", en: "Farm games for kids" }, desc: { ar: "سقي، وزراعة شتلة، وإطعام الطيور.", en: "Watering, planting a seedling, feeding the birds." } },
    ],
    amenities: ["parking", "prayer", "family", "kids", "shade", "restrooms", "accessible"],
    experiences: ["exp-palm-weave", "food-dilal-lunch"],
    packages: [],
    media: { hero: "dilal-hero", card: "dilal-card" },
    gallery: ["dilal-craft", "dilal-lunch", "dilal-card"],
    mapNote: { ar: "الموقع التقريبي: جنوب البكيرية.", en: "Approximate area: south of Al Bukayriyah." },
    map: { x: 0.28, y: 0.3 },
  },

  {
    id: "ghada",
    name: { ar: "روضة الغضا", en: "Rawdat Al Ghada" },
    town: { ar: "أطراف عنيزة", en: "Outskirts of Unaizah" },
    region: { ar: "القصيم", en: "Qassim" },
    type: "camp",
    status: "season",
    ...destinationFrom("ghada"),
    capacity: { dayGuests: 30, rooms: 8 },
    tags: [
      { ar: "شتاء", en: "Winter" },
      { ar: "نجوم", en: "Stars" },
      { ar: "مخيم", en: "Camp" },
    ],
    short: {
      ar: "مخيم شتوي بين أشجار الغضا، بثماني خيام وليالٍ مخصصة لرصد النجوم.",
      en: "A winter camp among ghada trees, with eight tents and nights set aside for stargazing.",
    },
    headline: { ar: "حيث يبدأ الشتاء.", en: "Where winter begins." },
    story: {
      ar: "تفتح الروضة من نوفمبر إلى مارس فقط، حين يبرد الليل ويصفو السماء. الخيام متباعدة، والإضاءة منخفضة عمدًا حتى تبقى النجوم هي المشهد.",
      en: "The camp opens only from November to March, when nights cool and skies clear. Tents are spaced apart and lighting is kept low on purpose, so the stars stay the view.",
    },
    about: [
      { ar: "موسم ٢٠٢٦–٢٠٢٧ يبدأ في ١ نوفمبر. الحجز التجريبي متاح لتواريخ الموسم فقط.", en: "The 2026–27 season starts on 1 November. Demo booking is open for season dates only." },
    ],
    facts: [
      { label: { ar: "الموسم", en: "Season" }, value: { ar: "نوفمبر إلى مارس", en: "November to March" } },
      { label: { ar: "الخيام", en: "Tents" }, value: { ar: "٨ خيام", en: "8 tents" } },
    ],
    accommodation: [
      { name: { ar: "خيمة الغضا", en: "Ghada tent" }, desc: { ar: "خيمة مجهزة بسرير ومدفأة ومجلس خارجي.", en: "A furnished tent with a bed, heater and outdoor majlis." }, capacity: { ar: "حتى ضيفين", en: "Up to 2 guests" }, priceFrom: stayPrice("ghada-tent"), media: "ghada-tent" },
    ],
    food: [
      { name: { ar: "عشاء الحطب", en: "Wood-fire dinner" }, desc: { ar: "مندي يُطبخ في الحفرة أمام الضيوف.", en: "Mandi cooked in the pit in front of guests." } },
    ],
    activities: [
      { name: { ar: "ليلة النجوم", en: "Stargazing night" }, desc: { ar: "مع دليل فلك، وتلسكوب للمجموعة.", en: "With an astronomy guide and a group telescope." } },
      { name: { ar: "مسار الغروب", en: "Sunset trail" }, desc: { ar: "مشي على الرمل قبل المغرب.", en: "A walk on the sand before sunset." } },
    ],
    amenities: ["parking", "firepit", "restrooms", "prayer"],
    experiences: ["exp-sunset", "exp-stars", "stay-desert-tent"],
    packages: [],
    media: { hero: "ghada-hero", card: "ghada-card" },
    gallery: ["ghada-tent", "ghada-stars", "ghada-card"],
    mapNote: { ar: "الموقع التقريبي: جنوب شرق عنيزة.", en: "Approximate area: south-east of Unaizah." },
    map: { x: 0.66, y: 0.68 },
  },

  {
    id: "hasad",
    name: { ar: "دار الحصاد", en: "Dar Al Hasad" },
    town: { ar: "المذنب", en: "Al Mithnab" },
    region: { ar: "القصيم", en: "Qassim" },
    type: "agri",
    status: "open",
    ...destinationFrom("hasad"),
    capacity: { dayGuests: 40, rooms: 0 },
    tags: [
      { ar: "زراعة", en: "Farming" },
      { ar: "أطفال", en: "Kids" },
      { ar: "موسمي", en: "Seasonal" },
    ],
    short: {
      ar: "مزرعة خضار وفواكه مفتوحة للزوار: تقطف بنفسك، وتتعلم، وتتغدى مما جمعت.",
      en: "A fruit and vegetable farm open to visitors: pick, learn, and have lunch from what you gathered.",
    },
    headline: { ar: "تعلّم من الأرض.", en: "Learn from the land." },
    story: {
      ar: "دار الحصاد مزرعة إنتاج قبل أن تكون وجهة. تُفتح للزوار في مواسم القطف، ويقود الجولات مهندس زراعي من المزرعة.",
      en: "Dar Al Hasad is a working farm before it is a destination. It opens to visitors during picking seasons, with tours led by the farm's agronomist.",
    },
    about: [
      { ar: "مناسبة للمدارس والعائلات. الأحذية المغلقة مطلوبة.", en: "Suited to schools and families. Closed shoes required." },
    ],
    facts: [
      { label: { ar: "المحاصيل", en: "Crops" }, value: { ar: "طماطم، خيار، رمان، حمضيات", en: "Tomatoes, cucumbers, pomegranate, citrus" } },
      { label: { ar: "السعة", en: "Capacity" }, value: { ar: "٤٠ ضيفًا يوميًا", en: "40 guests a day" } },
    ],
    accommodation: [],
    food: [
      { name: { ar: "غداء المزرعة", en: "Farm lunch" }, desc: { ar: "يُطبخ مما قُطف صباحًا.", en: "Cooked from what was picked that morning." } },
    ],
    activities: [
      { name: { ar: "يوم الحصاد", en: "Harvest day" }, desc: { ar: "أربع ساعات بين الحقول مع مهندس المزرعة.", en: "Four hours in the fields with the farm agronomist." } },
    ],
    amenities: ["parking", "kids", "restrooms", "shade", "prayer"],
    experiences: ["exp-harvest-day", "food-farm-lunch", "event-date-nights"],
    packages: ["pkg-harvest-family"],
    media: { hero: "hasad-hero", card: "hasad-card" },
    gallery: ["hasad-field", "hasad-lunch", "hasad-card"],
    mapNote: { ar: "الموقع التقريبي: شمال المذنب.", en: "Approximate area: north of Al Mithnab." },
    map: { x: 0.6, y: 0.8 },
  },

  {
    id: "wasm",
    name: { ar: "مزرعة الوسم", en: "Al Wasm Farm" },
    town: { ar: "الشماسية", en: "Al Shimasiyah" },
    region: { ar: "القصيم", en: "Qassim" },
    type: "family",
    status: "soon",
    ...destinationFrom("wasm"),
    capacity: { dayGuests: 20, rooms: 4 },
    tags: [
      { ar: "قيد التطوير", en: "In development" },
      { ar: "عائلات", en: "Families" },
    ],
    short: {
      ar: "مزرعة عائلية في مرحلة التطوير مع ريف. يُتوقع افتتاحها في ربيع ٢٠٢٧.",
      en: "A family farm in development with Rif. Opening is expected in spring 2027.",
    },
    headline: { ar: "الوجهة القادمة.", en: "The next destination." },
    story: {
      ar: "بدأت الوسم من نموذج التقييم نفسه الذي يجربه الملاك في ريف. بعد المعاينة والدراسة التفصيلية، دخلت مرحلة التطوير: أربع غرف، ومجلس، ومسار حول قناة الري.",
      en: "Al Wasm started with the same assessment owners try on Rif. After the site visit and detailed study, it entered development: four rooms, a majlis, and a path along the irrigation channel.",
    },
    about: [
      { ar: "الحجز غير متاح بعد. يمكنك متابعة الوجهة لتصلك أخبار الافتتاح.", en: "Booking isn't open yet. Follow the destination to hear about the opening." },
    ],
    facts: [
      { label: { ar: "المرحلة", en: "Stage" }, value: { ar: "التطوير", en: "Development" } },
      { label: { ar: "الافتتاح المتوقع", en: "Expected opening" }, value: { ar: "ربيع ٢٠٢٧", en: "Spring 2027" } },
    ],
    accommodation: [],
    food: [],
    activities: [],
    amenities: ["parking", "family", "kids"],
    experiences: [],
    packages: [],
    media: { hero: "wasm-hero", card: "wasm-card" },
    gallery: ["wasm-channel", "wasm-card"],
    mapNote: { ar: "الموقع التقريبي: الشماسية.", en: "Approximate area: Al Shimasiyah." },
    map: { x: 0.72, y: 0.34 },
  },
];

export const getDestinationById = (id) => DESTINATIONS.find((d) => d.id === id) || null;
