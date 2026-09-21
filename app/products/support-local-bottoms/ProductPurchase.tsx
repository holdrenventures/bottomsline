'use client';

import { useState } from 'react';
import type { CatalogProduct } from '../../data/products';
import { addCartItem } from '../../lib/cart';

type PurchaseProduct = Pick<CatalogProduct, 'id' | 'slug' | 'name' | 'price' | 'availableSizes' | 'stripeProductId' | 'stripePriceId'>;

export default function ProductPurchase({ product }: { product: PurchaseProduct }) {
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function addToBag() {
    if (!size) return;
    addCartItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPrice: product.price,
      size,
      quantity,
      stripeProductId: product.stripeProductId,
      stripePriceId: product.stripePriceId,
    });
    setAdded(true);
  }

  return (
    <div className="purchase-controls">
      <fieldset className="size-selector">
        <legend><span>Choose a size</span><button type="button" className="size-guide">Size guide</button></legend>
        <div>{product.availableSizes.map((option) => <button key={option} type="button" className={size === option ? 'is-selected' : ''} aria-pressed={size === option} onClick={() => { setSize(option); setAdded(false); }}>{option}</button>)}</div>
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
