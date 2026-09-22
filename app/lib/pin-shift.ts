/**
 * Pick a clothespin horizontal offset for a card. Deterministic in the input
 * string so server and client render the same value (no hydration mismatch)
 * while distributing left/right across products in a visually random-looking
 * way — no alternating pattern.
 *
 * The offset lands the pin just to the left or right of the shirt's collar.
 */
export function pinShift(key: string): string {
  // 32-bit djb2 hash — cheap, well-distributed for short slugs.
  let hash = 5381 >>> 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash * 33) ^ key.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? '-32px' : '32px';
}
