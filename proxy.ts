import { NextResponse, type NextRequest } from 'next/server';
import { canonicalRedirectTarget } from './app/lib/canonical-host';

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

// Canonical host for the public store only. Preview hosts and local dev are unchanged.
export function proxy(request: NextRequest) {
  const hostHeader = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const target = canonicalRedirectTarget({
    hostname: hostHeader.split(',')[0]?.trim() ?? '',
    protocol: requestProtocol(request),
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
  });
  if (!target) return NextResponse.next();
  return NextResponse.redirect(target, 301);
}
