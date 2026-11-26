'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CART_UPDATED_EVENT, clearCart, readCart, removeCartItem, updateCartItem, type CartItem } from '../lib/cart';
import { storefrontImage } from '../lib/storefront-images';
import { trackMeta } from '../lib/meta-pixel';
import { BUNDLE_SIZE, BUNDLE_STYLES, FREE_SHIPPING_MIN_CENTS, normalizePromoCode, quoteWithOffers, type DiscountOffer } from '../lib/pricing';
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
  const [offers, setOffers] = useState<DiscountOffer[]>([]);
  const [promoMessage, setPromoMessage] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
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

  // Preview only — the checkout Worker recomputes from catalog prices and validates the code.
  const pricing = useMemo(
    () => quoteWithOffers(
      items.map((item) => ({ style: item.style, unitCents: Math.round(item.unitPrice * 100), quantity: item.quantity })),
      offers,
      now,
    ),
    [items, offers, now],
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

  async function addCode() {
    if (offers.length >= 5) { setPromoMessage('You can add up to five codes.'); return; }
    const code = normalizePromoCode(promoInput);
    if (!code) { setPromoMessage('Enter a code of 4–32 letters, numbers, or hyphens.'); return; }
    if (offers.some((offer) => offer.code === code)) { setPromoMessage('That code is already added.'); return; }
    setCheckingCode(true); setPromoMessage('Checking code…');
    try {
      const response = await fetch('/api/discounts/resolve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codes: [code] }),
      });
      const result = await response.json() as { offers?: DiscountOffer[]; error?: string };
      if (!response.ok || !result.offers?.[0]) throw new Error(result.error || 'Unable to check the code.');
      setOffers((current) => [...current, result.offers![0]]);
      setPromoInput(''); setPromoMessage(`${code} added.`); setCheckoutError('');
    } catch (error) { setPromoMessage(error instanceof Error ? error.message : 'Unable to check the code.'); }
    finally { setCheckingCode(false); }
  }

  async function checkout() {
    if (promoInput.trim()) { setCheckoutError('Tap Add code before checkout, or clear the code field.'); return; }
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
            ...(item.areaCode ? { areaCode: item.areaCode } : {}),
          })),
          promoCodes: offers.map((offer) => offer.code),
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
          <article className="bag-item" key={`${item.productId}-${item.variantId}-${item.colorId}-${item.size}-${item.areaCode ?? ''}-${index}`}>
            <a className="bag-item__visual" href={`/products/${item.slug}`} aria-label={`View ${item.name}`}>
              {mockup
                ? <img src={mockup} alt="" />
                : <span>{item.name.split(/\s+/).slice(0, 3).join('\n')}</span>}
            </a>
            <div className="bag-item__copy">
              {item.areaCode && <p className="bag-item__area">Area code {item.areaCode}</p>}
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
          {pricing.breakdown.map((discount) => <div className="bag-summary__discount" key={discount.code ?? 'bundle'}><dt>{discount.label}</dt><dd>−{money.format(discount.cents / 100)}</dd></div>)}
          <div><dt>{pickup ? 'Pickup' : 'Shipping'}</dt><dd>{displayedShippingCents === 0 ? 'Free' : money.format(displayedShippingCents / 100)}</dd></div>
        </dl>
        {isTeeBundleActive(now) && pricing.bundleApplied && <p className="bag-summary__bundle">{Math.floor(eligibleTees / BUNDLE_SIZE) > 1 ? `${Math.floor(eligibleTees / BUNDLE_SIZE)} sets of ` : ''}3 tees for $65 applied. {pickup ? 'Pickup is free.' : 'Shipped free.'}</p>}
        {isTeeBundleActive(now) && teesTowardNextBundle > 0 && <p className="bag-summary__bundle">Add {BUNDLE_SIZE - teesTowardNextBundle} more {BUNDLE_SIZE - teesTowardNextBundle === 1 ? 'tee' : 'tees'} {eligibleTees >= BUNDLE_SIZE ? 'for another 3 for $65.' : pickup ? 'to get 3 for $65.' : 'to get 3 for $65, shipped free.'}</p>}
        <div><span>Total</span><strong>{money.format(displayedTotalCents / 100)}</strong></div>
        <div className="bag-summary__promo">
          <label htmlFor="bag-discount-code">Discount codes</label>
          <div className="bag-summary__promo-entry"><input
            id="bag-discount-code"
            value={promoInput}
            onChange={(event) => { setPromoInput(event.target.value); setPromoMessage(''); setCheckoutError(''); }}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void addCode(); } }}
            placeholder="Enter a code"
            autoComplete="off"
            spellCheck={false}
          /><button type="button" onClick={() => void addCode()} disabled={checkingCode || offers.length >= 5}>{checkingCode ? 'Checking…' : 'Add code'}</button></div>
        </div>
        {offers.length > 0 && <div className="bag-summary__codes">{offers.map((offer) => <span key={offer.code}>{offer.code}{pricing.skippedCodes.includes(offer.code) ? ' · not applied' : ''}<button type="button" aria-label={`Remove ${offer.code}`} onClick={() => { setOffers((current) => current.filter((entry) => entry.code !== offer.code)); setPromoMessage(''); }}>×</button></span>)}</div>}
        {promoMessage && <p className="bag-summary__promo-message" role="status">{promoMessage}</p>}
        <p>
          {pricing.skippedCodes.length
            ? `The best available discount combination is shown above. ${pricing.skippedCodes.join(', ')} ${pricing.skippedCodes.length === 1 ? 'was' : 'were'} not applied.`
            : pickup
              ? 'Free local pickup in 37207. Taxes are calculated at checkout.'
            : toFreeShipping > 0
              ? `${money.format(toFreeShipping / 100)} away from free shipping.`
              : 'Free shipping unlocked. Taxes are calculated at checkout.'}
        </p>
        <button type="button" disabled={checkingOut || checkingCode} onClick={checkout}>
          {checkingOut ? 'Opening checkout…' : 'Checkout'} <span>↗</span>
        </button>
        {checkoutError
          ? <small className="bag-summary__error" role="alert">{checkoutError}</small>
          : <small>Secure payment happens on Stripe. Your bag stays saved until payment succeeds.</small>}
      </aside>
    </div>
  );
}
