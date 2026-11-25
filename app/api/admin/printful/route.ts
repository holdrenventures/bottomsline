import { isAdminRequest, supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

type Address = { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null; fulfillment_method?: string | null; phone?: string | null };
type Order = { id: string; payment_status: string; fulfillment_status: string; customer_name: string | null; customer_email: string | null; shipping_address: Address | null; printful_draft_id: number | null; printful_draft_state: string; updated_at: string };
type Item = { id: string; variant_id: string; colorway_id: string | null; product_name: string; quantity: number };
type Mapping = { variant_id: string; colorway_id: string; printful_sync_variant_id: number; printful_sync_product_id: number };
type PrintfulVariant = { id: number; sync_product_id: number; name: string; synced: boolean; files?: unknown[] };
type PrintfulOrder = { id: number; status: string; external_id: string | null };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const positiveId = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0;
const unauthorized = () => Response.json({ error: 'Invalid admin token.' }, { status: 401 });

async function printful(path: string, init: RequestInit = {}, envelope = false) {
  const token = process.env.PRINTFUL_TOKEN;
  if (!token) throw new Error('Printful is not configured. Add PRINTFUL_TOKEN as a server secret.');
  const response = await fetch(`https://api.printful.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(process.env.PRINTFUL_STORE_ID ? { 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => null) as { result?: unknown; paging?: { total?: number; offset?: number; limit?: number }; error?: { message?: string } } | null;
  if (!response.ok) {
    const detail = body?.error?.message?.slice(0, 240);
    throw new Error(`Printful request failed (${response.status})${detail ? `: ${detail}` : '.'}`);
  }
  return envelope ? body : body?.result;
}

async function orderWithItems(id: string) {
  const rows = await supabaseAdmin(
    `orders?select=id,payment_status,fulfillment_status,customer_name,customer_email,shipping_address,printful_draft_id,printful_draft_state,updated_at,order_items(id,variant_id,colorway_id,product_name,quantity)&id=eq.${id}&limit=1`,
  ) as Array<Order & { order_items: Item[] }>;
  return rows[0] ?? null;
}

async function saveRemoteDraft(id: string, remote: PrintfulOrder) {
  if (!positiveId(remote.id) || remote.external_id !== id) throw new Error('Printful returned an unexpected order.');
  const rows = await supabaseAdmin(`orders?id=eq.${id}&printful_draft_id=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      printful_draft_id: remote.id,
      printful_draft_state: 'draft',
      printful_draft_created_at: new Date().toISOString(),
    }),
  }) as Array<{ id: string }>;
  if (!rows[0]) throw new Error('Printful draft exists, but its reference could not be saved. Use Check Printful.');
  return Response.json({ ok: true, printful_draft_id: remote.id, printful_status: remote.status });
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const params = new URL(request.url).searchParams;
    const productId = Number(params.get('product_id'));
    if (params.has('product_id')) {
      if (!positiveId(productId)) return Response.json({ error: 'Choose a valid Printful product.' }, { status: 400 });
      const result = await printful(`/store/products/${productId}`) as { sync_product: { id: number; name: string }; sync_variants: PrintfulVariant[] } | null;
      return Response.json({ product: result?.sync_product ?? null, variants: result?.sync_variants ?? [] });
    }
    const search = params.get('search')?.trim().toLowerCase().slice(0, 100) ?? '';
    const products: Array<{ id: number; name: string; synced: number; variants: number }> = [];
    for (let offset = 0; offset < 1000;) {
      const page = await printful(`/store/products?status=synced&offset=${offset}&limit=100`, {}, true) as { result?: Array<{ id: number; name: string; synced: number; variants: number }>; paging?: { total?: number; offset?: number } } | null;
      if (offset > 0 && page?.paging?.offset !== offset) throw new Error('Printful product paging did not advance. Try again later.');
      const rows = page?.result ?? [];
      products.push(...rows.filter((product) => product.name.toLowerCase().includes(search)));
      if (!rows.length || offset + rows.length >= (page?.paging?.total ?? rows.length)) break;
      offset += rows.length;
    }
    return Response.json({ products });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Printful lookup failed.' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  let orderId = '';
  let claimed = false;
  let postStarted = false;
  try {
    const input = await request.json() as { action?: string; order_id?: string; order_item_id?: string; sync_variant_id?: number; confirm_no_draft?: boolean };
    if (input.action === 'map') {
      const itemId = input.order_item_id?.trim() ?? '';
      if (!uuid.test(itemId) || !positiveId(input.sync_variant_id)) return Response.json({ error: 'Choose an order item and Printful variant.' }, { status: 400 });
      const items = await supabaseAdmin(`order_items?select=id,variant_id,colorway_id,order_id&id=eq.${itemId}&limit=1`) as Array<Item & { order_id: string }>;
      const item = items[0];
      if (!item?.colorway_id) return Response.json({ error: 'This item has no saved colorway; it cannot be matched safely.' }, { status: 400 });
      const orders = await supabaseAdmin(`orders?select=printful_draft_id,printful_draft_state&id=eq.${item.order_id}&limit=1`) as Array<{ printful_draft_id: number | null; printful_draft_state: string }>;
      if (!orders[0] || orders[0].printful_draft_id || orders[0].printful_draft_state !== 'idle') return Response.json({ error: 'This order is already being sent to Printful or has a draft.' }, { status: 409 });
      const variant = await printful(`/store/variants/${input.sync_variant_id}`) as PrintfulVariant | null;
      if (!variant?.synced || !positiveId(variant.sync_product_id) || !variant.files?.length) {
        return Response.json({ error: 'Choose a synced Printful variant with its print file configured.' }, { status: 400 });
      }
      await supabaseAdmin('printful_variant_mappings?on_conflict=variant_id,colorway_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ variant_id: item.variant_id, colorway_id: item.colorway_id, printful_sync_variant_id: variant.id, printful_sync_product_id: variant.sync_product_id, printful_name: variant.name, verified_at: new Date().toISOString() }),
      });
      return Response.json({ ok: true });
    }

    orderId = input.order_id?.trim() ?? '';
    if (!uuid.test(orderId) || !['draft', 'reconcile', 'reset'].includes(input.action ?? '')) return Response.json({ error: 'Choose a valid order action.' }, { status: 400 });
    const order = await orderWithItems(orderId);
    if (!order) return Response.json({ error: 'Order not found.' }, { status: 404 });
    if (order.printful_draft_id) return Response.json({ error: `This order already has Printful draft #${order.printful_draft_id}.` }, { status: 409 });

    // The store order ID is the Printful external ID, so a failed response can
    // be reconciled without creating a second draft.
    if (input.action === 'reset') {
      if (!input.confirm_no_draft || !['creating', 'needs_review'].includes(order.printful_draft_state)) return Response.json({ error: 'Confirm that no Printful draft exists before unlocking.' }, { status: 400 });
      if (Date.now() - new Date(order.updated_at).getTime() < 10 * 60 * 1000) return Response.json({ error: 'Wait ten minutes after the last Printful request before unlocking.' }, { status: 409 });
      const remote = await printful(`/orders/@${orderId}`) as PrintfulOrder | null;
      if (remote) return saveRemoteDraft(orderId, remote);
      const rows = await supabaseAdmin(`orders?id=eq.${orderId}&printful_draft_state=eq.${order.printful_draft_state}&printful_draft_id=is.null&select=id`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ printful_draft_state: 'idle' }),
      }) as Array<{ id: string }>;
      if (!rows[0]) return Response.json({ error: 'Order changed while checking Printful. Refresh and try again.' }, { status: 409 });
      return Response.json({ ok: true, reset: true });
    }
    if (input.action === 'reconcile' || order.printful_draft_state !== 'idle') {
      const existing = await printful(`/orders/@${orderId}`) as PrintfulOrder | null;
      if (existing) return saveRemoteDraft(orderId, existing);
      return Response.json({ error: 'No Printful order was found. Check the Printful dashboard before retrying; this order remains locked to avoid a duplicate.' }, { status: 409 });
    }
    if (!['paid', 'no_payment_required'].includes(order.payment_status) || order.fulfillment_status === 'cancelled') {
      return Response.json({ error: 'Only paid, active orders can be sent.' }, { status: 400 });
    }
    const address = order.shipping_address;
    if (address?.fulfillment_method === 'pickup') return Response.json({ error: 'Pickup orders need a separate delivery decision before sending to Printful.' }, { status: 400 });
    if (!address?.line1 || !address.city || !address.country || !address.postal_code || !order.customer_name || (['US', 'CA'].includes(address.country.toUpperCase()) && !address.state)) {
      return Response.json({ error: 'This order needs a complete shipping address and recipient name.' }, { status: 400 });
    }
    if (!order.order_items.length || order.order_items.some((item) => !item.colorway_id)) {
      return Response.json({ error: 'Every order item must have a saved colorway.' }, { status: 400 });
    }
    const mappings = await Promise.all(order.order_items.map(async (item) => {
      const rows = await supabaseAdmin(`printful_variant_mappings?select=variant_id,colorway_id,printful_sync_variant_id,printful_sync_product_id&variant_id=eq.${item.variant_id}&colorway_id=eq.${item.colorway_id}&limit=1`) as Mapping[];
      return rows[0] ?? null;
    }));
    const missing = order.order_items.findIndex((_, index) => !mappings[index]);
    if (missing >= 0) return Response.json({ error: `Match ${order.order_items[missing].product_name} to a Printful variant first.` }, { status: 400 });
    const checked = await Promise.all(mappings.map((mapping) => printful(`/store/variants/${mapping!.printful_sync_variant_id}`) as Promise<PrintfulVariant | null>));
    if (checked.some((variant, index) => !variant?.synced || !variant.files?.length || variant.sync_product_id !== mappings[index]!.printful_sync_product_id)) {
      return Response.json({ error: 'A saved Printful match is no longer configured. Review the matches before creating a draft.' }, { status: 409 });
    }

    const claimedRows = await supabaseAdmin(`orders?id=eq.${orderId}&printful_draft_state=eq.idle&printful_draft_id=is.null&payment_status=in.(paid,no_payment_required)&fulfillment_status=neq.cancelled&select=id`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ printful_draft_state: 'creating' }),
    }) as Array<{ id: string }>;
    if (!claimedRows[0]) return Response.json({ error: 'Another Printful action is already in progress for this order.' }, { status: 409 });
    claimed = true;
    const existing = await printful(`/orders/@${orderId}`) as PrintfulOrder | null;
    if (existing) return saveRemoteDraft(orderId, existing);

    postStarted = true;
    const remote = await printful('/orders', {
      method: 'POST',
      body: JSON.stringify({
        external_id: orderId,
        recipient: {
          name: order.customer_name,
          email: order.customer_email ?? undefined,
          phone: address.phone ?? undefined,
          address1: address.line1,
          address2: address.line2 ?? undefined,
          city: address.city,
          state_code: address.state,
          country_code: address.country,
          zip: address.postal_code,
        },
        items: order.order_items.map((item, index) => ({ sync_variant_id: mappings[index]!.printful_sync_variant_id, quantity: item.quantity })),
      }),
    }) as PrintfulOrder | null;
    if (!remote) throw new Error('Printful returned no draft. Use Check Printful before retrying.');
    return saveRemoteDraft(orderId, remote);
  } catch (error) {
    if (claimed && orderId) {
      try {
        await supabaseAdmin(`orders?id=eq.${orderId}&printful_draft_state=eq.creating&printful_draft_id=is.null`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ printful_draft_state: postStarted ? 'needs_review' : 'idle' }),
        });
      } catch (resetError) { console.error('Printful draft state update failed:', resetError); }
    }
    const message = error instanceof Error ? error.message : 'Printful action failed.';
    console.error('Printful action failed:', message);
    return Response.json({ error: message }, { status: 502 });
  }
}
