'use client';

/* eslint-disable @next/next/no-img-element -- R2 originals are composed locally in the editor. */
import { useRef, useState } from 'react';
import { COLORS, GARMENTS, blankUrl, slugify } from '../../lib/blc-cloudinary';
import restoredArtwork from '../../lib/editor-artwork.json';

const RATIO = 2 / 3;
const DEFAULT = { w: 0.34, x: 0, y: 0.3, angle: 0, brightness: 0 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => +Number(value).toFixed(4);
const normalized = (value) => ({ w: round(value.w), x: round(value.x), y: round(value.y), angle: round(value.angle || 0), brightness: round(value.brightness || 0) });

function artworkRect(placement, aspect) {
  const width = placement.w;
  const height = width * RATIO / aspect;
  const radians = (placement.angle || 0) * Math.PI / 180;
  const rotatedHeight = Math.abs(height * Math.cos(radians)) + Math.abs(width * RATIO * Math.sin(radians));
  return { left: 0.5 + placement.x - width / 2, top: placement.y + (rotatedHeight - height) / 2, width, height };
}

function ArtLayer({ url, placement, aspect, handle, onMove, onResize }) {
  if (!url) return null;
  const rect = artworkRect(placement, aspect);
  return <div onPointerDown={onMove} style={{ position: 'absolute', left: `${rect.left * 100}%`, top: `${rect.top * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%`, transform: `rotate(${placement.angle || 0}deg)`, cursor: handle ? 'grab' : 'inherit', touchAction: 'none' }}>
    <img src={url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', filter: `brightness(${100 + (placement.brightness || 0)}%)` }} />
    {handle && <span onPointerDown={onResize} style={S.handle} aria-label="Drag to resize artwork" />}
  </div>;
}

/**
 * The browser previews R2 originals. Cloudinary runs once per saved color.
 * @param {{products?: Array<{name:string,slug:string,active:boolean}>, onUpload:(file:File,slug:string)=>Promise<{artworkUrl:string,assetSlug?:string}>, onSave:(value:unknown)=>Promise<unknown>, onLoad:(productSlug:string,garment:string)=>Promise<{slug:string,artworkUrl?:string,colors:string[],placements:Record<string,{w:number,x:number,y:number,angle?:number,brightness?:number}>}>}} props
 */
export default function DesignAdjuster({ products = [], onUpload, onSave, onLoad }) {
  const [garment, setGarment] = useState('tee');
  const [slug, setSlug] = useState('');
  const [productSlug, setProductSlug] = useState('');
  const [previewColor, setPreviewColor] = useState('black');
  const [localUrl, setLocalUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [aspect, setAspect] = useState(1);
  const [placements, setPlacements] = useState({});
  const [selected, setSelected] = useState(() => new Set(['black', 'white', 'navy']));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [renderedUrls, setRenderedUrls] = useState({});
  const [error, setError] = useState('');
  const stageRef = useRef(null);
  const pointer = useRef(null);
  const palette = COLORS[garment];
  const placementFor = (token) => ({ ...DEFAULT, ...placements[garment]?.[token] });
  const current = placementFor(previewColor);
  const art = localUrl || sourceUrl;

  function updatePlacement(changes) {
    setPlacements((all) => ({ ...all, [garment]: { ...all[garment], [previewColor]: { ...DEFAULT, ...all[garment]?.[previewColor], ...changes } } }));
    setSaved(false);
  }

  function changeGarment(next) {
    setGarment(next);
    const nextPalette = COLORS[next];
    const valid = new Set([...selected].filter((token) => nextPalette.some((color) => color.token === token)));
    if (!valid.size) nextPalette.slice(0, 3).forEach((color) => valid.add(color.token));
    setSelected(valid);
    setPreviewColor(nextPalette.some((color) => color.token === previewColor) ? previewColor : nextPalette[0].token);
    setSaved(false);
  }

  function readAspect(url) {
    const image = new Image();
    image.onload = () => setAspect(image.naturalWidth / image.naturalHeight);
    image.onerror = () => setError('Artwork could not be previewed.');
    image.src = url;
  }

  async function loadSaved() {
    if (!productSlug) return;
    setBusy(true); setError('');
    try {
      const result = await onLoad(productSlug, garment);
      if (!result?.slug || !result?.colors?.length) throw new Error('No saved front mockups found for this garment.');
      setLocalUrl(''); setSourceUrl(result.artworkUrl || '');
      if (result.artworkUrl) readAspect(result.artworkUrl);
      else setError('Placements recovered. Choose the original artwork from the library or upload its PNG before saving.');
      setSlug(result.slug); setSelected(new Set(result.colors)); setPreviewColor(result.colors[0]);
      setPlacements((all) => ({ ...all, [garment]: result.placements })); setSaved(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load saved mockups.'); }
    finally { setBusy(false); }
  }

  function chooseArtwork(url) {
    const chosen = restoredArtwork.find((item) => item.url === url);
    if (!chosen) return;
    if (localUrl.startsWith('blob:')) URL.revokeObjectURL(localUrl);
    setLocalUrl(''); setSourceUrl(chosen.url); readAspect(chosen.url);
    setSlug(chosen.slug); setSaved(false); setError('');
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (localUrl.startsWith('blob:')) URL.revokeObjectURL(localUrl);
    setLocalUrl(url); readAspect(url); setSourceUrl(''); setSaved(false); setError('');
    const nextSlug = slug || slugify(file.name); setSlug(nextSlug);
    setBusy(true);
    try {
      const result = await onUpload(file, nextSlug);
      setSourceUrl(result.artworkUrl); setSlug(result.assetSlug || nextSlug);
    } catch (cause) { setError(`Upload failed: ${cause instanceof Error ? cause.message : 'Unknown error'}`); }
    finally { setBusy(false); }
  }

  function startPointer(event, mode) {
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    event.preventDefault(); event.stopPropagation();
    const placement = { ...current };
    const rect = artworkRect(placement, aspect);
    const centerX = stage.left + (rect.left + rect.width / 2) * stage.width;
    const centerY = stage.top + (rect.top + rect.height / 2) * stage.height;
    const distance = Math.hypot((event.clientX - centerX) / stage.width, (event.clientY - centerY) / stage.width);
    pointer.current = { mode, id: event.pointerId, startX: event.clientX, startY: event.clientY, stage, placement, centerX, centerY, distance: Math.max(distance, 0.01) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePointer(event) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.mode === 'move') {
      updatePlacement({ x: round(clamp(drag.placement.x + (event.clientX - drag.startX) / drag.stage.width, -0.6, 0.6)), y: round(clamp(drag.placement.y + (event.clientY - drag.startY) / drag.stage.height, -0.1, 0.95)) });
    } else {
      const distance = Math.hypot((event.clientX - drag.centerX) / drag.stage.width, (event.clientY - drag.centerY) / drag.stage.width);
      updatePlacement({ w: round(clamp(drag.placement.w * distance / drag.distance, 0.05, 0.95)) });
    }
  }

  function endPointer(event) { if (pointer.current?.id === event.pointerId) pointer.current = null; }

  async function handleSave() {
    setBusy(true); setError('');
    try {
      if (!sourceUrl) throw new Error('Upload the original artwork before saving.');
      const colors = palette.filter((color) => selected.has(color.token)).map((color) => color.token);
      const byColor = Object.fromEntries(colors.map((token) => [token, normalized(placementFor(token))]));
      const result = await onSave({ slug, artworkUrl: sourceUrl, productSlug: productSlug || null, garment, placement: normalized(current), placements: byColor, colors });
      setRenderedUrls(result?.mockupUrls || {}); setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save design.'); }
    finally { setBusy(false); }
  }

  const selectedColors = palette.filter((color) => selected.has(color.token));
  return <div className="design-adjuster" style={S.wrap}>
    <div>
      <div style={S.toolbar}>
        <label style={S.upload}>{art ? 'Replace PNG' : 'Upload PNG'}<input type="file" accept="image/png" onChange={onFile} style={{ display: 'none' }} /></label>
        <select aria-label="Restored artwork" value={restoredArtwork.some((item) => item.url === sourceUrl) ? sourceUrl : ''} onChange={(event) => chooseArtwork(event.target.value)} style={S.select}><option value="">Choose restored artwork…</option>{restoredArtwork.map((item) => <option key={item.url} value={item.url}>{item.label}</option>)}</select>
        <div style={S.segment}>{Object.entries(GARMENTS).map(([id, config]) => <button type="button" key={id} onClick={() => changeGarment(id)} style={{ ...S.segmentButton, ...(id === garment ? S.segmentSelected : {}) }}>{config.label}</button>)}</div>
        <input value={slug} onChange={(event) => { setSlug(slugify(event.target.value)); setSaved(false); }} placeholder="design-slug" style={S.slug} aria-label="Design name" />
      </div>
      <label style={S.productLabel}>Storefront product <span style={S.help}>Optional. Saving with a product publishes the selected front mockups to its colorways.</span>
        <select value={productSlug} onChange={(event) => { setProductSlug(event.target.value); setSaved(false); }} style={S.select}>
          <option value="">Save placement only</option>
          {products.map((product) => <option key={product.slug} value={product.slug}>{product.name}{product.active ? '' : ' — Draft'}</option>)}
        </select>
      </label>
      <button type="button" onClick={loadSaved} disabled={!productSlug || busy} style={S.load}>Load saved front mockups</button><p style={S.help}>To add a new garment to this product, add its sizes, price, and Tultex blank in <a href="/admin">Product Desk</a> first. Saving here then adds its selected colors alongside the other garment choices.</p>
      <div ref={stageRef} style={S.stage} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer}>
        <img src={blankUrl(garment, previewColor)} alt={`${palette.find((color) => color.token === previewColor)?.label || previewColor} front blank`} style={S.blank} draggable={false} />
        <ArtLayer url={art} placement={current} aspect={aspect} handle onMove={(event) => startPointer(event, 'move')} onResize={(event) => startPointer(event, 'resize')} />
        <div style={S.centerGuide} aria-hidden="true" />
      </div>
      <div style={S.row}><span style={S.label}>Size</span><input type="range" min="5" max="95" step="0.5" value={current.w * 100} onChange={(event) => updatePlacement({ w: Number(event.target.value) / 100 })} style={S.slider} aria-label="Artwork size" /><code style={S.value}>{Math.round(current.w * 100)}%</code></div>
      <div style={S.row}><span style={S.label}>Tilt</span><input type="range" min="-20" max="20" step="0.5" value={current.angle} onChange={(event) => updatePlacement({ angle: Number(event.target.value) })} style={S.slider} aria-label="Artwork tilt" /><code style={S.value}>{current.angle.toFixed(1)}°</code><button type="button" onClick={() => updatePlacement({ angle: 0 })} style={S.smallButton}>Reset</button></div>
      <div style={S.row}><span style={S.label}>Brightness</span><input type="range" min="-50" max="50" step="1" value={current.brightness} onChange={(event) => updatePlacement({ brightness: Number(event.target.value) })} style={S.slider} aria-label="Artwork brightness" /><code style={S.value}>{current.brightness > 0 ? '+' : ''}{current.brightness}</code><button type="button" onClick={() => updatePlacement({ brightness: 0 })} style={S.smallButton}>Reset</button></div>
      <div style={S.row}><span style={S.label}>Position</span><button type="button" onClick={() => updatePlacement({ x: 0 })} style={S.smallButton}>Center horizontally</button><button type="button" onClick={() => updatePlacement({ x: 0, y: DEFAULT.y })} style={S.smallButton}>Reset to chest</button><code style={S.value}>x {current.x.toFixed(3)} · y {current.y.toFixed(3)}</code></div>
      <div style={S.row}><span style={S.label}>Editing on</span><select value={previewColor} onChange={(event) => setPreviewColor(event.target.value)} style={S.select}>{palette.map((color) => <option key={color.token} value={color.token}>{color.label}</option>)}</select><span style={S.help}>Each color keeps its own size, tilt, brightness, and position.</span></div>
    </div>
    <div>
      <div style={S.label}>Front colors ({selected.size})</div>
      <div style={S.swatches}>{palette.map((color) => <button type="button" key={color.token} title={color.label} aria-label={`${color.label}${selected.has(color.token) ? ' selected' : ''}`} onClick={() => { setSelected((old) => { const next = new Set(old); if (next.has(color.token)) next.delete(color.token); else next.add(color.token); return next; }); setPreviewColor(color.token); setSaved(false); }} style={{ ...S.swatch, background: color.hex, outline: selected.has(color.token) ? '2px solid #ff4f3d' : '1px solid #ddd' }} />)}</div>
      <p style={S.help}>{saved && Object.keys(renderedUrls).length ? 'Saved mockups below are the exact R2 images now used by the storefront.' : 'Preview uses the R2 originals. Saving renders only the selected front colors.'}</p>
      <div style={S.grid}>{art ? selectedColors.map((color) => <button type="button" key={color.token} onClick={() => setPreviewColor(color.token)} aria-label={`Edit placement on ${color.label}`} style={{ ...S.cell, outline: previewColor === color.token ? '2px solid #ff4f3d' : 'none' }}><div style={S.thumbnail}>{saved && renderedUrls[color.token] ? <img src={renderedUrls[color.token]} alt="" style={{ ...S.blank, objectFit: 'contain' }} loading="lazy" /> : <><img src={blankUrl(garment, color.token)} alt="" style={S.blank} loading="lazy" /><ArtLayer url={art} placement={placementFor(color.token)} aspect={aspect} /></>}</div><span style={S.cellLabel}>{color.label}</span></button>) : <p style={S.help}>Upload a PNG or load a saved design to preview its selected colors.</p>}</div>
      {error && <p role="alert" style={S.error}>{error}</p>}
      <button type="button" onClick={handleSave} disabled={busy || !sourceUrl || !slug || !selected.size} style={{ ...S.save, opacity: busy || !sourceUrl || !slug || !selected.size ? 0.5 : 1 }}>{busy ? 'Working…' : saved ? 'Saved ✓' : 'Save front mockups'}</button>
    </div>
  </div>;
}

const S = {
  wrap: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, fontFamily: 'system-ui, sans-serif', color: '#1a1720' },
  toolbar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  upload: { padding: '9px 14px', background: '#ff4f3d', color: '#111', borderRadius: 4, fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  segment: { display: 'flex', border: '1px solid #e4e0dc', borderRadius: 9, overflow: 'hidden' },
  segmentButton: { padding: '8px 12px', background: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 },
  segmentSelected: { background: '#1a1720', color: '#fff' },
  slug: { flex: 1, minWidth: 140, padding: '8px 10px', border: '1px solid #e4e0dc', borderRadius: 9, fontSize: 13 },
  productLabel: { display: 'grid', gap: 6, marginBottom: 12, color: '#5f584f', fontSize: 11, fontWeight: 800 },
  select: { padding: '8px 10px', border: '1px solid #d1cbc1', borderRadius: 5, background: '#fff', fontSize: 13 },
  load: { marginBottom: 12, padding: '9px 12px', border: '1px solid #d1cbc1', borderRadius: 4, background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  stage: { position: 'relative', width: '100%', aspectRatio: '2 / 3', background: '#141018', borderRadius: 14, overflow: 'hidden', touchAction: 'none', userSelect: 'none' },
  blank: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' },
  handle: { position: 'absolute', right: -9, bottom: -9, width: 20, height: 20, background: '#ff4f3d', border: '2px solid #fff', borderRadius: '50%', cursor: 'nwse-resize', touchAction: 'none' },
  centerGuide: { position: 'absolute', left: '50%', top: 0, height: '100%', borderLeft: '1px dashed #ffffff66', pointerEvents: 'none' },
  row: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6b6675', fontWeight: 600 },
  slider: { flex: 1, minWidth: 100 },
  value: { fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#6b6675', whiteSpace: 'nowrap' },
  smallButton: { padding: '5px 8px', border: '1px solid #d1cbc1', borderRadius: 4, background: '#fff', fontSize: 11, cursor: 'pointer' },
  help: { color: '#777066', fontSize: 11, fontWeight: 500, lineHeight: 1.4 },
  swatches: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(30px, 1fr))', gap: 6, marginTop: 8 },
  swatch: { width: 30, height: 30, borderRadius: 7, cursor: 'pointer', outlineOffset: 2, border: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8, maxHeight: 360, overflowY: 'auto' },
  cell: { background: '#141018', border: 'none', borderRadius: 10, padding: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' },
  thumbnail: { position: 'relative', width: '100%', aspectRatio: '2 / 3', overflow: 'hidden' },
  cellLabel: { fontSize: 10, color: '#b7b2c0', marginTop: 2 },
  error: { margin: '10px 0', color: '#b42318', fontSize: 12, lineHeight: 1.4 },
  save: { width: '100%', padding: 12, marginTop: 16, background: '#1a1720', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
