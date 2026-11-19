import { isAdminRequest, supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';
const archiveSlug = 'admin-archive';

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return Response.json({error:'Invalid admin token.'},{status:401});
  try {
    const input = await request.json() as {productId?:string;archived?:boolean};
    if (!input.productId || !/^[0-9a-f-]{36}$/.test(input.productId) || typeof input.archived !== 'boolean') throw new Error('Choose a product and archive action.');
    const products = await supabaseAdmin(`products?select=id&id=eq.${encodeURIComponent(input.productId)}&limit=1`) as Array<{id:string}>;
    if (!products.length) throw new Error('Product not found.');
    let collections = await supabaseAdmin(`collections?select=id&slug=eq.${archiveSlug}&limit=1`) as Array<{id:string}>;
    if (input.archived && !collections.length) {
      collections = await supabaseAdmin('collections?on_conflict=slug', {method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify([{name:'Admin Archive',slug:archiveSlug,active:false,sort_order:9999}])}) as Array<{id:string}>;
    }
    const collectionId = collections[0]?.id;
    if (input.archived) {
      await supabaseAdmin(`products?id=eq.${input.productId}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({active:false,featured:false,new_drop:false})});
      await supabaseAdmin('product_collections?on_conflict=product_id,collection_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify([{product_id:input.productId,collection_id:collectionId,sort_order:9999}])});
    } else if (collectionId) {
      await supabaseAdmin(`product_collections?product_id=eq.${input.productId}&collection_id=eq.${collectionId}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    }
    return Response.json({ok:true,archived:input.archived});
  } catch (error) {
    return Response.json({error:error instanceof Error ? error.message : 'Unable to change archive.'},{status:400});
  }
}
