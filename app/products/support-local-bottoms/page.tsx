import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Clothespin, ProductAnnotation, Shirt } from '../../BrandVisuals';
import { getProductBySlug, productPriceLabel } from '../../data/products';
import SiteHeader from '../../SiteHeader';
import ProductPurchase from './ProductPurchase';

export const metadata: Metadata = {
  title: 'Support Local Bottoms — Bottom’s Line Clothing',
  description: 'Support Local Bottoms. Community outreach you can wear.',
  openGraph: {
    title: 'Support Local Bottoms — Bottom’s Line Clothing',
    description: 'Community outreach you can wear.',
    images: [],
  },
  twitter: {
    card: 'summary',
    title: 'Support Local Bottoms — Bottom’s Line Clothing',
    description: 'Community outreach you can wear.',
    images: [],
  },
};

export default async function SupportLocalBottomsPage() {
  const product = await getProductBySlug('support-local-bottoms');

  if (!product) notFound();
  const productDetails = [
    ['Material', product.material],
    ['Fit', product.fitNotes],
    ['Care', product.careInstructions],
    ['Shipping', product.shippingNote],
  ].filter((detail): detail is [string, string] => Boolean(detail[1]));

  return (
    <>
      <SiteHeader />
      <main className="product-page">
        <div className="shell product-back-row"><a href="/shop">← Back to the line</a><span>Community Outreach / 001</span></div>

        <section className="product-detail shell">
          <div className="product-detail__visual">
            <div className="product-detail__line" aria-hidden="true"><Clothespin /></div>
            <ProductAnnotation>A public service,<br />more or less.</ProductAnnotation>
            <span className="product-detail__index">BL / 001</span>
            <Shirt art={['SUPPORT', 'LOCAL', 'BOTTOMS']} tone="coral" detail />
          </div>

          <div className="product-detail__info">
            <p className="eyebrow"><span /> Community Outreach</p>
            <div className="product-title-row"><h1>Support Local<br /><em>Bottoms</em></h1><p>{productPriceLabel(product)}</p></div>
            <p className="product-description">A public service announcement.<br />Support locally.</p>
            <p className="product-aside">The right people will read it twice.</p>
            <ProductPurchase product={product} />

            {productDetails.length > 0 && <div className="product-specs">
              {productDetails.map(([label, value], index) => <div key={label}><span className="product-specs__index">0{index + 1}</span><span className="product-specs__label">{label}</span><p>{value}</p></div>)}
            </div>}
            <a className="continue-shopping" href="/shop" aria-label="Keep looking at related products">Keep looking. We won’t judge. <span>↗</span></a>
          </div>
        </section>

        <section className="product-statement">
          <div className="shell"><p>Community support<br />looks good <em>on you.</em></p><span>Wear locally.</span></div>
        </section>
      </main>
      <footer className="product-footer"><div className="shell"><p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p><a href="/shop">Return to shopping ↗</a></div></footer>
    </>
  );
}
