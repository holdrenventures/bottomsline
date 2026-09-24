'use client';

import { useEffect, useState } from 'react';
import DesignAdjuster from './DesignAdjuster';

type ProductSummary = { id: string; name: string; slug: string; active: boolean };

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
      setProducts((payload.products ?? []).map(({ id, name, slug, active }) => ({ id, name, slug, active })));
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

  async function upload(file: File, slug: string) {
    const body = new FormData(); body.append('file', file); body.append('slug', slug);
    const response = await fetch('/api/admin/designs/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
    const payload = await response.json() as { error?: string; assetSlug?: string };
    if (!response.ok) throw new Error(payload.error || 'Cloudinary upload failed.');
    return payload;
  }

  async function save(payload: unknown) {
    const response = await fetch('/api/admin/designs', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || 'Unable to save the design.');
    return result;
  }

  if (!token || !loaded) return <main className="admin-login"><form onSubmit={login}><p className="admin-kicker">Bottom’s Line / Internal</p><h1>Design Adjuster</h1><p>One PNG. One placement. An unreasonable number of shirts.</p><label>Admin token<input type="password" autoComplete="current-password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} /></label><button disabled={busy}>{busy ? 'Checking…' : 'Open adjuster'}</button><output role="status">{status}</output></form></main>;

  return <main className="admin-shell design-desk-shell">
    <header className="admin-header"><div><p className="admin-kicker">Bottom’s Line / Internal</p><h1>Design Adjuster</h1></div><div><a href="/admin">Product desk</a><a href="/admin/orders">Orders</a><a href="/shop" target="_blank" rel="noreferrer">View shop ↗</a></div></header>
    <section className="design-desk">
      <div className="design-desk__intro"><p className="admin-kicker">Mockup production</p><h2>Place it once.<br /><em>Wear it everywhere.</em></h2><p>Upload transparent artwork, position it on a Tultex 202 tee or Tultex 105 tank, choose the colors, and send the generated mockups to a storefront product.</p></div>
      <DesignAdjuster products={products} onUpload={upload} onSave={save} />
    </section>
  </main>;
}
