import assert from 'node:assert/strict';
import test from 'node:test';
import { quote } from './pricing.ts';

const tee = (quantity, unitCents = 3200) => [{ style: 'Tee', unitCents, quantity }];

test('three tees use the $65 bundle and free shipping', () => {
  assert.deepEqual(quote(tee(3), false), {
    subtotalCents: 9600,
    discountCents: 3100,
    discountKind: 'bundle',
    discountLabel: '3 tees for $65',
    shippingCents: 0,
    totalCents: 6500,
    welcomeCodeSkipped: false,
  });
});

test('welcome code wins when it saves more than the bundle', () => {
  const result = quote(tee(1), true);
  assert.equal(result.discountKind, 'welcome');
  assert.equal(result.discountCents, 320);
  assert.equal(result.shippingCents, 600);
  assert.equal(result.totalCents, 3480);
});

test('bundle wins for three tees and preserves the welcome code', () => {
  const result = quote(tee(3), true);
  assert.equal(result.discountKind, 'bundle');
  assert.equal(result.welcomeCodeSkipped, true);
});

test('shipping uses the discounted subtotal and heavy garment rate', () => {
  const result = quote([{ style: 'Hoodie', unitCents: 5000, quantity: 1 }], true);
  assert.equal(result.discountCents, 500);
  assert.equal(result.shippingCents, 900);
  assert.equal(result.totalCents, 5400);
});
