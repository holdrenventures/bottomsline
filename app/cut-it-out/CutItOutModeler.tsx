'use client';

import { useMemo, useState } from 'react';
import type { CatalogProduct } from '../data/products';

type PrimaryCut = 'none' | 'muscle' | 'drop-arm' | 'crop';
type Extras = { scoop: boolean; vneck: boolean; slits: boolean; slashes: boolean };

// Shirt geometry in the artifact's viewBox coords (300 × 340). We reuse it so
// the cut overlay and the CSS clip-path stay in the same reference frame.
const VB_W = 300;
const VB_H = 340;
const px = (v: number) => (v / VB_W) * 100;
const py = (v: number) => (v / VB_H) * 100;

// Convert artifact coordinates → CSS clip-path polygon `x% y%` pairs.
function polygon(points: Array<[number, number]>): string {
  return `polygon(${points.map(([x, y]) => `${px(x).toFixed(2)}% ${py(y).toFixed(2)}%`).join(', ')})`;
}

function buildClipPath(cut: PrimaryCut, drop: number, crop: number, extras: Extras): string | undefined {
  // Muscle and drop-arm remove the sleeves; crop trims the hem. Neck extras
  // stack on top of any of those. Slits/slashes don't remove much visible
  // area so they show as overlay lines only, not clipped.
  const cropY = 130 + crop * 10;

  // Top edge of the shirt polygon — flat (uncut) or a scoop/v-neck cut-out.
  function topEdge(): Array<[number, number]> {
    if (extras.vneck) return [[118, 28], [150, 82], [182, 28]];
    if (extras.scoop) {
      // Scoop is a curved arc; approximate with a series of points along the curve.
      const arc: Array<[number, number]> = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        // Quadratic Bezier: (1-t)^2*P0 + 2(1-t)t*C + t^2*P2 with P0=(118,28) C=(150,92) P2=(182,28)
        const x = (1 - t) ** 2 * 118 + 2 * (1 - t) * t * 150 + t ** 2 * 182;
        const y = (1 - t) ** 2 * 28 + 2 * (1 - t) * t * 92 + t ** 2 * 28;
        arc.push([x, y]);
      }
      return arc;
    }
    // Default rounded neckline.
    return [[118, 28], [150, 50], [182, 28]];
  }

  const bottomY = cut === 'crop' ? cropY : 320;

  // Right side of the shirt (from top to bottom-right corner).
  function rightSide(): Array<[number, number]> {
    if (cut === 'muscle') {
      // Straight cut along the sleeve seam: 230,48 -> 218,130 -> hem
      return [[230, 48], [218, 130], [218, bottomY]];
    }
    if (cut === 'drop-arm') {
      const dropY = 130 + drop * 10;
      // J-curve: 208,38.8 -> 202,78 -> 203,dropY-6 -> 217,dropY -> hem
      return [[208, 38.8], [202, 78], [203, dropY - 6], [217, dropY], [217, bottomY]];
    }
    // Full sleeve outline (no cut): 230,48 -> 274,122 -> 248,142 -> 218,130 -> hem
    return [[230, 48], [274, 122], [248, 142], [218, 130], [218, bottomY]];
  }
  function leftSide(): Array<[number, number]> {
    // Mirror right side across x=150.
    return rightSide().map(([x, y]) => [300 - x, y] as [number, number]).reverse();
  }

  const points: Array<[number, number]> = [
    ...topEdge(),
    ...rightSide(),
    [bottomY === 320 ? 84 : 84, bottomY], // hem-right meets hem
    [bottomY === 320 ? 216 : 216, bottomY],
    ...leftSide(),
  ];
  // Simplify: the two hem points above are redundant — replace with clean sequence.
  const clean: Array<[number, number]> = [
    ...topEdge(),
    ...rightSide(),
    [84, bottomY],
    ...leftSide().slice(1), // drop duplicate at hem
  ];
  return polygon(clean);
}

function dropLevel(v: number) {
  if (v <= 3) return 'Gym tank: clean and sporty';
  if (v <= 5) return 'Drop arm: shows some side';
  if (v <= 6.5) return 'Deep cut: ribs on display';
  return 'Stringer: all side, no apologies';
}

