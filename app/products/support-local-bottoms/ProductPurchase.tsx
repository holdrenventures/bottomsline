'use client';

import { useState } from 'react';

const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export default function ProductPurchase() {
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function addToBag() {
    if (!size) return;
    const current = Number(window.localStorage.getItem('bottoms-line-bag-count') || 0);
    window.localStorage.setItem('bottoms-line-bag-count', String(current + quantity));
    window.dispatchEvent(new Event('bottoms-line-bag-updated'));
    setAdded(true);
  }

  return (
    <div className="purchase-controls">
      <fieldset className="size-selector">
        <legend><span>Choose a size</span><button type="button" className="size-guide">Size guide</button></legend>
        <div>{sizes.map((option) => <button key={option} type="button" className={size === option ? 'is-selected' : ''} aria-pressed={size === option} onClick={() => { setSize(option); setAdded(false); }}>{option}</button>)}</div>
      </fieldset>

      <div className="purchase-row">
        <div className="quantity-selector" aria-label="Quantity selector">
          <span>Qty</span>
          <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" aria-label="Increase quantity" onClick={() => setQuantity(Math.min(9, quantity + 1))}>+</button>
        </div>
        <button className="add-to-bag" type="button" disabled={!size} onClick={addToBag}>
          {added ? `Added — ${size} × ${quantity}` : 'Add to bag'} <span aria-hidden="true">↗</span>
        </button>
      </div>
      <p className={`purchase-note ${added ? 'purchase-note--success' : ''}`} role="status">{added ? 'Excellent judgment. It’s in the bag.' : size ? 'Ready when you are.' : 'Pick a size. Commitment looks good on you.'}</p>
    </div>
  );
}
