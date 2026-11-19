import { env } from 'cloudflare:workers';
import { artworkUrl } from '../../../../lib/blc-cloudinary';
import { isAdminRequest } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

function bucket() {
  const storage = (env as unknown as { EDITOR_ASSETS?: R2Bucket }).EDITOR_ASSETS;
  if (!storage) throw new Error('Editor storage is not configured.');
  return storage;
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return Response.json({ error: 'Invalid admin token.' }, { status: 401 });
  try {
    const input = await request.formData();
    const file = input.get('file');
    const slug = String(input.get('slug') ?? '').trim().toLowerCase();
    if (!(file instanceof File) || file.type !== 'image/png') throw new Error('Choose a PNG file.');
    if (file.size > 12 * 1024 * 1024) throw new Error('Artwork must be 12 MB or smaller.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Design slug must use lowercase letters, numbers, and hyphens.');
    const bytes = await file.arrayBuffer();
    const header = new Uint8Array(bytes.slice(0, 8));
    if (header.join(',') !== '137,80,78,71,13,10,26,10') throw new Error('Artwork must be a valid PNG.');
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
      .map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 12);
    const key = `editor/artwork/${slug}.${digest}.png`;
    await bucket().put(key, bytes, { httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' } });
    return Response.json({ ok: true, assetSlug: slug, artworkUrl: artworkUrl(key) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to upload artwork.';
    return Response.json({ error: message }, { status: /PNG|12 MB|slug/i.test(message) ? 400 : 502 });
  }
}
