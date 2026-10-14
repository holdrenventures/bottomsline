import 'server-only';

// Email templates receive just what the webhook already has in scope — no
// extra DB queries required. Keep this tight so templates are easy to test.
export type EmailOrder = {
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  shipping_address: Record<string, string | null> | null;
  payment_status: string;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
};

export type EmailOrderItem = {
  product_name: string;
  style: string;
  color: string | null;
  garment: string | null;
  size: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
};

export function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

export function shortSessionId(id: string) {
  // cs_live_a1Bsyo5r... → BSYO (readable order ref the customer can quote)
  const stripped = id.replace(/^cs_(live|test)_a1/, '');
  return stripped.slice(0, 6).toUpperCase();
}

export function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
