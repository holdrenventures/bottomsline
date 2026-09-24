'use client';

import { useEffect, useMemo, useState } from 'react';

type FulfillmentStatus = 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type Address = { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null };
type OrderItem = { id: string; product_name: string; style: string; color: string | null; garment: string | null; size: string; sku: string; quantity: number; unit_price_cents: number };
type Order = {
  id: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  shipping_address: Address | null;
  payment_status: string;
  fulfillment_status: FulfillmentStatus;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
};

const tokenKey = 'bl-admin-token';
const statuses: FulfillmentStatus[] = ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'];

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function addressLines(address: Address | null) {
  if (!address) return ['No shipping address captured.'];
  return [address.line1, address.line2, [address.city, address.state, address.postal_code].filter(Boolean).join(', '), address.country].filter(Boolean) as string[];
}

export default function OrdersDesk() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState<'all' | FulfillmentStatus>('all');
  const [status, setStatus] = useState('Enter the admin token to load orders.');
  const [busy, setBusy] = useState(false);
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0] ?? null;
  const visibleOrders = useMemo(
    () => filter === 'all' ? orders : orders.filter((order) => order.fulfillment_status === filter),
    [filter, orders],
  );

  async function request<T>(input: RequestInfo, init: RequestInit = {}, accessToken = token): Promise<T> {
    const response = await fetch(input, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) } });
    const payload = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'Request failed.');
    return payload;
  }

  async function loadOrders(accessToken = token, preferredId?: string) {
    setBusy(true); setStatus('Loading orders…');
    try {
      const payload = await request<{ orders: Order[] }>('/api/admin/orders', {}, accessToken);
      setOrders(payload.orders);
      setSelectedId(preferredId ?? selectedId ?? payload.orders[0]?.id ?? '');
      setStatus(payload.orders.length ? `${payload.orders.length} orders loaded.` : 'No orders yet.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to load orders.');
      sessionStorage.removeItem(tokenKey); setToken('');
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(tokenKey);
    if (!saved) return;
    const timer = window.setTimeout(() => { setToken(saved); setTokenInput(saved); void loadOrders(saved); }, 0);
    return () => window.clearTimeout(timer);
    // The token is intentionally restored only once per tab session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(event: React.FormEvent) {
    event.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) return;
    sessionStorage.setItem(tokenKey, clean); setToken(clean); void loadOrders(clean);
  }

  function patchSelected(value: Partial<Order>) {
    if (!selected) return;
    setOrders((current) => current.map((order) => order.id === selected.id ? { ...order, ...value } : order));
  }

  async function save() {
    if (!selected) return;
    setBusy(true); setStatus('Updating fulfillment…');
    try {
      await request('/api/admin/orders', {
        method: 'PATCH',
        body: JSON.stringify({
          id: selected.id,
          fulfillment_status: selected.fulfillment_status,
          carrier: selected.carrier,
          tracking_number: selected.tracking_number,
          tracking_url: selected.tracking_url,
        }),
      });
      await loadOrders(token, selected.id);
      setStatus('Fulfillment updated.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to update fulfillment.'); }
    finally { setBusy(false); }
  }

  if (!token) {
    return <main className="admin-login"><form onSubmit={login}><p className="admin-kicker">Bottom’s Line / Internal</p><h1>Orders Desk</h1><p>Paid, packed, and eventually out the door.</p><label>Admin token<input type="password" autoComplete="current-password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} /></label><button disabled={busy}>{busy ? 'Checking…' : 'Open orders'}</button><output role="status">{status}</output></form></main>;
  }

  return (
    <main className="admin-shell">
      <header className="admin-header"><div><p className="admin-kicker">Bottom’s Line / Internal</p><h1>Orders Desk</h1></div><div><a href="/admin">Product desk</a><a href="/shop" target="_blank">View shop ↗</a><button type="button" onClick={() => loadOrders()}>Refresh</button></div></header>
      <div className="admin-layout">
        <aside className="admin-sidebar orders-sidebar">
          <div className="admin-sidebar__tools"><select aria-label="Filter orders" value={filter} onChange={(event) => setFilter(event.target.value as 'all' | FulfillmentStatus)}><option value="all">All orders</option>{statuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
          <nav>{visibleOrders.map((order) => <button type="button" key={order.id} className={selected?.id === order.id ? 'is-active' : ''} onClick={() => setSelectedId(order.id)}><span>{order.customer_name || order.customer_email || 'Customer'}</span><small>{dateTime(order.created_at)} · {money(order.total_cents, order.currency)}</small><small className={`order-status order-status--${order.fulfillment_status}`}>{order.fulfillment_status}</small></button>)}</nav>
        </aside>

        <section className="admin-editor orders-editor">
          <div className="admin-editor__top"><div><p>{selected ? `Order ${selected.id.slice(0, 8)}` : 'Orders'}</p><h2>{selected ? money(selected.total_cents, selected.currency) : 'Nothing here yet.'}</h2></div>{selected && <button type="button" className="admin-save" disabled={busy} onClick={save}>{busy ? 'Working…' : 'Save fulfillment'}</button>}</div>
          <output className="admin-status" role="status">{status}</output>

          {selected && <>
            <section className="admin-section order-summary"><div><p className="admin-kicker">Customer</p><h3>{selected.customer_name || 'Name not supplied'}</h3><p>{selected.customer_email || 'Email not supplied'}</p>{addressLines(selected.shipping_address).map((line) => <p key={line}>{line}</p>)}</div><div><p className="admin-kicker">Payment</p><h3>{selected.payment_status}</h3><dl><div><dt>Subtotal</dt><dd>{money(selected.subtotal_cents, selected.currency)}</dd></div><div><dt>Shipping</dt><dd>{money(selected.shipping_cents, selected.currency)}</dd></div><div><dt>Tax</dt><dd>{money(selected.tax_cents, selected.currency)}</dd></div><div><dt>Discount</dt><dd>−{money(selected.discount_cents, selected.currency)}</dd></div><div><dt>Total</dt><dd>{money(selected.total_cents, selected.currency)}</dd></div></dl></div></section>

            <section className="admin-section"><h3>Items</h3><div className="order-items">{selected.order_items.map((item) => <article key={item.id}><div><strong>{item.quantity} × {item.product_name}</strong><p>{[item.style, item.color, item.size].filter(Boolean).join(' / ')}</p><small>{item.sku}</small></div><b>{money(item.unit_price_cents * item.quantity, selected.currency)}</b></article>)}</div></section>

            <section className="admin-section"><h3>Fulfillment</h3><div className="admin-fields admin-fields--two"><label>Status<select value={selected.fulfillment_status} onChange={(event) => patchSelected({ fulfillment_status: event.target.value as FulfillmentStatus })}>{statuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label>Carrier<input value={selected.carrier ?? ''} onChange={(event) => patchSelected({ carrier: event.target.value })} placeholder="USPS, UPS, FedEx…" /></label><label>Tracking number<input value={selected.tracking_number ?? ''} onChange={(event) => patchSelected({ tracking_number: event.target.value })} /></label><label>Tracking URL<input type="url" value={selected.tracking_url ?? ''} onChange={(event) => patchSelected({ tracking_url: event.target.value })} placeholder="https://…" /></label></div>{selected.tracking_url && <p className="order-tracking-link"><a href={selected.tracking_url} target="_blank" rel="noreferrer">Open tracking ↗</a></p>}</section>

            <section className="admin-section order-technical"><h3>Payment references</h3><p>Checkout: {selected.stripe_checkout_session_id}</p><p>Payment: {selected.stripe_payment_intent_id || 'Not returned'}</p><p>Placed: {dateTime(selected.created_at)}</p>{selected.fulfilled_at && <p>First fulfilled: {dateTime(selected.fulfilled_at)}</p>}</section>
          </>}
        </section>
      </div>
    </main>
  );
}
