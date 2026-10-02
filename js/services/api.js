/* ==========================================================================
   Mock API
   ---------------------------------------------------------------------------
   The UI never imports data files directly for reads/writes that would come
   from a server later — it calls these async functions. To connect a real
   backend (REST, Supabase, Firebase), replace the bodies here; the pages and
   components stay the same.

   A short simulated latency makes loading states real.
   Everything written is stored in this browser only (see core/store.js).
   ========================================================================== */

import { store } from "../core/store.js";
import { uid } from "../core/dom.js";
import { DESTINATIONS, getDestinationById } from "../data/destinations.js";
import { EXPERIENCES, getExperienceById } from "../data/experiences.js";
import { PACKAGES, getPackageById } from "../data/packages.js";
import { SEED_BOOKINGS } from "../data/bookings.js";
import { SEED_FARMS, OWNERS, PIPELINE_STAGES, SEED_STUDY_REQUESTS, getOwnerById } from "../data/farms.js";
import { CITIES, SAMPLE_ANSWERS } from "../data/assessment.js";
import { computePackagePrice } from "./pricing.js";
import { getBookable, contentOverride } from "./bookable.js";
import { computeReadiness } from "./scoring.js";
import { experienceAvailableOn, experienceUpcoming, isBookable, packageDateStatus, today } from "./availability.js";
import { toISODate } from "../core/format.js";

const latency = (min = 220, max = 520) =>
  typeof window === "undefined" ? Promise.resolve() : new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

