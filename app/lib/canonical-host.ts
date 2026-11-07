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
