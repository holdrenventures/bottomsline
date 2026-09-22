'use client';

/* eslint-disable @next/next/no-img-element -- Admin previews use arbitrary Cloudinary URLs entered by the catalog manager. */

import { useMemo, useState } from 'react';

type Collection = { id: string; name: string; slug: string; description: string | null; sort_order: number; active: boolean };
type Variant = { id?: string; size: string; sku: string; active: boolean; inventory_quantity: number | null; stripe_product_id: string | null; stripe_price_id: string | null; price_cents: number };
type Color = { id?: string; color: string; style: string | null; garment: string | null; mockup_url: string | null; sort_order: number; active: boolean };
type Product = {
  id?: string;
  name: string;
  slug: string;
  editorial_descriptor: string | null;
  description: string | null;
  base_price_cents: number;
  currency: string;
  catalog_image: string | null;
  active: boolean;
  featured: boolean;
  new_drop: boolean;
  created_at?: string;
  updated_at?: string;
  product_variants: Variant[];
  product_colors: Color[];
  product_collections: Array<{ collection_id: string; sort_order: number }>;
  collection_ids?: string[];
};

const blankProduct = (): Product => ({
  name: '', slug: '', editorial_descriptor: '', description: '', base_price_cents: 3200, currency: 'usd', catalog_image: '',
  active: false, featured: false, new_drop: false, product_variants: [], product_colors: [], product_collections: [], collection_ids: [],
});

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminCatalog() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<Product>(blankProduct());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Enter the admin token to load the catalog.');
  const [busy, setBusy] = useState(false);

  const visibleProducts = useMemo(() => products.filter((product) => `${product.name} ${product.slug}`.toLowerCase().includes(query.toLowerCase())), [products, query]);

  async function request(input: RequestInfo, init: RequestInit = {}, accessToken = token) {
    const response = await fetch(input, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Request failed.');
    return payload;
  }

  async function loadCatalog(accessToken = token, preferredId?: string) {
    setBusy(true); setStatus('Loading catalog…');
    try {
      const payload = await request('/api/admin/catalog', {}, accessToken);
      setProducts(payload.products); setCollections(payload.collections);
      const nextId = preferredId ?? selectedId ?? payload.products[0]?.id ?? '';
      const next = payload.products.find((product: Product) => product.id === nextId) ?? payload.products[0];
      if (next) selectProduct(next);
      setStatus(`${payload.products.length} products loaded.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to load catalog.');
      if ((error as Error).message.includes('token')) sessionStorage.removeItem('bl-admin-token');
    } finally { setBusy(false); }
  }

  function login(event: React.FormEvent) {
    event.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) return;
    setToken(clean); void loadCatalog(clean);
  }

  function selectProduct(product: Product) {
    setSelectedId(product.id ?? '');
    setDraft({
      ...structuredClone(product),
      collection_ids: [...product.product_collections].sort((a, b) => a.sort_order - b.sort_order).map((link) => link.collection_id),
      product_variants: [...product.product_variants].sort((a, b) => a.size.localeCompare(b.size)),
      product_colors: [...product.product_colors].sort((a, b) => a.sort_order - b.sort_order),
    });
  }

  function newProduct() { setSelectedId(''); setDraft(blankProduct()); setStatus('New draft product.'); }
  function patch<K extends keyof Product>(key: K, value: Product[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function patchVariant(index: number, value: Partial<Variant>) { patch('product_variants', draft.product_variants.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item)); }
  function patchColor(index: number, value: Partial<Color>) { patch('product_colors', draft.product_colors.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item)); }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setStatus('Saving…');
    try {
      const payload = await request('/api/admin/catalog', { method: 'POST', body: JSON.stringify(draft) });
      setStatus('Saved. The storefront will read the update on its next request.');
      await loadCatalog(token, payload.id);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to save product.'); }
    finally { setBusy(false); }
  }

  if (!token || !products.length) {
    return (
      <main className="admin-login">
        <form onSubmit={login}>
          <p className="admin-kicker">Bottom’s Line / Internal</p>
          <h1>Product Desk</h1>
          <p>Products in. Shirts out. Secrets stay server-side.</p>
          <label>Admin token<input type="password" autoComplete="current-password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} /></label>
          <button disabled={busy}>{busy ? 'Checking…' : 'Open catalog'}</button>
          <output role="status">{status}</output>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header"><div><p className="admin-kicker">Bottom’s Line / Internal</p><h1>Product Desk</h1></div><div><a href="/shop" target="_blank">View shop ↗</a><button type="button" onClick={() => loadCatalog()}>Refresh</button></div></header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__tools"><input type="search" placeholder="Find a product" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" onClick={newProduct}>+ New</button></div>
          <nav>{visibleProducts.map((product) => <button type="button" key={product.id} className={selectedId === product.id ? 'is-active' : ''} onClick={() => selectProduct(product)}><span>{product.name}</span><small>{product.active ? 'Live' : 'Draft'} · ${(product.base_price_cents / 100).toFixed(2)}</small></button>)}</nav>
        </aside>

        <form className="admin-editor" onSubmit={save}>
          <div className="admin-editor__top"><div><p>{draft.id ? 'Edit product' : 'New product'}</p><h2>{draft.name || 'Untitled shirt'}</h2></div><button className="admin-save" disabled={busy}>{busy ? 'Working…' : 'Save product'}</button></div>
          <output className="admin-status" role="status">{status}</output>

          <section className="admin-section"><h3>Core product</h3><div className="admin-fields admin-fields--two">
            <label>Name<input required value={draft.name} onChange={(event) => { const name = event.target.value; patch('name', name); if (!draft.id) patch('slug', slugify(name)); }} /></label>
            <label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(event) => patch('slug', slugify(event.target.value))} /></label>
            <label>Editorial descriptor<input value={draft.editorial_descriptor ?? ''} onChange={(event) => patch('editorial_descriptor', event.target.value)} /></label>
            <label>Price in cents<input type="number" min="0" step="1" required value={draft.base_price_cents} onChange={(event) => patch('base_price_cents', Number(event.target.value))} /></label>
            <label>Currency<input maxLength={3} value={draft.currency} onChange={(event) => patch('currency', event.target.value.toLowerCase())} /></label>
            <label className="admin-field--wide">Description<textarea rows={3} value={draft.description ?? ''} onChange={(event) => patch('description', event.target.value)} /></label>
          </div><div className="admin-checks"><label><input type="checkbox" checked={draft.active} onChange={(event) => patch('active', event.target.checked)} /> Active product</label><label><input type="checkbox" checked={draft.featured} onChange={(event) => patch('featured', event.target.checked)} /> Featured</label><label><input type="checkbox" checked={draft.new_drop} onChange={(event) => patch('new_drop', event.target.checked)} /> New drop</label></div></section>

          <section className="admin-section"><h3>Catalog image</h3><div className="admin-image-field"><label>Cloudinary image URL<input type="url" value={draft.catalog_image ?? ''} onChange={(event) => patch('catalog_image', event.target.value)} /></label>{draft.catalog_image && <img src={draft.catalog_image} alt="Catalog preview" />}</div></section>

          <section className="admin-section"><h3>Collections</h3><div className="admin-checks admin-checks--wrap">{collections.map((collection) => <label key={collection.id}><input type="checkbox" checked={(draft.collection_ids ?? []).includes(collection.id)} onChange={(event) => patch('collection_ids', event.target.checked ? [...(draft.collection_ids ?? []), collection.id] : (draft.collection_ids ?? []).filter((id) => id !== collection.id))} /> {collection.name}</label>)}</div></section>

          <section className="admin-section"><div className="admin-section__heading"><h3>Size variants</h3><button type="button" onClick={() => patch('product_variants', [...draft.product_variants, { size:'', sku:'', active:false, inventory_quantity:null, stripe_product_id:null, stripe_price_id:null, price_cents:draft.base_price_cents }])}>+ Add size</button></div>{draft.product_variants.map((variant, index) => <div className="admin-row admin-row--variant" key={variant.id ?? `new-variant-${index}`}>
            <label>Size<input value={variant.size} onChange={(event) => patchVariant(index, { size:event.target.value })} /></label><label>SKU<input value={variant.sku} onChange={(event) => patchVariant(index, { sku:event.target.value })} /></label><label>Price cents<input type="number" min="0" value={variant.price_cents} onChange={(event) => patchVariant(index, { price_cents:Number(event.target.value) })} /></label><label>Inventory<input type="number" min="0" placeholder="Untracked" value={variant.inventory_quantity ?? ''} onChange={(event) => patchVariant(index, { inventory_quantity:event.target.value === '' ? null : Number(event.target.value) })} /></label><label>Stripe product<input placeholder="prod_…" value={variant.stripe_product_id ?? ''} onChange={(event) => patchVariant(index, { stripe_product_id:event.target.value })} /></label><label>Stripe price<input placeholder="price_…" value={variant.stripe_price_id ?? ''} onChange={(event) => patchVariant(index, { stripe_price_id:event.target.value })} /></label><label className="admin-row__check"><input type="checkbox" checked={variant.active} onChange={(event) => patchVariant(index, { active:event.target.checked })} /> Sellable</label>
          </div>)}</section>

          <section className="admin-section"><div className="admin-section__heading"><h3>Colorways and images</h3><button type="button" onClick={() => patch('product_colors', [...draft.product_colors, { color:'', style:'Tee', garment:'', mockup_url:'', sort_order:draft.product_colors.length, active:true }])}>+ Add colorway</button></div>{draft.product_colors.map((color, index) => <div className="admin-row admin-row--color" key={color.id ?? `new-color-${index}`}>
            <label>Color<input value={color.color} onChange={(event) => patchColor(index, { color:event.target.value })} /></label><label>Style<input value={color.style ?? ''} onChange={(event) => patchColor(index, { style:event.target.value })} /></label><label>Garment<input value={color.garment ?? ''} onChange={(event) => patchColor(index, { garment:event.target.value })} /></label><label>Order<input type="number" value={color.sort_order} onChange={(event) => patchColor(index, { sort_order:Number(event.target.value) })} /></label><label className="admin-row__url">Cloudinary mockup URL<input type="url" value={color.mockup_url ?? ''} onChange={(event) => patchColor(index, { mockup_url:event.target.value })} /></label><label className="admin-row__check"><input type="checkbox" checked={color.active} onChange={(event) => patchColor(index, { active:event.target.checked })} /> Visible</label>{color.mockup_url && <img src={color.mockup_url} alt={`${color.color} preview`} />}
          </div>)}</section>

          <div className="admin-editor__bottom"><p>Created and updated timestamps are managed automatically by Supabase.</p><button className="admin-save" disabled={busy}>{busy ? 'Working…' : 'Save product'}</button></div>
        </form>
      </div>
    </main>
  );
}
