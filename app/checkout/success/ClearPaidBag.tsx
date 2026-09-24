'use client';

import { useEffect } from 'react';
import { clearCart } from '../../lib/cart';

export default function ClearPaidBag() {
  useEffect(() => {
    clearCart();
  }, []);
  return null;
}
