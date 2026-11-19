import assert from 'node:assert/strict';
import { test } from 'node:test';
import { variantKey, uniqueVariantWrites } from './variant-combos.mjs';

test('same style and size is one option even when the blank differs', () => {
  assert.equal(variantKey({ style: ' Tee ', size: 's' }), variantKey({ style: 'tee', size: 'S', garment: 'another-blank' }));
});

test('a duplicate addition is skipped while saved size edits survive', () => {
  const saved = [{ id: 'existing', style: 'Tee', size: 'S' }];
  const incoming = [
    { id: 'existing', style: 'Tee', size: 'S', price_cents: 3600 },
    { id: 'new', style: 'Tee', size: 'S', garment: 'another-blank' },
    { id: 'new-medium', style: 'Tee', size: 'M' },
    { id: 'duplicate-medium', style: 'Tee', size: 'M' },
  ];
  assert.deepEqual(uniqueVariantWrites(incoming, saved), [incoming[0], incoming[2]]);
});
