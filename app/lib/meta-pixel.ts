'use client';

export const META_PIXEL_ID = '1023195525937892';

type PixelEvent = 'ViewContent' | 'InitiateCheckout' | 'Purchase';
type PixelPayload = Record<string, string | number | string[]>;
type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

export function initMetaPixel() {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return false;
  if (window.fbq) return true;

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else (fbq.queue ??= []).push(args);
  } as Fbq;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  window.fbq = fbq;
  window._fbq = fbq;

  // Keep base Pixel automatic configuration off; Meta's existing event setup
  // still detects the store's Add to bag button separately.
  fbq('set', 'autoConfig', false, META_PIXEL_ID);
  fbq('init', META_PIXEL_ID);
  fbq('track', 'PageView');

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  return true;
}

export function trackMeta(event: PixelEvent, payload: PixelPayload) {
  if (initMetaPixel()) window.fbq?.('track', event, payload);
}
