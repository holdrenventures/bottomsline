'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { imageAttrs } from '../../lib/delivery-images';

type HeroState = { image: string | null; alt: string; setHero: (image: string | null, alt: string) => void };

const HeroContext = createContext<HeroState | null>(null);

export function useProductHero() {
  return useContext(HeroContext);
}

// Shares the selected color's mockup between the purchase controls and the big
// clothesline visual, so the page shows one shirt instead of two.
export function ProductHeroProvider({ initialImage, initialAlt, children }: { initialImage: string | null; initialAlt: string; children: ReactNode }) {
  const [hero, setHeroState] = useState({ image: initialImage, alt: initialAlt });
  const setHero = useCallback((image: string | null, alt: string) => {
    setHeroState((current) => (current.image === image && current.alt === alt ? current : { image, alt }));
  }, []);
  const value = useMemo(() => ({ ...hero, setHero }), [hero, setHero]);
  return <HeroContext.Provider value={value}>{children}</HeroContext.Provider>;
}

export function ProductHeroImage({ fallback }: { fallback: ReactNode }) {
  const hero = useProductHero();
  if (!hero?.image) return <>{fallback}</>;
  return <img className="product-detail__image" src={hero.image} alt={hero.alt} {...imageAttrs(hero.image)} fetchPriority="high" decoding="async" />;
}
