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
  // clipped or overlaid convincingly. Also skip products whose only style is
  // tank/other: the modeler is a tee-cutting tool, tanks are already tanks.
  const shirts = products.filter((product) => {
    if (!product.catalogImage) return false;
    if (product.colors.length === 0) return true; // mock fallback keeps rendering
    return product.colors.some((color) => (color.style ?? '').toLowerCase().includes('tee'));
  });

  return (
    <>
      <SiteHeader />
      <main className="cut-page">
        <section className="cut-hero shell">
          <p className="eyebrow"><span /> DIY / Cut It Out</p>
          <div className="cut-hero__copy">
            <h1>Cut it<br /><em>out.</em></h1>
            <p>Your tee, your rules. One pair of scissors turns any Bottom’s Line tee into a muscle tee, a drop-arm tank, or a crop that shows exactly as much as you want. Model it here, then make it.</p>
            <p className="cut-hero__note"><span className="cut-hero__badge">DIY</span> These are do-it-yourself instructions. We ship the tees uncut. The scissors are on you.</p>
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
