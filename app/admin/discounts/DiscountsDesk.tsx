'use client';

import { useEffect, useState, type FormEvent } from 'react';
import AdminNav from '../AdminNav';

type Discount = {
  id: string;
  code: string;
  name: string;
  kind: 'percent' | 'fixed';
  value: number;
  active: boolean;
  combinable: boolean;
  used_count: number;
  created_at: string;
  updated_at: string;
};
type Draft = Omit<Discount, 'used_count' | 'created_at' | 'updated_at' | 'value'> & { value: string };

const tokenKey = 'bl-admin-token';
const emptyDraft = (): Draft => ({ id: '', code: '', name: '', kind: 'percent', value: '10', active: false, combinable: false });
const toDraft = (discount: Discount): Draft => ({
  id: discount.id, code: discount.code, name: discount.name, kind: discount.kind,
  value: discount.kind === 'fixed' ? (discount.value / 100).toFixed(2) : String(discount.value),
  active: discount.active, combinable: discount.combinable,
});

export default function DiscountsDesk() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [savedDraft, setSavedDraft] = useState<Draft>(emptyDraft);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Enter the admin token to manage discounts.');
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  async function request<T>(method: 'GET' | 'POST' | 'PATCH', body?: unknown, accessToken = token): Promise<T> {
    const response = await fetch('/api/admin/discounts', {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'Discount request failed.');
    return payload;
  }

  async function load(accessToken = token, preferredId?: string) {
    setBusy(true); setStatus('Loading discounts…');
    try {
      const payload = await request<{ discounts: Discount[] }>('GET', undefined, accessToken);
      setDiscounts(payload.discounts); setLoaded(true);
      const selected = payload.discounts.find((item) => item.id === preferredId);
      if (selected) { const next = toDraft(selected); setDraft(next); setSavedDraft(next); }
      setStatus(payload.discounts.length ? `${payload.discounts.length} codes ready.` : 'No codes yet. Create your first one.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load discounts.';
      setStatus(message);
      if (message.includes('token')) { sessionStorage.removeItem(tokenKey); setToken(''); setLoaded(false); }
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem(tokenKey);
    if (!stored) return;
    const timer = window.setTimeout(() => { setToken(stored); setTokenInput(stored); void load(stored); }, 0);
    return () => window.clearTimeout(timer);
    // Restore once per browser session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function login(event: FormEvent) {
    event.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) return;
    sessionStorage.setItem(tokenKey, clean); setToken(clean); void load(clean);
  }

  const confirmDiscard = () => !dirty || window.confirm('Discard unsaved discount changes?');
  function pick(discount: Discount) {
    if (discount.id !== draft.id) {
      if (!confirmDiscard()) return;
      const next = toDraft(discount); setDraft(next); setSavedDraft(next);
    }
    setMobileView('detail'); setStatus('');
  }
  function startNew() {
    if (!confirmDiscard()) return;
    const next = emptyDraft(); setDraft(next); setSavedDraft(next); setMobileView('detail'); setStatus('New codes start off until you turn them on.');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const value = draft.kind === 'fixed' ? Math.round(Number(draft.value) * 100) : Number(draft.value);
    setBusy(true); setStatus('Saving discount…');
    try {
      const payload = await request<{ discount: Discount }>(draft.id ? 'PATCH' : 'POST', {
        ...(draft.id ? { id: draft.id } : { code: draft.code.trim().toUpperCase() }),
        name: draft.name, kind: draft.kind, value,
        active: draft.active, combinable: draft.combinable,
      });
      await load(token, payload.discount.id);
      setStatus(`${payload.discount.code} saved.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to save discount.'); }
    finally { setBusy(false); }
  }

  async function toggle(discount: Discount) {
    if (!confirmDiscard()) return;
    if (dirty) setDraft(savedDraft);
    setBusy(true); setStatus(`${discount.active ? 'Turning off' : 'Turning on'} ${discount.code}…`);
    try {
      await request('PATCH', { id: discount.id, name: discount.name, kind: discount.kind, value: discount.value, active: !discount.active, combinable: discount.combinable });
      await load(token, draft.id || undefined);
      setStatus(`${discount.code} is now ${discount.active ? 'off' : 'on'}.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to change discount.'); }
    finally { setBusy(false); }
  }

  if (!token || !loaded) return <main className="admin-login"><form onSubmit={login}><p className="admin-kicker">Bottom’s Line / Internal</p><h1>Discounts</h1><p>Create codes and keep track of paid uses.</p><label>Admin token<input type="password" autoComplete="current-password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} /></label><button disabled={busy}>{busy ? 'Checking…' : 'Open discounts'}</button><output role="status">{status}</output></form></main>;

  const selected = discounts.find((item) => item.id === draft.id);
  return <main className={`admin-shell admin-mobile-${mobileView}`}>
    <header className="admin-header"><div><p className="admin-kicker">Bottom’s Line / Internal</p><h1>Discounts</h1></div><div><AdminNav current="discounts" /><button type="button" onClick={() => { if (confirmDiscard()) void load(token, draft.id); }} disabled={busy}>Refresh</button></div></header>
    <div className="admin-layout">
      <aside className="admin-sidebar discounts-sidebar">
        <div className="admin-sidebar__tools"><button type="button" onClick={startNew}>+ New code</button></div>
        <p className="admin-empty">Usage counts paid orders since this tool launched. Older WOAKS10 and ENB15 uses were not recorded by the previous checkout.</p>
        <nav>{discounts.map((discount) => <div className="discount-list-item" key={discount.id}><button type="button" className={discount.id === draft.id ? 'is-active' : ''} onClick={() => pick(discount)}><span>{discount.code}</span><small>{discount.name}</small><small>{discount.used_count} paid {discount.used_count === 1 ? 'use' : 'uses'} · {discount.combinable ? 'Combines' : 'Solo only'}</small></button><button type="button" className={`discount-toggle ${discount.active ? 'is-on' : ''}`} disabled={busy} onClick={() => void toggle(discount)} aria-label={`${discount.active ? 'Turn off' : 'Turn on'} ${discount.code}`}>{discount.active ? 'On' : 'Off'}</button></div>)}</nav>
        {!discounts.length && <p className="admin-empty">No discount codes yet.</p>}
      </aside>

      <form className="admin-editor discounts-editor" onSubmit={save}>
        <button type="button" className="admin-mobile-back" onClick={() => setMobileView('list')}>All discounts</button>
        <div className="admin-editor__top"><div><p>{draft.id ? 'Edit code' : 'Create code'}</p><h2>{draft.code || 'New discount'}</h2></div><button className="admin-save" disabled={busy || !dirty && !!draft.id}>{busy ? 'Working…' : 'Save discount'}</button></div>
        <output className="admin-status" role="status">{status}</output>
        {selected && <section className="admin-section discount-stats"><div><strong>{selected.used_count}</strong><span>paid {selected.used_count === 1 ? 'use' : 'uses'} tracked</span></div><p>Counts start when this tool launched. Turning a code off keeps its history.</p></section>}
        <section className="admin-section"><h3>Code and value</h3><div className="admin-fields admin-fields--two">
          <label>Coupon code<input required minLength={4} maxLength={32} pattern="[A-Za-z0-9]+(-[A-Za-z0-9]+)*" autoCapitalize="characters" autoComplete="off" spellCheck={false} value={draft.code} disabled={!!draft.id} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} placeholder="YOUR-CODE" /><small className="admin-field-hint">The code cannot change after creation, so usage stays attached to it.</small></label>
          <label>Label shown in bag<input required minLength={2} maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Holiday thank-you · 15% off" /></label>
          <label>Discount type<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as Draft['kind'], value: event.target.value === 'fixed' ? '5.00' : '10' })}><option value="percent">Percentage off</option><option value="fixed">Dollar amount off</option></select></label>
          <label>{draft.kind === 'percent' ? 'Percentage' : 'Amount ($)'}<input required type="number" inputMode="decimal" min={draft.kind === 'percent' ? 1 : 0.01} max={draft.kind === 'percent' ? 100 : 1000} step={draft.kind === 'percent' ? 1 : 0.01} value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} /></label>
        </div></section>
        <section className="admin-section"><h3>Availability</h3><div className="discount-options">
          <label><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /><span><strong>Code is on</strong><small>Customers can enter it at checkout. Turn it off without losing usage history.</small></span></label>
          <label><input type="checkbox" checked={draft.combinable} onChange={(event) => setDraft({ ...draft, combinable: event.target.checked })} /><span><strong>Allow combining</strong><small>Works with other combinable codes and the automatic 3-tee deal. Otherwise checkout uses whichever option saves the customer more.</small></span></label>
        </div></section>
        <div className="admin-savebar"><p className="admin-savebar__status">{dirty ? 'Unsaved changes' : draft.id ? 'Saved' : 'Ready to create'}</p><button className="admin-save" disabled={busy || !dirty && !!draft.id}>{busy ? 'Working…' : draft.id ? 'Save changes' : 'Create code'}</button></div>
      </form>
    </div>
  </main>;
}
