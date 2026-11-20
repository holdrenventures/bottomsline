import { collectionFromParam, collectionSlug } from './collections.ts';

const APEX_HOST = 'bottomslineclothing.com';

export type CanonicalHostInput = {
  hostname: string;
  protocol: string;
  pathname: string;
  search?: string;
};

// Returns the https apex URL when the request used http or the www host.
// Other hosts (localhost, workers.dev previews) are left untouched.
export function canonicalRedirectTarget(input: CanonicalHostInput): string | null {
  const hostname = input.hostname.trim().toLowerCase().replace(/:\d+$/, '');
  const protocol = input.protocol.trim().toLowerCase().replace(/:$/, '');
  const onApex = hostname === APEX_HOST;
  const onWww = hostname === `www.${APEX_HOST}`;
  if (!onApex && !onWww) return null;
  if (onApex && protocol === 'https') return null;

  let pathname = input.pathname || '/';
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  if (pathname !== '/') pathname = pathname.replace(/\/+$/, '') || '/';
  const search = input.search && input.search !== '?' ? (input.search.startsWith('?') ? input.search : `?${input.search}`) : '';
  return `https://${APEX_HOST}${pathname}${search}`;
}

// Trailing-slash and ?collection= cleanup. Returns null when the path is already canonical.
// Callers choose the host. Public http/www redirects stay in canonicalRedirectTarget.
export function storefrontPathRedirect(pathname: string, search: string): { pathname: string; search: string } | null {
  let path = pathname || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  let changed = false;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.replace(/\/+$/, '') || '/';
    changed = true;
  }
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (path === '/shop' && params.has('collection')) {
    const match = collectionFromParam(params.get('collection'));
    params.delete('collection');
    if (match !== 'All') path = `/shop/${collectionSlug(match)}`;
    changed = true;
  }
  if (!changed) return null;
  const nextSearch = params.toString();
  return { pathname: path, search: nextSearch ? `?${nextSearch}` : '' };
}
