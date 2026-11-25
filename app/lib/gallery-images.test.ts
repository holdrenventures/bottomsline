import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { invalidGalleryImages, isAllowedGalleryImageUrl } from './gallery-images.ts';

const hash = 'a'.repeat(64);
const detail = `https://images.bottomslineclothing.com/product-details/${hash}.webp`;
const hat = 'https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/navy-white-right-front.webp';

describe('gallery image urls', () => {
  it('allows admin close-ups and hat photos on the store image host', () => {
    assert.equal(isAllowedGalleryImageUrl(detail), true);
    assert.equal(isAllowedGalleryImageUrl(detail.replace(/webp$/, 'png')), true);
    assert.equal(isAllowedGalleryImageUrl(detail.replace(/webp$/, 'jpg')), true);
    assert.equal(isAllowedGalleryImageUrl(hat), true);
    assert.equal(isAllowedGalleryImageUrl('https://images.bottomslineclothing.com/hats/protect-trans-kids-trucker-hat/heather-black-back.webp'), true);
    assert.equal(isAllowedGalleryImageUrl('https://images.bottomslineclothing.com/hats/nash-pride-patch-trucker-hat/white-right-front.jpg'), true);
  });

  it('rejects other hosts, query strings, and the wrong key shape', () => {
    assert.equal(isAllowedGalleryImageUrl('https://res.cloudinary.com/bihiyho3/image/upload/example.png'), false);
    assert.equal(isAllowedGalleryImageUrl('http://images.bottomslineclothing.com/hats/615-pride-trucker-hat/navy-white-right-front.webp'), false);
    assert.equal(isAllowedGalleryImageUrl(`${hat}?size=1`), false);
    assert.equal(isAllowedGalleryImageUrl(`https://images.bottomslineclothing.com/product-details/${'a'.repeat(63)}.webp`), false);
    assert.equal(isAllowedGalleryImageUrl('https://images.bottomslineclothing.com/hats/../secret.webp'), false);
    assert.equal(invalidGalleryImages([{ url: hat, alt: '615 Pride Trucker Hat in Navy/ White, right-front view' }]), false);
    assert.equal(invalidGalleryImages([{ url: hat, description: 'right-front view' }]), true);
    assert.equal(invalidGalleryImages([{ url: hat, alt: 'x'.repeat(501) }]), true);
    assert.equal(invalidGalleryImages(Array.from({ length: 9 }, () => ({ url: hat, alt: 'view' }))), true);
    assert.equal(invalidGalleryImages(Array.from({ length: 8 }, () => ({ url: detail, alt: '' }))), false);
  });
});
