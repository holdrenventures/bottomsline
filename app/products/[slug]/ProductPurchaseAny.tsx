'use client';

import { useMemo, useState } from 'react';
import type { CatalogColor, CatalogProduct } from '../../data/products';
import { addCartItem } from '../../lib/cart';

type PurchaseProduct = Pick<
  CatalogProduct,
  'id' | 'slug' | 'name' | 'price' | 'availableSizes' | 'variants' | 'colors' | 'stripeProductId' | 'stripePriceId' | 'catalogImage'
>;

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'color';
}

function styleName(color: CatalogColor) {
  return color.style?.trim() || 'Tee';
}

export default function ProductPurchaseAny({ product }: { product: PurchaseProduct }) {
  const displayColors = useMemo(
    () => product.colors.filter((color) => color.active),
    [product.colors],
  );
  const styles = useMemo(
    () => Array.from(new Set(displayColors.map(styleName))),
    [displayColors],
  );
  const [style, setStyle] = useState<string | null>(styles[0] ?? null);
  const colorsForStyle = useMemo(
    () => displayColors.filter((color) => styleName(color) === style),
    [displayColors, style],
  );
  const [colorId, setColorId] = useState<string | null>(colorsForStyle[0]?.id ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selectedColor: CatalogColor | null = useMemo(
    () => colorsForStyle.find((color) => color.id === colorId) ?? null,
    [colorsForStyle, colorId],
  );

  const heroImage = selectedColor?.mockupUrl ?? product.catalogImage ?? null;

  function addToBag() {
    if (!size) return;
    const selectedVariant = product.variants?.find((variant) => variant.size === size);
    const composedSku = selectedColor
      ? `blc-${product.slug}-${slugify(styleName(selectedColor))}-${slugify(selectedColor.color)}-${size.toLowerCase()}`
      : null;

    addCartItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPrice: selectedVariant?.price ?? product.price,
      size,
      quantity,
      stripeProductId: selectedVariant?.stripeProductId ?? product.stripeProductId,
      stripePriceId: selectedVariant?.stripePriceId ?? product.stripePriceId,
      color: selectedColor?.color ?? null,
      colorId: selectedColor?.id ?? null,
      colorMockup: selectedColor?.mockupUrl ?? null,
      style: selectedColor ? styleName(selectedColor) : null,
      garment: selectedColor?.garment ?? null,
    });
    if (composedSku && typeof console !== 'undefined') {
      // Recorded on the client for now; the Worker will re-derive this at checkout.
      console.debug('cart:add', composedSku);
    }
    setAdded(true);
  }

  return (
    <div className="purchase-controls">
      {heroImage && (
        <div className="purchase-hero">
          <img src={heroImage} alt={`${product.name}${selectedColor ? ` — ${selectedColor.color}` : ''}`} />
        </div>
      )}

      {styles.length > 1 && (
        <fieldset className="style-selector">
          <legend>Choose a style</legend>
          <div>
            {styles.map((option) => (
              <button
                key={option}
                type="button"
                className={style === option ? 'is-selected' : ''}
                aria-pressed={style === option}
                onClick={() => {
                  setStyle(option);
                  setColorId(displayColors.find((color) => styleName(color) === option)?.id ?? null);
                  setAdded(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {colorsForStyle.length > 0 && (
        <fieldset className="color-selector">
          <legend><span>Choose a color</span><span className="color-selector__count">{colorsForStyle.length}</span></legend>
          <div className="color-selector__grid">
            {colorsForStyle.map((color) => (
              <button
                key={color.id}
                type="button"
                className={colorId === color.id ? 'color-swatch is-selected' : 'color-swatch'}
                aria-pressed={colorId === color.id}
                onClick={() => { setColorId(color.id); setAdded(false); }}
              >
                {color.mockupUrl
                  ? <img src={color.mockupUrl} alt={color.color} loading="lazy" />
                  : <span className="color-swatch__placeholder">{color.color.slice(0, 2).toUpperCase()}</span>}
                <span className="color-swatch__label">{color.color}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="size-selector">
        <legend><span>Choose a size</span><button type="button" className="size-guide">Size guide</button></legend>
        <div>
          {product.availableSizes.map((option) => (
            <button
              key={option}
              type="button"
              className={size === option ? 'is-selected' : ''}
              aria-pressed={size === option}
              onClick={() => { setSize(option); setAdded(false); }}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="purchase-row">
        <div className="quantity-selector" aria-label="Quantity selector">
          <span>Qty</span>
          <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" aria-label="Increase quantity" onClick={() => setQuantity(Math.min(9, quantity + 1))}>+</button>
        </div>
        <button className="add-to-bag" type="button" disabled={!size} onClick={addToBag}>
          {added
            ? `Added — ${selectedColor ? `${styleName(selectedColor)} · ${selectedColor.color} · ` : ''}${size} × ${quantity}`
            : 'Add to bag'} <span aria-hidden="true">↗</span>
        </button>
      </div>
      <p className={`purchase-note ${added ? 'purchase-note--success' : ''}`} role="status">
        {added
          ? 'Excellent judgment. It’s in the bag.'
          : size
            ? 'Ready when you are.'
            : displayColors.length > 0 && !selectedColor
              ? 'Pick a color, then a size.'
              : 'Pick a size. Commitment looks good on you.'}
      </p>
    </div>
  );
}
