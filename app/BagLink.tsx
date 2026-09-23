'use client';

import { useEffect, useState } from 'react';
import { CART_UPDATED_EVENT, getCartQuantity, readCart } from './lib/cart';

export default function BagLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const readCount = () => setCount(getCartQuantity(readCart()));
    readCount();
    window.addEventListener(CART_UPDATED_EVENT, readCount);
    window.addEventListener('storage', readCount);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, readCount);
      window.removeEventListener('storage', readCount);
    };
  }, []);

  return <a className="bag-link" href="/bag">Bag <span>({count})</span></a>;
}
