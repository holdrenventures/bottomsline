import type { Metadata } from 'next';
import SiteHeader from '../SiteHeader';
import { getCatalogProducts } from '../data/products';
import CutItOutModeler from './CutItOutModeler';
import DiyGuide from './DiyGuide';

const SITE_URL = 'https://bottomslineclothing.com';
const PAGE_URL = `${SITE_URL}/cut-it-out`;
const OG_IMAGE = `${SITE_URL}/og.png`;

const description =
  'Free step-by-step DIY guide with diagrams and a live modeler that previews the cut on your own shirt. Turn any t-shirt into a muscle tank, drop-arm tank, or crop top — no sewing, one pair of scissors.';

export const metadata: Metadata = {
  title: 'How to Cut a T-Shirt: DIY Muscle Tee, Tank & Crop Top Guide',
  description,
  keywords: [
    'how to cut a t-shirt',
    'how to cut a shirt',
    'how to cut a mens shirt',
    'DIY muscle tee',
    'DIY tank top',
    'drop-arm tank tutorial',
    'crop top DIY',
    'cut your own tank top',
    'cut off shirt DIY',
    'no-sew shirt modifications',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'article',
    url: PAGE_URL,
    title: 'How to Cut a T-Shirt: DIY Muscle Tee, Tank & Crop Top Guide',
    description,
    siteName: 'Bottom’s Line Clothing',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Cut It Out — DIY shirt cutting guide' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Cut a T-Shirt: DIY Muscle Tee, Tank & Crop Top Guide',
    description,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

// HowTo structured data — Google surfaces these as rich results for
// "how to cut a t-shirt" queries. One HowTo per cut, wrapped in a graph
// alongside a WebPage node for the page itself.
function buildStructuredData() {
  const commonTool = [
    { '@type': 'HowToTool', name: 'Sharp fabric scissors' },
    { '@type': 'HowToTool', name: 'Fabric chalk or washable marker' },
    { '@type': 'HowToTool', name: 'Ruler or tape measure' },
    { '@type': 'HowToSupply', name: 'A t-shirt that fits across the shoulders' },
  ];

  const muscleTee = {
    '@type': 'HowTo',
    '@id': `${PAGE_URL}#how-to-muscle`,
    name: 'How to Cut a T-Shirt Into a Muscle Tee',
    description: 'Turn any t-shirt into a sleeveless muscle tank in five minutes with one pair of scissors.',
    totalTime: 'PT5M',
    tool: commonTool,
    step: [
      { '@type': 'HowToStep', name: 'Fold', text: 'Fold the tee in half lengthwise so the sleeves stack on top of each other.' },
      { '@type': 'HowToStep', name: 'Find the seam', text: 'Find the seam where the sleeve joins the body.' },
      { '@type': 'HowToStep', name: 'Cut', text: 'Cut along the sleeve side of that seam, keeping the stitching on the body so the armhole does not stretch out.' },
      { '@type': 'HowToStep', name: 'Deepen if needed', text: 'For more room, take the underarm down about 1 inch, curving back up to meet the seam at the shoulder.' },
      { '@type': 'HowToStep', name: 'Roll the edges', text: 'Unfold, try it on, then stretch any raw edges so they roll into a soft finished curl.' },
    ],
  };
  const dropArm = {
    '@type': 'HowTo',
    '@id': `${PAGE_URL}#how-to-drop-arm`,
    name: 'How to Cut a T-Shirt Into a Drop-Arm Tank',
    description: 'Cut a J-curve armhole into a t-shirt for a drop-arm tank that shows the side body.',
    totalTime: 'PT10M',
    tool: commonTool,
    step: [
      { '@type': 'HowToStep', name: 'Mark the depth', text: 'Put the shirt on and chalk a dot on the side seam where you want the armhole to end (typically 4 to 6 inches below the armpit).' },
      { '@type': 'HowToStep', name: 'Fold flat', text: 'Lay the shirt flat and fold it in half lengthwise, sleeves stacked.' },
      { '@type': 'HowToStep', name: 'Mark the strap', text: 'On the shoulder seam, mark 2 to 3 inches out from the collar for the shoulder strap width.' },
      { '@type': 'HowToStep', name: 'Draw the J-curve', text: 'Draw a J-curve from the strap mark down to the depth mark. Curve in toward the chest first, then sweep out to the side seam.' },
      { '@type': 'HowToStep', name: 'Cut', text: 'Cut through all layers along the curve in long, smooth strokes.' },
      { '@type': 'HowToStep', name: 'Adjust', text: 'Try it on. Go deeper in 0.5 inch passes if you want more side body showing.' },
    ],
  };
  const crop = {
    '@type': 'HowTo',
    '@id': `${PAGE_URL}#how-to-crop`,
    name: 'How to Cut a T-Shirt Into a Crop Top',
    description: 'Cut a t-shirt hem short to make a crop top.',
    totalTime: 'PT5M',
    tool: commonTool,
    step: [
      { '@type': 'HowToStep', name: 'Mark with arms up', text: 'Put the shirt on, raise your arms overhead, and chalk where you want the hem to land. Hems ride up when you move.' },
      { '@type': 'HowToStep', name: 'Add margin', text: 'Add 1 inch below that mark. The raw edge rolls up about 0.5 inch after a wash.' },
      { '@type': 'HowToStep', name: 'Draw the line', text: 'Lay the shirt flat with the side seams lined up and chalk a straight line across with a ruler.' },
      { '@type': 'HowToStep', name: 'Cut', text: 'Cut through both layers in long, even strokes.' },
      { '@type': 'HowToStep', name: 'Roll the hem', text: 'Stretch the new hem all the way around so it rolls clean.' },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': PAGE_URL,
        url: PAGE_URL,
        name: 'How to Cut a T-Shirt: DIY Muscle Tee, Tank & Crop Top Guide',
        description,
        inLanguage: 'en-US',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${SITE_URL}#site`,
          url: SITE_URL,
          name: 'Bottom’s Line Clothing',
        },
      },
      muscleTee,
      dropArm,
      crop,
    ],
  };
}

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

  const structuredData = buildStructuredData();

  return (
    <>
      <SiteHeader />
      <main className="cut-page">
        {/* JSON-LD HowTo — indexed by Google, invisible to the user. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <section className="cut-hero shell">
          <p className="eyebrow"><span /> DIY / Cut It Out</p>
          <div className="cut-hero__copy">
            <h1>Cut it<br /><em>out.</em></h1>
            <p>Your tee, your rules. One pair of scissors turns any Bottom’s Line tee into a muscle tee, a drop-arm tank, or a crop that shows exactly as much as you want. Model it here, then make it.</p>
            <p className="cut-hero__note"><span className="cut-hero__badge">DIY</span> These are do-it-yourself instructions. We ship the tees uncut. The scissors are on you.</p>
          </div>
        </section>

        {/* Keyword-rich intro so the page ranks for search phrases people
            actually type, without spamming the visible design. */}
        <section className="cut-intro shell">
          <h2 className="sr-only">How to cut a t-shirt</h2>
          <p>
            Looking for how to cut a t-shirt into a tank, muscle tee, or crop top? This is the free
            DIY guide — an interactive modeler that previews the cut on your own shirt, plus a
            step-by-step for each classic modification with a labeled diagram. Works for any
            unisex men’s or women’s tee: cotton, tri-blend, whatever’s already hanging in the
            closet. No sewing.
          </p>
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
