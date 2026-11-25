// Product Desk saves reject a gallery that does not match this shape.
// Admin close-ups are content-addressed under product-details/. Hat photos
// already live on the same R2 host under hats/<slug>/<view>.webp. Both are
// store images; other hosts stay out.

const DETAIL_UPLOAD = /^https:\/\/images\.bottomslineclothing\.com\/product-details\/[a-f0-9]{64}\.(png|jpg|webp)$/;
const HAT_PHOTO = /^https:\/\/images\.bottomslineclothing\.com\/hats\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\.(png|jpg|webp)$/;

export const GALLERY_IMAGE_LIMIT = 8;
export const GALLERY_ALT_LIMIT = 500;

export function isAllowedGalleryImageUrl(url: string) {
  return DETAIL_UPLOAD.test(url) || HAT_PHOTO.test(url);
}

export function invalidGalleryImages(images: unknown) {
  if (!Array.isArray(images) || images.length > GALLERY_IMAGE_LIMIT) return true;
  return images.some((image) => {
    if (!image || typeof image !== 'object') return true;
    const record = image as { url?: unknown; alt?: unknown };
    return typeof record.url !== 'string'
      || !isAllowedGalleryImageUrl(record.url)
      || typeof record.alt !== 'string'
      || record.alt.length > GALLERY_ALT_LIMIT;
  });
}
