'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { Clothespin, Shirt } from '../BrandVisuals';
import { catalogCollections, type CatalogProduct } from '../data/products';

type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';

function chunkProducts(products: CatalogProduct[], size: number) {
  return Array.from({ length: Math.ceil(products.length / size) }, (_, index) => products.slice(index * size, index * size + size));
}

export default function ShopCatalog({ products }: { products: CatalogProduct[] }) {
  const [collection, setCollection] = useState<(typeof catalogCollections)[number]>('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('featured');

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCollection = collection === 'All' || product.collection === collection;
      const matchesQuery = !normalizedQuery || `${product.name} ${product.collection} ${product.editorialDescriptor}`.toLowerCase().includes(normalizedQuery);
      return matchesCollection && matchesQuery;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'newest') return Number(b.isNewDrop) - Number(a.isNewDrop);
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'name') return a.name.localeCompare(b.name);
      return Number(b.featured) - Number(a.featured);
    });
  }, [collection, products, query, sort]);

  const rows = chunkProducts(visibleProducts, 4);

  return (
    <section className="shop-catalog shell" id="catalog">
      <div className="catalog-controls">
        <div className="catalog-filters" role="group" aria-label="Filter products by collection">
          {catalogCollections.map((option) => <button type="button" key={option} className={collection === option ? 'is-active' : ''} aria-pressed={collection === option} onClick={() => setCollection(option)}>{option}</button>)}
        </div>
        <div className="catalog-tools">
          <label className="catalog-search"><span>Search</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a shirt" /></label>
          <label className="catalog-sort"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="featured">Featured first</option><option value="newest">Newest first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A–Z</option></select></label>
        </div>
      </div>

      <div className="catalog-count"><span>{String(visibleProducts.length).padStart(2, '0')}</span> shirts on the line</div>

      {rows.length ? rows.map((row, rowIndex) => (
        <div key={`${collection}-${query}-${sort}-${rowIndex}`}>
          <div className="catalog-line">
            {row.map((product, productIndex) => {
              const href = product.slug === 'support-local-bottoms' ? '/products/support-local-bottoms' : null;
              return (
                <article className="catalog-product" style={{ '--catalog-rotate': `${[-0.7, 0.6, -0.25, 0.8][productIndex]}deg` } as CSSProperties} key={product.slug}>
                  <div className="catalog-product__visual">
                    <Clothespin />
                    {product.isPlaceholder && <span className="catalog-product__placeholder">V1 placeholder</span>}
                    {product.imageUrl
                      ? <img className="catalog-product__image" src={product.imageUrl} alt={product.name} />
                      : <Shirt art={product.art} tone={product.tone} />}
                  </div>
                  <div className="catalog-product__meta"><p>{product.editorialDescriptor}</p><span>${product.price}</span></div>
                  <h2>{href ? <a href={href}>{product.name}</a> : product.name}</h2>
                  <div className="catalog-product__action">{href ? <a href={href}>Read the shirt <span>↗</span></a> : <span>PDP coming later</span>}</div>
                </article>
              );
            })}
          </div>
          {rowIndex === 1 && rows.length > 2 && (
            <aside className="catalog-interlude">
              <p>Read the room.<br /><em>Then ignore it.</em></p>
              <div className="catalog-interlude__note"><Clothespin compact /><span>Browsing is a form of research.</span></div>
            </aside>
          )}
        </div>
      )) : <div className="catalog-empty"><p>Nothing on that line.</p><button type="button" onClick={() => { setCollection('All'); setQuery(''); }}>Show everything</button></div>}
    </section>
  );
}
