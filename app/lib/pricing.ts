// Promo + shipping rules shared by the bag preview and the checkout Worker.
// The Worker recomputes everything from catalog prices; the bag only previews.
import { isTeeBundleActive } from './promo.ts';

export const BUNDLE_SIZE = 3;
export const BUNDLE_PRICE_CENTS = 6500;
export const BUNDLE_STYLES = ['Tee'];
export const WELCOME_PERCENT = 10;
export const WOAKS10_CODE = 'WOAKS10';
export const ENB15_CODE = 'ENB15';
export const ENB15_PERCENT = 15;
export const FREE_SHIPPING_MIN_CENTS = 6000;

export type PricedLine = { style: string | null | undefined; unitCents: number; quantity: number };

export type DiscountOffer = {
  id?: string;
  code: string;
  name: string;
  kind: 'percent' | 'fixed';
  value: number; // Percent as a whole number, or fixed amount in cents.
  combinable: boolean;
  source: 'managed' | 'welcome';
};

export type DiscountBreakdown = { label: string; cents: number; code: string | null };

export type ManagedQuote = {
  subtotalCents: number;
  discountCents: number;
  breakdown: DiscountBreakdown[];
  appliedOffers: DiscountOffer[];
  skippedCodes: string[];
  bundleApplied: boolean;
  shippingCents: number;
  totalCents: number;
};

export type DiscountKind = 'bundle' | 'welcome' | 'woaks10' | 'enb15';
export type CodeKind = 'welcome' | 'woaks10' | 'enb15';

export function codeKindForPromoCode(code: string | null): CodeKind {
  return code === ENB15_CODE ? 'enb15' : code === WOAKS10_CODE ? 'woaks10' : 'welcome';
}

export type Quote = {
  subtotalCents: number;
  discountCents: number;
  discountKind: DiscountKind | null;
  discountLabel: string | null;
  shippingCents: number;
  totalCents: number;
  // True when a code was offered but the bundle saved more.
  promoCodeSkipped: boolean;
};

export function isHeavyGarment(style: string | null | undefined) {
  return /hood|sweat/i.test(style ?? '');
}

// Groups eligible tees into sets of three, priciest first, so the customer
// always gets the biggest saving the deal allows.
export function bundleDiscountCents(lines: PricedLine[]) {
  const tees = lines
    .flatMap((line) => (BUNDLE_STYLES.includes(line.style ?? '') ? Array<number>(line.quantity).fill(line.unitCents) : []))
    .sort((a, b) => b - a);
  let discount = 0;
  for (let index = 0; index + BUNDLE_SIZE <= tees.length; index += BUNDLE_SIZE) {
    const groupTotal = tees.slice(index, index + BUNDLE_SIZE).reduce((sum, cents) => sum + cents, 0);
    discount += Math.max(0, groupTotal - BUNDLE_PRICE_CENTS);
  }
  return discount;
}

// $6 for one garment, $9 for two, $11 for three, +$2 each after.
// Any hoodie/sweatshirt in the bag: $9 first garment, +$5 each after.
// Free once the discounted subtotal reaches $60.
export function shippingCents(lines: PricedLine[], discountedSubtotalCents: number) {
  const garments = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (garments === 0 || discountedSubtotalCents >= FREE_SHIPPING_MIN_CENTS) return 0;
  if (lines.some((line) => isHeavyGarment(line.style))) return 900 + 500 * (garments - 1);
  if (garments === 1) return 600;
  if (garments === 2) return 900;
  return 1100 + 200 * (garments - 3);
}

function offerSavings(offer: DiscountOffer, remainingCents: number) {
  const savings = offer.kind === 'percent'
    ? Math.round(remainingCents * offer.value / 100)
    : offer.value;
  return Math.min(remainingCents, Math.max(0, savings));
}

