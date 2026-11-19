'use client';

import { useEffect, useState } from 'react';
import DesignAdjuster from './DesignAdjuster';
import { GARMENTS, slugify } from '../../lib/blc-cloudinary';

type ProductSummary = { id: string; name: string; slug: string; active: boolean; product_variants: Array<{ style: string; active: boolean }> };

const tokenKey = 'bl-admin-token';

export default function DesignAdjusterDesk() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Enter the admin token to open the adjuster.');

  async function loadProducts(accessToken: string) {
    setBusy(true); setStatus('Loading products…');
    try {
      const response = await fetch('/api/admin/catalog', { headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json() as { products?: ProductSummary[]; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to load products.');
      setProducts((payload.products ?? []).map(({ id, name, slug, active, product_variants }) => ({ id, name, slug, active, product_variants: product_variants ?? [] })));
      setLoaded(true); setStatus('');
    } catch (error) {
      sessionStorage.removeItem(tokenKey); setLoaded(false);
      setStatus(error instanceof Error ? error.message : 'Unable to open the adjuster.');
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem(tokenKey);
    if (!stored) return;
    const timer = window.setTimeout(() => { setToken(stored); setTokenInput(stored); void loadProducts(stored); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function login(event: React.FormEvent) {
    event.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) return;
    sessionStorage.setItem(tokenKey, clean); setToken(clean); void loadProducts(clean);
  }

  async function createProduct(input: {name:string;garment:string;priceCents:number;sizes:string[]}) {
    const config = GARMENTS[input.garment as keyof typeof GARMENTS];
    if (!config) throw new Error('Choose a garment first.');
    const slug = slugify(input.name);
    if (!slug) throw new Error('Enter a product name with letters or numbers.');
    const response = await fetch('/api/admin/catalog', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: input.name, slug, active: false, base_price_cents: input.priceCents, currency: 'usd',
        product_variants: [...new Set(input.sizes)].map((size) => ({ style: config.style, garment: config.model, size, sku: `${slug}-${config.model}-${size.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, active: true, inventory_quantity: null, price_cents: input.priceCents })),
        product_colors: [], collection_ids: [],
      }),
    });
    const result = await response.json() as {id?:string;error?:string};
    if (!response.ok || !result.id) throw new Error(result.error || 'Unable to create product.');
    setProducts((all) => [{id:result.id!,name:input.name,slug,active:false,product_variants:[{style:config.style,active:true}]}, ...all]);
    return { slug };
  }

  async function upload(file: File, slug: string) {
    const body = new FormData(); body.append('file', file); body.append('slug', slug);
    const response = await fetch('/api/admin/designs/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
    const payload = await response.json() as { error?: string; assetSlug?: string; artworkUrl?: string };
    if (!response.ok || !payload.artworkUrl) throw new Error(payload.error || 'Artwork upload failed.');
    return { artworkUrl: payload.artworkUrl, assetSlug: payload.assetSlug };
  }

  async function save(payload: unknown) {
    const response = await fetch('/api/admin/designs', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string; mockupUrls?: Record<string, string> };
    if (!response.ok) throw new Error(result.error || 'Unable to save the design.');
    return result;
  }

  async function loadSaved(productSlug: string, garment: string) {
    const query = new URLSearchParams({ productSlug, garment });
    const response = await fetch(`/api/admin/designs?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json() as { error?: string; slug?: string; colors?: string[]; placements?: Record<string, { w: number; x: number; y: number; angle: number; brightness: number }>; artworkUrl?: string; artworkUrls?: Record<string,string> };
    if (!response.ok) throw new Error(result.error || 'Unable to load saved mockups.');
    if (!result.slug || !result.colors || !result.placements) throw new Error('Saved mockups are incomplete.');
    return { slug: result.slug, colors: result.colors, placements: result.placements, artworkUrl: result.artworkUrl, artworkUrls: result.artworkUrls };
  }

  if (!token || !loaded) return <main className="admin-login"><form onSubmit={login}><p className="admin-kicker">Bottom’s Line / Internal</p><h1>Design Adjuster</h1><p>Place artwork separately on every shirt color.</p><label>Admin token<input type="password" autoComplete="current-password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} /></label><button disabled={busy}>{busy ? 'Checking…' : 'Open adjuster'}</button><output role="status">{status}</output></form></main>;

  return <main className="admin-shell design-desk-shell">
    <header className="admin-header"><div><p className="admin-kicker">Bottom’s Line / Internal</p><h1>Design Adjuster</h1></div><div><a href="/admin">Product desk</a><a href="/admin/orders">Orders</a><a href="/shop" target="_blank" rel="noreferrer">View shop ↗</a></div></header>
    <section className="design-desk">
      <div className="design-desk__intro"><p className="admin-kicker">Mockup production</p><h2>Make every color<br /><em>fit the shirt.</em></h2><p>Upload transparent artwork or load a saved product. Choose each garment color, then set its position, size, tilt, and brightness independently before saving the mockups.</p></div>
      <DesignAdjuster products={products} onUpload={upload} onSave={save} onLoad={loadSaved} onCreate={createProduct} />
    </section>
  </main>;
}
