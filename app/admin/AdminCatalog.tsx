'use client';

/* eslint-disable @next/next/no-img-element -- Admin previews use arbitrary Cloudinary URLs entered by the catalog manager. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, InputHTMLAttributes } from 'react';

type Collection = { id: string; name: string; slug: string; description: string | null; sort_order: number; active: boolean };
type Variant = { id?: string; style: string; garment: string | null; size: string; sku: string; active: boolean; inventory_quantity: number | null; price_cents: number; _key?: string };
type Color = { id?: string; color: string; style: string | null; garment: string | null; mockup_url: string | null; sort_order: number; active: boolean; _key?: string };
type Product = {
  id?: string;
  name: string;
  slug: string;
  editorial_descriptor: string | null;
  description: string | null;
  product_annotation: string | null;
  material: string | null;
  fit_notes: string | null;
  care_instructions: string | null;
  shipping_note: string | null;
  size_guide_url: string | null;
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
type Filter = 'all' | 'live' | 'draft';
type Notice = { text: string; tone: 'info' | 'success' | 'error' };
type GarmentPresetId = 'tee' | 'tank' | 'sweatshirt' | 'hat' | 'custom';
type GarmentGenerator = { preset: GarmentPresetId; style: string; garment: string; sizes: string };

const tokenKey = 'bl-admin-token';
const DEFAULT_SIZES = 'S, M, L, XL, 2XL';
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL', 'ONE SIZE', 'OS'];
const GARMENT_PRESETS: Array<{ id: GarmentPresetId; label: string; detail: string; style: string; sizes: string }> = [
  { id: 'tee', label: 'T-shirt', detail: 'Standard size run', style: 'Tee', sizes: 'XS, S, M, L, XL, 2XL, 3XL' },
  { id: 'tank', label: 'Tank', detail: 'Sleeveless option', style: 'Tank', sizes: 'XS, S, M, L, XL, 2XL, 3XL' },
  { id: 'sweatshirt', label: 'Sweatshirt', detail: 'Crewneck or hoodie', style: 'Sweatshirt', sizes: 'S, M, L, XL, 2XL, 3XL' },
  { id: 'hat', label: 'Hat', detail: 'Starts as one size', style: 'Hat', sizes: 'One Size' },
  { id: 'custom', label: 'Custom', detail: 'Anything else', style: '', sizes: DEFAULT_SIZES },
];
/** Public URL for one product. Change this if the storefront route is different. */
const productPath = (slug: string) => `/products/${slug}`;
const emptyNotice: Notice = { text: '', tone: 'info' };

const blankProduct = (): Product => ({
  name: '', slug: '', editorial_descriptor: '', description: '', product_annotation: '', material: '', fit_notes: '', care_instructions: '', shipping_note: '', size_guide_url: '', base_price_cents: 3200, currency: 'usd', catalog_image: '',
  active: false, featured: false, new_drop: false, product_variants: [], product_colors: [], product_collections: [], collection_ids: [],
});