// Combinable codes apply in code order after the automatic tee deal. An
// exclusive code competes against that whole combination; customers get the
// larger saving. Checkout and the bag preview call this same calculation.
export function quoteWithOffers(lines: PricedLine[], offers: DiscountOffer[], now = Date.now()): ManagedQuote {
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
  const bundle = isTeeBundleActive(now) ? bundleDiscountCents(lines) : 0;
  const stackable = offers.filter((offer) => offer.combinable).sort((a, b) => a.code.localeCompare(b.code));
  const stackedBreakdown: DiscountBreakdown[] = bundle > 0
    ? [{ label: `${BUNDLE_SIZE} tees for $${BUNDLE_PRICE_CENTS / 100}`, cents: bundle, code: null }]
    : [];
  let remaining = subtotalCents - bundle;
  for (const offer of stackable) {
    const cents = offerSavings(offer, remaining);
    if (cents > 0) { stackedBreakdown.push({ label: offer.name, cents, code: offer.code }); remaining -= cents; }
  }
  const stackedSavings = subtotalCents - remaining;
  const bestExclusive = offers.filter((offer) => !offer.combinable)
    .map((offer) => ({ offer, cents: offerSavings(offer, subtotalCents) }))
    .sort((a, b) => b.cents - a.cents || a.offer.code.localeCompare(b.offer.code))[0];
  const useExclusive = Boolean(bestExclusive && bestExclusive.cents > stackedSavings);
  const breakdown: DiscountBreakdown[] = useExclusive
    ? [{ label: bestExclusive!.offer.name, cents: bestExclusive!.cents, code: bestExclusive!.offer.code }]
    : stackedBreakdown;
  const appliedCodes = new Set(breakdown.map((entry) => entry.code).filter((code): code is string => Boolean(code)));
  const appliedOffers = offers.filter((offer) => appliedCodes.has(offer.code));
  const discountCents = breakdown.reduce((sum, entry) => sum + entry.cents, 0);
  const bundleApplied = breakdown.some((entry) => entry.code === null);
  // The scheduled tee offer promises free shipping even when combined codes
  // lower the total below the normal $60 shipping threshold.
  const shipping = bundleApplied ? 0 : shippingCents(lines, subtotalCents - discountCents);
  return {
    subtotalCents, discountCents, breakdown, appliedOffers,
    skippedCodes: offers.filter((offer) => !appliedCodes.has(offer.code)).map((offer) => offer.code),
    bundleApplied,
    shippingCents: shipping,
    totalCents: subtotalCents - discountCents + shipping,
  };
}

export function quote(lines: PricedLine[], hasPromoCode: boolean, now = Date.now(), codeKind: CodeKind = 'welcome'): Quote {
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
  const bundle = isTeeBundleActive(now) ? bundleDiscountCents(lines) : 0;
  const codePercent = codeKind === 'enb15' ? ENB15_PERCENT : WELCOME_PERCENT;
  const codeDiscount = hasPromoCode ? Math.round((subtotalCents * codePercent) / 100) : 0;

  // Best deal only — the two offers never stack.
  const discountKind: DiscountKind | null = bundle === 0 && codeDiscount === 0 ? null : bundle >= codeDiscount ? 'bundle' : codeKind;
  const discountCents = discountKind === 'bundle' ? bundle : discountKind ? codeDiscount : 0;
  const discountLabel = discountKind === 'bundle'
    ? `${BUNDLE_SIZE} tees for $${BUNDLE_PRICE_CENTS / 100}`
    : discountKind === 'welcome' ? `${WELCOME_PERCENT}% off first order`
      : discountKind === 'woaks10' ? 'WOaks10 · 10% off'
        : discountKind === 'enb15' ? 'ENB15 · 15% off' : null;
  const shipping = shippingCents(lines, subtotalCents - discountCents);

  return {
    subtotalCents,
    discountCents,
    discountKind,
    discountLabel,
    shippingCents: shipping,
    totalCents: subtotalCents - discountCents + shipping,
    promoCodeSkipped: hasPromoCode && discountKind === 'bundle',
  };
}

export function normalizePromoCode(input: string | null | undefined) {
  const code = (input ?? '').trim().toUpperCase();
  return /^[A-Z0-9-]{4,32}$/.test(code) ? code : null;
}
