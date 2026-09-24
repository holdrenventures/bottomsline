import type { Metadata } from 'next';
import SiteHeader from '../SiteHeader';
import { getCatalogProducts } from '../data/products';
import CutItOutModeler from './CutItOutModeler';
import DiyGuide from './DiyGuide';

export const metadata: Metadata = {
  title: 'Cut It Out — Bottom’s Line Clothing',
  description: 'Turn any Bottom’s Line tee into a muscle tee, drop-arm tank, or crop. Zero sewing, one pair of scissors.',
  openGraph: {
    title: 'Cut It Out — Bottom’s Line Clothing',
    description: 'Your tee, your rules. Model the cut, then make it.',
    images: [],
  },
};

export default async function CutItOutPage() {
  const products = await getCatalogProducts();
  // Only shirts with a photo can be modeled — an SVG placeholder can’t be
  // clipped or overlaid convincingly.
  const shirts = products.filter((product) => product.catalogImage);

  return (
    <>
      <SiteHeader />
      <main className="cut-page">
        <section className="cut-hero shell">
          <p className="eyebrow"><span /> DIY / Cut It Out</p>
          <div className="cut-hero__copy">
            <h1>Cut it<br /><em>out.</em></h1>
            <p>Your tee, your rules. One pair of scissors turns any Bottom’s Line shirt into a muscle tee, a drop-arm tank, or a crop that shows exactly as much as you want. Model it here, then make it.</p>
          </div>
        </section>

        <CutItOutModeler products={shirts} />

        <DiyGuide />
      </main>
      <footer className="cut-footer">
        <div className="shell">
          <p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p>
          <p>Show us your cut. Tag <em>@bottomslineclothing</em>.</p>
        </div>
      </footer>
    </>
  );
}
