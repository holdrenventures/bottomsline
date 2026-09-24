'use client';

import { useMemo, useState } from 'react';
import type { CatalogProduct } from '../data/products';

type Sleeves = 'none' | 'muscle' | 'drop-arm';
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

// --- Curve sampling helpers ---
// The shirt outline uses quadratic and cubic Beziers in the source SVG. CSS
// clip-path polygons only understand straight lines, so we sample points along
// each curve and stitch them together. Sampling densely enough hides the
// straight-line approximation at typical viewport sizes.
type Pt = [number, number];
const N_NECK = 14;
const N_SLEEVE = 12;

function quad(t: number, p0: Pt, c: Pt, p2: Pt): Pt {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1],
  ];
}
function cubic(t: number, p0: Pt, c1: Pt, c2: Pt, p3: Pt): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1],
  ];
}
function sample(n: number, fn: (t: number) => Pt): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) pts.push(fn(i / n));
  return pts;
}

function buildClipPath(sleeves: Sleeves, cropOn: boolean, drop: number, crop: number, extras: Extras): string | undefined {
  const cropY = 130 + crop * 10;
  const dropY = 130 + drop * 10;
  const bottomY = cropOn ? cropY : 320;

  // Neckline (left → right). Default is a shallow quadratic arc that matches
  // the artifact's SVG `M118,28 Q150,50 182,28`. Scoop deepens the arc; V-neck
  // becomes a triangle.
  function topEdge(): Pt[] {
    if (extras.vneck) return [[118, 28], [150, 82], [182, 28]];
    if (extras.scoop) return sample(N_NECK, (t) => quad(t, [118, 28], [150, 92], [182, 28]));
    return sample(N_NECK, (t) => quad(t, [118, 28], [150, 50], [182, 28]));
  }

  // Right side of the shirt outline from the top-right of the neckline down
  // to the hem. Muscle and drop-arm both follow curves in the source SVG.
  function rightSide(): Pt[] {
    if (sleeves === 'muscle') {
      // Cut runs along the sleeve seam: `M230,48 Q224,98 218,130` on the raw
      // outline, then straight down to the hem.
      const seam = sample(N_SLEEVE, (t) => quad(t, [230, 48], [224, 98], [218, 130]));
      return [...seam, [218, bottomY]];
    }
    if (sleeves === 'drop-arm') {
      // J-curve: `M208,38.8 C202,78 203,dropY-6 217,dropY`.
      const curve = sample(N_SLEEVE, (t) => cubic(t, [208, 38.8], [202, 78], [203, dropY - 6], [217, dropY]));
      return [...curve, [217, bottomY]];
    }
    // Full sleeve silhouette (no primary cut): shoulder → sleeve tip → underarm
    // → body-side → hem, matching the source shirt outline.
    return [[230, 48], [274, 122], [248, 142], [218, 130], [218, bottomY]];
  }

  function leftSide(): Pt[] {
    // Mirror the right side across the shirt's vertical center (x = 150) and
    // reverse so the polygon traces around continuously.
    return rightSide().map(([x, y]) => [300 - x, y] as Pt).reverse();
  }

  const points: Pt[] = [
    ...topEdge(),
    ...rightSide(),
    [84, bottomY], // hem-left corner; right side's last point handles the right hem
    ...leftSide().slice(1), // drop the duplicate hem-left corner from the mirror
  ];
  return polygon(points);
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

function buildRecipe(sleeves: Sleeves, cropOn: boolean, drop: number, crop: number, x: Extras): string {
  const parts: string[] = [];
  if (sleeves === 'muscle') parts.push('Muscle');
  else if (sleeves === 'drop-arm') parts.push(`Drop arm ${drop} in`);
  if (cropOn) parts.push(`Crop ${crop} in`);
  if (x.scoop) parts.push('scoop');
  if (x.vneck) parts.push('v-neck');
  if (x.slits) parts.push('side slits');
  if (x.slashes) parts.push('back slashes');
  return parts.length ? parts.join(' + ') : 'Original';
}

export default function CutItOutModeler({ products }: { products: CatalogProduct[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string>(products[0]?.slug ?? '');
  const [sleeves, setSleeves] = useState<Sleeves>('muscle');
  const [cropOn, setCropOn] = useState(false);
  const [dropDepth, setDropDepth] = useState(4);
  const [cropLen, setCropLen] = useState(8);
  const [extras, setExtras] = useState<Extras>({ scoop: false, vneck: false, slits: false, slashes: false });
  const [showCut, setShowCut] = useState(true);

  const selected = useMemo(
    () => products.find((product) => product.slug === selectedSlug) ?? products[0],
    [products, selectedSlug],
  );

  const clipPath = useMemo(
    () => (showCut ? buildClipPath(sleeves, cropOn, dropDepth, cropLen, extras) : undefined),
    [showCut, sleeves, cropOn, dropDepth, cropLen, extras],
  );

  const recipe = buildRecipe(sleeves, cropOn, dropDepth, cropLen, extras);

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
                <CutLines sleeves={sleeves} cropOn={cropOn} drop={dropDepth} crop={cropLen} extras={extras} showCut={showCut} />
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
            <p className="cut-stage__disclaimer">Cut it wrong? Welcome to your new look. We don’t replace shirts you’ve rearranged.</p>
          </div>
        </div>

        {/* Controls */}
        <div className="cut-modeler__controls">
          <p className="cut-modeler__pane-label">03 · Cut</p>

          <fieldset className="cut-controls__group">
            <legend>Sleeves</legend>
            <div className="cut-buttons">
              {(['none', 'muscle', 'drop-arm'] as Sleeves[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={sleeves === option ? 'is-selected' : ''}
                  aria-pressed={sleeves === option}
                  onClick={() => setSleeves(option)}
                >
                  {option === 'none' ? 'Keep sleeves' : option === 'muscle' ? 'Muscle' : 'Drop arm'}
                </button>
              ))}
            </div>
          </fieldset>

          {sleeves === 'drop-arm' && (
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

          <fieldset className="cut-controls__group">
            <legend>Hem</legend>
            <div className="cut-buttons cut-buttons--two">
              <button
                type="button"
                className={!cropOn ? 'is-selected' : ''}
                aria-pressed={!cropOn}
                onClick={() => setCropOn(false)}
              >
                Full length
              </button>
              <button
                type="button"
                className={cropOn ? 'is-selected' : ''}
                aria-pressed={cropOn}
                onClick={() => setCropOn(true)}
              >
                Crop
              </button>
            </div>
          </fieldset>

          {cropOn && (
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
          <p className="cut-cta__note">Ships uncut. The cutting is your art project.</p>
        </div>
      </div>
    </section>
  );
}

function CutLines({
  sleeves,
  cropOn,
  drop,
  crop,
  extras,
  showCut,
}: {
  sleeves: Sleeves;
  cropOn: boolean;
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
      {showPrimary && sleeves === 'muscle' && (
        <>
          <path d="M70,48 Q76,98 82,130" className="cut-line" />
          <path d="M230,48 Q224,98 218,130" className="cut-line" />
        </>
      )}
      {showPrimary && sleeves === 'drop-arm' && (
        <>
          <path d={`M92,38.8 C98,78 97,${dropY - 6} 83,${dropY}`} className="cut-line" />
          <path d={`M208,38.8 C202,78 203,${dropY - 6} 217,${dropY}`} className="cut-line" />
        </>
      )}
      {showPrimary && cropOn && (
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
