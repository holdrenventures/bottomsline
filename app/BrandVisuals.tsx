import type { ReactNode } from 'react';

export function Shirt({ art, tone, featured = false, detail = false }: { art: string[]; tone: string; featured?: boolean; detail?: boolean }) {
  return (
    <div className={`shirt shirt--${tone} ${featured ? 'shirt--featured' : ''} ${detail ? 'shirt--detail' : ''}`} aria-label={`${art.join(' ')} shirt mockup placeholder`}>
      <div className="shirt__neck" />
      <div className="shirt__print">{art.map((line) => <span key={line}>{line}</span>)}</div>
    </div>
  );
}

export function Clothespin({ compact = false }: { compact?: boolean }) {
  return <span className={`clothespin ${compact ? 'clothespin--compact' : ''}`} aria-hidden="true"><i /></span>;
}

export function ProductAnnotation({ children }: { children: ReactNode }) {
  return <span className="product-detail__annotation">{children}</span>;
}
