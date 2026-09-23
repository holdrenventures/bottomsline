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
        <p>Shipping and taxes are calculated at checkout.</p>
        <button type="button" disabled>Checkout <span>↗</span></button>
        <small>Stripe Checkout connects in the next phase. Your bag is saved on this device.</small>
      </aside>
    </div>
  );
}
