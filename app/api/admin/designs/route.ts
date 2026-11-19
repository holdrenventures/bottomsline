import { env } from 'cloudflare:workers';
import { artworkUrl as r2Url, COLORS, GARMENTS, mockupUrl, placementFromMockupUrl, R2_ORIGIN } from '../../../lib/blc-cloudinary';
import { isAdminRequest, supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

type Garment = keyof typeof GARMENTS;
type Placement = { w: number; x: number; y: number; angle?: number; brightness?: number };
type Input = { slug?: string; artworkUrl?: string; garment?: string; placement?: Placement; placements?: Record<string, Placement>; colors?: string[]; productSlug?: string | null };
type Assignment = { slug: string; artwork_url: string; placements: Record<string, Placement>; colors: string[] };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const artworkPattern = /^https:\/\/images\.bottomslineclothing\.com\/editor\/artwork\/[a-z0-9-]+\.[a-f0-9]{12}\.png$/;
const unauthorized = () => Response.json({ error: 'Invalid admin token.' }, { status: 401 });
const clean = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const finiteWithin = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const isGarment = (value: string): value is Garment => Object.hasOwn(GARMENTS, value);
const validPlacement = (value: Placement | undefined) => !!value && finiteWithin(value.w, 0.05, 0.95) && finiteWithin(value.x, -0.6, 0.6) && finiteWithin(value.y, -0.1, 0.95) && finiteWithin(value.angle ?? 0, -20, 20) && finiteWithin(value.brightness ?? 0, -50, 50);
const normalize = (value: Placement) => ({ w: value.w, x: value.x, y: value.y, angle: value.angle ?? 0, brightness: value.brightness ?? 0 });

function bucket() {
  const storage = (env as unknown as { EDITOR_ASSETS?: R2Bucket }).EDITOR_ASSETS;
  if (!storage) throw new Error('Editor storage is not configured.');
  return storage;
}

async function productId(slug: string) {
  const rows = await supabaseAdmin(`products?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`) as Array<{ id: string }>;
  if (!rows[0]?.id) throw new Error('The selected storefront product was not found.');
  return rows[0].id;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const params = new URL(request.url).searchParams;
    const slug = clean(params.get('productSlug'));
    const garment = params.get('garment') ?? '';
    if (!slug || !isGarment(garment)) throw new Error('Choose a product and garment to load.');
    const id = await productId(slug);
    const assigned = await supabaseAdmin(`design_assignments?select=slug,artwork_url,placements,colors&product_id=eq.${id}&garment=eq.${garment}&limit=1`) as Assignment[];
    if (assigned[0]) return Response.json({ slug: assigned[0].slug, garment, artworkUrl: assigned[0].artwork_url, placements: assigned[0].placements, colors: assigned[0].colors });

    // Existing storefront renders are already archived in R2. Their old
    // Cloudinary URL is retained solely to recover editable placement values.
    const config = GARMENTS[garment];
    const rows = await supabaseAdmin(`product_colors?select=color,mockup_url_cloudinary&product_id=eq.${id}&style=eq.${encodeURIComponent(config.style)}&garment=eq.${encodeURIComponent(config.model)}&active=eq.true&order=sort_order.asc`) as Array<{ color: string; mockup_url_cloudinary: string | null }>;
    const parsed = rows.map((row) => ({ color: (COLORS[garment] as Array<{ token: string; label: string }>).find((item) => item.label.toLowerCase() === row.color.toLowerCase()), result: placementFromMockupUrl(row.mockup_url_cloudinary) })).filter((item) => item.color && item.result);
    if (!parsed.length) return Response.json({ error: 'No saved front mockups for this product and garment.' }, { status: 404 });
    const firstSlug = parsed[0].result!.slug;
    const colors = parsed.filter((item) => item.result!.slug === firstSlug).map((item) => item.color!.token);
    const placements = Object.fromEntries(parsed.filter((item) => item.result!.slug === firstSlug).map((item) => [item.color!.token, item.result!.placement]));
    const designs = await supabaseAdmin(`designs?select=placement&slug=eq.${encodeURIComponent(firstSlug)}&garment=eq.${garment}&limit=1`) as Array<{ placement: { artworkUrl?: string } }>;
    return Response.json({ slug: firstSlug, garment, artworkUrl: designs[0]?.placement?.artworkUrl ?? null, colors, placements });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to load design.' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const input = await request.json() as Input;
    const slug = clean(input.slug);
    const productSlug = clean(input.productSlug);
    const garment = input.garment ?? '';
    const source = input.artworkUrl ?? '';
    if (!slugPattern.test(slug)) throw new Error('Design name must use lowercase letters, numbers, and hyphens.');
    if (!isGarment(garment)) throw new Error('Choose a supported garment blank.');
    if (!artworkPattern.test(source)) throw new Error('Upload artwork to the editor before saving.');
    if (!validPlacement(input.placement)) throw new Error('Design placement is outside the supported canvas.');
    const palette = COLORS[garment] as Array<{ token: string; label: string }>;
    const allowed = new Set(palette.map((color) => color.token));
    if (!Array.isArray(input.colors) || !input.colors.length || input.colors.some((color) => !allowed.has(color))) throw new Error('Choose at least one valid garment color.');
    const colors = [...new Set(input.colors)];
    const placements = Object.fromEntries(colors.map((token) => {
      const placement = input.placements?.[token] ?? input.placement!;
      if (!validPlacement(placement)) throw new Error(`Placement for ${token} is outside the supported canvas.`);
      return [token, normalize(placement)];
    }));
    const storage = bucket();
    const artworkKey = source.slice(`${R2_ORIGIN}/`.length);
    if (!await storage.head(artworkKey)) throw new Error('Uploaded artwork was not found in R2.');
    const id = productSlug ? await productId(productSlug) : null;
    if (id) {
      const config = GARMENTS[garment];
      const variants = await supabaseAdmin(`product_variants?select=style,garment,active&product_id=eq.${id}`) as Array<{ style: string; garment: string | null; active: boolean }>;
      if (garment === 'hat' && variants.some((variant) => variant.active && variant.style !== 'Hat')) throw new Error('Hats must be a standalone product. Choose a hat-only product in Product Desk.');
      if (garment !== 'hat' && variants.some((variant) => variant.active && variant.style === 'Hat')) throw new Error('This is a standalone hat product. Choose an apparel product instead.');
      if (!variants.some((variant) => variant.active && variant.style === config.style && (variant.garment === config.model || (garment === 'tee' && !variant.garment)))) {
        throw new Error(`Add ${config.style} sizes with blank ${config.model} in Product Desk before publishing this mockup.`);
      }
    }

    // Render only on an explicit save with a storefront product. Reused
    // placements reuse the same immutable R2 object and Cloudinary URL.
    const rendered: Array<{ token: string; url: string }> = [];
    if (id) {
      for (const token of colors) {
        const transform = mockupUrl({ artwork: source, garment, colorToken: token, placement: placements[token] });
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(transform))))
          .map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
        const format = garment === 'hat' ? 'jpg' : 'png';
        const mime = garment === 'hat' ? 'image/jpeg' : 'image/png';
        const key = `editor/mockups/${id}/${garment}/${token}.${hash}.${format}`;
        if (!await storage.head(key)) {
          const response = await fetch(transform);
          if (!response.ok || !(response.headers.get('content-type') ?? '').startsWith(mime)) throw new Error(`Could not render ${token} front mockup (Cloudinary ${response.status}).`);
          const bytes = await response.arrayBuffer();
          if (bytes.byteLength > 20 * 1024 * 1024) throw new Error(`${token} mockup exceeds the size limit.`);
          await storage.put(key, bytes, { httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' } });
        }
        rendered.push({ token, url: r2Url(key) });
      }
    }

    if (id) {
      const config = GARMENTS[garment];
      const rows = rendered.map(({ token, url }, index) => ({ product_id: id, color: palette.find((color) => color.token === token)!.label, style: config.style, garment: config.model, mockup_url: url, sort_order: index, active: true }));
      await supabaseAdmin('product_colors?on_conflict=product_id,color,style', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
      const existingColors = await supabaseAdmin(`product_colors?select=id,color&product_id=eq.${id}&style=eq.${encodeURIComponent(config.style)}&active=eq.true`) as Array<{ id: string; color: string }>;
      const selectedLabels = new Set(rows.map((row) => row.color.toLowerCase()));
      const staleIds = existingColors.filter((row) => !selectedLabels.has(row.color.toLowerCase())).map((row) => row.id);
      if (staleIds.length) await supabaseAdmin(`product_colors?id=in.(${staleIds.join(',')})`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: false }) });
      await supabaseAdmin('design_assignments?on_conflict=product_id,garment', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ product_id: id, garment, slug, artwork_url: source, placements, colors, updated_at: new Date().toISOString() }]) });
    }
    await supabaseAdmin('designs?on_conflict=slug,garment', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ slug, garment, placement: { ...normalize(input.placement!), artworkUrl: source, byColor: placements }, colors, updated_at: new Date().toISOString() }]) });
    return Response.json({ ok: true, slug, productId: id, colors: colors.length, mockups: rendered.length, mockupUrls: Object.fromEntries(rendered.map((item) => [item.token, item.url])) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save design.';
    return Response.json({ error: message }, { status: /must|choose|outside|not found|upload|invalid|exceeds/i.test(message) ? 400 : 502 });
  }
}
