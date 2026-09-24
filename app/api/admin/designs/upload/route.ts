import { isAdminRequest } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const cloudName = 'bihiyho3';

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return Response.json({ error: 'Invalid admin token.' }, { status: 401 });
  try {
    const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (!preset) throw new Error('Cloudinary upload preset is not configured.');
    const input = await request.formData();
    const file = input.get('file');
    const slug = String(input.get('slug') ?? '').trim().toLowerCase();
    if (!(file instanceof File)) throw new Error('Choose a PNG file.');
    if (file.type !== 'image/png') throw new Error('Artwork must be a transparent PNG.');
    if (file.size > 12 * 1024 * 1024) throw new Error('Artwork must be 12 MB or smaller.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Design slug must use lowercase letters, numbers, and hyphens.');

    const body = new FormData();
    body.append('file', file); body.append('upload_preset', preset); body.append('folder', 'designs'); body.append('public_id', slug); body.append('overwrite', 'true');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
    const payload = await response.json() as { secure_url?: string; public_id?: string; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || `Cloudinary upload failed (${response.status}).`);
    return Response.json({ ok: true, publicId: payload.public_id, url: payload.secure_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to upload artwork.';
    return Response.json({ error: message }, { status: /PNG|12 MB|slug|configured/i.test(message) ? 400 : 502 });
  }
}
