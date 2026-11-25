import { InvalidDiscountCodeError, resolveDiscountCodes } from '../../../lib/discounts-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const input = await request.json() as { codes?: unknown };
    const offers = await resolveDiscountCodes(input.codes);
    return Response.json({ offers }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof InvalidDiscountCodeError) return Response.json({ error: error.message }, { status: 400 });
    console.error('Discount code lookup failed:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Unable to check the code right now.' }, { status: 500 });
  }
}
