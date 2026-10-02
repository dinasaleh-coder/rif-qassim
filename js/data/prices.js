/* ==========================================================================
   Price list — the ONE place prices live (SAR, before 15% VAT)
   ---------------------------------------------------------------------------
   Every price shown or charged anywhere reads from here: experiences,
   packages and their add-ons, stays on destination pages, the "from" price
   on destination cards, and the market benchmarks behind the owner
   report's default assumptions. The pricing engine (services/pricing.js)
   calculates totals and VAT from these values; nothing is duplicated.

   minBillable: guided sessions that need a dedicated guide or host are
   billed for at least this many guests (a solo guest can still book).

   Units
     person   per person
     night    per night, for the stated capacity
     booking  once per booking (a group or family)
     item     per box / product

   Illustrative prices for a pre-launch prototype, set to sit within the
   Qassim domestic leisure market: accessible entry experiences, food and
   stays priced by what is included, a clear premium tier for private,
   overnight or specialised offers.
   ========================================================================== */

/* ---- Experiences, food, products, stays (bookable items) ------------- */
export const ITEM_PRICES = {
  // Experiences & activities (per person)
  "exp-palm-morning": { amount: 95, unit: "person", minBillable: 2 }, // 3h grove walk, coffee & dates
  "exp-kleija": { amount: 85, unit: "person" }, // 2h hands-on bake, take it home
  "exp-palm-weave": { amount: 75, unit: "person", minBillable: 2 }, // 2h craft workshop
  "exp-sunset": { amount: 65, unit: "person", minBillable: 2 }, // 2h guided walk
  "exp-stars": { amount: 120, unit: "person" }, // specialist guide + telescope + coffee
  "event-date-nights": { amount: 35, unit: "person" }, // evening market entry
  "exp-date-picking": { amount: 125, unit: "person", minBillable: 2 }, // includes a box of dates
  "exp-harvest-day": { amount: 110, unit: "person", minBillable: 2 }, // 4h with the agronomist

  // Food (per person)
  "food-breakfast": { amount: 65, unit: "person" },
  "food-farm-lunch": { amount: 85, unit: "person" },
  "food-dilal-lunch": { amount: 70, unit: "person" },
  "food-dinner": { amount: 175, unit: "person" }, // wood-fired, seasonal, weekends

  // Stays (per night, breakfast where stated)
  "stay-garden-room": { amount: 550, unit: "night" }, // up to 2, breakfast included
  "stay-mud-suite": { amount: 950, unit: "night" }, // heritage suite, private roof
  "stay-desert-tent": { amount: 650, unit: "night" }, // winter camp tent, up to 2

  // Products (per box)
  "product-sukkari": { amount: 85, unit: "item" }, // 3 kg farm Sukkari
  "product-kleija": { amount: 45, unit: "item" }, // box of 12
};

/* ---- Stays shown on destination pages but booked via packages --------- */
export const STAY_PRICES = {
  "sidr-garden-rooms": ITEM_PRICES["stay-garden-room"],
  "sidr-courtyard-suite": { amount: 850, unit: "night" }, // 2 rooms, up to 4
  "sidr-guesthouse": { amount: 1450, unit: "night" }, // whole house, up to 8
  "tin-mud-room": { amount: 650, unit: "night" }, // up to 2
  "tin-mud-suite": ITEM_PRICES["stay-mud-suite"],
  "ghada-tent": ITEM_PRICES["stay-desert-tent"],
};

/* ---- Internal component values (not sold on their own) ---------------
   Used only to make bundles traceable. */
