import type { Metadata } from 'next';
import SiteHeader from '../SiteHeader';
import { getCatalogProducts } from '../data/products';
import ShopCatalog from './ShopCatalog';

export const metadata: Metadata = {
  title: 'Shop the Line — Bottom’s Line Clothing',
  description: 'Conversation-starting shirts. Say it with your chest.',
};

export default async function ShopPage() {
  const products = await getCatalogProducts();
  return (
    <>
      <SiteHeader />
      <main className="shop-page">
        <section className="shop-intro shell">
          <p className="eyebrow"><span /> The full collection</p>
          <div><h1>Shop<br /><em>the line.</em></h1><p>Say it with your chest.</p></div>
        </section>
        <ShopCatalog products={products} />
      </main>
      <footer className="shop-footer"><div className="shell"><p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p><p>End of the line. For now.</p></div></footer>
    </>
  );
}
