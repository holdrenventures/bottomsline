'use client';

import { promoBanner } from './lib/promo';
import { usePromoClock } from './lib/use-promo-window';

export default function PromoBanner({ initialNow }: { initialNow: number }) {
  const now = usePromoClock(initialNow);
  return <p className="promo-banner">{promoBanner(now)}</p>;
}
