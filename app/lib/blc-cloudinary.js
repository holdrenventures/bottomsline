// Cloudinary helpers for the Bottom's Line design adjuster.
// The whole system rests on ONE idea: a design is a single overlay asset,
// and every shirt color is generated on the fly by dropping that overlay
// onto a per-color blank. Set placement once -> every color reproduces.

import CATALOG from "./blc-colors.json";

export const CLOUD = CATALOG.cloud;               // "bihiyho3"
export const GARMENTS = CATALOG.garments;         // tee -> {folder, prefix}, tank -> {...}
export const COLORS = CATALOG.colors;             // { tee: [...], tank: [...] }

const base = `https://res.cloudinary.com/${CLOUD}/image/upload`;

// Round + drop near-zero offsets so URLs stay clean (matches your existing ones).
function n(v, d = 4) {
  const r = +Number(v).toFixed(d);
  return r === 0 ? 0 : r;
}

/**
 * The raw blank, no overlay. Use this as the drag canvas so pointer
 * coordinates map 1:1 to Cloudinary's base image (do NOT trim it here).
 */
export function blankUrl(garment, colorToken) {
  const g = GARMENTS[garment];
  return `${base}/blanks/${g.folder}/${g.prefix}_${colorToken}_front.png`;
}

/**
 * A finished mockup: design overlaid on a colored blank.
 * placement = { w, x, y } in Cloudinary's fl_relative / g_north space:
 *   w = design width as a fraction of the shirt width
 *   x = horizontal offset of the design center from center (fraction, +right)
 *   y = design top as a fraction of shirt height (from the top)
 * trim=true adds e_trim so the preview matches the trimmed storefront images.
 */
export function mockupUrl({ slug, garment, colorToken, placement, trim = true }) {
  const g = GARMENTS[garment];
  const { w, x, y } = placement;
  let t = `l_designs:${slug},fl_relative,w_${n(w)},g_north`;
  if (n(x)) t += `,x_${n(x)}`;
  if (n(y)) t += `,y_${n(y)}`;
  const trimStep = trim ? "/e_trim" : "";
  return `${base}/${t}${trimStep}/blanks/${g.folder}/${g.prefix}_${colorToken}_front.png`;
}

// slugify a filename into a clean overlay id: "Hard Cock Pharmacy.png" -> "hard-cock-pharmacy"
export function slugify(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
