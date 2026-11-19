// Storefront promo + shipping copy, kept in one place so the banner and product
// pages stay in sync with whatever checkout actually honors.
export const PROMO_BANNER = '3 tees for $65 · Free shipping on $60+';
export const SHIPS_IN_BUSINESS_DAYS = '3–5';
export const BLACK_FRIDAY_BANNER = 'Black Friday: 3 tees for $65, shipped free · Through Cyber Monday';
export const CHRISTMAS_BANNER = 'Order by Wed, Dec 16 for Christmas · Free shipping on $60+';
export const AFTER_CHRISTMAS_CUTOFF_BANNER = 'Free shipping on $60+ · Free size swaps within 30 days';

// Central time is UTC−6 on both campaign boundaries in 2026.
export const BLACK_FRIDAY_START = Date.UTC(2026, 10, 27, 6);
export const BLACK_FRIDAY_END = Date.UTC(2026, 11, 1, 6);
export const CHRISTMAS_DELIVERY_END = Date.UTC(2026, 11, 17, 6);
export const THANKSGIVING_DELIVERY_CUTOFF = Date.UTC(2026, 10, 21, 6);

export function isBlackFridayPromo(now = Date.now()) {
  return now >= BLACK_FRIDAY_START && now < BLACK_FRIDAY_END;
}

export function isTeeBundleActive(now = Date.now()) {
  return now < BLACK_FRIDAY_END;
}

export function isChristmasDeliveryWindow(now = Date.now()) {
  return now >= BLACK_FRIDAY_END && now < CHRISTMAS_DELIVERY_END;
}

export function promoBanner(now = Date.now()) {
  if (isBlackFridayPromo(now)) return BLACK_FRIDAY_BANNER;
  if (isChristmasDeliveryWindow(now)) return CHRISTMAS_BANNER;
  return now >= CHRISTMAS_DELIVERY_END ? AFTER_CHRISTMAS_CUTOFF_BANNER : PROMO_BANNER;
}

const thanksgivingSlugs = new Set(['im-just-here-for-the-stuffing', 'lesbian-turkey-baster']);
const expiredPromise = /\bOrder by (?:Friday,?\s*)?(?:November|Nov)\s*20(?:,?\s*2026)?\s+for delivery by (?:Tuesday,?\s*)?(?:November|Nov)\s*24(?:,?\s*2026)?[.!]?\s*/gi;

export function publicThanksgivingCopy(slug: string, description: string, shippingNote: string | null, now = Date.now()) {
  if (now < THANKSGIVING_DELIVERY_CUTOFF || !thanksgivingSlugs.has(slug)) return { description, shippingNote };
  const cleanDescription = description.replace(expiredPromise, '').replace(/\s{2,}/g, ' ').trim();
  const cleanShipping = shippingNote?.replace(expiredPromise, '').trim() ?? null;
  return {
    description: cleanDescription,
    shippingNote: cleanShipping || `Ships in ${SHIPS_IN_BUSINESS_DAYS} business days.`,
  };
}
