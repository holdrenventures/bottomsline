'use client';

import { useEffect, useMemo, useState } from 'react';
import { CART_UPDATED_EVENT, clearCart, readCart, removeCartItem, updateCartItem, type CartItem } from '../lib/cart';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function itemDetails(item: CartItem) {
  return [item.style, item.color, item.size].filter(Boolean).join(' · ');
}

export default function BagClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

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

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    [items],
  );

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
        }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? 'Checkout is temporarily unavailable.');

      const destination = new URL(result.url);
      if (destination.protocol !== 'https:' || !destination.hostname.endsWith('.stripe.com')) {
        throw new Error('Checkout returned an unexpected destination.');
      }
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
        <a className="button button--primary" href="/shop">Find a shirt <span>↗</span></a>
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
        {items.map((item, index) => (
          <article className="bag-item" key={`${item.productId}-${item.variantId}-${item.colorId}-${item.size}-${index}`}>
            <a className="bag-item__visual" href={`/products/${item.slug}`} aria-label={`View ${item.name}`}>
              {item.colorMockup
                ? <img src={item.colorMockup} alt="" />
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
        ))}
        <a className="bag-continue" href="/shop">← Keep looking. We won’t judge.</a>
      </section>

      <aside className="bag-summary">
        <p className="eyebrow"><span /> The bottom line</p>
        <div><span>Subtotal</span><strong>{money.format(subtotal)}</strong></div>
        <p>Secure payment and shipping details are handled at checkout.</p>
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
