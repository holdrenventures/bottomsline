// Personalized trucker hats. The slug is the switch: these two products require
// a 3-digit area code, and every other product must not carry one. Checkout
// reloads the slug from Supabase and ignores the browser's price and name.

export const AREA_CODE_PRODUCTS = {
  'your-area-code-rainbow-trucker-hat': 'rainbow',
  'your-area-code-trans-pride-trucker-hat': 'trans',
} as const;

export type AreaCodeTreatment = (typeof AREA_CODE_PRODUCTS)[keyof typeof AREA_CODE_PRODUCTS];

const AREA_CODE_PATTERN = /^[0-9]{3}$/;

export function areaCodeTreatment(slug: string | null | undefined): AreaCodeTreatment | null {
  if (!slug) return null;
  return AREA_CODE_PRODUCTS[slug as keyof typeof AREA_CODE_PRODUCTS] ?? null;
}

export function isAreaCode(value: unknown): value is string {
  return typeof value === 'string' && AREA_CODE_PATTERN.test(value);
}

// Keeps leading zeros. A numeric 615 is rejected so a client cannot send a
// number that would collapse "012" into 12.
export function parseAreaCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return AREA_CODE_PATTERN.test(trimmed) ? trimmed : null;
}

export class AreaCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AreaCodeError';
  }
}

export function areaCodeForCheckout(slug: string, raw: unknown): string | null {
  if (!areaCodeTreatment(slug)) {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'string' && raw.trim() === '') return null;
    throw new AreaCodeError('That product does not take an area code.');
  }
  const parsed = parseAreaCode(raw);
  if (!parsed) throw new AreaCodeError('Enter a 3-digit area code.');
  return parsed;
}

export function areaCodeDetail(areaCode: string | null | undefined) {
  return isAreaCode(areaCode) ? `Area code ${areaCode}` : null;
}

// Same join the checkout route used before personalization, with the area
// code added only when this line has one.
export function checkoutLineDescription(parts: {
  style: string;
  color?: string | null;
  size: string;
  areaCode?: string | null;
}) {
  return [parts.style, parts.color, parts.size, areaCodeDetail(parts.areaCode)].filter(Boolean).join(' / ');
}

export function missingAreaCodeColumn(error: unknown) {
  return error instanceof Error
    && /area_code/.test(error.message)
    && /42703|does not exist/i.test(error.message);
}
