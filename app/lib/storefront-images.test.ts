import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import manifest from './cloudinary-image-manifest.json' with { type: 'json' };
import delivery from './delivery-image-manifest.json' with { type: 'json' };
import { existsSync } from 'node:fs';
import { storefrontImage, STOREFRONT_IMAGE_BASE } from './storefront-images.ts';

const rewrite = manifest.rewrite as Record<string, string>;

describe('storefront image archive', () => {
  it('sends every archived Cloudinary URL to the R2 host', () => {
    assert.equal(STOREFRONT_IMAGE_BASE, 'https://images.bottomslineclothing.com');
    assert.ok(Object.keys(rewrite).length > 300);
    for (const [source, target] of Object.entries(rewrite)) {
      assert.match(source, /^https:\/\/res\.cloudinary\.com\/bihiyho3\//);
      assert.ok(target.startsWith(`${STOREFRONT_IMAGE_BASE}/catalog/`));
      assert.equal(target.includes('res.cloudinary.com'), false);
      assert.equal(storefrontImage(source), target);
    }
  });

  it('rewrites the trimmed form when the saved URL omitted e_trim', () => {
    const bare = 'https://res.cloudinary.com/bihiyho3/image/upload/v1790043735/ChatGPT_Image_Aug_27_2026_05_18_54_PM_3.png';
    const trimmed = bare.replace('/image/upload/', '/image/upload/e_trim/');
    assert.equal(rewrite[bare], rewrite[trimmed]);
    assert.equal(storefrontImage(bare), rewrite[trimmed]);
  });

  it('leaves images we do not have a delivery copy for alone', () => {
    const local = 'https://bottomslineclothing.com/holiday-mockups/example.png';
    assert.equal(storefrontImage(local), local);
    assert.equal(storefrontImage(null), null);
  });

  it('serves resized webp copies for holiday mockups and editor pngs', () => {
    const images = delivery.images as Record<string, { src: string; width: number; height: number }>;
    const holiday = '/holiday-mockups/ho-ho-hole/black.png';
    assert.ok(images[holiday], 'run scripts/optimize-delivery-images.mjs');
    assert.equal(storefrontImage(holiday), images[holiday].src);
    assert.equal(storefrontImage(`https://bottomslineclothing.com${holiday}`), images[holiday].src);
    assert.match(images[holiday].src, /^\/opt\/[a-f0-9]+\.webp$/);
    assert.equal(existsSync(new URL(`../../public${images[holiday].src}`, import.meta.url)), true);
    assert.ok(images[holiday].width > 0 && images[holiday].height > 0);
    const editor = Object.keys(images).find((key) => key.includes('/editor/mockups/') && key.endsWith('.png'));
    assert.ok(editor);
    assert.match(storefrontImage(editor) ?? '', /^\/opt\/[a-f0-9]+\.webp$/);
    assert.equal(storefrontImage(editor)?.includes('.png'), false);
  });

  it('does not invent an archive for a Cloudinary URL outside the manifest', () => {
    const fresh = 'https://res.cloudinary.com/bihiyho3/image/upload/l_designs:future-drop,fl_relative,w_0.3,g_north,y_0.2/blanks/tultex202/202_black_front.png';
    const rewritten = storefrontImage(fresh);
    assert.match(rewritten ?? '', /\/e_trim\//);
    assert.match(rewritten ?? '', /res\.cloudinary\.com/);
  });

  it('covers the Cloudinary URLs hardcoded in storefront pages', () => {
    for (const file of ['app/page.tsx', 'app/data/products.ts']) {
      const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
      const urls = [...source.matchAll(/https:\/\/res\.cloudinary\.com\/[^'")\s]+/g)].map((match) => match[0]);
      assert.ok(urls.length > 0, file);
      for (const url of urls) {
        const image = storefrontImage(url);
        assert.equal(image?.includes('res.cloudinary.com'), false, url);
      }
    }
  });
});
