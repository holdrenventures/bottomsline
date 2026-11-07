import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import manifest from './cloudinary-image-manifest.json' with { type: 'json' };
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

  it('leaves images we do not host on Cloudinary alone', () => {
    const local = 'https://bottomslineclothing.com/holiday-mockups/ho-ho-hole/black.png';
    assert.equal(storefrontImage(local), local);
    assert.equal(storefrontImage('/holiday-mockups/ho-ho-hole/black.png'), '/holiday-mockups/ho-ho-hole/black.png');
    assert.equal(storefrontImage(null), null);
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
