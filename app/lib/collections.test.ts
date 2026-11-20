import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectionCopy, collectionPath, collectionSlug } from './collections.ts';
import { DESCRIPTION_MAX, DESCRIPTION_MIN } from './seo.ts';
import { relatedProducts } from './related.ts';
import { latestSitemapDate, sitemapDate } from './sitemap-dates.ts';

describe('collection pages', () => {
  it('gives every collection a unique indexable URL and a description in range', () => {
    const paths = new Set<string>();
    for (const collection of collectionCopy) {
      const path = collectionPath(collection.name);
      assert.equal(paths.has(path), false, path);
      paths.add(path);
      assert.equal(path, `/shop/${collectionSlug(collection.name)}`);
      assert.ok(collection.description.length >= DESCRIPTION_MIN, collection.name);
      assert.ok(collection.description.length <= DESCRIPTION_MAX, `${collection.name} ${collection.description.length}`);
      assert.match(collection.description, /Nashville|queer|gay|pride|LGBTQ/i);
      assert.ok(collection.intro.length > 0);
      assert.ok(collection.intro.length < 80);
    }
    assert.equal(paths.size, 7);
  });
});

describe('related products', () => {
  const catalog = [
    { slug: 'a', name: 'Alpha', collection: 'Pride', collections: ['Pride', 'Holiday'], active: true },
    { slug: 'b', name: 'Bravo', collection: 'Holiday', collections: ['Holiday'], active: true },
    { slug: 'c', name: 'Charlie', collection: 'Nashville', collections: ['Nashville'], active: true },
    { slug: 'd', name: 'Draft', collection: 'Pride', collections: ['Pride'], active: true, draft: true },
    { slug: 'e', name: 'Placeholder', collection: 'Pride', collections: ['Pride'], active: true, isPlaceholder: true },
  ];

  it('links same-collection products before the rest of the line', () => {
    const related = relatedProducts(catalog[0], catalog);
    assert.deepEqual(related.map((item) => item.slug), ['b', 'c']);
  });
});

describe('sitemap dates', () => {
  it('uses a real timestamp and ignores empty values', () => {
    assert.equal(sitemapDate(null), undefined);
    assert.equal(sitemapDate('not-a-date'), undefined);
    assert.equal(sitemapDate('2026-11-01T00:00:00.000Z')?.toISOString(), '2026-11-01T00:00:00.000Z');
    assert.equal(latestSitemapDate([null, '2026-11-01T00:00:00.000Z', '2026-12-02T00:00:00.000Z'])?.toISOString(), '2026-12-02T00:00:00.000Z');
  });
});
