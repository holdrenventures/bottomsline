// Cloudinary helpers for the Bottom's Line design adjuster.
// One design asset can have a separate placement on each garment color.

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

export function designUrl(slug) {
  return `${base}/designs/${slug}.png`;
}

/**
 * A finished mockup: design overlaid on a colored blank.
 * placement = { w, x, y, angle } in Cloudinary's fl_relative / g_north space:
 *   w = design width as a fraction of the shirt width
 *   x = horizontal offset of the design center from center (fraction, +right)
 *   y = design top as a fraction of shirt height (from the top)
 *   angle = clockwise rotation in degrees, applied only to the overlay
 * trim=true adds e_trim so the preview matches the trimmed storefront images.
 */
export function mockupUrl({ slug, garment, colorToken, placement, trim = true }) {
  const g = GARMENTS[garment];
  const { w, x, y, angle = 0 } = placement;
  const trimStep = trim ? "/e_trim" : "";
  if (n(angle, 1)) {
    // Keep rotation on the overlay. Applying a_ to the legacy one-component
    // URL can rotate the entire finished mockup on some Cloudinary paths.
    let apply = "fl_layer_apply,g_north";
    if (n(x)) apply += `,x_${n(x)}`;
    if (n(y)) apply += `,y_${n(y)}`;
    return `${base}/l_designs:${slug}/c_scale,fl_relative,w_${n(w)}/a_${n(angle, 1)}/${apply}${trimStep}/blanks/${g.folder}/${g.prefix}_${colorToken}_front.png`;
  }
  let t = `l_designs:${slug},fl_relative,w_${n(w)},g_north`;
  if (n(x)) t += `,x_${n(x)}`;
  if (n(y)) t += `,y_${n(y)}`;
  return `${base}/${t}${trimStep}/blanks/${g.folder}/${g.prefix}_${colorToken}_front.png`;
}

// Recover a saved color's placement when opening an existing product in the editor.
// Older URLs omit angle; those designs start at zero degrees.
export function placementFromMockupUrl(url) {
  const layer = typeof url === "string" && url.match(/\/l_designs:([a-z0-9-]+)([\s\S]*?)\/(?:e_trim\/)?blanks\//);
  if (!layer) return null;
  const value = (key, fallback) => {
    const match = layer[2].match(new RegExp(`(?:^|[,/])${key}_(-?\\d+(?:\\.\\d+)?)`));
    return match ? Number(match[1]) : fallback;
  };
  return { slug: layer[1], placement: { w: value("w", 0.34), x: value("x", 0), y: value("y", 0), angle: value("a", 0) } };
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
