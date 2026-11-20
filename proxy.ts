import { NextResponse, type NextRequest } from 'next/server';
import { canonicalRedirectTarget, storefrontPathRedirect } from './app/lib/canonical-host';

function requestProtocol(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? '';
  const visitor = request.headers.get('cf-visitor');
  if (visitor) {
    try {
      const parsed = JSON.parse(visitor) as { scheme?: string };
      if (parsed.scheme) return parsed.scheme;
    } catch {
      // A malformed cf-visitor header falls through to the request URL.
    }
  }
  return request.nextUrl.protocol;
}

function isDocument(request: NextRequest) {
  if (request.headers.has('rsc') || request.headers.has('next-router-prefetch')) return false;
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/x-component')) return false;
  return request.headers.get('sec-fetch-dest') === 'document' || accept.includes('text/html');
}

// Canonical host for the public store only. Preview hosts and local dev are unchanged.
// Trailing slashes use 301, same as the host redirect, so HTML URLs are not left on Next's 308.
export function proxy(request: NextRequest) {
  const hostHeader = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const hostTarget = canonicalRedirectTarget({
    hostname: hostHeader.split(',')[0]?.trim() ?? '',
    protocol: requestProtocol(request),
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
  });
  const base = hostTarget ? new URL(hostTarget) : request.nextUrl;
  const pathRedirect = storefrontPathRedirect(base.pathname, base.search);
  if (hostTarget || pathRedirect) {
    const dest = hostTarget ? new URL(hostTarget) : request.nextUrl.clone();
    if (pathRedirect) {
      dest.pathname = pathRedirect.pathname;
      dest.search = pathRedirect.search;
    }
    return NextResponse.redirect(dest, 301);
  }

  const response = NextResponse.next();
  const path = request.nextUrl.pathname;
  const privatePath = path.startsWith('/api') || path.startsWith('/admin') || path.startsWith('/bag') || path.startsWith('/checkout');
  // Short browser cache for HTML navigations only. RSC payloads stay uncached.
  // Bag, checkout, admin, and API responses are never shared.
  if (request.method === 'GET' && isDocument(request) && !privatePath) {
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }
  return response;
}
