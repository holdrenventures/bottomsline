import type { CSSProperties } from 'react';
import { Clothespin, Shirt } from '../BrandVisuals';
import type { CatalogProduct } from '../data/products';
import { productPriceLabel } from '../data/products';
import { imageAttrs } from '../lib/delivery-images';
import { pinShift, pinSlant } from '../lib/pin-shift';
import { relatedProducts } from '../lib/related';

export default function RelatedProducts({ product, catalog }: { product: CatalogProduct; catalog: CatalogProduct[] }) {
  const related = relatedProducts(product, catalog);
  if (!related.length) return null;
  return (
    <section className="related shell section" aria-labelledby="related-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow"><span /> While you’re here</p>
          <h2 id="related-title">More from<br /><em>this line.</em></h2>
        </div>
      </div>
      <div className="product-rail" aria-label="Related products">
        <div className="product-grid">
          {related.map((item, index) => (
            <article className="product-card" key={item.slug} style={{ ['--pin-shift' as string]: pinShift(item.slug), ['--pin-slant' as string]: pinSlant(item.slug) } as CSSProperties}>
              <a className="product-card__image" href={`/products/${item.slug}`} aria-label={`Shop ${item.name}`}>
                <Clothespin />
                <span className="product-card__number">{String(index + 1).padStart(2, '0')}</span>
                <div className="product-card__media">{item.catalogImage ? <img src={item.catalogImage} alt={`${item.name} — ${item.editorialDescriptor}`} {...imageAttrs(item.catalogImage)} loading="lazy" decoding="async" /> : <Shirt art={item.art} tone={item.tone} />}</div>
              </a>
              <div className="product-card__meta"><p>{item.editorialDescriptor}</p><span>{productPriceLabel(item)}</span></div>
              <h3>{item.name}</h3>
              <a href={`/products/${item.slug}`}>Read the shirt <span aria-hidden="true">↗</span></a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
