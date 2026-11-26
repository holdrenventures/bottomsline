import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AreaCodeError,
  areaCodeDetail,
  areaCodeForCheckout,
  areaCodeTreatment,
  checkoutLineDescription,
  parseAreaCode,
} from './area-code.ts';
import { cartLinesMatch, parseStoredCart, withCartItem, type CartItem } from './cart.ts';

const tee: CartItem = {
  productId: 'p1',
  variantId: 'v1',
  sku: 'TEE-M',
  slug: 'some-tee',
  name: 'Some Tee',
  unitPrice: 25,
  size: 'M',
  quantity: 1,
  color: 'Black',
  colorId: 'c1',
  style: 'Tee',
};

function hat(areaCode: string, colorId = 'black'): CartItem {
  return {
    productId: 'hat',
    variantId: 'hat-os',
    sku: 'HAT-OS',
    slug: 'your-area-code-rainbow-trucker-hat',
    name: 'Your Area Code Rainbow Trucker Hat',
    unitPrice: 35,
    size: 'One Size',
    quantity: 1,
    color: 'Black/ White',
    colorId,
    style: 'Hat',
    areaCode,
  };
}

describe('area code parsing', () => {
  it('accepts exactly three digits, including leading zeros', () => {
    assert.equal(parseAreaCode('615'), '615');
    assert.equal(parseAreaCode(' 012 '), '012');
    assert.equal(parseAreaCode('000'), '000');
  });

  it('rejects missing, short, long, and non-digit values', () => {
    for (const value of ['', '61', '6155', '61a', 'abc', ' 61 ', null, undefined, 615]) {
      assert.equal(parseAreaCode(value), null);
    }
  });
});

describe('checkout area code', () => {
  it('requires a code only on the two personalized hats', () => {
    assert.equal(areaCodeTreatment('your-area-code-rainbow-trucker-hat'), 'rainbow');
    assert.equal(areaCodeTreatment('your-area-code-trans-pride-trucker-hat'), 'trans');
    assert.equal(areaCodeTreatment('615-pride-trucker-hat'), null);
    assert.equal(areaCodeForCheckout('your-area-code-trans-pride-trucker-hat', '212'), '212');
    assert.throws(
      () => areaCodeForCheckout('your-area-code-rainbow-trucker-hat', '61'),
      (error: unknown) => error instanceof AreaCodeError && /3-digit/.test(error.message),
    );
  });

  it('leaves ordinary products alone unless they smuggle a code', () => {
    assert.equal(areaCodeForCheckout('615-pride-trucker-hat', null), null);
    assert.equal(areaCodeForCheckout('615-pride-trucker-hat', undefined), null);
    assert.equal(areaCodeForCheckout('615-pride-trucker-hat', ''), null);
    assert.throws(
      () => areaCodeForCheckout('615-pride-trucker-hat', '615'),
      (error: unknown) => error instanceof AreaCodeError,
    );
  });

  it('keeps the existing Stripe description and appends the code on hat lines', () => {
    assert.equal(checkoutLineDescription({ style: 'Tee', color: 'Black', size: 'M' }), 'Tee / Black / M');
    assert.equal(
      checkoutLineDescription({ style: 'Hat', color: 'Navy/ White', size: 'One Size', areaCode: '615' }),
      'Hat / Navy/ White / One Size / Area code 615',
    );
    assert.equal(areaCodeDetail('615'), 'Area code 615');
    assert.equal(areaCodeDetail('nope'), null);
  });
});

describe('cart lines', () => {
  it('keeps the same hat with different area codes on separate lines', () => {
    const cart = withCartItem(withCartItem([], hat('615')), hat('629'));
    assert.equal(cart.length, 2);
    assert.deepEqual(cart.map((item) => item.areaCode), ['615', '629']);
  });

  it('merges a repeated area code and still separates colors', () => {
    const merged = withCartItem([hat('615')], { ...hat('615'), quantity: 2 });
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.quantity, 3);
    const twoColors = withCartItem([hat('615', 'black')], hat('615', 'pink'));
    assert.equal(twoColors.length, 2);
  });

  it('still folds ordinary lines that have no area code', () => {
    assert.equal(cartLinesMatch(tee, { ...tee, quantity: 4 }), true);
    const merged = withCartItem([tee], { ...tee, quantity: 1 });
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.quantity, 2);
    assert.equal(cartLinesMatch(tee, { ...tee, areaCode: '615' }), false);
  });

  it('drops a stored line whose area code is not three digits and keeps legacy lines', () => {
    const stored = parseStoredCart([
      tee,
      hat('615'),
      { ...hat('12'), areaCode: '12' },
      { ...hat('615'), areaCode: 615 },
      { nope: true },
    ]);
    assert.equal(stored.length, 2);
    assert.equal(stored[0]?.slug, 'some-tee');
    assert.equal(stored[1]?.areaCode, '615');
  });
});