const clone = (v) => JSON.parse(JSON.stringify(v));
const norm = (s) => String(s || "").toLowerCase().replace(/[\u064B-\u0652]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").trim();
const textOf = (v) => (v && typeof v === "object" ? `${v.ar || ""} ${v.en || ""}` : String(v || ""));

/* ==========================================================================
   Destinations
   ========================================================================== */

/**
 * @param {{ type?: string, status?: string, q?: string }} filters
 */
/** Add ?simulate=error to a page URL to see its error state (prototype only). */
const simulateError = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("simulate") === "error";

/* Admin demo edits applied on read, so public pages and admin agree */
function applyDestination(d) {
  const o = contentOverride("destinations", d.id);
  if (!o) return d;
  return { ...d, status: o.status || d.status, short: o.text || d.short };
}
const isActive = (kind, id) => contentOverride(kind, id)?.active !== false;

export async function getDestinations(filters = {}) {
  await latency();
  if (simulateError()) throw new Error("simulated");
  const q = norm(filters.q);
  const order = { open: 0, limited: 1, season: 2, soon: 3 };
  return clone(
    DESTINATIONS.map(applyDestination).filter((d) => !filters.type || filters.type === "all" || d.type === filters.type)
      .filter((d) => !filters.status || filters.status === "all" || d.status === filters.status)
      .filter((d) => !q || norm(`${textOf(d.name)} ${textOf(d.town)} ${textOf(d.short)} ${d.tags.map(textOf).join(" ")}`).includes(q))
      .sort((a, b) => order[a.status] - order[b.status])
  );
}

export async function getDestination(id) {
  await latency(160, 360);
  if (simulateError()) throw new Error("simulated");
  const base = getDestinationById(id);
  if (!base) return null;
  const destination = applyDestination(base);
  return clone({
    destination,
    packages: destination.packages.filter((p) => isActive("packages", p)).map((p) => getBookable(p)).filter(Boolean),
    experiences: destination.experiences
      .filter((e) => isActive("experiences", e))
      .map(getExperienceById)
      .filter(Boolean)
      .map((e) => ({ ...e, desc: contentOverride("experiences", e.id)?.text || e.desc })),
  });
}

/* ==========================================================================
   Experiences (packages are listed as the "package" category)
   ========================================================================== */

function packageAsListing(p) {
  return {
    id: p.id,
    category: "package",
    destinationId: p.destinationId,
    title: p.title,
    desc: p.summary,
    durationHours: p.durationHours,
    price: p.pricing.basePrice,
    priceUnit: p.pricing.model === "person" ? "person" : "booking",
    minGuests: p.minGuests,
    maxGuests: p.maxGuests,
    tags: [{ ar: "باقة", en: "Package" }],
    media: p.media,
    isPackage: true,
    _pkg: p,
  };
}

/**
 * @param {{ category?: string, date?: string, guests?: number,
 *           duration?: "short"|"half"|"full"|"stay", priceMax?: number,
 *           destinationId?: string, q?: string }} f
 */
export async function getExperiences(f = {}) {
  await latency();
  if (simulateError()) throw new Error("simulated");
  const all = [
    ...EXPERIENCES.filter((e) => isActive("experiences", e.id)).map((e) => ({ ...e, desc: contentOverride("experiences", e.id)?.text || e.desc })),
    ...PACKAGES.filter((p) => isActive("packages", p.id)).map((p) => packageAsListing({ ...p, summary: contentOverride("packages", p.id)?.text || p.summary })),
  ];
  const q = norm(f.q);
  const guests = Number(f.guests) || 0;

  const matchDuration = (h) => {
    switch (f.duration) {
      case "short": return h > 0 && h <= 2;
      case "half": return h > 2 && h <= 5;
      case "full": return h > 5 && h < 24;
      case "stay": return h >= 24;
      default: return true;
    }
  };

  const items = all
    .filter((e) => !f.category || f.category === "all" || e.category === f.category)
    .filter((e) => !f.destinationId || e.destinationId === f.destinationId)
    .filter((e) => !guests || e.priceUnit === "item" || (guests >= e.minGuests && guests <= e.maxGuests))
    .filter((e) => matchDuration(e.durationHours))
    .filter((e) => !f.priceMax || e.price <= Number(f.priceMax))
    .filter((e) => {
      if (!f.date) return true;
      if (e.isPackage) return isBookable(packageDateStatus(e._pkg, f.date));
      return experienceAvailableOn(e, f.date);
    })
    .filter((e) => !q || norm(`${textOf(e.title)} ${textOf(e.desc)} ${(e.tags || []).map(textOf).join(" ")}`).includes(q))
    .map((e) => {
      const { _pkg, ...rest } = e;
      const destination = getDestinationById(e.destinationId);
      return {
        ...rest,
        destinationName: destination?.name,
        upcoming: e.isPackage ? true : experienceUpcoming(e),
      };
    });

  return clone(items);
}

/** Count per category for the current non-category filters (for chip counts). */
export async function getExperienceCounts(f = {}) {
  const items = await getExperiences({ ...f, category: "all" });
  return items.reduce((acc, e) => ((acc[e.category] = (acc[e.category] || 0) + 1), acc), { all: items.length });
}

/* ==========================================================================
   Packages & booking
   ========================================================================== */

/** Anything bookable (package or experience), with its destination. */
export async function getBookableItem(id) {
  await latency(200, 420);
  if (simulateError()) throw new Error("simulated");
  const item = getBookable(id);
  if (!item) return null;
  return clone({ item, destination: getDestinationById(item.destinationId) });
}

/** Look up a booking created in this browser (for the confirmation page). */
export async function getUserBooking(ref) {
  await latency(120, 240);
  const b = store.get("userBookings").find((x) => x.id === ref);
  return b ? clone(enrichBooking(b, store.get("bookingStatuses"))) : null;
}

/** "Notify me when it opens" for destinations in development (demo). */
export async function registerInterest({ destinationId, name, phone }) {
  await latency(400, 700);
  const entry = { id: `INT-${uid(5)}`, destinationId, name, phone, createdAt: new Date().toISOString() };
  store.set("interests", (list) => [entry, ...list]);
  return clone(entry);
}

export const getFeaturedPackage = () => clone(PACKAGES.find((p) => p.featured) || PACKAGES[0]);

/**
 * Create a DEMO booking. Nothing is charged; the record lives in this
 * browser and appears in the admin bookings view.
 */
export async function createBooking(draft) {
  await latency(700, 1200);
  const pkg = getBookable(draft.packageId);
  if (!pkg) throw new Error("package-not-found");
  if (!draft.date || !isBookable(packageDateStatus(pkg, draft.date))) throw new Error("date-unavailable");
  const price = computePackagePrice(pkg, { guests: draft.guests, addOns: draft.addOns });
  if (!price.valid) throw new Error("invalid-guests");

  const now = new Date();
  const ref = `RIF-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${uid(4)}`;
  const booking = {
    id: ref,
    customer: draft.contact?.name?.trim() || (store.get("lang") === "en" ? "Demo guest" : "ضيف تجريبي"),
    phone: draft.contact?.phone || "",
    email: draft.contact?.email || "",
    notes: draft.contact?.notes || "",
    kind: pkg.kind,
    city: "",
    packageId: pkg.id,
    destinationId: pkg.destinationId,
    date: draft.date,
    guests: price.guests,
    addOns: [...(draft.addOns || [])],
    amount: price.total,
    status: "confirmed",
    createdAt: toISODate(now),
    createdAtTime: now.toISOString(),
    channel: "web",
    isDemo: true,
    isUserCreated: true,
  };
  store.set("userBookings", (list) => [booking, ...list]);
  return clone(booking);
}

function enrichBooking(b, statusOverrides) {
  const pkg = getBookable(b.packageId, { includeInactive: true });
  const destination = getDestinationById(pkg?.destinationId || b.destinationId);
  const amount = b.amount ?? computePackagePrice(pkg, { guests: b.guests, addOns: b.addOns }).total;
  return {
    ...b,
    destinationId: destination?.id,
    destinationName: destination?.name,
    packageTitle: pkg?.title,
    amount,
    status: statusOverrides[b.id] || b.status,
  };
}

/**
 * @param {{ status?: string, q?: string, destinationId?: string }} f
 */
export async function listBookings(f = {}) {
  await latency();
  if (simulateError()) throw new Error("simulated");
  const overrides = store.get("bookingStatuses");
  const q = norm(f.q);
  const all = [...store.get("userBookings"), ...SEED_BOOKINGS].map((b) => enrichBooking(b, overrides));
  return clone(
    all
      .filter((b) => !f.status || f.status === "all" || b.status === f.status)
      .filter((b) => !f.destinationId || f.destinationId === "all" || b.destinationId === f.destinationId)
      .filter((b) => !q || norm(`${b.id} ${b.customer} ${textOf(b.destinationName)} ${textOf(b.packageTitle)} ${b.city}`).includes(q))
      .sort((a, b) => (b.createdAtTime || b.createdAt).localeCompare(a.createdAtTime || a.createdAt))
  );
}

export async function updateBookingStatus(id, status) {
  await latency(150, 300);
  store.set("bookingStatuses", (m) => ({ ...m, [id]: status }));
  return { id, status };
}

/* ==========================================================================
   Farm assessment (owner)
   ========================================================================== */

/**
 * Submit the wizard. Computes the readiness score, stores the result for the
 * owner, and adds the farm to the admin pipeline as a NEW opportunity.
 */
export async function submitAssessment(answers) {
  await latency(1400, 2000); // the "analysing" moment
  if (simulateError()) throw new Error("simulated");
  const readiness = computeReadiness(answers);
  const now = new Date();
  const farmId = `farm-u-${uid(5).toLowerCase()}`;
  const cityLabel = CITIES.find((c) => c.id === answers.city)?.label || { ar: "القصيم", en: "Qassim" };

  const result = {
    farmId,
    answers: clone(answers),
    readiness,
    submittedAt: now.toISOString(),
    reference: `ASM-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${uid(4)}`,
  };

  const farm = {
    id: farmId,
    name: { ar: answers.farmName, en: answers.farmName },
    ownerId: "owner-you",
    ownerName: answers.ownerName || { ar: "مالك (تجريبي)", en: "Owner (demo)" },
    phone: answers.phone || "",
    city: cityLabel.ar,
    cityLabel,
    assetType: answers.assetType,
    totalArea: Number(answers.totalArea) || 0,
    usableArea: Number(answers.usableArea) || 0,
    rooms: Number(answers.rooms) || 0,
    score: readiness.score,
    dims: readiness.dims,
    stage: "new",
    submittedAt: toISODate(now),
    updatedAt: toISODate(now),
    note: { ar: "تقييم أولي مكتمل من بوابة الملاك.", en: "Initial assessment completed from the owner portal." },
    isUserSubmitted: true,
  };

  farm.reference = result.reference;
  store.set("assessmentResult", result);
  store.set("submittedFarms", (list) => [farm, ...list.filter((f) => f.name?.ar !== answers.farmName)]);
  store.reset("assessmentDraft");
  store.set("ownerMessages", (list) => [
    {
      id: uid(6),
      from: "rif",
      at: now.toISOString(),
      text: {
        ar: `وصل تقييم ${answers.farmName}. سيراجع فريق ريف البيانات خلال ٣ أيام عمل.`,
        en: `${answers.farmName}'s assessment arrived. The Rif team will review it within 3 working days.`,
      },
    },
    ...list,
  ]);
  return clone(result);
}

export const getAssessmentResult = () => clone(store.get("assessmentResult"));

export async function requestStudy(form) {
  await latency(800, 1200);
  if (simulateError()) throw new Error("simulated");
  const now = new Date();
  const request = {
    id: `STD-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${uid(4)}`,
    ...form,
    farmId: store.get("assessmentResult")?.farmId || null,
    createdAt: now.toISOString(),
    status: "received",
  };
  store.set("studyRequests", (list) => [request, ...list]);
  const result = store.get("assessmentResult");
  if (result?.farmId) {
    store.set("submittedFarms", (list) =>
      list.map((f) =>
        f.id === result.farmId
          ? { ...f, studyRequested: true, updatedAt: toISODate(now), note: { ar: "طلب المالك دراسة تفصيلية.", en: "Owner requested a detailed study." } }
          : f
      )
    );
  }
  store.set("ownerMessages", (list) => [
    {
      id: uid(6),
      from: "rif",
      at: now.toISOString(),
      text: {
        ar: "وصلنا طلب الدراسة التفصيلية. سيتواصل معك فريق ريف في الوقت الذي اخترته.",
        en: "We received your detailed study request. The Rif team will contact you at your chosen time.",
      },
    },
    ...list,
  ]);
  return clone(request);
}

/**
 * Owner edits to the farm information collected in the assessment.
 * There is one farm model: the stored assessment answers. Editing them
 * re-runs the existing scoring engine and updates the same farm record the
 * Rif team sees in the pipeline.
 */
export async function updateFarmAnswers(patch) {
  await latency(350, 650);
  if (simulateError()) throw new Error("simulated");
  const result = store.get("assessmentResult");
  if (!result) throw new Error("no-assessment");
  const answers = { ...result.answers, ...patch };
  const readiness = computeReadiness(answers);
  const previousScore = result.readiness.score;
  const now = new Date();
  const next = { ...result, answers, readiness, updatedAt: now.toISOString() };
  store.set("assessmentResult", next);

  const cityLabel = CITIES.find((c) => c.id === answers.city)?.label || { ar: "القصيم", en: "Qassim" };
  store.set("submittedFarms", (list) =>
    list.map((f) =>
      f.id === result.farmId
        ? {
            ...f,
            name: { ar: answers.farmName, en: answers.farmName },
            ownerName: answers.ownerName || f.ownerName,
            phone: answers.phone || "",
            city: cityLabel.ar,
            cityLabel,
            assetType: answers.assetType,
            totalArea: Number(answers.totalArea) || 0,
            usableArea: Number(answers.usableArea) || 0,
            rooms: Number(answers.rooms) || 0,
            score: readiness.score,
            dims: readiness.dims,
            updatedAt: toISODate(now),
          }
        : f
    )
  );
  store.set("ownerMessages", (list) => [
    {
      id: uid(6),
      from: "system",
      at: now.toISOString(),
      text:
        readiness.score === previousScore
          ? { ar: "حُدّثت بيانات المزرعة.", en: "Farm details updated." }
          : { ar: `حُدّثت بيانات المزرعة، وأعيد حساب الجاهزية: ${previousScore} ← ${readiness.score}.`, en: `Farm details updated; readiness recalculated: ${previousScore} → ${readiness.score}.` },
    },
    ...list,
  ]);
  return clone({ result: next, previousScore });
}

/** Mark every owner notification as read. */
export async function markMessagesRead() {
  store.set("ownerMessages", (list) => list.map((m) => ({ ...m, read: true })));
  return true;
}

/* ==========================================================================
   Study requests (owner → Rif team)
   ========================================================================== */

/** All study requests: made in this browser + seed requests, with statuses. */
export async function listStudyRequests() {
  await latency();
  if (simulateError()) throw new Error("simulated");
  const overrides = store.get("studyStatuses");
  const farms = [...store.get("submittedFarms"), ...SEED_FARMS];
  const stageOverrides = store.get("farmStages");
  return clone(
    [...store.get("studyRequests").map((r) => ({ ...r, isUserCreated: true })), ...SEED_STUDY_REQUESTS.map((r) => ({ ...r, status: overrides[r.id] || r.status }))]
      .map((r) => {
        const farm = farms.find((f) => f.id === r.farmId);
        return {
          ...r,
          farmName: farm?.name || { ar: r.farm || "—", en: r.farm || "—" },
          ownerName: getOwnerById(farm?.ownerId)?.name || farm?.ownerName || r.name,
          score: farm?.score ?? null,
          stage: farm ? stageOverrides[farm.id] || farm.stage : null,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
}

/** Move a study request along its states (demo team action). */
export async function updateStudyStatus(id, status) {
  await latency(120, 240);
  const mine = store.get("studyRequests").some((r) => r.id === id);
  if (mine) {
    store.set("studyRequests", (list) => list.map((r) => (r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)));
    const labels = { received: "تم الإرسال", reviewing: "قيد المراجعة", contacted: "تم التواصل", completed: "مكتمل" };
    const labelsEn = { received: "sent", reviewing: "under review", contacted: "contacted", completed: "completed" };
    store.set("ownerMessages", (list) => [
      { id: uid(6), from: "system", at: new Date().toISOString(), text: { ar: `تغيرت حالة طلب الدراسة إلى «${labels[status]}» (تحديث تجريبي من لوحة الفريق).`, en: `Your study request is now ${labelsEn[status]} (a demo update from the team view).` } },
      ...list,
    ]);
  } else {
    store.set("studyStatuses", (m) => ({ ...m, [id]: status }));
  }
  return { id, status };
}

/* ==========================================================================
   Content (admin demo edits over the static data)
   kind: "destinations" | "experiences" | "packages"
   patch: { status? (destinations), active? (experiences, packages), text?: {ar,en} }
   ========================================================================== */

export async function updateContent(kind, id, patch) {
  await latency(150, 300);
  if (simulateError()) throw new Error("simulated");
  store.set("contentOverrides", (all) => ({ ...all, [kind]: { ...(all[kind] || {}), [id]: { ...(all[kind]?.[id] || {}), ...patch } } }));
  return clone(store.get("contentOverrides")[kind][id]);
}

export async function resetContent(kind, id) {
  store.set("contentOverrides", (all) => {
    const next = { ...all, [kind]: { ...(all[kind] || {}) } };
    delete next[kind][id];
    return next;
  });
  return true;
}

/* ==========================================================================
   One farm, the whole story (admin farm detail)
   Answers exist for the farm assessed in this browser and for the demo
   owner's farm (the sample answers). Seed farms only carry recorded scores.
   ========================================================================== */

export async function getFarmRecord(id) {
  await latency(200, 400);
  if (simulateError()) throw new Error("simulated");
  const farms = await listFarms();
  const farm = farms.find((f) => f.id === id);
  if (!farm) return null;
  const result = store.get("assessmentResult");
  let answers = null;
  let assessment = null;
  if (result && result.farmId === id) {
    answers = result.answers;
    assessment = { reference: result.reference, submittedAt: result.submittedAt, updatedAt: result.updatedAt || null, source: "owner" };
  } else if (farm.demoOwnerFarm) {
    answers = { ...SAMPLE_ANSWERS, farmName: SAMPLE_ANSWERS.farmName.ar };
    assessment = { reference: null, submittedAt: farm.submittedAt, source: "sample" };
  }
  const studies = (await listStudyRequests()).filter((r) => r.farmId === id);
  return clone({ farm, answers, assessment, readiness: answers ? computeReadiness(answers) : null, studies });
}

/* ==========================================================================
   Farms pipeline (internal)
   ========================================================================== */

export async function listFarms() {
  await latency();
  if (simulateError()) throw new Error("simulated");
  const overrides = store.get("farmStages");
  const all = [...store.get("submittedFarms"), ...SEED_FARMS].map((f) => {
    const owner = getOwnerById(f.ownerId);
    return {
      ...f,
      ownerName: owner?.name || f.ownerName,
      stage: overrides[f.id] || f.stage,
    };
  });
  return clone(all);
}

export async function moveFarm(id, stage) {
  if (!PIPELINE_STAGES.some((s) => s.id === stage)) throw new Error("unknown-stage");
  await latency(120, 240);
  store.set("farmStages", (m) => ({ ...m, [id]: stage }));
  return { id, stage };
}

export const listOwners = async () => {
  await latency();
  return clone(OWNERS);
};

/* ==========================================================================
   Owner dashboard
   ========================================================================== */

/**
 * The owner sees their own submitted farm if they've completed the
 * assessment in this browser; otherwise the demo owner (Ahmed) and his farm.
 */
export async function getOwnerDashboard() {
  await latency(300, 600);
  if (simulateError()) throw new Error("simulated");
  const result = store.get("assessmentResult");
  const overrides = store.get("farmStages");
  const messages = store.get("ownerMessages");
  const studies = store.get("studyRequests");

  if (result) {
    const farm = store.get("submittedFarms").find((f) => f.id === result.farmId);
    return clone({
      mode: "user",
      ownerFirstName: result.answers.ownerFirstName || null,
      farm: farm ? { ...farm, stage: overrides[farm.id] || farm.stage } : null,
      result,
      messages,
      studyRequest: studies[0] || null,
    });
  }

  const demoFarm = SEED_FARMS.find((f) => f.demoOwnerFarm);
  const owner = getOwnerById(demoFarm.ownerId);
  return clone({
    mode: "demo",
    ownerFirstName: owner.firstName,
    farm: { ...demoFarm, stage: overrides[demoFarm.id] || demoFarm.stage },
    result: null,
    messages: [
      {
        id: "m-demo-2",
        from: "rif",
        at: "2026-09-29T09:20:00",
        text: { ar: "راجعنا صور المباني. نقترح موعد معاينة في الأسبوع الثاني من أكتوبر.", en: "We reviewed the building photos. We suggest a site visit in the second week of October." },
      },
      {
        id: "m-demo-1",
        from: "rif",
        at: "2026-09-08T14:05:00",
        text: { ar: "وصل تقييم مزرعة الريحان. سيراجعه فريق ريف خلال ٣ أيام عمل.", en: "Al Raihan Farm's assessment arrived. The Rif team will review it within 3 working days." },
      },
    ],
    studyRequest: null,
  });
}

/* ==========================================================================
   Admin overview
   ========================================================================== */

export async function getAdminOverview() {
  const [bookings, farms] = await Promise.all([listBookings(), listFarms()]);
  const live = bookings.filter((b) => b.status !== "cancelled");
  const revenue = live.reduce((s, b) => s + b.amount, 0);
  const now = today();
  const upcoming = live.filter((b) => b.date >= toISODate(now));

  const byDestination = {};
  live.forEach((b) => {
    byDestination[b.destinationId] = (byDestination[b.destinationId] || 0) + b.amount;
  });

  const byPackage = {};
  live.forEach((b) => {
    byPackage[b.packageId] = (byPackage[b.packageId] || 0) + b.guests;
  });

  // Booking demand by month of visit (Aug → Dec)
  const months = {};
  live.forEach((b) => {
    const key = b.date.slice(0, 7);
    months[key] = (months[key] || 0) + 1;
  });

  const stageCounts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.id, 0]));
  farms.forEach((f) => (stageCounts[f.stage] = (stageCounts[f.stage] || 0) + 1));

  return clone({
    activeDestinations: DESTINATIONS.filter((d) => d.status !== "soon").length,
    destinationsInDevelopment: DESTINATIONS.filter((d) => d.status === "soon").length,
    farmOpportunities: farms.filter((f) => !["operating"].includes(f.stage)).length,
    pendingAssessments: farms.filter((f) => ["new", "assessment", "review"].includes(f.stage)).length,
    bookingsCount: live.length,
    upcomingCount: upcoming.length,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    revenue,
    byDestination,
    byPackage,
    months,
    stageCounts,
    latestBookings: bookings.slice(0, 5),
    newFarms: farms.filter((f) => f.stage === "new"),
  });
}