/* ---------- helpers ---------- */

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
const uid = () => Math.random().toString(36).slice(2, 10);
const dollars = (cents: number) => (cents / 100).toFixed(2);
const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const comboKey = (v: Pick<Variant, 'style' | 'garment' | 'size'>) => [v.style, v.garment ?? '', v.size].map((part) => part.trim().toLowerCase()).join('|');
const formatDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function sizeRank(size: string) {
  const index = SIZE_ORDER.indexOf(size.trim().toUpperCase());
  return index === -1 ? SIZE_ORDER.length : index;
}
function compareVariants(a: Variant, b: Variant) {
  return a.style.localeCompare(b.style) || (a.garment ?? '').localeCompare(b.garment ?? '') || sizeRank(a.size) - sizeRank(b.size) || a.size.localeCompare(b.size);
}
function skuFor(slug: string, v: Pick<Variant, 'style' | 'garment' | 'size'>) {
  const clean = (part: string | null) => (part ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  return [slug.toUpperCase(), clean(v.style), clean(v.garment), clean(v.size)].filter(Boolean).join('-');
}
function rankByFrequency(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  values.forEach((value) => { const clean = (value ?? '').trim(); if (clean) counts.set(clean, (counts.get(clean) ?? 0) + 1); });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}
/** Normalizes a product from the API into an editable draft (sorted, with stable row keys). */
function toDraft(product: Product): Product {
  return {
    ...structuredClone(product),
    collection_ids: [...product.product_collections].sort((a, b) => a.sort_order - b.sort_order).map((link) => link.collection_id),
    product_variants: [...product.product_variants].sort(compareVariants).map((v) => ({ ...v, _key: v.id ?? uid() })),
    product_colors: [...product.product_colors].sort((a, b) => a.sort_order - b.sort_order).map((c) => ({ ...c, _key: c.id ?? uid() })),
  };
}

function omitKey<T extends { _key?: string }>(item: T): Omit<T, '_key'> {
  const { _key: omitted, ...rest } = item;
  void omitted;
  return rest;
}

/** Strips client-only keys, fills blank SKUs, and writes colorway order from list position. */
function toPayload(draft: Product) {
  return {
    ...draft,
    product_variants: draft.product_variants.map((v) => ({ ...omitKey(v), sku: v.sku.trim() || skuFor(draft.slug, v) })),
    product_colors: draft.product_colors.map((c, index) => ({ ...omitKey(c), sort_order: index })),
  };
}

function readinessChecks(p: Product) {
  return [
    { label: 'Name and URL', ok: Boolean(p.name.trim() && p.slug) },
    { label: 'Description', ok: Boolean(p.description?.trim()) },
    { label: 'Catalog image', ok: Boolean(p.catalog_image?.trim()) },
    { label: 'At least one colorway image', ok: p.product_colors.some((c) => c.active && c.mockup_url?.trim()) },
    { label: 'At least one sellable size in stock', ok: p.product_variants.some((v) => v.active && (v.inventory_quantity === null || v.inventory_quantity > 0)) },
  ];
}

/* ---------- small components ---------- */

type MoneyInputProps = { cents: number; onCentsChange: (cents: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

/** Shows dollars, stores cents. Free typing while focused, formatted on blur. */
function MoneyInput({ cents, onCentsChange, className, ...rest }: MoneyInputProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  return (
    <span className={`admin-money ${className ?? ''}`}>
      <span aria-hidden="true">$</span>
      <input
        {...rest}
        inputMode="decimal"
        value={focused ? text : dollars(cents)}
        onFocus={(event) => { setText(dollars(cents)); setFocused(true); event.currentTarget.select(); }}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const value = event.target.value.replace(/[^0-9.]/g, '');
          setText(value);
          const parsed = parseFloat(value);
          onCentsChange(Number.isNaN(parsed) ? 0 : Math.round(parsed * 100));
        }}
      />
    </span>
  );
}

/* ---------- page ---------- */

export default function AdminCatalog() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<Product>(blankProduct());
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(blankProduct()));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [notice, setNotice] = useState<Notice>({ text: 'Enter the admin token to load the catalog.', tone: 'info' });
  const [busy, setBusy] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generator, setGenerator] = useState<GarmentGenerator>({ preset: 'tee', style: 'Tee', garment: '', sizes: DEFAULT_SIZES });
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = JSON.stringify(draft) !== savedSnapshot;
  const checks = readinessChecks(draft);
  const missing = checks.filter((check) => !check.ok);
  const slugTaken = Boolean(draft.slug) && products.some((p) => p.slug === draft.slug && p.id !== draft.id);

  const counts = useMemo(() => ({
    all: products.length,
    live: products.filter((p) => p.active).length,
    draft: products.filter((p) => !p.active).length,
  }), [products]);

  const visibleProducts = useMemo(() => products
    .filter((p) => filter === 'all' || (filter === 'live' ? p.active : !p.active))
    .filter((p) => `${p.name} ${p.slug}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)),
  [products, filter, query]);

  // Values already used across the catalog, offered as suggestions to prevent typos like "Tshirt" vs "T-Shirt".
  const suggestions = useMemo(() => {
    const variants = products.flatMap((p) => p.product_variants);
    return {
      styles: rankByFrequency(variants.map((v) => v.style)),
      garments: rankByFrequency(variants.map((v) => v.garment)),
      sizes: rankByFrequency(variants.map((v) => v.size)).sort((a, b) => sizeRank(a) - sizeRank(b)),
      colors: rankByFrequency(products.flatMap((p) => p.product_colors.map((c) => c.color))),
    };
  }, [products]);

  const newCombos = useMemo(() => {
    if (!generatorOpen) return [];
    const existing = new Set(draft.product_variants.map(comboKey));
    const combos: Array<Pick<Variant, 'style' | 'garment' | 'size'>> = [];
    const style = generator.style.trim();
    const garment = generator.garment.trim();
    if (!style) return combos;
    for (const size of splitList(generator.sizes)) {
      const combo = { style, garment, size };
      if (!existing.has(comboKey(combo))) { existing.add(comboKey(combo)); combos.push(combo); }
    }
    return combos;
  }, [generatorOpen, generator, draft.product_variants]);

  /* ----- data ----- */

  async function request<T>(input: RequestInfo, init: RequestInit = {}, accessToken = token): Promise<T> {
    const response = await fetch(input, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) } });
    const payload = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'Request failed.');
    return payload;
  }

  async function loadCatalog(accessToken = token, preferredId?: string, doneNotice: Notice = emptyNotice) {
    setBusy(true); setNotice({ text: 'Loading catalog…', tone: 'info' });
    try {
      const payload = await request<{ products: Product[]; collections: Collection[] }>('/api/admin/catalog', {}, accessToken);
      setProducts(payload.products); setCollections(payload.collections); setLoaded(true);
      const nextId = preferredId ?? selectedId;
      const next = payload.products.find((product) => product.id === nextId) ?? payload.products[0];
      if (next) selectProduct(next); else startBlank();
      setNotice(doneNotice);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load catalog.';
      setNotice({ text: message, tone: 'error' });
      if (message.toLowerCase().includes('token')) { sessionStorage.removeItem(tokenKey); setLoaded(false); }
    } finally { setBusy(false); }
  }

  function login(event: FormEvent) {
    event.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) return;
    sessionStorage.setItem(tokenKey, clean); setToken(clean); void loadCatalog(clean);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(tokenKey);
    if (!saved) return;
    const timer = window.setTimeout(() => { setToken(saved); setTokenInput(saved); void loadCatalog(saved); }, 0);
    return () => window.clearTimeout(timer);
    // The token is intentionally restored only once per tab session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cmd/Ctrl + S saves.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); formRef.current?.requestSubmit(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  /* ----- editing ----- */

  function selectProduct(product: Product) {
    const next = toDraft(product);
    setSelectedId(product.id ?? '');
    setDraft(next);
    setSavedSnapshot(JSON.stringify(next));
    setGeneratorOpen(false);
  }
  function startBlank() {
    const blank = blankProduct();
    setSelectedId(''); setDraft(blank); setSavedSnapshot(JSON.stringify(blank)); setGeneratorOpen(false);
  }
  const confirmDiscard = () => !dirty || window.confirm('You have unsaved changes. Discard them?');

  function pickProduct(product: Product) {
    if (product.id === selectedId || !confirmDiscard()) return;
    selectProduct(product); setNotice(emptyNotice);
  }
  function newProduct() {
    if (!confirmDiscard()) return;
    startBlank(); setNotice({ text: 'New draft. Nothing is public until you switch it to Live and save.', tone: 'info' });
  }
  function duplicateProduct() {
    if (!confirmDiscard()) return;
    const name = `${draft.name} (copy)`;
    const copy: Product = {
      ...structuredClone(draft),
      id: undefined, created_at: undefined, updated_at: undefined,
      name, slug: slugify(name),
      description: '', editorial_descriptor: '', product_annotation: '', catalog_image: '',
      active: false, featured: false, new_drop: false,
      product_collections: [],
      // Keep the size run and colorways, but clear SKUs and art so nothing from the original leaks into the new shirt.
      product_variants: draft.product_variants.map((v) => ({ ...v, id: undefined, sku: '', _key: uid() })),
      product_colors: draft.product_colors.map((c) => ({ ...c, id: undefined, mockup_url: '', _key: uid() })),
    };
    setSelectedId(''); setDraft(copy);
    setNotice({ text: 'Copied sizes, colorways, details, and collections. Add the new name, description, and images.', tone: 'info' });
  }
  function discard() {
    const original = products.find((p) => p.id === selectedId);
    if (original) selectProduct(original); else startBlank();
    setNotice({ text: 'Changes discarded.', tone: 'info' });
  }
  function refresh() { if (confirmDiscard()) void loadCatalog(); }

  function patch<K extends keyof Product>(key: K, value: Product[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function patchVariant(index: number, value: Partial<Variant>) { patch('product_variants', draft.product_variants.map((item, i) => i === index ? { ...item, ...value } : item)); }
  function patchAllVariants(value: Partial<Variant>) { patch('product_variants', draft.product_variants.map((item) => ({ ...item, ...value }))); }
  function removeVariant(index: number) { patch('product_variants', draft.product_variants.filter((_, i) => i !== index)); }
  function patchColor(index: number, value: Partial<Color>) { patch('product_colors', draft.product_colors.map((item, i) => i === index ? { ...item, ...value } : item)); }
  function removeColor(index: number) { patch('product_colors', draft.product_colors.filter((_, i) => i !== index)); }
  function moveColor(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= draft.product_colors.length) return;
    const next = [...draft.product_colors];
    [next[index], next[target]] = [next[target], next[index]];
    patch('product_colors', next);
  }

  /** Changing the base price also moves every variant that was priced at the old base. Custom prices stay put. */
  function setBasePrice(cents: number) {
    setDraft((current) => ({
      ...current,
      base_price_cents: cents,
      product_variants: current.product_variants.map((v) => v.price_cents === current.base_price_cents ? { ...v, price_cents: cents } : v),
    }));
  }

  function selectGarmentPreset(presetId: GarmentPresetId) {
    const preset = GARMENT_PRESETS.find((item) => item.id === presetId) ?? GARMENT_PRESETS[0];
    setGenerator({ preset: preset.id, style: preset.style, garment: '', sizes: preset.sizes });
  }
  function openGenerator(presetId: GarmentPresetId = 'tee') {
    const preset = GARMENT_PRESETS.find((item) => item.id === presetId) ?? GARMENT_PRESETS[0];
    setGenerator({ preset: preset.id, style: preset.style, garment: '', sizes: preset.sizes });
    setGeneratorOpen(true);
  }
  function addGenerated() {
    const added: Variant[] = newCombos.map((combo) => ({ ...combo, sku: '', active: true, inventory_quantity: null, price_cents: draft.base_price_cents, _key: uid() }));
    const style = generator.style.trim();
    const garment = generator.garment.trim();
    const hasMatchingColorway = draft.product_colors.some((color) => (color.style ?? 'Tee') === style && (color.garment ?? '') === garment);
    const starterColorway: Color = { color: '', style, garment, mockup_url: '', sort_order: draft.product_colors.length, active: true, _key: uid() };
    setDraft((current) => ({
      ...current,
      product_variants: [...current.product_variants, ...added].sort(compareVariants),
      product_colors: hasMatchingColorway ? current.product_colors : [...current.product_colors, starterColorway],
    }));
    setNotice({ text: `${style} added. Add its color and mockup below, then save.`, tone: 'info' });
    setGeneratorOpen(false);
  }
  function addColorway() {
    const firstVariant = draft.product_variants[0];
    patch('product_colors', [...draft.product_colors, { color: '', style: firstVariant?.style ?? 'Tee', garment: firstVariant?.garment ?? '', mockup_url: '', sort_order: draft.product_colors.length, active: true, _key: uid() }]);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !dirty) return;
    if (slugTaken) { setNotice({ text: 'Another product already uses that URL slug. Change it before saving.', tone: 'error' }); return; }
    setBusy(true); setNotice({ text: 'Saving…', tone: 'info' });
    try {
      const payload = await request<{ id: string }>('/api/admin/catalog', { method: 'POST', body: JSON.stringify(toPayload(draft)) });
      await loadCatalog(token, payload.id, { text: draft.active ? 'Saved. The shop shows the update on its next page load.' : 'Saved as a draft.', tone: 'success' });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Unable to save product.', tone: 'error' });
      setBusy(false);
    }
  }

  /* ----- render ----- */

  if (!token || !loaded) {
    return (
      <main className="admin-login">
        <form onSubmit={login}>
          <p className="admin-kicker">Bottom’s Line / Internal</p>
          <h1>Product Desk</h1>
          <p>Products in. Shirts out. Secrets stay server-side.</p>
          <label>Admin token<input type="password" autoComplete="current-password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} /></label>
          <button disabled={busy}>{busy ? 'Checking…' : 'Open catalog'}</button>
          <output role="status">{notice.text}</output>
        </form>
      </main>
    );
  }

  const statusText = notice.tone === 'error' || busy ? notice.text : dirty ? 'Unsaved changes' : notice.text || (draft.updated_at ? `Last saved ${formatDate(draft.updated_at)}` : '');
  const pricesDiffer = draft.product_variants.some((v) => v.price_cents !== draft.base_price_cents);
  const productGarments = rankByFrequency(draft.product_variants.map((v) => v.garment));
  const productStyles = rankByFrequency(draft.product_variants.map((v) => v.style));
  const hasDetails = Boolean(draft.material || draft.fit_notes || draft.care_instructions || draft.shipping_note || draft.size_guide_url);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="admin-kicker">Bottom’s Line / Internal</p><h1>Product Desk</h1></div>
        <div><a href="/admin/designs">Design adjuster</a><a href="/admin/orders">Orders desk</a><a href="/shop" target="_blank" rel="noreferrer">View shop ↗</a><button type="button" onClick={refresh} disabled={busy}>Refresh</button></div>
      </header>

      {/* Shared suggestion lists for free-text fields */}
      <datalist id="dl-styles">{suggestions.styles.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-garments">{suggestions.garments.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-sizes">{suggestions.sizes.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-colors">{suggestions.colors.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-product-styles">{(productStyles.length ? productStyles : suggestions.styles).map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-product-garments">{(productGarments.length ? productGarments : suggestions.garments).map((v) => <option key={v} value={v} />)}</datalist>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__tools">
            <input type="search" placeholder="Find a product" value={query} onChange={(event) => setQuery(event.target.value)} />
            <button type="button" onClick={newProduct}>+ New</button>
          </div>
          <div className="admin-filter" role="tablist" aria-label="Filter products">
            {(['all', 'live', 'draft'] as Filter[]).map((f) => (
              <button type="button" role="tab" key={f} aria-selected={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'live' ? 'Live' : 'Drafts'} <span>{counts[f]}</span>
              </button>
            ))}
          </div>
          <nav>
            {visibleProducts.length === 0 && <p className="admin-empty">No products match.</p>}
            {visibleProducts.map((product) => {
              const productChecks = readinessChecks(product);
              const ready = productChecks.filter((c) => c.ok).length;
              const isSelected = selectedId === product.id;
              return (
                <button type="button" key={product.id} className={`admin-product-item${isSelected ? ' is-active' : ''}`} onClick={() => pickProduct(product)}>
                  {product.catalog_image ? <img src={product.catalog_image} alt="" loading="lazy" /> : <span className="admin-thumb-empty" aria-hidden="true" />}
                  <span className="admin-product-item__text">
                    <span>{product.name}{isSelected && dirty ? ' •' : ''}</span>
                    <small>
                      <span className={`admin-badge ${product.active ? 'is-live' : 'is-draft'}`}>{product.active ? 'Live' : 'Draft'}</span>
                      {!product.active && <span className="admin-ready-count">{ready === productChecks.length ? 'Ready to publish' : `${ready}/${productChecks.length} ready`}</span>}
                    </small>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <form ref={formRef} className="admin-editor" onSubmit={save}>
          <div className="admin-editor__top">
            <div>
              <p>{draft.id ? 'Edit product' : 'New product'} <span className={`admin-badge ${draft.active ? 'is-live' : 'is-draft'}`}>{draft.active ? 'Live' : 'Draft'}</span></p>
              <h2>{draft.name || 'Untitled shirt'}</h2>
            </div>
            <div className="admin-editor__actions">
              {draft.id && draft.active && draft.slug && <a href={productPath(draft.slug)} target="_blank" rel="noreferrer">View product ↗</a>}
              {draft.id && <button type="button" onClick={duplicateProduct}>Duplicate</button>}
            </div>
          </div>

          {/* Visibility + publish checklist */}
          <section className="admin-section admin-publish">
            <div className="admin-section__heading">
              <div>
                <h3>Visibility</h3>
                <p className="admin-section__help">{draft.active ? 'Customers can see and buy this shirt.' : 'Only you can see this. Switch to Live and save when it is ready.'}</p>
              </div>
              <div className="admin-segmented" role="radiogroup" aria-label="Visibility">
                <button type="button" role="radio" aria-checked={!draft.active} className={!draft.active ? 'is-on' : ''} onClick={() => patch('active', false)}>Draft</button>
                <button type="button" role="radio" aria-checked={draft.active} className={draft.active ? 'is-on' : ''} onClick={() => patch('active', true)}>Live</button>
              </div>
            </div>
            {missing.length > 0 ? (
              <div className={`admin-checklist${draft.active ? ' is-warning' : ''}`}>
                <p>{draft.active ? 'This is set to Live but is missing:' : `Ready to publish: ${checks.length - missing.length} of ${checks.length}`}</p>
                <ul>{checks.map((check) => <li key={check.label} className={check.ok ? 'is-ok' : ''}>{check.ok ? '✓' : '○'} {check.label}</li>)}</ul>
              </div>
            ) : !draft.active && <p className="admin-ready">{'✓ Everything is in place. Switch to Live and save to publish.'}</p>}
            <div className="admin-checks">
              <label><input type="checkbox" checked={draft.featured} onChange={(event) => patch('featured', event.target.checked)} /> Featured</label>
              <label><input type="checkbox" checked={draft.new_drop} onChange={(event) => patch('new_drop', event.target.checked)} /> New drop</label>
            </div>
          </section>

          <section className="admin-section">
            <h3>Basics</h3>
            <div className="admin-fields admin-fields--two">
              <label>Name<input required value={draft.name} onChange={(event) => { const name = event.target.value; patch('name', name); if (!draft.id) patch('slug', slugify(name)); }} /></label>
              <label>
                URL slug
                <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(event) => patch('slug', slugify(event.target.value))} aria-invalid={slugTaken} />
                <small className={slugTaken ? 'admin-field-error' : 'admin-field-hint'}>
                  {slugTaken ? 'Another product already uses this.' : draft.id ? 'Changing this breaks old links to this shirt.' : 'Fills in from the name.'}
                </small>
              </label>
              <label>Editorial descriptor<input value={draft.editorial_descriptor ?? ''} onChange={(event) => patch('editorial_descriptor', event.target.value)} /></label>
              <label>
                Price
                <MoneyInput required cents={draft.base_price_cents} onCentsChange={setBasePrice} />
                <small className="admin-field-hint">Sizes priced the same follow this automatically.</small>
              </label>
              <label className="admin-field--wide">Description<textarea rows={3} value={draft.description ?? ''} onChange={(event) => patch('description', event.target.value)} /></label>
              <label className="admin-field--wide">Image annotation<input value={draft.product_annotation ?? ''} onChange={(event) => patch('product_annotation', event.target.value)} placeholder="A public service, more or less." /></label>
            </div>
          </section>

          <section className="admin-section">
            <h3>Catalog image</h3>
            <div className="admin-image-field">
              <label>Cloudinary image URL<input type="url" value={draft.catalog_image ?? ''} onChange={(event) => patch('catalog_image', event.target.value)} placeholder="https://res.cloudinary.com/…" /></label>
              {draft.catalog_image ? <img src={draft.catalog_image} alt="Catalog preview" /> : <div className="admin-image-empty">No image yet</div>}
            </div>
          </section>

          <section className="admin-section">
            <h3>Collections</h3>
            <div className="admin-checks admin-checks--wrap">
              {collections.map((collection) => (
                <label key={collection.id}>
                  <input type="checkbox" checked={(draft.collection_ids ?? []).includes(collection.id)} onChange={(event) => patch('collection_ids', event.target.checked ? [...(draft.collection_ids ?? []), collection.id] : (draft.collection_ids ?? []).filter((id) => id !== collection.id))} /> {collection.name}
                </label>
              ))}
            </div>
          </section>

          {/* Sizes / variants */}
          <section className="admin-section">
            <div className="admin-section__heading">
              <div>
                <h3>Garment options, sizes, and stock</h3>
                <p className="admin-section__help">Add each format this design comes on, such as a tee, tank, sweatshirt, or hat. Price and stock here are exactly what checkout charges and tracks. Leave stock blank if you don’t track it.</p>
              </div>
              <div className="admin-section__actions">
                <button type="button" onClick={() => openGenerator()}>+ Add garment option</button>
                <button type="button" onClick={() => patch('product_variants', [...draft.product_variants, { style: productStyles[0] ?? 'Tee', garment: productGarments[0] ?? '', size: '', sku: '', active: true, inventory_quantity: null, price_cents: draft.base_price_cents, _key: uid() }])}>+ Add single size</button>
              </div>
            </div>

            {generatorOpen && (
              <div className="admin-generator">
                <div className="admin-generator__intro">
                  <div><p className="admin-preset-label">What are you adding?</p><p className="admin-section__help">Choose a starting point. You can adjust the label, blank, and sizes before adding it.</p></div>
                  <button type="button" className="admin-icon-button" aria-label="Close garment option builder" onClick={() => setGeneratorOpen(false)}>✕</button>
                </div>
                <div className="admin-garment-presets">
                  {GARMENT_PRESETS.map((preset) => <button type="button" key={preset.id} className={generator.preset === preset.id ? 'is-selected' : ''} aria-pressed={generator.preset === preset.id} onClick={() => selectGarmentPreset(preset.id)}><strong>{preset.label}</strong><span>{preset.detail}</span></button>)}
                </div>
                <div className="admin-fields admin-fields--three">
                  <label>Customer-facing style<input list="dl-styles" value={generator.style} onChange={(event) => setGenerator({ ...generator, preset: 'custom', style: event.target.value })} placeholder="Tank" /><small className="admin-field-hint">Customers choose this on the product page.</small></label>
                  <label>Blank / model <span className="admin-optional">optional</span><input list="dl-garments" value={generator.garment} onChange={(event) => setGenerator({ ...generator, garment: event.target.value })} placeholder="e.g. Tultex 202" /><small className="admin-field-hint">For your internal garment reference.</small></label>
                  <label>Available sizes<input value={generator.sizes} onChange={(event) => setGenerator({ ...generator, sizes: event.target.value })} /><small className="admin-field-hint">Separate sizes with commas.</small></label>
                </div>
                <p className="admin-section__help">This adds {newCombos.length || 'no new'} sellable {newCombos.length === 1 ? 'option' : 'options'} at {`$${dollars(draft.base_price_cents)}`} and starts a matching colorway for its image.</p>
                <div className="admin-section__actions">
                  <button type="button" className="admin-save" disabled={!newCombos.length} onClick={addGenerated}>{newCombos.length ? `Add ${generator.style || 'garment'} · ${newCombos.length} ${newCombos.length === 1 ? 'size' : 'sizes'}` : 'Nothing new to add'}</button>
                  <button type="button" onClick={() => setGeneratorOpen(false)}>Cancel</button>
                </div>
              </div>
            )}

            {draft.product_variants.length === 0 ? (
              <p className="admin-empty">No garment options yet. Use <strong>Add garment option</strong> to start with a T-shirt, tank, sweatshirt, hat, or custom size run.</p>
            ) : (
              <>
                <div className="admin-bulk">
                  <button type="button" onClick={() => patchAllVariants({ active: true })}>Mark all sellable</button>
                  <button type="button" onClick={() => patchAllVariants({ active: false })}>Mark none sellable</button>
                  {pricesDiffer && <button type="button" onClick={() => patchAllVariants({ price_cents: draft.base_price_cents })}>Set all to {`$${dollars(draft.base_price_cents)}`}</button>}
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Product type</th><th>Blank / model</th><th>Size</th><th>SKU</th><th>Price</th><th>Stock</th><th>Sellable</th><th><span className="sr-only">Remove</span></th></tr></thead>
                    <tbody>
                      {draft.product_variants.map((variant, index) => {
                        const rowLabel = `${variant.style} ${variant.garment ?? ''} ${variant.size}`.trim();
                        return (
                          <tr key={variant._key} className={variant.active ? '' : 'is-muted'}>
                            <td><input aria-label={`Product type, ${rowLabel}`} list="dl-styles" value={variant.style} onChange={(event) => patchVariant(index, { style: event.target.value })} /></td>
                            <td><input aria-label={`Blank or model, ${rowLabel}`} list="dl-garments" value={variant.garment ?? ''} onChange={(event) => patchVariant(index, { garment: event.target.value })} /></td>
                            <td><input aria-label={`Size, ${rowLabel}`} list="dl-sizes" value={variant.size} onChange={(event) => patchVariant(index, { size: event.target.value })} className="admin-input--short" /></td>
                            <td><input aria-label={`SKU, ${rowLabel}`} value={variant.sku} placeholder={draft.slug ? skuFor(draft.slug, variant) : 'Auto'} onChange={(event) => patchVariant(index, { sku: event.target.value })} /></td>
                            <td><MoneyInput aria-label={`Price, ${rowLabel}`} cents={variant.price_cents} onCentsChange={(cents) => patchVariant(index, { price_cents: cents })} className={variant.price_cents !== draft.base_price_cents ? 'is-custom' : ''} /></td>
                            <td><input aria-label={`Stock, ${rowLabel}`} type="number" min="0" placeholder="Not tracked" value={variant.inventory_quantity ?? ''} onChange={(event) => patchVariant(index, { inventory_quantity: event.target.value === '' ? null : Number(event.target.value) })} className="admin-input--short" /></td>
                            <td className="admin-table__center"><input aria-label={`Sellable, ${rowLabel}`} type="checkbox" checked={variant.active} onChange={(event) => patchVariant(index, { active: event.target.checked })} /></td>
                            <td>{!variant.id && <button type="button" className="admin-icon-button" aria-label={`Remove ${rowLabel}`} onClick={() => removeVariant(index)}>✕</button>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="admin-section__help">Saved sizes can’t be deleted here. Uncheck Sellable to hide one from the shop.</p>
              </>
            )}
          </section>

          {/* Colorways */}
          <section className="admin-section">
            <div className="admin-section__heading">
              <div>
                <h3>Colorways and images</h3>
                <p className="admin-section__help">The first visible colorway shows first on the shop. Use the arrows to reorder.</p>
              </div>
              <button type="button" onClick={addColorway}>+ Add colorway</button>
            </div>
            {draft.product_colors.length === 0 ? (
              <p className="admin-empty">No colorways yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Preview</th><th>Color</th><th>Style</th><th>Garment</th><th>Cloudinary mockup URL</th><th>Visible</th><th>Order</th><th><span className="sr-only">Remove</span></th></tr></thead>
                  <tbody>
                    {draft.product_colors.map((color, index) => {
                      const rowLabel = color.color || `colorway ${index + 1}`;
                      return (
                        <tr key={color._key} className={color.active ? '' : 'is-muted'}>
                          <td>{color.mockup_url ? <img className="admin-table__thumb" src={color.mockup_url} alt={`${rowLabel} preview`} /> : <span className="admin-thumb-empty" aria-hidden="true" />}</td>
                          <td><input aria-label={`Color, ${rowLabel}`} list="dl-colors" value={color.color} onChange={(event) => patchColor(index, { color: event.target.value })} /></td>
                          <td><input aria-label={`Style, ${rowLabel}`} list="dl-product-styles" value={color.style ?? ''} onChange={(event) => patchColor(index, { style: event.target.value })} /></td>
                          <td><input aria-label={`Garment, ${rowLabel}`} list="dl-product-garments" value={color.garment ?? ''} onChange={(event) => patchColor(index, { garment: event.target.value })} /></td>
                          <td className="admin-table__wide"><input aria-label={`Mockup URL, ${rowLabel}`} type="url" value={color.mockup_url ?? ''} placeholder="https://res.cloudinary.com/…" onChange={(event) => patchColor(index, { mockup_url: event.target.value })} /></td>
                          <td className="admin-table__center"><input aria-label={`Visible, ${rowLabel}`} type="checkbox" checked={color.active} onChange={(event) => patchColor(index, { active: event.target.checked })} /></td>
                          <td className="admin-table__nowrap">
                            <button type="button" className="admin-icon-button" aria-label={`Move ${rowLabel} up`} disabled={index === 0} onClick={() => moveColor(index, -1)}>↑</button>
                            <button type="button" className="admin-icon-button" aria-label={`Move ${rowLabel} down`} disabled={index === draft.product_colors.length - 1} onClick={() => moveColor(index, 1)}>↓</button>
                          </td>
                          <td>{!color.id && <button type="button" className="admin-icon-button" aria-label={`Remove ${rowLabel}`} onClick={() => removeColor(index)}>✕</button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <details className="admin-section admin-details" open={hasDetails}>
            <summary><h3>Product details</h3><span className="admin-section__help">Optional. Empty fields stay off the public page.</span></summary>
            <div className="admin-fields admin-fields--two">
              <label>Material<input value={draft.material ?? ''} onChange={(event) => patch('material', event.target.value)} /></label>
              <label>Fit<input value={draft.fit_notes ?? ''} onChange={(event) => patch('fit_notes', event.target.value)} /></label>
              <label>Care<input value={draft.care_instructions ?? ''} onChange={(event) => patch('care_instructions', event.target.value)} /></label>
              <label>Shipping note<input value={draft.shipping_note ?? ''} onChange={(event) => patch('shipping_note', event.target.value)} /></label>
              <label className="admin-field--wide">Size guide URL<input type="url" value={draft.size_guide_url ?? ''} onChange={(event) => patch('size_guide_url', event.target.value)} placeholder="https://…" /></label>
            </div>
          </details>

          {/* Sticky save bar */}
          <div className={`admin-savebar${dirty ? ' is-dirty' : ''}`}>
            <output role="status" className={`admin-savebar__status is-${dirty && notice.tone !== 'error' && !busy ? 'dirty' : notice.tone}`}>{statusText}</output>
            <div className="admin-savebar__actions">
              {dirty && <button type="button" onClick={discard} disabled={busy}>Discard</button>}
              <button className="admin-save" disabled={busy || !dirty} title="Save (⌘S)">{busy ? 'Working…' : 'Save'}</button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
