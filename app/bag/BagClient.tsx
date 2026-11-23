'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CART_UPDATED_EVENT, clearCart, readCart, removeCartItem, updateCartItem, type CartItem } from '../lib/cart';
import { storefrontImage } from '../lib/storefront-images';
import { trackMeta } from '../lib/meta-pixel';
import { BUNDLE_SIZE, BUNDLE_STYLES, codeKindForPromoCode, ENB15_CODE, FREE_SHIPPING_MIN_CENTS, normalizePromoCode, quote, WOAKS10_CODE } from '../lib/pricing';
import { isTeeBundleActive } from '../lib/promo';
import { usePromoClock } from '../lib/use-promo-window';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function itemDetails(item: CartItem) {
  return [item.style, item.color, item.size].filter(Boolean).join(' · ');
}

export default function BagClient() {
  const now = usePromoClock();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'shipping' | 'pickup'>('shipping');
  const [pickupAddress, setPickupAddress] = useState({ line1: '', line2: '', city: '', postal_code: '' });

  useEffect(() => {
    const sync = () => {
      setItems(readCart());
      setReady(true);
    };
    sync();
    window.addEventListener(CART_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const promoCode = normalizePromoCode(promoInput);
  // Preview only — the checkout Worker recomputes from catalog prices and validates the code.
  const pricing = useMemo(
    () => quote(
      items.map((item) => ({ style: item.style, unitCents: Math.round(item.unitPrice * 100), quantity: item.quantity })),
      Boolean(promoCode),
      now,
      codeKindForPromoCode(promoCode),
    ),
    [items, promoCode, now],
  );
  const toFreeShipping = FREE_SHIPPING_MIN_CENTS - (pricing.subtotalCents - pricing.discountCents);
  const pickup = fulfillmentMethod === 'pickup';
  const displayedShippingCents = pickup ? 0 : pricing.shippingCents;
  const displayedTotalCents = pricing.subtotalCents - pricing.discountCents + displayedShippingCents;
  const eligibleTees = items.reduce((total, item) => total + (BUNDLE_STYLES.includes(item.style ?? '') ? item.quantity : 0), 0);
  const teesTowardNextBundle = eligibleTees % BUNDLE_SIZE;

  function setQuantity(index: number, quantity: number) {
    setItems(updateCartItem(index, quantity));
  }

  function remove(index: number) {
    setItems(removeCartItem(index));
  }

  async function checkout() {
    setCheckingOut(true);
    setCheckoutError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            colorId: item.colorId ?? null,
            quantity: item.quantity,
          })),
          promoCode: promoInput.trim() || null,
          fulfillmentMethod,
          ...(pickup ? { pickupAddress } : {}),
        }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? 'Checkout is temporarily unavailable.');

      const destination = new URL(result.url);
      if (destination.protocol !== 'https:' || !destination.hostname.endsWith('.stripe.com')) {
        throw new Error('Checkout returned an unexpected destination.');
      }
      trackMeta('InitiateCheckout', {
        content_ids: [...new Set(items.map((item) => item.productId))],
        content_type: 'product',
        value: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
        currency: 'USD',
        num_items: items.reduce((total, item) => total + item.quantity, 0),
      });
      window.location.assign(destination.href);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout is temporarily unavailable.');
      setCheckingOut(false);
    }
  }

  if (!ready) return <div className="bag-loading" aria-live="polite">Checking the bag…</div>;

  if (!items.length) {
    return (
      <section className="bag-empty">
        <p className="eyebrow"><span /> Nothing suspicious</p>
        <h1>Nothing in<br /><em>the bag.</em></h1>
        <p>You showed admirable restraint. Temporarily.</p>
        <Link className="button button--primary" href="/shop">Find a shirt <span>↗</span></Link>
      </section>
    );
  }

  return (
    <div className="bag-layout">
      <section className="bag-lines" aria-label="Items in your bag">
        <div className="bag-lines__heading">
          <span>{String(items.length).padStart(2, '0')} selections</span>
          <button type="button" onClick={() => setItems(clearCart())}>Clear the evidence</button>
        </div>
        {items.map((item, index) => {
          const mockup = storefrontImage(item.colorMockup);
          return (
          <article className="bag-item" key={`${item.productId}-${item.variantId}-${item.colorId}-${item.size}-${index}`}>
            <a className="bag-item__visual" href={`/products/${item.slug}`} aria-label={`View ${item.name}`}>
              {mockup
                ? <img src={mockup} alt="" />
                : <span>{item.name.split(/\s+/).slice(0, 3).join('\n')}</span>}
            </a>
            <div className="bag-item__copy">
              <p>{itemDetails(item)}</p>
              <h2><a href={`/products/${item.slug}`}>{item.name}</a></h2>
              <button type="button" onClick={() => remove(index)}>Remove</button>
            </div>
            <div className="bag-item__quantity" aria-label={`Quantity for ${item.name}`}>
              <span>Qty</span>
              <div>
                <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => setQuantity(index, item.quantity - 1)}>−</button>
                <output>{item.quantity}</output>
                <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => setQuantity(index, item.quantity + 1)}>+</button>
              </div>
            </div>
            <p className="bag-item__price">{money.format(item.unitPrice * item.quantity)}</p>
          </article>
          );
        })}
        <Link className="bag-continue" href="/shop">← Keep looking. We won’t judge.</Link>
      </section>

      <aside className="bag-summary">
        <p className="eyebrow"><span /> The bottom line</p>
        <fieldset className="bag-summary__fulfillment">
          <legend>Get your order</legend>
          <label><input type="radio" name="fulfillment" checked={!pickup} onChange={() => { setFulfillmentMethod('shipping'); setCheckoutError(''); }} /> Ship to me</label>
          <label><input type="radio" name="fulfillment" checked={pickup} onChange={() => { setFulfillmentMethod('pickup'); setCheckoutError(''); }} /> Local pickup · 37207 · $0</label>
        </fieldset>
        {pickup && <div className="bag-summary__pickup">
          <p>Davidson County addresses only. Pickup is by appointment in 37207. We’ll reach out after your order to schedule it. Stripe will require your email and phone number.</p>
          <label>Street address<input value={pickupAddress.line1} onChange={(event) => setPickupAddress({ ...pickupAddress, line1: event.target.value })} autoComplete="street-address" placeholder="Street address" /></label>
          <label>Apartment or suite (optional)<input value={pickupAddress.line2} onChange={(event) => setPickupAddress({ ...pickupAddress, line2: event.target.value })} autoComplete="address-line2" /></label>
          <div><label>City<input value={pickupAddress.city} onChange={(event) => setPickupAddress({ ...pickupAddress, city: event.target.value })} autoComplete="address-level2" placeholder="Nashville" /></label><label>ZIP code<input value={pickupAddress.postal_code} onChange={(event) => setPickupAddress({ ...pickupAddress, postal_code: event.target.value })} autoComplete="postal-code" inputMode="numeric" placeholder="37207" /></label></div>
          <small>We use this address only to confirm pickup eligibility. Pickup location details follow when we schedule with you.</small>
        </div>}
        <dl className="bag-summary__lines">
          <div><dt>Subtotal</dt><dd>{money.format(pricing.subtotalCents / 100)}</dd></div>
          {pricing.discountCents > 0 && (
            <div className="bag-summary__discount"><dt>{pricing.discountLabel}</dt><dd>−{money.format(pricing.discountCents / 100)}</dd></div>
          )}
          <div><dt>{pickup ? 'Pickup' : 'Shipping'}</dt><dd>{displayedShippingCents === 0 ? 'Free' : money.format(displayedShippingCents / 100)}</dd></div>
        </dl>
        {isTeeBundleActive(now) && pricing.discountKind === 'bundle' && <p className="bag-summary__bundle">{Math.floor(eligibleTees / BUNDLE_SIZE) > 1 ? `${Math.floor(eligibleTees / BUNDLE_SIZE)} sets of ` : ''}3 tees for $65 applied. {pickup ? 'Pickup is free.' : 'Shipped free.'}</p>}
        {isTeeBundleActive(now) && teesTowardNextBundle > 0 && <p className="bag-summary__bundle">Add {BUNDLE_SIZE - teesTowardNextBundle} more {BUNDLE_SIZE - teesTowardNextBundle === 1 ? 'tee' : 'tees'} {eligibleTees >= BUNDLE_SIZE ? 'for another 3 for $65.' : pickup ? 'to get 3 for $65.' : 'to get 3 for $65, shipped free.'}</p>}
        <div><span>Total</span><strong>{money.format(displayedTotalCents / 100)}</strong></div>
        <label className="bag-summary__promo">
          <span>Promo code</span>
          <input
            value={promoInput}
            onChange={(event) => { setPromoInput(event.target.value); setCheckoutError(''); }}
            placeholder="QUIET-XXXXXX"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <p>
          {pricing.promoCodeSkipped
            ? promoCode === WOAKS10_CODE
              ? 'Your 3-tee deal beats WOaks10, so we’re using that. Discounts can’t be combined.'
              : promoCode === ENB15_CODE
                ? 'Your 3-tee deal saves more than ENB15, so we’re using that. Discounts can’t be combined.'
              : 'Your 3-tee deal beats 10% off, so we’re using that. Your code stays saved for next time.'
            : pickup
              ? 'Free local pickup in 37207. Taxes are calculated at checkout.'
            : toFreeShipping > 0
              ? `${money.format(toFreeShipping / 100)} away from free shipping.`
              : 'Free shipping unlocked. Taxes are calculated at checkout.'}
        </p>
        <button type="button" disabled={checkingOut} onClick={checkout}>
          {checkingOut ? 'Opening checkout…' : 'Checkout'} <span>↗</span>
        </button>
        {checkoutError
          ? <small className="bag-summary__error" role="alert">{checkoutError}</small>
          : <small>Secure payment happens on Stripe. Your bag stays saved until payment succeeds.</small>}
      </aside>
    </div>
  );
}
