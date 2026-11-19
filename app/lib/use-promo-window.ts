'use client';

import { useEffect, useState } from 'react';
export function usePromoClock(initialNow = 0) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
