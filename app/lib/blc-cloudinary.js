// The editor keeps originals and finished storefront mockups in Cloudflare R2.
// Cloudinary is used only for a finalized composition at save time.
import CATALOG from './blc-colors.json';

export const CLOUD = CATALOG.cloud;
export const GARMENTS = CATALOG.garments;
export const COLORS = CATALOG.colors;
export const R2_ORIGIN = 'https://images.bottomslineclothing.com';

const fetchBase = `https://res.cloudinary.com/${CLOUD}/image/fetch`;
const n = (value, digits = 4) => {
  const rounded = +Number(value).toFixed(digits);
  return rounded === 0 ? 0 : rounded;
};

export function blankUrl(garment, colorToken) {
  const config = GARMENTS[garment];
  if (!config) throw new Error('Unsupported garment blank.');
  return `${R2_ORIGIN}/editor/blanks/${config.folder}/${config.prefix}_${colorToken}_front.${config.ext || 'png'}`;
}

export function artworkUrl(key) {
  return `${R2_ORIGIN}/${key}`;
}

// Keep the historical parser so existing placement values can be recovered
// from Cloudinary backup URLs, even though their originals are unavailable.
export function placementFromMockupUrl(url) {
  const layer = typeof url === 'string' && url.match(/\/l_designs:([a-z0-9-]+)([\s\S]*?)\/(?:e_trim\/)?blanks\//);
  if (!layer) return null;
  const value = (key, fallback) => {
    const match = layer[2].match(new RegExp(`(?:^|[,/])${key}_(-?\\d+(?:\\.\\d+)?)`));
    return match ? Number(match[1]) : fallback;
  };
  return { slug: layer[1], placement: { w: value('w', 0.34), x: value('x', 0), y: value('y', 0), angle: value('a', 0), brightness: 0 } };
}

export function mockupUrl({ artwork, garment, colorToken, placement, trim = undefined }) {
  const { w, x, y, angle = 0, brightness = 0 } = placement;
  const encodedArtwork = btoa(artwork).replace(/\+/g, '-').replace(/\//g, '_');
  const steps = [`l_fetch:${encodedArtwork}`, `c_scale,fl_relative,w_${n(w)}`];
  if (n(brightness, 1)) steps.push(`e_brightness:${n(brightness, 1)}`);
  if (n(angle, 1)) steps.push(`a_${n(angle, 1)}`);
  let apply = 'fl_layer_apply,fl_relative,g_north';
  if (n(x)) apply += `,x_${n(x)}`;
  if (n(y)) apply += `,y_${n(y)}`;
  steps.push(apply);
  if (trim ?? (GARMENTS[garment].trim !== false)) steps.push('e_trim');
  return `${fetchBase}/${steps.join('/')}/${blankUrl(garment, colorToken)}`;
}

export function slugify(name) {
  return name.replace(/\.[^.]+$/, '').toLowerCase().replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
