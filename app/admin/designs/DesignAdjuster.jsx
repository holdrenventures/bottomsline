"use client";

/* eslint-disable @next/next/no-img-element -- Cloudinary composition previews use generated URLs. */

// Bottom's Line — admin design adjuster.
// Upload a PNG, then position, scale, and rotate it on each selected color.

import { useRef, useState } from "react";
import { COLORS, GARMENTS, blankUrl, designUrl as designAssetUrl, mockupUrl, slugify } from "../../lib/blc-cloudinary";

const AR_CONTAINER = 2 / 3; // all current blank canvases are 2:3
const DEFAULT_PLACEMENT = { w: 0.34, x: 0, y: 0.3, angle: 0 };
const GARMENT_OPTIONS = Object.entries(GARMENTS).map(([id, garment]) => ({ id, label: garment.label }));

/**
 * @param {{
 *   initial?: { slug?: string, productSlug?: string, garment?: 'tee'|'tank'|'crewneck'|'hoodie', placement?: {w:number,x:number,y:number,angle?:number}, placements?: Record<string,{w:number,x:number,y:number,angle?:number}>, colors?: string[] } | null,
 *   products?: Array<{name:string,slug:string,active:boolean}>,
 *   onUpload?: (file: File, slug: string) => Promise<{assetSlug?: string}>,
 *   onSave?: (payload: {slug:string,productSlug:string|null,garment:string,placement:{w:number,x:number,y:number,angle:number},placements:Record<string,{w:number,x:number,y:number,angle:number}>,colors:string[]}) => Promise<unknown>,
 *   onLoad?: (productSlug:string,garment:string) => Promise<{slug:string,colors:string[],placements:Record<string,{w:number,x:number,y:number,angle:number}>}>
 * }} props
 */
