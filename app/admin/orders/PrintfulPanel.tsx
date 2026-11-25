'use client';

// Small, server-provided Printful thumbnails are displayed only in the private Orders Desk.
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';

type Item = { id: string; variant_id: string; colorway_id: string | null; product_name: string; style: string; color: string | null; garment: string | null; size: string; sku: string };
type Mapping = { variant_id: string; colorway_id: string; printful_sync_variant_id: number; printful_name: string };
type Product = { id: number; name: string; synced: number; variants: number };
type Variant = { id: number; name: string; synced: boolean; sku?: string | null; product?: { name?: string; image?: string }; files?: Array<{ type?: string; thumbnail_url?: string; status?: string }> };
type Order = { id: string; payment_status: string; fulfillment_status: string; shipping_address: { fulfillment_method?: string | null } | null; printful_draft_id: number | null; printful_draft_state: string; order_items: Item[] };

export default function PrintfulPanel({ order, mappings, token, onChanged }: { order: Order; mappings: Mapping[]; token: string; onChanged: (message: string) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [productId, setProductId] = useState('');
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const mappingFor = (item: Item) => mappings.find((map) => map.variant_id === item.variant_id && map.colorway_id === item.colorway_id);
  const unmatched = order.order_items.filter((item) => !mappingFor(item));

  async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    const body = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(body.error || 'Printful request failed.');
    return body;
  }

  async function run(work: () => Promise<void>) {
    setBusy(true); setMessage('Working with Printful…');
    try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Printful action failed.'); }
    finally { setBusy(false); }
  }

  function findProducts() {
    void run(async () => {
      const result = await api<{ products: Product[] }>(`/api/admin/printful?search=${encodeURIComponent(search)}`);
      setProducts(result.products);
      setVariants([]);
      setProductId('');
      setMessage(result.products.length ? `${result.products.length} Printful products found. Choose one to view its variants.` : 'No synced Printful products found. Set up the design and print file in Printful first.');
    });
  }

  function loadVariants(id: string) {
    setProductId(id);
    setVariants([]);
    if (!id) return;
    void run(async () => {
      const result = await api<{ variants: Variant[] }>(`/api/admin/printful?product_id=${encodeURIComponent(id)}`);
      setVariants(result.variants.filter((variant) => variant.synced));
      setMessage(`${result.variants.filter((variant) => variant.synced).length} configured variants found.`);
    });
  }

  function saveMatch(item: Item) {
    const id = Number(chosen[item.id]);
    if (!id) return;
    void run(async () => {
      await api('/api/admin/printful', { method: 'POST', body: JSON.stringify({ action: 'map', order_item_id: item.id, sync_variant_id: id }) });
      await onChanged('Printful match saved for this item and future orders with the same selection.');
      setMessage('Match saved.');
    });
  }

  function createDraft(action: 'draft' | 'reconcile' | 'reset') {
    if (action === 'reset' && !window.confirm('Only unlock after checking the Printful dashboard and confirming this store order has no draft. Continue?')) return;
    void run(async () => {
      const result = await api<{ printful_draft_id?: number; reset?: boolean }>('/api/admin/printful', { method: 'POST', body: JSON.stringify({ action, order_id: order.id, ...(action === 'reset' ? { confirm_no_draft: true } : {}) }) });
      const nextMessage = result.reset ? 'Order unlocked. Review matches before creating a draft.' : `Printful draft #${result.printful_draft_id} is ready for review.`;
      await onChanged(nextMessage);
      setMessage(nextMessage);
    });
  }

  return <section className="admin-section">
    <h3>Printful draft</h3>
    <p className="admin-section__help">Match each exact design, garment, color, and size to a configured Printful variant. Matches are reused for future orders. Creating a draft does not submit it for fulfillment.</p>
    {order.printful_draft_id ? <p>Printful order #{order.printful_draft_id} was created as a draft. Review its current status in Printful before confirming fulfillment.</p> : <>
      {order.shipping_address?.fulfillment_method === 'pickup' && <p className="admin-section__help">This is a pickup order. Decide where Printful should ship it before creating a draft.</p>}
      <div className="admin-fields admin-fields--two">
        <label>Search Printful products<input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); findProducts(); } }} placeholder="Design or product name" /></label>
        <div><button type="button" disabled={busy} onClick={findProducts}>Find products</button></div>
        {products.length > 0 && <label>Printful product<select value={productId} onChange={(event) => loadVariants(event.target.value)}><option value="">Choose product…</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.synced}/{product.variants} ready)</option>)}</select></label>}
      </div>
      <div className="order-items">{order.order_items.map((item) => {
        const mapping = mappingFor(item);
        const preview = variants.find((variant) => String(variant.id) === chosen[item.id]);
        return <article key={item.id}><div><strong>{item.product_name}</strong><p>{[item.style, item.garment, item.color, item.size].filter(Boolean).join(' / ')}</p><small>{item.sku}</small><p>{mapping ? `Matched: ${mapping.printful_name} · #${mapping.printful_sync_variant_id}` : 'Needs a Printful match'}</p>
          {variants.length > 0 && order.printful_draft_state === 'idle' && <div className="admin-fields admin-fields--two"><label>Printful variant<select value={chosen[item.id] ?? ''} onChange={(event) => setChosen((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">Choose exact blank, color, size…</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}{variant.product?.name ? ` · ${variant.product.name}` : ''}{variant.sku ? ` · ${variant.sku}` : ''}</option>)}</select></label><button type="button" disabled={busy || !chosen[item.id]} onClick={() => saveMatch(item)}>{mapping ? 'Change match' : 'Save match'}</button></div>}
          {preview && <div className="order-printful-preview">{preview.product?.image && <figure><img src={preview.product.image} alt="Printful blank garment" width="88" height="88" /><figcaption>Blank</figcaption></figure>}{preview.files?.filter((file) => file.thumbnail_url).map((file, index) => <figure key={`${file.type ?? 'art'}-${index}`}><img src={file.thumbnail_url} alt={`Printful ${file.type ?? 'design'} artwork`} width="88" height="88" /><figcaption>{file.type ?? 'Design'}{file.status && file.status !== 'ok' ? ` · ${file.status}` : ''}</figcaption></figure>)}</div>}
        </div></article>;
      })}</div>
      <p className="admin-section__help">{unmatched.length ? `${unmatched.length} item${unmatched.length === 1 ? '' : 's'} still need a match.` : 'All items are matched.'}</p>
      {order.printful_draft_state === 'idle' ? <button type="button" className="admin-save" disabled={busy || unmatched.length > 0 || order.shipping_address?.fulfillment_method === 'pickup' || !['paid', 'no_payment_required'].includes(order.payment_status) || order.fulfillment_status === 'cancelled'} onClick={() => createDraft('draft')}>Create Printful draft</button> : <button type="button" disabled={busy} onClick={() => createDraft('reconcile')}>Check Printful for existing draft</button>}
      {order.printful_draft_state === 'needs_review' && <p className="admin-section__help">The last Printful response was uncertain. Check Printful before attempting another draft.</p>}
      {order.printful_draft_state !== 'idle' && <p><button type="button" disabled={busy} onClick={() => createDraft('reset')}>Unlock after checking Printful</button></p>}
    </>}
    <output role="status">{message}</output>
  </section>;
}
