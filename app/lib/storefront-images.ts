import manifest from './cloudinary-image-manifest.json' with { type: 'json' };
import { trimMockup } from './cloudinary.ts';

type ImageManifest = {
  publicBase: string;
  bucket: string;
  generatedAt: string;
  rewrite: Record<string, string>;
};

const imageManifest = manifest as ImageManifest;

/**
 * Public base for archived catalog renders. Objects live in R2 bucket
 * `bottomsline-catalog` and are served on this hostname.
 */
export const STOREFRONT_IMAGE_BASE = imageManifest.publicBase;

const rewrite = imageManifest.rewrite;

/**
 * Map a catalog/mockup URL to the archived render.
 * Known Cloudinary URLs (including the trimmed form the storefront used to
 * request) resolve to the R2 WebP. URLs we do not have an archive for —
 * holiday files on this site, or a brand-new design-adjuster mockup — pass
 * through. `trimMockup` still runs for unknown Cloudinary URLs so a future
 * admin save keeps today's cropping behavior until it is archived too.
 */
export function storefrontImage(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  const direct = rewrite[url];
  if (direct) return direct;
  const trimmed = trimMockup(url);
  if (trimmed && rewrite[trimmed]) return rewrite[trimmed];
  return trimmed;
}
