import { env } from 'cloudflare:workers';
import { isAdminRequest } from '../../../lib/supabase-admin';
const origin = 'https://images.bottomslineclothing.com';
export async function GET(request: Request) {
 if (!isAdminRequest(request)) return Response.json({error:'Invalid admin token.'},{status:401});
 const source = new URL(request.url).searchParams.get('source') || '';
 try {
  const url = new URL(source);
  if (url.origin !== origin || url.username || url.password) throw new Error('Choose an R2 mockup.');
  const storage = (env as unknown as {EDITOR_ASSETS:R2Bucket}).EDITOR_ASSETS;
  const object = await storage.get(decodeURIComponent(url.pathname.slice(1)));
  if (!object) return Response.json({error:'Image not found.'},{status:404});
  return new Response(object.body as unknown as BodyInit,{headers:{'Content-Type':object.httpMetadata?.contentType || 'image/png','Cache-Control':'no-store'}});
 } catch { return Response.json({error:'Unable to open this mockup.'},{status:400}); }
}
export async function POST(request: Request) {
 if (!isAdminRequest(request)) return Response.json({error:'Invalid admin token.'},{status:401});
 try {
  const data = await request.formData(); const file = data.get('file');
  if (!(file instanceof File) || file.size > 12*1024*1024) throw new Error('Choose an image up to 12 MB.');
  const bytes = await file.arrayBuffer(); const b = new Uint8Array(bytes);
  const png = b.slice(0,8).join(',') === '137,80,78,71,13,10,26,10';
  const jpg = b[0]===255 && b[1]===216 && b[2]===255;
  const webp = new TextDecoder().decode(b.slice(0,4))==='RIFF' && new TextDecoder().decode(b.slice(8,12))==='WEBP';
  if (!png && !jpg && !webp) throw new Error('Choose a PNG, JPEG, or WebP image.');
  const ext = png?'png':jpg?'jpg':'webp'; const mime = png?'image/png':jpg?'image/jpeg':'image/webp';
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const key = `product-details/${hash}.${ext}`;
  await (env as unknown as {EDITOR_ASSETS:R2Bucket}).EDITOR_ASSETS.put(key,bytes,{httpMetadata:{contentType:mime,cacheControl:'public, max-age=31536000, immutable'}});
  return Response.json({url:`${origin}/${key}`});
 } catch(error) { return Response.json({error:error instanceof Error?error.message:'Unable to upload image.'},{status:400}); }
}
