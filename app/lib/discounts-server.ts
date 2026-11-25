import 'server-only';
import { normalizePromoCode, WELCOME_PERCENT, type DiscountOffer } from './pricing';
import { supabaseAdmin } from './supabase-admin';

type DiscountRow = {
  id: string;
  code: string;
  name: string;
  kind: 'percent' | 'fixed';
  value: number;
  active: boolean;
  combinable: boolean;
};

type WelcomeRow = { discount_code: string; redeemed_at: string | null };

export class InvalidDiscountCodeError extends Error {}

export async function resolveDiscountCodes(rawCodes: unknown): Promise<DiscountOffer[]> {
  if (!Array.isArray(rawCodes) || rawCodes.length > 5 || rawCodes.some((code) => typeof code !== 'string')) {
    throw new InvalidDiscountCodeError('Enter up to five discount codes.');
  }
  const codes = rawCodes.map((code: string) => normalizePromoCode(code));
  if (codes.some((code) => !code) || new Set(codes).size !== codes.length) {
    throw new InvalidDiscountCodeError('Check the discount codes and remove any duplicates.');
  }

  return Promise.all(codes.map(async (code): Promise<DiscountOffer> => {
    const rows = await supabaseAdmin(
      `discounts?select=id,code,name,kind,value,active,combinable&code=eq.${encodeURIComponent(code!)}&limit=1`,
    ) as DiscountRow[];
    const managed = rows[0];
    if (managed) {
      if (!managed.active) throw new InvalidDiscountCodeError(`${code} is not active.`);
      return { id: managed.id, code: managed.code, name: managed.name, kind: managed.kind, value: managed.value, combinable: managed.combinable, source: 'managed' };
    }
    if (code?.startsWith('QUIET-')) {
      const welcome = await supabaseAdmin(
        `email_signups?select=discount_code,redeemed_at&discount_code=eq.${encodeURIComponent(code)}&limit=1`,
      ) as WelcomeRow[];
      if (welcome[0] && !welcome[0].redeemed_at) {
        return { code, name: `${WELCOME_PERCENT}% off first order`, kind: 'percent', value: WELCOME_PERCENT, combinable: false, source: 'welcome' };
      }
    }
    throw new InvalidDiscountCodeError(`${code} is invalid or has already been used.`);
  }));
}
