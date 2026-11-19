'use client';
/* eslint-disable @next/next/no-img-element -- R2 product gallery images. */
import { useRef, useState } from 'react';
export default function ProductDetailGallery({images=[]}:{images?:Array<{url:string;alt:string}>}) {
 const dialog=useRef<HTMLDialogElement>(null);const [selected,setSelected]=useState(0);
 if(!images.length)return null;
 return <section className="product-detail-gallery"><h3>A closer look</h3><div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{images.map((item,index)=><button type="button" key={`${item.url}-${index}`} aria-label={`Enlarge ${item.alt || 'product detail'}`} onClick={()=>{setSelected(index);dialog.current?.showModal();}} style={{padding:0,border:'1px solid #ccc',background:'#fff',cursor:'zoom-in'}}><img src={item.url} alt={item.alt} loading="lazy" style={{display:'block',width:110,height:110,objectFit:'cover'}} /></button>)}</div>
 <dialog ref={dialog} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} style={{padding:16,border:0,maxWidth:'min(94vw,1000px)',maxHeight:'94vh'}}><button type="button" onClick={()=>dialog.current?.close()} autoFocus style={{display:'block',marginLeft:'auto',marginBottom:12}}>Close ✕</button><img src={images[selected]?.url} alt={images[selected]?.alt} style={{display:'block',maxWidth:'100%',maxHeight:'78vh',objectFit:'contain'}} /><p>{images[selected]?.alt}</p></dialog></section>;
}
