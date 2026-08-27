import type { Metadata } from 'next';
import { Clothespin, ProductAnnotation, Shirt } from '../../BrandVisuals';
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

// V1 PLACEHOLDER CONTENT: replace these specifications and shipping estimates
// with confirmed production details before this page is used for live sales.
const productDetails = [
  ['Material', 'Midweight cotton tee — placeholder specification'],
  ['Fit', 'Relaxed unisex fit — placeholder fit guidance'],
  ['Care', 'Wash cold, inside out. Dry low. Keep the joke intact.'],
  ['Shipping', 'Estimated 5–7 business days — placeholder timing'],
];

export default function SupportLocalBottomsPage() {
  return (
    <>
      <SiteHeader />
      <main className="product-page">
        <div className="shell product-back-row"><a href="/#shop">← Back to the line</a><span>Community Outreach / 001</span></div>

        <section className="product-detail shell">
          <div className="product-detail__visual">
            <div className="product-detail__line" aria-hidden="true"><Clothespin /></div>
            <ProductAnnotation>A public service,<br />more or less.</ProductAnnotation>
            <span className="product-detail__index">BL / 001</span>
            <Shirt art={['SUPPORT', 'LOCAL', 'BOTTOMS']} tone="coral" detail />
          </div>

          <div className="product-detail__info">
            <p className="eyebrow"><span /> Community Outreach</p>
            <div className="product-title-row"><h1>Support Local<br /><em>Bottoms</em></h1><p>$32</p></div>
            <p className="product-description">A public service announcement.<br />Support locally.</p>
            <p className="product-aside">The right people will read it twice.</p>
            <ProductPurchase />

            <div className="product-specs">
              {productDetails.map(([label, value], index) => <div key={label}><span className="product-specs__index">0{index + 1}</span><span className="product-specs__label">{label}</span><p>{value}</p></div>)}
            </div>
            <a className="continue-shopping" href="/#shop" aria-label="Keep looking at related products">Keep looking. We won’t judge. <span>↗</span></a>
          </div>
        </section>

        <section className="product-statement">
          <div className="shell"><p>Community support<br />looks good <em>on you.</em></p><span>Wear locally.</span></div>
        </section>
      </main>
      <footer className="product-footer"><div className="shell"><p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p><a href="/#shop">Return to shopping ↗</a></div></footer>
    </>
  );
}
