import { isAdminRequest, supabaseAdmin } from '../../../lib/supabase-admin';
import { normalizePromoCode } from '../../../lib/pricing';

export const dynamic = 'force-dynamic';

function unauthorized() { return Response.json({ error: 'Invalid admin token.' }, { status: 401 }); }

type DiscountInput = {
  id?: unknown;
  code?: unknown;
  name?: unknown;
  kind?: unknown;
  value?: unknown;
  active?: unknown;
  combinable?: unknown;
};

function fields(input: DiscountInput, creating: boolean) {
  const code = typeof input.code === 'string' ? normalizePromoCode(input.code) : null;
  if (creating && (!code || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code) || code.startsWith('QUIET-'))) {
    throw new Error('Choose a code of 4–32 letters, numbers, or hyphens. QUIET- is reserved for welcome codes.');
  }
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 2 || name.length > 100) throw new Error('Enter a name of 2–100 characters.');
  if (input.kind !== 'percent' && input.kind !== 'fixed') throw new Error('Choose a percentage or dollar amount.');
  if (!Number.isInteger(input.value) || (input.value as number) < 1 || (input.kind === 'percent' ? (input.value as number) > 100 : (input.value as number) > 100000)) {
    throw new Error(input.kind === 'percent' ? 'Percentage must be 1–100.' : 'Dollar amount must be between $0.01 and $1,000.');
  }
  if (typeof input.active !== 'boolean' || typeof input.combinable !== 'boolean') throw new Error('Choose whether the code is active and combinable.');
  return { ...(creating ? { code } : {}), name, kind: input.kind, value: input.value, active: input.active, combinable: input.combinable };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to save discount.';
  if (/duplicate key|23505/i.test(message)) return Response.json({ error: 'That code already exists.' }, { status: 409 });
  if (/^Choose|^Enter|^Percentage|^Dollar|^A valid/.test(message)) return Response.json({ error: message }, { status: 400 });
  console.error('Discount admin request failed:', message);
  return Response.json({ error: 'Unable to manage discounts.' }, { status: 500 });
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const discounts = await supabaseAdmin('discounts?select=id,code,name,kind,value,active,combinable,used_count,created_at,updated_at&order=created_at.desc&limit=200');
    return Response.json({ discounts }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const input = await request.json() as DiscountInput;
    const created = await supabaseAdmin('discounts?select=id,code,name,kind,value,active,combinable,used_count,created_at,updated_at', {
      method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(fields(input, true)),
    });
    return Response.json({ discount: (created as unknown[])[0] }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const input = await request.json() as DiscountInput;
    if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error('A valid discount is required.');
    const updated = await supabaseAdmin(`discounts?select=id,code,name,kind,value,active,combinable,used_count,created_at,updated_at&id=eq.${encodeURIComponent(input.id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(fields(input, false)),
    }) as unknown[];
    if (!updated[0]) return Response.json({ error: 'Discount not found.' }, { status: 404 });
    return Response.json({ discount: updated[0] });
  } catch (error) { return errorResponse(error); }
}
