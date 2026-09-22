/**
 * Deterministic per-card pin geometry.
 *
 * Both helpers hash the same key (usually the product slug) with djb2 so the
 * value is stable across SSR and client renders — no hydration mismatch —
 * while the distribution across products looks random, not alternating.
 *
 *   pinShift  → horizontal offset from center in px. The clothespin ends up
 *               just to the left or right of the shirt collar.
 *   pinSlant  → rotation applied to the whole card visual, pivoted at the pin.
 *               The pin corner is the high point and the opposite corner
 *               droops, as if gravity is pulling the shirt off the line.
 *               Two subtle magnitudes so cards don't all tilt identically.
 */
function djb2(key: string): number {
  let h = 5381 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h * 33) ^ key.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pinShift(key: string): string {
  return djb2(key) % 2 === 0 ? '-50px' : '50px';
}

export function pinSlant(key: string): string {
  const h = djb2(key);
  // Pin left (shift -32) → shirt tilts clockwise (+deg), high corner on the left.
  // Pin right (shift +32) → shirt tilts counterclockwise (-deg), high corner on the right.
  const sign = h % 2 === 0 ? 1 : -1;
  // Two magnitudes for variety across a row.
  const magnitude = ((h >>> 3) & 1) === 0 ? 1.4 : 2.2;
  return `${(sign * magnitude).toFixed(2)}deg`;
}