function cropLevel(v: number) {
  if (v <= 5) return 'High crop: chest only, festival energy';
  if (v <= 8) return 'Rib crop: the classic';
  if (v <= 10.5) return 'Navel crop: just above the belly button';
  return 'Low crop: a peek when you reach';
}

function buildRecipe(cut: PrimaryCut, drop: number, crop: number, x: Extras): string {
  const parts: string[] = [];
  if (cut === 'muscle') parts.push('Muscle');
  else if (cut === 'drop-arm') parts.push(`Drop arm ${drop} in`);
  else if (cut === 'crop') parts.push(`Crop ${crop} in`);
  if (x.scoop) parts.push('scoop');
  if (x.vneck) parts.push('v-neck');
  if (x.slits) parts.push('side slits');
  if (x.slashes) parts.push('back slashes');
  return parts.length ? parts.join(' + ') : 'Original';
}

export default function CutItOutModeler({ products }: { products: CatalogProduct[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string>(products[0]?.slug ?? '');
  const [cut, setCut] = useState<PrimaryCut>('muscle');
  const [dropDepth, setDropDepth] = useState(4);
  const [cropLen, setCropLen] = useState(8);
  const [extras, setExtras] = useState<Extras>({ scoop: false, vneck: false, slits: false, slashes: false });
  const [showCut, setShowCut] = useState(true);

  const selected = useMemo(
    () => products.find((product) => product.slug === selectedSlug) ?? products[0],
    [products, selectedSlug],
  );

  const clipPath = useMemo(
    () => (showCut ? buildClipPath(cut, dropDepth, cropLen, extras) : undefined),
    [showCut, cut, dropDepth, cropLen, extras],
  );

  const recipe = buildRecipe(cut, dropDepth, cropLen, extras);

  if (!selected) {
    return (
      <section className="cut-modeler shell">
        <p className="cut-empty">No shirts to model yet. Once the catalog loads, this is where the scissors come out.</p>
      </section>
    );
  }

  return (
    <section className="cut-modeler shell" id="modeler">
      <div className="cut-modeler__head">
        <p className="eyebrow"><span /> The modeler</p>
        <h2>Pick a shirt.<br /><em>Cut it however.</em></h2>
        <p>Choose a tee, pick the cut, drag the sliders. Toggle "Show cut" to see it before you commit.</p>
      </div>

      <div className="cut-modeler__grid">
        {/* Picker */}
        <div className="cut-modeler__picker">
          <p className="cut-modeler__pane-label">01 · Shirt</p>
          <div className="cut-picker">
            {products.map((product) => (
              <button
                key={product.slug}
                type="button"
                className={product.slug === selectedSlug ? 'cut-picker__tile is-selected' : 'cut-picker__tile'}
                aria-pressed={product.slug === selectedSlug}
                onClick={() => setSelectedSlug(product.slug)}
              >
                <span className="cut-picker__thumb">
                  {product.catalogImage
                    ? <img src={product.catalogImage} alt="" loading="lazy" />
                    : <span className="cut-picker__ghost" aria-hidden="true">BL</span>}
                </span>
                <span className="cut-picker__name">{product.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div className="cut-modeler__stage">
          <p className="cut-modeler__pane-label">02 · Preview</p>
          <div className="cut-stage">
            <div className="cut-stage__frame">
              {selected.catalogImage && (
                <img
                  className="cut-stage__image"
                  src={selected.catalogImage}
                  alt={`${selected.name} — ${recipe}`}
                  style={{ clipPath, WebkitClipPath: clipPath }}
                />
              )}
              <svg
                className="cut-stage__overlay"
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <CutLines cut={cut} drop={dropDepth} crop={cropLen} extras={extras} showCut={showCut} />
              </svg>
            </div>
            <div className="cut-stage__caption">
              <p><strong>{selected.name}</strong></p>
              <p className="cut-stage__recipe">{recipe}</p>
            </div>
            <button
              type="button"
              className="cut-stage__toggle"
              onClick={() => setShowCut(!showCut)}
              aria-pressed={showCut}
            >
              {showCut ? 'Show original' : 'Show cut'}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="cut-modeler__controls">
          <p className="cut-modeler__pane-label">03 · Cut</p>

          <fieldset className="cut-controls__group">
            <legend>Main cut</legend>
            <div className="cut-buttons">
              {(['none', 'muscle', 'drop-arm', 'crop'] as PrimaryCut[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cut === option ? 'is-selected' : ''}
                  aria-pressed={cut === option}
                  onClick={() => setCut(option)}
                >
                  {option === 'none' ? 'No cut' : option === 'muscle' ? 'Muscle' : option === 'drop-arm' ? 'Drop arm' : 'Crop'}
                </button>
              ))}
            </div>
          </fieldset>

          {cut === 'drop-arm' && (
            <div className="cut-slider">
              <label htmlFor="drop-depth">
                Depth below armpit <output htmlFor="drop-depth">{dropDepth} in</output>
              </label>
              <input
                id="drop-depth"
                type="range"
                min={2}
                max={8}
                step={0.5}
                value={dropDepth}
                onChange={(event) => setDropDepth(Number(event.target.value))}
              />
              <p className="cut-slider__level">{dropLevel(dropDepth)}</p>
            </div>
          )}

          {cut === 'crop' && (
            <div className="cut-slider">
              <label htmlFor="crop-len">
                Hem below armpit <output htmlFor="crop-len">{cropLen} in</output>
              </label>
              <input
                id="crop-len"
                type="range"
                min={3}
                max={13}
                step={0.5}
                value={cropLen}
                onChange={(event) => setCropLen(Number(event.target.value))}
              />
              <p className="cut-slider__level">{cropLevel(cropLen)}</p>
            </div>
          )}

          <fieldset className="cut-controls__group">
            <legend>Add extras</legend>
            <div className="cut-extras">
              {(
                [
                  ['scoop', 'Scoop neck'],
                  ['vneck', 'V-neck'],
                  ['slits', 'Side slits'],
                  ['slashes', 'Back slashes'],
                ] as Array<[keyof Extras, string]>
              ).map(([key, label]) => (
                <label key={key} className={extras[key] ? 'cut-extra is-selected' : 'cut-extra'}>
                  <input
                    type="checkbox"
                    checked={extras[key]}
                    onChange={() => setExtras((prev) => ({ ...prev, [key]: !prev[key] }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <a className="cut-cta" href={`/products/${selected.slug}`}>
            Get this shirt <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function CutLines({
  cut,
  drop,
  crop,
  extras,
  showCut,
}: {
  cut: PrimaryCut;
  drop: number;
  crop: number;
  extras: Extras;
  showCut: boolean;
}) {
  // When "Show cut" is on, the clip-path already hides everything past the cut —
  // showing the overlay would look like double-drawing. Keep just the extras.
  const showPrimary = !showCut;
  const dropY = 130 + drop * 10;
  const cropY = 130 + crop * 10;

  return (
    <g>
      {showPrimary && cut === 'muscle' && (
        <>
          <path d="M70,48 Q76,98 82,130" className="cut-line" />
          <path d="M230,48 Q224,98 218,130" className="cut-line" />
        </>
      )}
      {showPrimary && cut === 'drop-arm' && (
        <>
          <path d={`M92,38.8 C98,78 97,${dropY - 6} 83,${dropY}`} className="cut-line" />
          <path d={`M208,38.8 C202,78 203,${dropY - 6} 217,${dropY}`} className="cut-line" />
        </>
      )}
      {showPrimary && cut === 'crop' && (
        <path d={`M56,${cropY} L244,${cropY}`} className="cut-line" />
      )}
      {extras.scoop && <path d="M118,28 Q150,92 182,28" className="cut-line" />}
      {extras.vneck && <path d="M118,28 L150,82 L182,28" className="cut-line" />}
      {extras.slits && (
        <>
          <path d="M84,280 L84,320" className="cut-line" />
          <path d="M216,280 L216,320" className="cut-line" />
        </>
      )}
      {extras.slashes &&
        Array.from({ length: 6 }).map((_, i) => {
          const y = 160 + i * 22;
          return <path key={i} d={`M110,${y} L190,${y}`} className="cut-line" />;
        })}
    </g>
  );
}
