'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Clothespin, Shirt } from '../BrandVisuals';
import { catalogCollections, collectionPath, type ShopCard } from '../data/products';
import { imageAttrs } from '../lib/delivery-images';
import { pinShift, pinSlant } from '../lib/pin-shift';

function GarmentIcon({ style }: { style: string }) {
  const name = style.toLowerCase();
  let outline: ReactNode;
  if (name.includes('tank')) {
    outline = <path d="M8 2h3l1 4h8l1-4h3l3 5-2 5-3-2v21H10V10l-3 2-2-5 3-5Z" />;
  } else if (name.includes('hood')) {
    outline = <><path d="M10 4c1-3 11-3 12 0l2 4 4 4-3 5-3-2v16H10V15l-3 2-3-5 4-4 2-4Z" /><path d="M10 4c1 6 11 6 12 0M14 9l-1 9m6-9 1 9M12 24h8" /></>;
  } else if (name.includes('sweat') || name.includes('sweater') || name.includes('crew')) {
    outline = <><path d="M9 4h4c1 3 5 3 6 0h4l6 5-3 8-4-2v16H10V15l-4 2-3-8 6-5Z" /><path d="M10 27h12M3 14l4 1m18 0 4-1" /></>;
  } else if (name.includes('hat') || name.includes('cap')) {
    outline = <><path d="M7 18v-4a9 9 0 0 1 18 0v4H7Z" /><path d="M4 18h25c-2 4-7 5-12 5H4v-5Z" /></>;
  } else {
    outline = <><path d="m7 5 4-2 2 3h6l2-3 4 2 5 7-5 4-3-3v18H10V13l-3 3-5-4 5-7Z" /><path d="M13 6c1 2 5 2 6 0" /></>;
  }
  return <svg viewBox="0 0 32 33" fill="none" aria-hidden="true" focusable="false">{outline}</svg>;
}

type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';

function chunkProducts(products: ShopCard[], size: number) {
  return Array.from({ length: Math.ceil(products.length / size) }, (_, index) => products.slice(index * size, index * size + size));
}

type ShopCatalogProps = {
  products: ShopCard[];
  initialCollection: (typeof catalogCollections)[number];
  initialQuery: string;
  initialSort: SortOption;
  initialStyle: 'tee' | null;
};

export default function ShopCatalog({ products, initialCollection, initialQuery, initialSort, initialStyle }: ShopCatalogProps) {
  const collection = initialCollection;
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [styleFilter, setStyleFilter] = useState(initialStyle);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (sort !== 'featured') params.set('sort', sort);
    if (styleFilter) params.set('style', styleFilter);
    const search = params.toString();
    const path = window.location.pathname.replace(/\/+$/, '') || '/shop';
    window.history.replaceState(null, '', `${path}${search ? `?${search}` : ''}#catalog`);
  }, [query, sort, styleFilter]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const productCollections = product.collections ?? [product.collection];
      const matchesCollection = collection === 'All' || productCollections.includes(collection);
      const matchesQuery = !normalizedQuery || `${product.name} ${productCollections.join(' ')} ${product.editorialDescriptor}`.toLowerCase().includes(normalizedQuery);
      const matchesStyle = !styleFilter || product.styles.some((style) => style.toLowerCase() === styleFilter);
      return matchesCollection && matchesQuery && matchesStyle;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'newest') return Number(b.isNewDrop) - Number(a.isNewDrop);
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'name') return a.name.localeCompare(b.name);
      return Number(b.featured) - Number(a.featured);
    });
  }, [collection, products, query, sort, styleFilter]);

  const rows = chunkProducts(visibleProducts, 4);

  return (
    <section className="shop-catalog shell" id="catalog">
      <div className="catalog-controls">
        <div className="catalog-filters" role="group" aria-label="Filter products by collection">
          {catalogCollections.map((option) => <a key={option} href={collectionPath(option)} className={collection === option ? 'is-active' : ''} aria-current={collection === option ? 'page' : undefined}>{option}</a>)}
        </div>
        <div className="catalog-tools">
          <label className="catalog-search"><span>Search</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a shirt" /></label>
          <label className="catalog-sort"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="featured">Featured first</option><option value="newest">Newest first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A–Z</option></select></label>
        </div>
      </div>

      <div className="catalog-count"><span>{String(visibleProducts.length).padStart(2, '0')}</span> shirts on the line</div>
      {styleFilter && <button className="catalog-style-filter" type="button" onClick={() => setStyleFilter(null)}>Showing tees only <span aria-hidden="true">×</span><span className="sr-only">Clear tee filter</span></button>}
      {visibleProducts.some((product) => product.styles.length > 1) && <p className="catalog-style-key"><span className="catalog-style-key__sample" aria-hidden="true"><GarmentIcon style="Tank" /><GarmentIcon style="Hoodie" /></span><span>Garment outlines show the styles available for each design.</span></p>}

      {rows.length ? rows.map((row, rowIndex) => (
        <div key={`${collection}-${query}-${sort}-${rowIndex}`}>
          <div className="catalog-line">
            {row.map((product, productIndex) => {
              const href = `/products/${product.slug}`;
              const styles = product.styles;
              const catalogImage = styleFilter === 'tee' ? product.teeImage ?? product.catalogImage : product.catalogImage;
              return (
                <article className="catalog-product" style={{ '--catalog-rotate': `${[-0.7, 0.6, -0.25, 0.8][productIndex]}deg`, '--pin-shift': pinShift(product.slug), '--pin-slant': pinSlant(product.slug) } as CSSProperties} key={product.slug}>
                  <a className="catalog-product__visual" href={href} aria-label={`Shop ${product.name}${styles.length > 1 ? `, available in ${styles.join(', ')}` : ''}`}>
                    <Clothespin />
                    {product.isPlaceholder && <span className="catalog-product__placeholder">V1 placeholder</span>}
                    {catalogImage
                      ? <img className="catalog-product__image" src={catalogImage} alt={product.name} {...imageAttrs(catalogImage)} loading={rowIndex === 0 ? 'eager' : 'lazy'} fetchPriority={rowIndex === 0 && productIndex === 0 ? 'high' : 'auto'} decoding="async" />
                      : <Shirt art={product.art} tone={product.tone} />}
                    {styles.length > 1 && <span className="catalog-product__styles" aria-hidden="true" title={`Available in ${styles.join(', ')}`}>{styles.map((style) => <span key={style} title={style}><GarmentIcon style={style} /></span>)}</span>}
                  </a>
                  <div className="catalog-product__meta"><p>{product.editorialDescriptor}</p><span>{product.priceLabel}</span></div>
                  <h2><a href={href}>{product.name}</a></h2>
                  <div className="catalog-product__action"><a href={href}>Read the shirt <span>↗</span></a></div>
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
      )) : <div className="catalog-empty"><p>Nothing on that line.</p>{query || styleFilter ? <button type="button" onClick={() => { setQuery(''); setStyleFilter(null); }}>Clear the search</button> : <Link href="/shop">Show everything</Link>}</div>}
    </section>
  );
}
