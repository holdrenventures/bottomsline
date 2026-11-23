import assert from 'node:assert/strict';
import test from 'node:test';
import { AFTER_CHRISTMAS_CUTOFF_BANNER, BLACK_FRIDAY_BANNER, BLACK_FRIDAY_END, BLACK_FRIDAY_START, CHRISTMAS_BANNER, CHRISTMAS_DELIVERY_END, PROMO_BANNER, THANKSGIVING_DELIVERY_CUTOFF, isBlackFridayPromo, isChristmasDeliveryWindow, isTeeBundleActive, promoBanner, publicThanksgivingCopy } from './promo.ts';

test('Black Friday copy starts and ends at the Central time boundaries', () => {
  assert.equal(isBlackFridayPromo(BLACK_FRIDAY_START - 1), false);
  assert.equal(isBlackFridayPromo(BLACK_FRIDAY_START), true);
  assert.equal(isBlackFridayPromo(BLACK_FRIDAY_END - 1), true);
  assert.equal(isBlackFridayPromo(BLACK_FRIDAY_END), false);
  assert.equal(promoBanner(BLACK_FRIDAY_START), BLACK_FRIDAY_BANNER);
  assert.equal(promoBanner(BLACK_FRIDAY_END), CHRISTMAS_BANNER);
  assert.equal(promoBanner(BLACK_FRIDAY_START - 1), PROMO_BANNER);
  assert.equal(isTeeBundleActive(BLACK_FRIDAY_START - 1), false);
  assert.equal(isTeeBundleActive(BLACK_FRIDAY_START), true);
  assert.equal(isTeeBundleActive(BLACK_FRIDAY_END - 1), true);
  assert.equal(isTeeBundleActive(BLACK_FRIDAY_END), false);
});

test('Christmas delivery language ends at midnight Central on Dec 17', () => {
  assert.equal(isChristmasDeliveryWindow(BLACK_FRIDAY_END), true);
  assert.equal(isChristmasDeliveryWindow(CHRISTMAS_DELIVERY_END - 1), true);
  assert.equal(isChristmasDeliveryWindow(CHRISTMAS_DELIVERY_END), false);
  assert.equal(promoBanner(CHRISTMAS_DELIVERY_END - 1), CHRISTMAS_BANNER);
  assert.equal(promoBanner(CHRISTMAS_DELIVERY_END), AFTER_CHRISTMAS_CUTOFF_BANNER);
});

test('expired Thanksgiving delivery promise disappears only after the cutoff', () => {
  const description = 'A holiday shirt. Order by Friday, November 20 for delivery by Tuesday, November 24.';
  const shippingNote = 'Order by Friday, November 20 for delivery by Tuesday, November 24.';
  assert.equal(publicThanksgivingCopy('lesbian-turkey-baster', description, shippingNote, THANKSGIVING_DELIVERY_CUTOFF - 1).description, description);
  assert.deepEqual(publicThanksgivingCopy('lesbian-turkey-baster', description, shippingNote, THANKSGIVING_DELIVERY_CUTOFF), {
    description: 'A holiday shirt.',
    shippingNote: 'Ships in 3–5 business days.',
  });
  assert.equal(publicThanksgivingCopy('another-shirt', description, shippingNote, THANKSGIVING_DELIVERY_CUTOFF).description, description);
});
