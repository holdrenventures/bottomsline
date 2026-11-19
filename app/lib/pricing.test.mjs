import assert from 'node:assert/strict';
import test from 'node:test';
import { quote as priceQuote } from './pricing.ts';
import { BLACK_FRIDAY_END, BLACK_FRIDAY_START } from './promo.ts';

const quote = (lines, hasWelcomeCode) => priceQuote(lines, hasWelcomeCode, BLACK_FRIDAY_START);

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

test('three different tee prices still total $65, while tanks and sweatshirts do not count', () => {
  const result = quote([
    { style: 'Tee', unitCents: 2500, quantity: 1 },
    { style: 'Tee', unitCents: 2800, quantity: 1 },
    { style: 'Tee', unitCents: 3200, quantity: 1 },
  ], false);
  assert.equal(result.totalCents, 6500);
  assert.equal(result.shippingCents, 0);
  assert.equal(quote([{ style: 'Tee', unitCents: 2500, quantity: 2 }, { style: 'Tank', unitCents: 2500, quantity: 1 }], false).discountCents, 0);
  assert.equal(quote([{ style: 'Tee', unitCents: 2500, quantity: 2 }, { style: 'Sweatshirt', unitCents: 4000, quantity: 1 }], false).discountCents, 0);
});

test('four or five tees form one bundle and six form two', () => {
  assert.equal(quote(tee(4, 2500), false).totalCents, 9000);
  assert.equal(quote(tee(5, 2500), false).totalCents, 11500);
  assert.equal(quote(tee(6, 2500), false).totalCents, 13000);
});

test('bundle pricing ends on Dec 1 while ordinary shipping and welcome codes remain', () => {
  const before = priceQuote(tee(3, 2500), false, BLACK_FRIDAY_END - 1);
  const after = priceQuote(tee(3, 2500), false, BLACK_FRIDAY_END);
  assert.equal(before.totalCents, 6500);
  assert.equal(after.totalCents, 7500);
  assert.equal(after.discountKind, null);
  assert.equal(after.shippingCents, 0);
  assert.equal(priceQuote(tee(3, 2500), true, BLACK_FRIDAY_END).discountKind, 'welcome');
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