export const COMPONENT_VALUES = {
  // The shared rural dinner inside the full day. Defined from existing prices:
  // the private dinner (food-dinner) = this shared dinner + the upgrade add-on.
  "shared-dinner": { amount: 80, unit: "person", label: { ar: "عشاء ريفي مشترك", en: "Shared rural dinner" } },
  // The full day's palm-frond workshop is the same craft as exp-palm-weave.
  "frond-workshop": { ref: "exp-palm-weave", label: { ar: "ورشة سعف النخيل", en: "Palm frond workshop" } },
  // The family day's produce basket is a gift with no separate value in the model.
  "produce-basket": { amount: 0, unit: "booking", label: { ar: "سلة خضار وفاكهة", en: "Produce basket" }, untraced: true },
  // Al Tin evening parts with no catalogue price (يحتاج تحقق تشغيلي).
  "roof-coffee": { amount: null, unit: "person", label: { ar: "قهوة العصر على السطح", en: "Rooftop coffee" }, untraced: true },
  "storytelling": { amount: null, unit: "person", label: { ar: "جلسة حكايات", en: "Storytelling" }, untraced: true },
  "heritage-dinner": { amount: null, unit: "person", label: { ar: "عشاء تراثي", en: "Heritage dinner" }, untraced: true },
};

const valueOf = (ref) => {
  const c = COMPONENT_VALUES[ref];
  if (c?.ref) return ITEM_PRICES[c.ref].amount;
  if (c) return c.amount;
  return (ITEM_PRICES[ref] || STAY_PRICES[ref]).amount;
};

/* ---- Packages: what each bundle contains -----------------------------
   per: "person" (each guest), "room" (each room for the stay), "booking"
   price: the customer price (unchanged). The difference from the sum of
   components is the bundle discount (or premium) and is computed, not typed.

   Extra-guest rule (one rule for every group package): the package price
   covers its included guests; each guest above that pays that guest's
   per-person components at catalogue value, and any extra room needed is
   charged at the room's catalogue price for the package's nights. */
const PACKAGE_DEFS = {
  "pkg-full-day": {
    model: "person",
    price: 345,
    components: [
      { ref: "exp-palm-morning", per: "person" },
      { ref: "food-breakfast", per: "person" },
      { ref: "frond-workshop", per: "person" },
      { ref: "shared-dinner", per: "person" },
      { ref: "exp-sunset", per: "person" },
    ],
    addOns: {
      kleija: { amount: 60, unit: "person" }, // add-on rate, below the 85 standalone workshop
      // Upgrade = private dinner − the shared dinner already included
      dinner: { derive: () => ITEM_PRICES["food-dinner"].amount - COMPONENT_VALUES["shared-dinner"].amount, unit: "person" },
      sukkari: { derive: () => ITEM_PRICES["product-sukkari"].amount, unit: "booking" }, // same box as the product
      photographer: { amount: 350, unit: "booking" }, // outside supplier (يحتاج تحقق تشغيلي)
      transfer: { amount: 180, unit: "booking" }, // outside supplier (يحتاج تحقق تشغيلي)
    },
  },
  "pkg-weekend": {
    model: "booking",
    price: 1650,
    includedGuests: 2,
    nights: 2,
    roomCapacity: 2,
    components: [
      { ref: "stay-garden-room", per: "room" }, // per night, breakfast for 2 included
      { ref: "food-dinner", per: "person" },
      { ref: "exp-palm-morning", per: "person" },
    ],
    addOns: {
      kleija: { amount: 60, unit: "person" },
      sukkari: { derive: () => ITEM_PRICES["product-sukkari"].amount, unit: "booking" },
    },
  },
  "pkg-mud-evening": {
    model: "person",
    price: 195,
    components: [
      { ref: "roof-coffee", per: "person" },
      { ref: "storytelling", per: "person" },
      { ref: "heritage-dinner", per: "person" },
    ],
    addOns: {
      walk: { amount: 45, unit: "person" }, // storyteller's hour (يحتاج تحقق تشغيلي)
    },
  },
  "pkg-harvest-family": {
    model: "booking",
    price: 595,
    includedGuests: 4,
    components: [
      { ref: "exp-harvest-day", per: "person" },
      { ref: "food-farm-lunch", per: "person" },
      { ref: "produce-basket", per: "booking" },
    ],
    addOns: {
      seedlings: { amount: 45, unit: "booking" },
    },
  },
};

const perPersonValue = (def) => def.components.filter((c) => c.per === "person").reduce((s, c) => s + (valueOf(c.ref) || 0), 0);
const perRoomValue = (def) => def.components.filter((c) => c.per === "room").reduce((s, c) => s + valueOf(c.ref) * (def.nights || 1), 0);

