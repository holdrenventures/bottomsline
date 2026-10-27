import { COLORS, GARMENTS, mockupUrl, placementFromMockupUrl } from '../../../lib/blc-cloudinary';
import { isAdminRequest, supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

type Garment = 'tee' | 'tank' | 'crewneck' | 'hoodie';
type Placement = { w: number; x: number; y: number; angle?: number };
type DesignInput = { slug?: string; garment?: string; placement?: Placement; placements?: Record<string, Placement>; colors?: string[]; productSlug?: string | null };

function unauthorized() { return Response.json({ error: 'Invalid admin token.' }, { status: 401 }); }
function cleanSlug(value: unknown) { return typeof value === 'string' ? value.trim().toLowerCase() : ''; }
function isGarment(value: string): value is Garment { return ['tee', 'tank', 'crewneck', 'hoodie'].includes(value); }
function finiteWithin(value: unknown, minimum: number, maximum: number) { return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum; }
function validPlacement(value: Placement | undefined) {
  return !!value && finiteWithin(value.w, 0.05, 0.95) && finiteWithin(value.x, -0.6, 0.6)
    && finiteWithin(value.y, -0.1, 0.95) && finiteWithin(value.angle ?? 0, -20, 20);
}
function normalizedPlacement(value: Placement) { return { w: value.w, x: value.x, y: value.y, angle: value.angle ?? 0 }; }

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const params = new URL(request.url).searchParams;
    const productSlug = cleanSlug(params.get('productSlug'));
    const garment = params.get('garment') ?? '';
    if (!productSlug || !isGarment(garment)) throw new Error('Choose a product and garment to load.');
    const products = await supabaseAdmin(`products?select=id&slug=eq.${encodeURIComponent(productSlug)}&limit=1`) as Array<{ id: string }>;
    const productId = products[0]?.id;
    if (!productId) throw new Error('The selected storefront product was not found.');
    const config = GARMENTS[garment] as { style: string; model: string };
    const rows = await supabaseAdmin(`product_colors?select=color,mockup_url&product_id=eq.${encodeURIComponent(productId)}&style=eq.${encodeURIComponent(config.style)}&garment=eq.${encodeURIComponent(config.model)}&active=eq.true&order=sort_order.asc`) as Array<{ color: string; mockup_url: string | null }>;
    const palette = COLORS[garment] as Array<{ token: string; label: string }>;
    const first = rows.map((row) => placementFromMockupUrl(row.mockup_url)).find(Boolean);
    if (!first) return Response.json({ error: 'No saved mockups for this product and garment.' }, { status: 404 });
    const colors: string[] = [];
    const placements: Record<string, Placement> = {};
    for (const row of rows) {
      const parsed = placementFromMockupUrl(row.mockup_url);
      const color = palette.find((item) => item.label.toLowerCase() === row.color.toLowerCase());
      if (!parsed || parsed.slug !== first.slug || !color || !validPlacement(parsed.placement)) continue;
      colors.push(color.token);
      placements[color.token] = normalizedPlacement(parsed.placement);
    }
    return Response.json({ slug: first.slug, garment, colors, placements });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to load design.' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const input = await request.json() as DesignInput;
    const slug = cleanSlug(input.slug);
    const productSlug = cleanSlug(input.productSlug);
    const garment = input.garment ?? '';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Design slug must use lowercase letters, numbers, and hyphens.');
    if (!isGarment(garment)) throw new Error('Choose a supported garment blank.');
    const placement = input.placement;
    if (!validPlacement(placement)) throw new Error('Design placement is outside the supported canvas.');
    const palette = COLORS[garment] as Array<{ token: string; label: string }>;
    const allowedColors = new Set(palette.map((color) => color.token));
    const colors = [...new Set(input.colors ?? [])].filter((color) => allowedColors.has(color));
    if (!colors.length || colors.length !== new Set(input.colors ?? []).size) throw new Error('Choose at least one valid garment color.');
    const placements: Record<string, Placement> = {};
    for (const color of colors) {
      const specific = input.placements?.[color] ?? placement!;
      if (!validPlacement(specific)) throw new Error(`Placement for ${color} is outside the supported canvas.`);
      placements[color] = normalizedPlacement(specific);
    }

    await supabaseAdmin('designs?on_conflict=slug,garment', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ slug, garment, placement: { ...normalizedPlacement(placement!), byColor: placements }, colors, updated_at: new Date().toISOString() }]),
    });

    let productId: string | null = null;
    if (productSlug) {
      const products = await supabaseAdmin(`products?select=id&slug=eq.${encodeURIComponent(productSlug)}&limit=1`) as Array<{ id: string }>;
      productId = products[0]?.id ?? null;
      if (!productId) throw new Error('The selected storefront product was not found.');
      const garmentConfig = GARMENTS[garment] as { style: string; model: string };
      const style = garmentConfig.style;
      await supabaseAdmin(`product_colors?product_id=eq.${encodeURIComponent(productId)}&style=eq.${encodeURIComponent(style)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: false }),
      });
      const rows = colors.map((token, index) => {
        const color = palette.find((item) => item.token === token)!;
        return {
          product_id: productId, color: color.label, style, garment: garmentConfig.model,
          mockup_url: mockupUrl({ slug, garment, colorToken: token, placement: placements[token] }), sort_order: index, active: true,
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
