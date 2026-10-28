'use client';

import { useEffect } from 'react';
import { clearCart } from '../../lib/cart';
import { trackMeta } from '../../lib/meta-pixel';

export type VerifiedPurchase = {
  sessionId: string;
  value: number;
  currency: string;
  contentIds: string[];
  numItems: number;
};

export default function ClearPaidBag({ purchase }: { purchase: VerifiedPurchase | null }) {
  useEffect(() => {
    if (!purchase) return;
    const eventKey = `meta-purchase-${purchase.sessionId}`;
    if (!window.sessionStorage.getItem(eventKey)) {
      trackMeta('Purchase', {
        value: purchase.value,
        currency: purchase.currency,
        content_ids: purchase.contentIds,
        content_type: 'product',
        num_items: purchase.numItems,
      });
      window.sessionStorage.setItem(eventKey, '1');
    }
    clearCart();
  }, [purchase]);
  return null;
}
