'use client';

import { useEffect, useState } from 'react';

export default function BagLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const readCount = () => setCount(Number(window.localStorage.getItem('bottoms-line-bag-count') || 0));
    readCount();
    window.addEventListener('bottoms-line-bag-updated', readCount);
    return () => window.removeEventListener('bottoms-line-bag-updated', readCount);
  }, []);

  return <a className="bag-link" href="/#shop">Bag <span>({count})</span></a>;
}
