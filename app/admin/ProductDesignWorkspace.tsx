'use client';

import DesignAdjuster from './designs/DesignAdjuster';
import { GARMENTS } from '../lib/blc-cloudinary';

type ProductRef = { name:string; slug:string; active:boolean; product_variants:Array<{style:string;garment:string|null;active:boolean}> };

export default function ProductDesignWorkspace({product,products,token,onSaved}:{product:ProductRef;products:ProductRef[];token:string;onSaved:()=>Promise<void>}) {
  const auth = { Authorization: `Bearer ${token}` };
  async function upload(file:File,slug:string) {
    const body = new FormData(); body.append('file',file); body.append('slug',slug);
    const response = await fetch('/api/admin/designs/upload',{method:'POST',headers:auth,body});
    const result = await response.json() as {error?:string;artworkUrl?:string;assetSlug?:string};
    if (!response.ok || !result.artworkUrl) throw new Error(result.error || 'Artwork upload failed.');
    return {artworkUrl:result.artworkUrl,assetSlug:result.assetSlug};
  }
  async function save(value:unknown) {
    const response = await fetch('/api/admin/designs',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify(value)});
    const result = await response.json() as {error?:string;mockupUrls?:Record<string,string>};
    if (!response.ok) throw new Error(result.error || 'Unable to save mockups.');
    await onSaved();
    return result;
  }
  async function load(productSlug:string,garment:string) {
    const params = new URLSearchParams({productSlug,garment});
    const response = await fetch(`/api/admin/designs?${params}`,{headers:auth});
    const result = await response.json() as {error?:string;slug?:string;artworkUrl?:string;artworkUrls?:Record<string,string>;colors?:string[];placements?:Record<string,{w:number;x:number;y:number;angle:number;brightness:number}>};
    if (!response.ok || !result.slug || !result.colors || !result.placements) throw new Error(result.error || 'No saved placements for that garment.');
    return {slug:result.slug,artworkUrl:result.artworkUrl,artworkUrls:result.artworkUrls,colors:result.colors,placements:result.placements};
  }
  const firstGarment = Object.entries(GARMENTS).find(([, config]) => product.product_variants.some((v) => v.active && v.style === config.style && v.garment === config.model))?.[0] || 'tee';
  return <DesignAdjuster key={product.slug} products={products} lockedProduct={product.slug} initialGarment={firstGarment} onUpload={upload} onSave={save} onLoad={load} onCreate={async()=>{throw new Error('Create a new product from the Product Desk.');}} />;
}