export default function DesignAdjuster({
  initial = null,               // optional: { slug, garment, placement, colors } to edit
  products = [],
  onUpload = async () => {},
  onSave = async () => {},      // async (payload) => persist to Supabase
  onLoad = async () => {},
}) {
  const [garment, setGarment] = useState(initial?.garment || "tee");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [productSlug, setProductSlug] = useState(initial?.productSlug || "");
  const [previewColor, setPreviewColor] = useState("black");
  const [designUrl, setDesignUrl] = useState(null);   // local objectURL for the editor
  const [ar, setAr] = useState(1);                    // design aspect (w/h)
  const [defaultPlacement] = useState({ ...DEFAULT_PLACEMENT, ...initial?.placement });
  const [placementsByGarment, setPlacementsByGarment] = useState(() => ({ [initial?.garment || "tee"]: initial?.placements || {} }));
  const [selected, setSelected] = useState(() => new Set(initial?.colors || ["black", "white", "navy"]));
  const [uploaded, setUploaded] = useState(!!initial?.slug); // slug exists on Cloudinary
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const stageRef = useRef(null);
  const palette = COLORS[garment];
  const placementFor = (token) => ({ ...defaultPlacement, ...placementsByGarment[garment]?.[token] });
  const placement = placementFor(previewColor);

  function updatePlacement(changes) {
    setPlacementsByGarment((all) => ({
      ...all,
      [garment]: { ...all[garment], [previewColor]: { ...defaultPlacement, ...all[garment]?.[previewColor], ...changes } },
    }));
    setSaved(false);
  }

  function changeGarment(nextGarment) {
    const nextPalette = COLORS[nextGarment];
    setGarment(nextGarment);
    setPreviewColor((current) => nextPalette.some((color) => color.token === current) ? current : nextPalette[0].token);
    setSelected((current) => {
      const valid = new Set([...current].filter((token) => nextPalette.some((color) => color.token === token)));
      if (!valid.size) nextPalette.slice(0, Math.min(3, nextPalette.length)).forEach((color) => valid.add(color.token));
      return valid;
    });
    setSaved(false);
  }

  async function loadSaved() {
    if (!productSlug) return;
    setBusy(true);
    setError("");
    try {
      const result = await onLoad(productSlug, garment);
      if (!result?.slug || !result?.colors?.length) throw new Error("No saved mockups found for this garment.");
      const url = designAssetUrl(result.slug);
      const img = new Image();
      setUploaded(false);
      img.onload = () => { setAr(img.naturalWidth / img.naturalHeight); setUploaded(true); };
      img.onerror = () => setError("Saved artwork could not be previewed. Upload the PNG again before saving.");
      img.src = url;
      setDesignUrl(url);
      setSlug(result.slug);
      setSelected(new Set(result.colors));
      setPreviewColor(result.colors[0]);
      setPlacementsByGarment((all) => ({ ...all, [garment]: result.placements || {} }));
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load saved mockups.");
    } finally {
      setBusy(false);
    }
  }

  // ---- file pick ----
  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setAr(img.naturalWidth / img.naturalHeight);
    img.src = url;
    setDesignUrl(url);
    const s = slug || slugify(file.name);
    setSlug(s);
    setUploaded(false);
    setSaved(false);
    setError("");
    // upload in the background so the multi-color grid can render real Cloudinary art
    try {
      setBusy(true);
      const result = await onUpload(file, s);
      if (result?.assetSlug) setSlug(result.assetSlug);
      setUploaded(true);
    } catch (err) {
      setError("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setBusy(false);
    }
  }

  // ---- geometry <-> placement ----
  function rotatedHeight(w, h, angle) {
    const radians = (angle || 0) * Math.PI / 180;
    return Math.abs(h * Math.cos(radians)) + Math.abs(w * AR_CONTAINER * Math.sin(radians));
  }
  function rectFromPlacement() {
    const w = placement.w;                       // fraction of stage width
    // Convert the artwork width from a fraction of the stage width to a
    // fraction of the stage height while preserving the PNG's aspect ratio.
    const h = (w * AR_CONTAINER) / ar;
    const left = 0.5 + placement.x - w / 2;
    // Cloudinary's north gravity positions the rotated bounding box. Keep the
    // local drag preview aligned with that same top edge.
    const top = placement.y + (rotatedHeight(w, h, placement.angle) - h) / 2;
    return { left, top, w, h };
  }
  function setFromRect(left, top, w) {
    const x = left + w / 2 - 0.5;
    const width = clamp(w, 0.05, 0.95);
    const height = (width * AR_CONTAINER) / ar;
    const y = top - (rotatedHeight(width, height, placement.angle) - height) / 2;
    updatePlacement({ w: width, x: round(clamp(x, -0.6, 0.6)), y: round(clamp(y, -0.1, 0.95)) });
  }

  // ---- drag to move ----
  const drag = useRef(null);
  function onPointerDownMove(e) {
    const st = stageRef.current.getBoundingClientRect();
    const r = rectFromPlacement();
    drag.current = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, w: r.w, sw: st.width, sh: st.height };
    e.target.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!drag.current) return;
    const d = drag.current;
    const left = d.left + (e.clientX - d.x) / d.sw;
    const top = d.top + (e.clientY - d.y) / d.sh;
    setFromRect(left, top, d.w);
  }
  function onPointerUp() { drag.current = null; }

  // ---- resize handle (bottom-right) ----
  const rez = useRef(null);
  function onResizeDown(e) {
    e.stopPropagation();
    const st = stageRef.current.getBoundingClientRect();
    const r = rectFromPlacement();
    rez.current = { x: e.clientX, left: r.left, top: r.top, w: r.w, sw: st.width };
    e.target.setPointerCapture(e.pointerId);
  }
  function onResizeMove(e) {
    if (!rez.current) return;
    const d = rez.current;
    const w = d.w + (e.clientX - d.x) / d.sw;      // grow to the right
    // keep the design's center fixed while scaling
    const centerX = d.left + d.w / 2;
    setFromRect(centerX - w / 2, d.top, w);
  }
  function onResizeUp() { rez.current = null; }

  const r = rectFromPlacement();
  const selectedList = palette.filter((c) => selected.has(c.token));

  async function handleSave() {
    setBusy(true);
    setError("");
    try {
      const placements = Object.fromEntries([...selected].map((token) => [token, roundedPlacement(placementFor(token))]));
      await onSave({
        slug,
        productSlug: productSlug || null,
        garment,
        placement: roundedPlacement(placement),
        placements,
        colors: [...selected],
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save design.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="design-adjuster" style={S.wrap}>
      {/* ---------- editor ---------- */}
      <div>
        <div style={S.toolbar}>
          <label style={S.btn}>
            {designUrl ? "Replace PNG" : "Upload PNG"}
            <input type="file" accept="image/png" onChange={onFile} style={{ display: "none" }} />
          </label>
          <div style={S.seg}>
            {GARMENT_OPTIONS.map((option) => (
              <button key={option.id} onClick={() => changeGarment(option.id)}
                style={{ ...S.segBtn, ...(garment === option.id ? S.segOn : {}) }}>
                {option.label}
              </button>
            ))}
          </div>
          <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="design-slug" style={S.slug} />
        </div>

        <label style={S.productLabel}>
          Storefront product <span style={S.optional}>optional</span>
          <select value={productSlug} onChange={(e) => { const next = e.target.value; setProductSlug(next); if (next && !slug) setSlug(next); }} style={S.productSelect}>
            <option value="">Save placement only</option>
            {products.map((product) => <option key={product.slug} value={product.slug}>{product.name}{product.active ? "" : " — Draft"}</option>)}
          </select>
          <span style={S.help}>{productSlug ? `Saving will update this product’s ${GARMENTS[garment].label.toLowerCase()} colorways only.` : "Choose a product to send the generated mockups directly to its colorways."}</span>
        </label>
        <button type="button" onClick={loadSaved} disabled={!productSlug || busy} style={S.load}>
          Load saved mockups for this product and garment
        </button>

        <div ref={stageRef} style={S.stage}
          onPointerMove={(e) => { onPointerMove(e); onResizeMove(e); }}
          onPointerUp={() => { onPointerUp(); onResizeUp(); }}>
          <img src={blankUrl(garment, previewColor)} alt="" style={S.shirt} draggable={false} />
          {designUrl && (
            <div style={{
              position: "absolute", cursor: "grab",
              left: `${r.left * 100}%`, top: `${r.top * 100}%`,
              width: `${r.w * 100}%`, height: `${r.h * 100}%`,
              transform: `rotate(${placement.angle}deg)`,
            }} onPointerDown={onPointerDownMove}>
              <img src={designUrl} alt="" draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
              <div onPointerDown={onResizeDown} style={S.handle} />
            </div>
          )}
        </div>

        <div style={S.sizeRow}>
          <span style={S.lab}>Size</span>
          <input type="range" min="5" max="95" step="0.5" aria-label={`Size on ${palette.find((c) => c.token === previewColor)?.label || previewColor}`} value={(placement.w * 100).toFixed(1)}
            onChange={(e) => updatePlacement({ w: +e.target.value / 100 })}
            style={{ flex: 1 }} />
          <code style={S.code}>
            w {placement.w.toFixed(3)} · x {placement.x.toFixed(3)} · y {placement.y.toFixed(3)}
          </code>
        </div>

        <div style={S.sizeRow}>
          <label htmlFor="design-rotation" style={S.lab}>Rotate</label>
          <input id="design-rotation" type="range" min="-20" max="20" step="0.5" value={placement.angle}
            onChange={(e) => updatePlacement({ angle: +e.target.value })} style={{ flex: 1 }} />
          <code style={S.code}>{placement.angle.toFixed(1)}°</code>
          <button type="button" onClick={() => updatePlacement({ angle: 0 })} style={S.zero}>Reset</button>
        </div>

        <div style={S.previewPick}>
          <span style={S.lab}>Editing on</span>
          <select value={previewColor} onChange={(e) => setPreviewColor(e.target.value)} style={S.select}>
            {palette.map((c) => <option key={c.token} value={c.token}>{c.label}</option>)}
          </select>
          <span style={S.help}>Changes affect this color only.</span>
          {busy && <span style={{ color: "#ff4f3d", fontSize: 12 }}>working…</span>}
        </div>
      </div>

      {/* ---------- colors + output ---------- */}
      <div>
        <div style={S.lab}>Colors this design ships in ({selected.size})</div>
        <div style={S.swatches}>
          {palette.map((c) => {
            const on = selected.has(c.token);
            return (
              <button key={c.token} title={c.label} aria-label={`${c.label}${on ? " selected" : ""}`}
                onClick={() => { setSelected((s) => toggle(s, c.token)); setPreviewColor(c.token); setSaved(false); }}
                style={{ ...S.sw, outline: on ? "2.5px solid #ff4f3d" : "1px solid #ddd", background: c.hex }} />
            );
          })}
        </div>

        <div style={{ ...S.lab, marginTop: 14 }}>
          Reproduced across selected colors {uploaded ? "" : "(upload finishing…)"}
        </div>
        <div style={S.grid}>
          {uploaded && slug
            ? selectedList.map((c) => (
                <button type="button" key={c.token} onClick={() => setPreviewColor(c.token)}
                  aria-label={`Edit placement on ${c.label}`} style={{ ...S.cell, outline: previewColor === c.token ? "2px solid #ff4f3d" : "none" }}>
                  <img src={mockupUrl({ slug, garment, colorToken: c.token, placement: placementFor(c.token) })}
                    alt={c.label} style={S.cellImg} loading="lazy" />
                  <span style={S.cellLab}>{c.label}</span>
                </button>
              ))
            : <div style={S.hint}>Upload a PNG or load saved mockups. Choose a color to adjust its placement.</div>}
        </div>

        <div style={S.actions}>
          {error && <p style={S.error} role="alert">{error}</p>}
          <button onClick={handleSave} disabled={busy || !uploaded || !slug || selected.size === 0}
            style={{ ...S.save, opacity: busy || !uploaded || !slug ? 0.5 : 1 }}>
            {saved ? "Saved ✓" : "Save design + placement"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- helpers ----
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (v) => +Number(v).toFixed(4);
const roundedPlacement = (p) => ({ w: round(p.w), x: round(p.x), y: round(p.y), angle: round(p.angle || 0) });
function toggle(set, k) { const n = new Set(set); if (n.has(k)) n.delete(k); else n.add(k); return n; }

// ---- inline styles (no CSS framework needed) ----
const S = {
  wrap: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 24, fontFamily: "system-ui, sans-serif", color: "#1a1720" },
  toolbar: { display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" },
  btn: { padding: "9px 14px", background: "#ff4f3d", color: "#111", borderRadius: 4, fontSize: 13, fontWeight: 800, cursor: "pointer" },
  seg: { display: "flex", border: "1px solid #e4e0dc", borderRadius: 9, overflow: "hidden" },
  segBtn: { padding: "8px 14px", background: "#fff", border: "none", cursor: "pointer", fontSize: 13 },
  segOn: { background: "#1a1720", color: "#fff" },
  slug: { flex: 1, minWidth: 140, padding: "8px 10px", border: "1px solid #e4e0dc", borderRadius: 9, fontSize: 13, fontFamily: "ui-monospace, monospace" },
  stage: { position: "relative", width: "100%", aspectRatio: "2 / 3", background: "#141018", borderRadius: 14, overflow: "hidden", touchAction: "none", userSelect: "none" },
  shirt: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" },
  handle: { position: "absolute", right: -7, bottom: -7, width: 16, height: 16, background: "#ff4f3d", border: "2px solid #fff", borderRadius: "50%", cursor: "nwse-resize" },
  sizeRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 12 },
  lab: { fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b6675", fontWeight: 600 },
  code: { fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#6b6675", whiteSpace: "nowrap" },
  previewPick: { display: "flex", alignItems: "center", gap: 10, marginTop: 10 },
  select: { padding: "7px 10px", border: "1px solid #e4e0dc", borderRadius: 9, fontSize: 13 },
  productLabel: { display: "grid", gap: 6, marginBottom: 12, color: "#5f584f", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" },
  optional: { color: "#8b847b", fontSize: 9, fontWeight: 600 },
  productSelect: { width: "100%", padding: "10px", border: "1px solid #d1cbc1", borderRadius: 4, background: "#fff", color: "#111", fontSize: 13, textTransform: "none" },
  load: { marginBottom: 12, padding: "9px 12px", border: "1px solid #d1cbc1", borderRadius: 4, background: "#fff", color: "#1a1720", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  zero: { padding: "5px 8px", border: "1px solid #d1cbc1", borderRadius: 4, background: "#fff", fontSize: 11, cursor: "pointer" },
  help: { color: "#777066", fontSize: 10, fontWeight: 500, letterSpacing: 0, lineHeight: 1.4, textTransform: "none" },
  swatches: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(30px, 1fr))", gap: 6, marginTop: 8 },
  sw: { width: 30, height: 30, borderRadius: 7, cursor: "pointer", outlineOffset: 2, border: "none" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 8, maxHeight: 360, overflowY: "auto" },
  cell: { background: "#141018", border: "none", borderRadius: 10, padding: 6, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" },
  cellImg: { width: "100%", aspectRatio: "3 / 4", objectFit: "contain" },
  cellLab: { fontSize: 10, color: "#b7b2c0", marginTop: 2 },
  hint: { fontSize: 12, color: "#6b6675", lineHeight: 1.5, gridColumn: "1 / -1" },
  actions: { marginTop: 16 },
  error: { margin: "0 0 10px", color: "#b42318", fontSize: 12, lineHeight: 1.4 },
  save: { width: "100%", padding: "12px", background: "#1a1720", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
