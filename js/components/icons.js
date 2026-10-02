/* ==========================================================================
   Icons — one consistent 24px, 1.5-stroke line set.
   Icons that point "forward" (arrow, chevron) are drawn for LTR and get the
   .icon--dir class so CSS mirrors them in RTL.
   ========================================================================== */

import { raw } from "../core/dom.js";

const P = {
  arrow: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  "chevron-down": '<path d="M5 9l7 7 7-7"/>',
  "chevron-up": '<path d="M5 15l7-7 7 7"/>',
  menu: '<path d="M3 7h18M3 12h18M3 17h12"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.8a3.4 3.4 0 010 6.4M18.5 14.8c1.6.8 2.7 2.6 3 5.2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c.8-4 4-6 8-6s7.2 2 8 6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v4.5h16V15"/>',
  file: '<path d="M14 3H6.5v18h11V6.5L14 3z"/><path d="M14 3v3.5h3.5M9 12h6M9 15.5h6"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><circle cx="9" cy="9.5" r="1.8"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
  leaf: '<path d="M5 19c0-8 5-13.5 14-14-.3 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
  palm: '<path d="M12 21v-9"/><path d="M12 12c-1.5-3-4.5-4.5-8-4 1.8 1 3 2.5 3.5 4.5"/><path d="M12 12c1.5-3 4.5-4.5 8-4-1.8 1-3 2.5-3.5 4.5"/><path d="M12 12c-.8-3.5.2-6.5 3-8.5-.2 2-.6 3.2-1.4 4.6"/><path d="M12 12c.6-3.4-.6-6.3-3.4-8.2.3 2 .8 3.2 1.6 4.5"/>',
  home: '<path d="M4 10.5L12 4l8 6.5V20H4v-9.5z"/><path d="M10 20v-5.5h4V20"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  sprout: '<path d="M12 21v-8"/><path d="M12 13c0-4-3-6.5-7-6.5 0 4 3 6.5 7 6.5z"/><path d="M12 11c0-3.5 2.5-6 6.5-6 0 3.5-2.5 6-6.5 6z"/>',
  briefcase: '<rect x="3.5" y="7" width="17" height="12.5" rx="1.5"/><path d="M9 7V4.5h6V7M3.5 12.5h17"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  message: '<path d="M4 5h16v11H9l-5 4V5z"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 004 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  moon: '<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5s1.1-6.1 3.5-8.5z"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2 2A16.5 16.5 0 014.5 5.5a2 2 0 012-2z"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
  alert: '<path d="M12 4l9 15.5H3L12 4z"/><path d="M12 10v4.5M12 17v.3"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M15.5 4.5l4 4L9 19H5v-4L15.5 4.5z"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
  drag: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  car: '<path d="M4 16.5V12l2-5h12l2 5v4.5"/><path d="M3.5 12h17v4.5h-17z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>',
  wifi: '<path d="M3 9a13 13 0 0118 0M6 12.5a8.5 8.5 0 0112 0M9 16a4 4 0 016 0"/><circle cx="12" cy="19" r=".6"/>',
  flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.8 3.5-5.6 3.5-9.9 2.6 1.6 4.3 4 4.3 6.5.9-.8 1.4-1.9 1.5-3 1.6 1.6 2.7 3.7 2.7 6.4 0 3.2-2.4 5.6-6 5.6z"/>',
  pot: '<path d="M4 10h16v5.5a4.5 4.5 0 01-4.5 4.5h-7A4.5 4.5 0 014 15.5V10z"/><path d="M2.5 10h19M9 6.5c0-1 .5-1.5.5-2.5M13 6.5c0-1 .5-1.5.5-2.5"/>',
  path: '<path d="M8 21c0-4 4-5 4-9s-4-5-4-9M16 21c0-4-1.5-5-1.5-9S16 7 16 3"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.6a6 6 0 01-12 0C6 9.9 12 3.5 12 3.5z"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z"/>',
  door: '<path d="M5 21V3.5h11V21M3 21h18"/><path d="M13 12.5v.5"/>',
  bed: '<path d="M3 18.5V6M3 14h18v4.5M21 14v-2.5a3 3 0 00-3-3h-7.5V14"/><circle cx="7" cy="10.5" r="1.8"/>',
  map: '<path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2v-13z"/><path d="M9 4.5v13M15 6.5v13"/>',
  layers: '<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8 12 3.5z"/><path d="M3.5 12l8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  coin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  refresh: '<path d="M19.5 9A8 8 0 006 6.5L4 8.5M4.5 15A8 8 0 0018 17.5l2-2"/><path d="M4 4v4.5h4.5M20 20v-4.5h-4.5"/>',
  logout: '<path d="M14 4h5.5v16H14M10 8l-4 4 4 4M6 12h10"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r=".7"/>',
  x: '<path d="M4.5 4.5l15 15M19.5 4.5l-15 15"/>',
  linkedin: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 10.5v6M8 7.5v.3M11.5 16.5v-6M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1 1 2.1 2.6v3.5"/>',
  youtube: '<rect x="3" y="6" width="18" height="12" rx="3.5"/><path d="M10.5 9.5l4 2.5-4 2.5v-5z"/>',
  survey: '<path d="M4 18c2.5-1.8 4-1.8 6.5 0s4 1.8 6.5 0 3-1.5 3-1.5M4 13c2.5-1.8 4-1.8 6.5 0s4 1.8 6.5 0 3-1.5 3-1.5M4 8c2.5-1.8 4-1.8 6.5 0s4 1.8 6.5 0 3-1.5 3-1.5"/>',
};

/* Icons that represent direction in the reading flow */
const DIRECTIONAL = new Set(["arrow", "chevron"]);

/**
 * icon("arrow") → safe SVG markup
 * @param {string} name
 * @param {{ size?: "sm"|"lg", label?: string, cls?: string }} opts
 */
export function icon(name, { size, label, cls = "" } = {}) {
  const body = P[name] || P.info;
  const classes = ["icon", size ? `icon--${size}` : "", DIRECTIONAL.has(name) ? "icon--dir" : "", cls].filter(Boolean).join(" ");
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, "&quot;")}"` : 'aria-hidden="true" focusable="false"';
  return raw(`<svg class="${classes}" viewBox="0 0 24 24" ${a11y}>${body}</svg>`);
}

export const ICON_NAMES = Object.keys(P);
