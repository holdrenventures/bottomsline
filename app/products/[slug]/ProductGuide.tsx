'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type GuideTab = 'fabric' | 'fit' | 'care';
type GuideKind = 'tee' | 'tank' | 'other';

const teeMeasurements = [
  ['XXS', '15', '25'], ['XS', '16', '26'], ['S', '18', '28'], ['M', '20', '29'],
  ['L', '22', '30'], ['XL', '24', '31'], ['2XL', '26', '32'], ['3XL', '28', '33'],
];

const tankMeasurements = [
  ['XS', '17', '27.25'], ['S', '18', '28.25'], ['M', '20', '29.25'],
  ['L', '21', '30.25'], ['XL', '23', '31.25'], ['2XL', '24', '32.25'],
];

function guideKind(style: string | null): GuideKind {
  const value = style?.toLowerCase() ?? '';
  if (value.includes('tank')) return 'tank';
  if (value.includes('tee') || value.includes('t-shirt') || value.includes('tshirt')) return 'tee';
  return 'other';
}

function guideLabel(kind: GuideKind, fallback: string | null) {
  if (kind === 'tee') return 'T-shirt / Tultex 202';
  if (kind === 'tank') return 'Tank / Tultex 105';
  return fallback || 'Garment details';
}

export default function ProductGuide({ selectedStyle, availableStyles, externalGuideUrl }: {
  selectedStyle: string | null;
  availableStyles: string[];
  externalGuideUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<GuideTab>('fit');
  const [style, setStyle] = useState<string | null>(selectedStyle);
  const kind = guideKind(style);
  const measurementRows = kind === 'tank' ? tankMeasurements : teeMeasurements;
  const guideStyles = useMemo(() => {
    const recognized = availableStyles.filter((option) => guideKind(option) !== 'other');
    return Array.from(new Map(recognized.map((option) => [guideKind(option), option])).values());
  }, [availableStyles]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  function showGuide() {
    setStyle(selectedStyle);
    setTab('fit');
    setOpen(true);
  }

  return (
    <>
      <button className="size-guide" type="button" onClick={showGuide}>Size &amp; care guide ↗</button>
      {open && createPortal(<div className="product-guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
        <section className="product-guide" role="dialog" aria-modal="true" aria-labelledby="product-guide-title">
          <header>
            <div><p>Bottom’s Line / The useful part</p><h2 id="product-guide-title">Size &amp; care</h2></div>
            <button type="button" aria-label="Close size and care guide" onClick={() => setOpen(false)}>✕</button>
          </header>

          {guideStyles.length > 1 && <div className="product-guide__styles" aria-label="Garment guide">
            {guideStyles.map((option) => <button type="button" key={option} className={guideKind(option) === kind ? 'is-selected' : ''} aria-pressed={guideKind(option) === kind} onClick={() => setStyle(option)}>{guideKind(option) === 'tank' ? 'Tank' : 'T-shirt'}</button>)}
          </div>}

          <p className="product-guide__garment">{guideLabel(kind, style)}</p>
          <div className="product-guide__tabs" role="tablist" aria-label="Product guide sections">
            {(['fabric', 'fit', 'care'] as GuideTab[]).map((option) => <button type="button" role="tab" key={option} aria-selected={tab === option} className={tab === option ? 'is-selected' : ''} onClick={() => setTab(option)}>{option === 'fit' ? 'Size & fit' : option}</button>)}
          </div>

          <div className="product-guide__content">
            {tab === 'fabric' && kind === 'tee' && <><h3>Soft, lightweight cotton jersey.</h3><p>4.5 oz. ring-spun cotton jersey. Solid colors are 100% cotton; Heather Grey is 90% cotton and 10% polyester; other heathers are 50% cotton and 50% polyester. Pre-washed to help minimize shrinkage.</p><p className="product-guide__aside">The shirt has already relaxed. Your turn.</p></>}
            {tab === 'fabric' && kind === 'tank' && <><h3>Soft, lightweight cotton jersey.</h3><p>4.5 oz. ring-spun cotton jersey. Solid colors are 100% cotton; Heather Grey is 90% cotton and 10% polyester. Pre-washed, with ribbed binding at the neckline and armholes.</p><p className="product-guide__aside">Sleeves were not invited.</p></>}
            {tab === 'fabric' && kind === 'other' && <><h3>Garment details are being confirmed.</h3><p>This style needs its exact blank and fabric specification before we publish a claim. Accuracy remains hotter than guessing.</p></>}

            {tab === 'fit' && kind !== 'other' && <>
              <h3>{kind === 'tank' ? 'Unisex tank fit.' : 'Unisex short-sleeve fit.'}</h3>
              <p>Measure a garment you already like, laid flat and unstretched. These are garment measurements in inches, not body measurements. Width is measured straight across, not around.</p>
              <div className="product-guide__table-wrap"><table><thead><tr><th>Size</th><th>Width</th><th>Length</th></tr></thead><tbody>{measurementRows.map(([size, width, length]) => <tr key={size}><th>{size}</th><td>{width}&quot;</td><td>{length}&quot;</td></tr>)}</tbody></table></div>
              <p className="product-guide__aside">Between sizes? Compare both measurements. Confidence is attractive. A tape measure is useful.</p>
            </>}
            {tab === 'fit' && kind === 'other' && <><h3>Measure before committing.</h3><p>This style’s exact chart has not been added yet. Use the manufacturer guide when available, or compare the listed garment measurements with something you already own.</p></>}

            {tab === 'care' && <><h3>Get dirty. Wash gently.</h3><p>Turn inside out and machine wash cold with similar colors on a gentle cycle. Use mild detergent. Avoid bleach and fabric softener. Air-dry when possible; otherwise use low heat only when the garment and print instructions allow it. Do not iron directly over the design.</p><p className="product-guide__aside">Pre-washed means less shrinkage, not permission to cook it.</p></>}
          </div>

          <footer>
            <p>Manufacturing variation can occur. Available sizes depend on the selected style and color.</p>
            {externalGuideUrl && <a href={externalGuideUrl} target="_blank" rel="noreferrer">Manufacturer guide ↗</a>}
          </footer>
        </section>
      </div>, document.body)}
    </>
  );
}
