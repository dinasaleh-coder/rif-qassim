/* ==========================================================================
   Store
   One place for application state. Slices marked `persist` are saved to
   localStorage so drafts survive reloads and the visitor / owner / admin
   pages share the same demo data — this is what closes the end-to-end loop
   (a booking made as a visitor shows up in admin).

   Later, persisted slices map 1:1 onto backend tables / API resources.
   ========================================================================== */

const PREFIX = "rif:v1:";

/** Slice definitions: default value + whether it is persisted. */
const SLICES = {
  lang: { persist: true, initial: () => "ar" },

  /* Visitor */
  bookingDraft: {
    persist: true,
    initial: () => ({
      packageId: null,
      destinationId: null,
      date: null, // ISO yyyy-mm-dd
      guests: 2,
      addOns: [], // add-on ids
      step: 1,
      contact: { name: "", phone: "", email: "" },
    }),
  },
  userBookings: { persist: true, initial: () => [] }, // bookings created in the demo
  interests: { persist: true, initial: () => [] }, // "notify me" requests for upcoming destinations

  /* Farm owner */
  assessmentDraft: { persist: true, initial: () => ({ step: 1, answers: {}, uploads: {} }) },
  assessmentResult: { persist: true, initial: () => null },
  assumptions: { persist: true, initial: () => null }, // null → defaults from data
  scenario: { persist: true, initial: () => "base" },
  studyRequests: { persist: true, initial: () => [] },
  submittedFarms: { persist: true, initial: () => [] }, // owner submissions → admin pipeline
  ownerMessages: { persist: true, initial: () => [] },

  /* Internal RIF */
  farmStages: { persist: true, initial: () => ({}) }, // farmId → stage override
  bookingStatuses: { persist: true, initial: () => ({}) }, // bookingId → status override
  studyStatuses: { persist: true, initial: () => ({}) }, // seed study request id → status override
  contentOverrides: { persist: true, initial: () => ({ destinations: {}, experiences: {}, packages: {} }) }, // admin demo edits

  /* UI only */
  ui: { persist: false, initial: () => ({ menuOpen: false }) },
};

const state = {};
const listeners = new Map(); // slice → Set<fn>

const memoryStorage = new Map();
const storage = (() => {
  try {
    const k = "__rif_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    // Private mode / non-browser: fall back to memory for this session
    return {
      getItem: (k) => (memoryStorage.has(k) ? memoryStorage.get(k) : null),
      setItem: (k, v) => memoryStorage.set(k, String(v)),
      removeItem: (k) => memoryStorage.delete(k),
    };
  }
})();

function load(name) {
  const def = SLICES[name];
  if (!def) throw new Error(`Unknown store slice: ${name}`);
  if (def.persist) {
    try {
      const rawValue = storage.getItem(PREFIX + name);
      if (rawValue !== null) return JSON.parse(rawValue);
    } catch {
      /* corrupted value: fall through to the initial value */
    }
  }
  return def.initial();
}

function save(name) {
  if (!SLICES[name].persist) return;
  try {
    storage.setItem(PREFIX + name, JSON.stringify(state[name]));
  } catch {
    /* quota exceeded: keep in memory */
  }
}

function emit(name) {
  listeners.get(name)?.forEach((fn) => {
    try {
      fn(state[name]);
    } catch (err) {
      console.error(err);
    }
  });
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export const store = {
  /** Read a slice (loaded lazily). */
  get(name) {
    if (!(name in state)) state[name] = load(name);
    return state[name];
  },

  /**
   * Update a slice. Objects are shallow-merged; arrays and primitives are
   * replaced. Pass a function to compute the next value from the current one.
   */
  set(name, next) {
    const current = this.get(name);
    let value = typeof next === "function" ? next(current) : next;
    if (isPlainObject(current) && isPlainObject(value)) value = { ...current, ...value };
    state[name] = value;
    save(name);
    emit(name);
    return value;
  },

  /** Restore a slice to its initial value. */
  reset(name) {
    state[name] = SLICES[name].initial();
    if (SLICES[name].persist) storage.removeItem(PREFIX + name);
    emit(name);
    return state[name];
  },

  subscribe(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name).delete(fn);
  },

  /** Wipe every persisted demo value except the language preference. */
  resetDemo() {
    Object.keys(SLICES).forEach((name) => {
      if (name !== "lang") this.reset(name);
    });
  },
};

/* Keep tabs in sync: a booking made in one tab appears in an open admin tab */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (!e.key || !e.key.startsWith(PREFIX)) return;
    const name = e.key.slice(PREFIX.length);
    if (!SLICES[name]) return;
    state[name] = load(name);
    emit(name);
  });
}