/** Pricing object for the engine, derived from the definition */
function pricingOf(def) {
  if (def.model === "person") return { model: "person", basePrice: def.price };
  const p = {
    model: "booking",
    basePrice: def.price,
    includedGuests: def.includedGuests,
    extraGuestPrice: perPersonValue(def),
  };
  if (def.roomCapacity) {
    p.roomCapacity = def.roomCapacity;
    p.extraRoomPrice = perRoomValue(def);
    p.nights = def.nights;
  }
  return p;
}

export const PACKAGE_PRICES = Object.fromEntries(
  Object.entries(PACKAGE_DEFS).map(([id, def]) => [
    id,
    {
      pricing: pricingOf(def),
      addOns: Object.fromEntries(Object.entries(def.addOns).map(([k, a]) => [k, { amount: a.derive ? a.derive() : a.amount, unit: a.unit }])),
    },
  ])
);

/**
 * How a package price is built (for audits and the team view):
 * components at catalogue value for the included guests, their sum, and the
 * difference to the customer price. untraced = some parts have no value.
 */
export function packageBreakdown(id) {
  const def = PACKAGE_DEFS[id];
  const guests = def.model === "person" ? 1 : def.includedGuests;
  const rooms = def.roomCapacity ? Math.ceil(guests / def.roomCapacity) : 0;
  const components = def.components.map((c) => {
    const unitValue = valueOf(c.ref);
    const qty = c.per === "person" ? guests : c.per === "room" ? rooms * (def.nights || 1) : 1;
    return { ref: c.ref, per: c.per, label: COMPONENT_VALUES[c.ref]?.label || null, unitValue, qty, total: unitValue === null ? null : unitValue * qty };
  });
  const untraced = components.some((c) => c.unitValue === null);
  const sum = untraced ? null : components.reduce((s, c) => s + c.total, 0);
  return { id, model: def.model, guests, price: def.price, components, componentsTotal: sum, difference: sum === null ? null : def.price - sum, untraced };
}

/* ---- Destination "from" prices: the lead offer of each destination ---- */
export const DESTINATION_LEAD = {
  sidr: "pkg-full-day",
  tin: "tin-mud-room",
  dilal: "exp-palm-weave",
  ghada: "stay-desert-tent",
  hasad: "exp-harvest-day",
  wasm: null, // in development: no price shown
};

/* ---- Market benchmarks behind the owner report's default assumptions -- */
export const BENCHMARKS = {
  avgNightValue: ITEM_PRICES["stay-garden-room"].amount, // a typical farm room night
  avgDayVisitorSpend: 140, // an experience plus food or a product, per day visitor
};

/* ---- Accessors ----------------------------------------------------------- */
const fail = (what) => {
  throw new Error(`No price for ${what}`);
};

/** { price, priceUnit, minBillable? } for an experience, food, stay or product */
export const itemPrice = (id) => {
  const p = ITEM_PRICES[id] || fail(id);
  return p.minBillable ? { price: p.amount, priceUnit: p.unit, minBillable: p.minBillable } : { price: p.amount, priceUnit: p.unit };
};

export const stayPrice = (id) => (STAY_PRICES[id] || fail(id)).amount;

export const packagePricing = (id) => ({ ...(PACKAGE_PRICES[id] || fail(id)).pricing });

/** { price, unit } for a package add-on */
export const addOnPrice = (pkgId, addOnId) => {
  const p = PACKAGE_PRICES[pkgId]?.addOns?.[addOnId] || fail(`${pkgId}:${addOnId}`);
  return { price: p.amount, unit: p.unit };
};

/** "From" price of a destination: { priceFrom, priceUnit } or nulls */
export function destinationFrom(id) {
  const lead = DESTINATION_LEAD[id];
  if (!lead) return { priceFrom: null, priceUnit: null };
  if (PACKAGE_PRICES[lead]) {
    const p = PACKAGE_PRICES[lead].pricing;
    return { priceFrom: p.basePrice, priceUnit: p.model === "person" ? "person" : "booking" };
  }
  const item = ITEM_PRICES[lead] || STAY_PRICES[lead] || fail(lead);
  return { priceFrom: item.amount, priceUnit: item.unit };
}
