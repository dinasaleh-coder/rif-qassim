/* ==========================================================================
   Paths & routes
   Resolved from this file's location, so links and assets work whether the
   prototype is served from a domain root, a sub-folder, or a local server —
   and from both /index.html and /pages/*.html.
   ========================================================================== */

export const ROOT = new URL("../../", import.meta.url);

/** Absolute URL for an asset path relative to the project root. */
export const asset = (path) => new URL(path, ROOT).href;

/* Page links in one place, so a renamed page is a one-line change */
export const ROUTES = {
  home: "index.html",
  destinations: "pages/destinations.html",
  destination: "pages/destination-detail.html",
  experiences: "pages/experiences.html",
  booking: "pages/booking.html",
  business: "pages/business.html",
  assessment: "pages/assessment.html",
  result: "pages/assessment-result.html",
  owner: "pages/owner-dashboard.html",
  admin: "pages/admin.html",
  about: "index.html#about",
  contact: "index.html#contact",
  styleguide: "pages/styleguide.html",
};

/* Pages delivered so far. Links to pages from later build parts are caught
   by the shell and explained, instead of leading to a 404. Add each page
   here as its part is delivered. */
export const READY = new Set(Object.keys(ROUTES)); // every page is built

const PART_OF = { experiences: 3, booking: 3, business: 4, assessment: 4, result: 4, owner: 5, admin: 6 };

/** Which build part delivers a route that isn't ready yet (or null). */
export function pendingPart(href) {
  try {
    const u = new URL(href, location.href);
    for (const [name, part] of Object.entries(PART_OF)) {
      const path = new URL(ROUTES[name], ROOT).pathname;
      if (u.pathname === path && !READY.has(name)) return part;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/**
 * route("destination", { id: "sidr" }) → ".../pages/destination-detail.html?id=sidr"
 */
export function route(name, params) {
  const target = ROUTES[name] || ROUTES.home;
  const [path, hash] = target.split("#");
  const url = new URL(path, ROOT);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }
  if (hash) url.hash = hash;
  return url.href;
}
