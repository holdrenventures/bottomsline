import { isAdminRequest, supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const fulfillmentStatuses = ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
type FulfillmentStatus = typeof fulfillmentStatuses[number];

function unauthorized() {
  return Response.json({ error: 'Invalid admin token.' }, { status: 401 });
}

function cleanNullable(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`Value cannot exceed ${maxLength} characters.`);
  return trimmed || null;
}

function cleanTrackingUrl(value: unknown) {
  const cleaned = cleanNullable(value, 1000);
  if (!cleaned) return null;
  let url: URL;
  try { url = new URL(cleaned); } catch { throw new Error('Tracking URL must be a valid URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Tracking URL must use HTTP or HTTPS.');
  return url.toString();
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  try {
    const select = [
      'id', 'stripe_checkout_session_id', 'stripe_payment_intent_id',
      'customer_email', 'customer_name', 'shipping_address', 'payment_status',
      'fulfillment_status', 'currency', 'subtotal_cents', 'discount_cents',
      'shipping_cents', 'tax_cents', 'total_cents', 'carrier',
      'tracking_number', 'tracking_url', 'fulfilled_at', 'created_at', 'updated_at',
      'order_items(id,product_name,style,color,garment,size,sku,quantity,unit_price_cents)',
    ].join(',');
    const orders = await supabaseAdmin(`orders?select=${encodeURIComponent(select)}&order=created_at.desc&limit=100`);
    return Response.json({ orders });
  } catch (error) {
    console.error('Orders Desk load failed:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Unable to load orders.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  try {
    const input = await request.json() as {
      id?: string;
      fulfillment_status?: string;
      carrier?: string | null;
      tracking_number?: string | null;
      tracking_url?: string | null;
    };
    const id = input.id?.trim() ?? '';
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) throw new Error('A valid order is required.');
    if (!fulfillmentStatuses.includes(input.fulfillment_status as FulfillmentStatus)) {
      throw new Error('Choose a valid fulfillment status.');
    }
    const fulfillmentStatus = input.fulfillment_status as FulfillmentStatus;
    const currentRows = await supabaseAdmin(
      `orders?select=id,fulfilled_at&id=eq.${encodeURIComponent(id)}&limit=1`,
    ) as Array<{ id: string; fulfilled_at: string | null }>;
    const current = currentRows[0];
    if (!current) return Response.json({ error: 'Order not found.' }, { status: 404 });

    const completed = fulfillmentStatus === 'shipped' || fulfillmentStatus === 'delivered';
    const updated = await supabaseAdmin(`orders?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        fulfillment_status: fulfillmentStatus,
        carrier: cleanNullable(input.carrier, 120),
        tracking_number: cleanNullable(input.tracking_number, 240),
        tracking_url: cleanTrackingUrl(input.tracking_url),
        fulfilled_at: completed ? current.fulfilled_at ?? new Date().toISOString() : null,
      }),
    }) as Array<{ id: string }>;
    if (!updated[0]) throw new Error('Supabase did not return the updated order.');
    return Response.json({ ok: true, id: updated[0].id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update order.';
    const expected = /valid|Choose|cannot exceed|required|not found/i.test(message);
    if (!expected) console.error('Orders Desk update failed:', message);
    return Response.json({ error: expected ? message : 'Unable to update order.' }, { status: expected ? 400 : 500 });
  }
}
