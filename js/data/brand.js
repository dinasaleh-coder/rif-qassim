/* ==========================================================================
   Brand configuration
   ---------------------------------------------------------------------------
   LOGO — two steps, nothing else changes:
     1. Copy the official logo into /assets/logo/  (SVG preferred, PNG fine)
     2. Set `file` below to its path, e.g. "assets/logo/rif-logo.svg"

   The logo then appears in the header, mobile menu and footer on every
   page. (Replace assets/favicon.svg separately for the browser tab icon.) For dark grounds (footer, menu, homepage hero) either:
     - set `fileOnDark` to a light version of the logo, or
     - leave it null and keep onDark: "invert", which turns a single-colour
       logo off-white. Use onDark: "none" for a multi-colour logo.

   While `file` is null a typeset wordmark is shown. (The prototype doesn't
   probe for files it hasn't been told about, so there are no 404s in the
   console.)
   ========================================================================== */

export const BRAND = {
  logo: {
    file: null, // e.g. "assets/logo/rif-logo.svg"
    fileOnDark: null, // e.g. "assets/logo/rif-logo-light.svg"
    onDark: "invert", // "invert" | "none"
    alt: { ar: "ريف القصيم", en: "Rif Qassim" },
  },
  name: { ar: "ريف القصيم", en: "Rif Qassim" },
  tagline: "Rural Tourism Solutions",
  contact: {
    // Placeholder contact details for the prototype (reserved example domain)
    email: "hello@rif-qassim.example",
    phoneDisplay: "+966 5X XXX XXXX",
  },
  social: [
    { key: "instagram", label: "Instagram" },
    { key: "x", label: "X" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "youtube", label: "YouTube" },
  ],
};
