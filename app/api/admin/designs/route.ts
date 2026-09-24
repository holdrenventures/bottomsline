import { COLORS, mockupUrl } from '../../../lib/blc-cloudinary';
import { isAdminRequest, supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

type Garment = 'tee' | 'tank';
type Placement = { w: number; x: number; y: number };
type DesignInput = { slug?: string; garment?: string; placement?: Placement; colors?: string[]; productSlug?: string | null };

function unauthorized() { return Response.json({ error: 'Invalid admin token.' }, { status: 401 }); }
function cleanSlug(value: unknown) { return typeof value === 'string' ? value.trim().toLowerCase() : ''; }
function isGarment(value: string): value is Garment { return value === 'tee' || value === 'tank'; }
function finiteWithin(value: unknown, minimum: number, maximum: number) { return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum; }

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const input = await request.json() as DesignInput;
    const slug = cleanSlug(input.slug);
    const productSlug = cleanSlug(input.productSlug);
    const garment = input.garment ?? '';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Design slug must use lowercase letters, numbers, and hyphens.');
    if (!isGarment(garment)) throw new Error('Garment must be tee or tank.');
    const placement = input.placement;
    if (!placement || !finiteWithin(placement.w, 0.05, 0.95) || !finiteWithin(placement.x, -0.6, 0.6) || !finiteWithin(placement.y, -0.1, 0.95)) throw new Error('Design placement is outside the supported canvas.');
    const palette = COLORS[garment] as Array<{ token: string; label: string }>;
    const allowedColors = new Set(palette.map((color) => color.token));
    const colors = [...new Set(input.colors ?? [])].filter((color) => allowedColors.has(color));
    if (!colors.length || colors.length !== new Set(input.colors ?? []).size) throw new Error('Choose at least one valid garment color.');

    await supabaseAdmin('designs?on_conflict=slug', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ slug, garment, placement, colors, updated_at: new Date().toISOString() }]),
    });

    let productId: string | null = null;
    if (productSlug) {
      const products = await supabaseAdmin(`products?select=id&slug=eq.${encodeURIComponent(productSlug)}&limit=1`) as Array<{ id: string }>;
      productId = products[0]?.id ?? null;
      if (!productId) throw new Error('The selected storefront product was not found.');
      const style = garment === 'tank' ? 'Tank' : 'Tee';
      await supabaseAdmin(`product_colors?product_id=eq.${encodeURIComponent(productId)}&style=eq.${encodeURIComponent(style)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: false }),
      });
      const rows = colors.map((token, index) => {
        const color = palette.find((item) => item.token === token)!;
        return {
          product_id: productId, color: color.label, style, garment: garment === 'tank' ? 'tultex105' : 'tultex202',
          mockup_url: mockupUrl({ slug, garment, colorToken: token, placement }), sort_order: index, active: true,
        };
      });
      await supabaseAdmin('product_colors?on_conflict=product_id,color,style', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows),
      });
    }

    return Response.json({ ok: true, slug, productId, colors: colors.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save design.';
    return Response.json({ error: message }, { status: /must|choose|valid|outside|not found/i.test(message) ? 400 : 500 });
  }
}
