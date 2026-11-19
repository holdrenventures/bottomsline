'use client';
/* eslint-disable @next/next/no-img-element -- R2 gallery previews. */
import { useEffect, useRef, useState } from 'react';
export type DetailImage = {url:string;alt:string};
export default function ProductDetailImages({images,onChange,mockups,token,name}:{images:DetailImage[];onChange:(images:DetailImage[])=>void;mockups:Array<{mockup_url:string|null;style:string|null;color:string;active:boolean}>;token:string;name:string}) {
 const [source,setSource]=useState('');const [picture,setPicture]=useState<HTMLImageElement|null>(null);
 const [zoom,setZoom]=useState(1);const [x,setX]=useState(0);const [y,setY]=useState(0);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const c=canvas.current;if(!picture||!c)return;const ctx=c.getContext('2d');if(!ctx)return;const size=1200;const scale=Math.max(size/picture.width,size/picture.height)*zoom;const w=picture.width*scale,h=picture.height*scale;ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.drawImage(picture,(size-w)/2+x*(w-size)/2,(size-h)/2+y*(h-size)/2,w,h);},[picture,zoom,x,y]);
 async function upload(file:Blob) {
  const form=new FormData();form.append('file',file,'detail.jpg');
  const response=await fetch('/api/admin/product-images',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
  const result=await response.json() as {url?:string;error?:string};if(!response.ok || !result.url)throw new Error(result.error || 'Upload failed.');
  onChange([...images,{url:result.url,alt:`${name} — print detail`}]);
 }
 async function addPhoto(file?:File) {if(!file)return;setBusy(true);setError('');try{await upload(file);}catch(e){setError(e instanceof Error?e.message:'Upload failed.');}finally{setBusy(false);}}
 async function openCrop(){setBusy(true);setError('');try{const r=await fetch(`/api/admin/product-images?source=${encodeURIComponent(source)}`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error('Unable to open mockup.');const url=URL.createObjectURL(await r.blob());const img=new Image();img.onload=()=>{setPicture(img);setZoom(1);setX(0);setY(0);URL.revokeObjectURL(url);};img.onerror=()=>{URL.revokeObjectURL(url);setError('Unable to read image.');};img.src=url;}catch(e){setError(e instanceof Error?e.message:'Unable to open image.');}finally{setBusy(false);}}
 async function saveCrop(){setBusy(true);setError('');try{const blob=await new Promise<Blob>((resolve,reject)=>canvas.current?.toBlob(b=>b?resolve(b):reject(new Error('Unable to create crop.')),'image/jpeg',0.94));await upload(blob);setPicture(null);}catch(e){setError(e instanceof Error?e.message:'Unable to save crop.');}finally{setBusy(false);}}
 return <section className="admin-section"><h3>Detail photos and close-ups</h3><p className="admin-section__help">Add an optional close-up of the print or a real product photo. These appear in the product gallery. Save the product to publish your gallery changes.</p>
 <label>Upload a photo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||images.length>=8} onChange={e=>{void addPhoto(e.target.files?.[0]);e.target.value='';}} /></label>
 <div className="admin-fields"><label>Crop an existing mockup<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Choose garment and color…</option>{mockups.filter(m=>m.active&&m.mockup_url).map((m,i)=><option key={i} value={m.mockup_url!}>{m.style||'Tee'} · {m.color}</option>)}</select></label><button type="button" onClick={()=>void openCrop()} disabled={!source||busy||images.length>=8}>Open crop</button></div>
 {picture&&<div><canvas ref={canvas} width={1200} height={1200} style={{width:'100%',maxWidth:360,height:'auto',marginTop:12}} aria-label="Close-up crop preview" />
 <label>Zoom<input type="range" min={1} max={5} step={0.05} value={zoom} onChange={e=>setZoom(+e.target.value)} /></label>
 <label>Horizontal position<input type="range" min={-1} max={1} step={0.01} value={x} onChange={e=>setX(+e.target.value)} /></label>
 <label>Vertical position<input type="range" min={-1} max={1} step={0.01} value={y} onChange={e=>setY(+e.target.value)} /></label>
 <button type="button" disabled={busy} onClick={()=>void saveCrop()}>Add this close-up</button><button type="button" onClick={()=>setPicture(null)}>Cancel crop</button></div>}
 {error&&<p role="alert">{error}</p>}{busy&&<p role="status">Working…</p>}
 <div style={{display:'flex',flexWrap:'wrap',gap:16,marginTop:16}}>{images.map((item,index)=><div key={`${item.url}-${index}`} style={{width:180}}><img src={item.url} alt={item.alt} style={{width:180,height:180,objectFit:'contain'}} /><label>Description<input disabled={busy} maxLength={500} value={item.alt} onChange={e=>onChange(images.map((v,i)=>i===index?{...v,alt:e.target.value}:v))} /></label><button type="button" disabled={busy} onClick={()=>onChange(images.filter((_,i)=>i!==index))}>Remove photo</button></div>)}</div></section>;
}
