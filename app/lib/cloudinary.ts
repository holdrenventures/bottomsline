/**
 * Wrap a Cloudinary URL with the `e_trim` effect so the delivered image is
 * cropped tightly to the visible shirt (no transparent/white whitespace).
 * Cloudinary applies the transform on the fly and caches it at the edge, so
 * every card gets a consistently-cropped mockup and the CSS layout stays
 * simple (no per-shirt margin hacks).
 *
 * - Idempotent: existing `e_trim` in the URL is left alone.
 * - Safe on non-Cloudinary URLs and on null.
 */
export function trimMockup(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  if (!url.includes('res.cloudinary.com')) return url;
  if (url.includes('/e_trim') || url.includes(',e_trim')) return url;
  // Chain the trim in front of whatever transforms are already there.
  return url.replace('/image/upload/', '/image/upload/e_trim/');
}
