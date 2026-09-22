import type { CSSProperties } from 'react';
import EmailSignup from './EmailSignup';
import { Clothespin, Shirt } from './BrandVisuals';
import SiteHeader from './SiteHeader';
import { getCatalogProducts } from './data/products';
import { pinShift, pinSlant } from './lib/pin-shift';
import { trimMockup } from './lib/cloudinary';

const collections = [
  { name: 'Support Local Bottoms', number: '01', note: 'Civic-minded, mostly.' },
  { name: 'Cruising', number: '02', note: 'No destination required.' },
  { name: 'Parodies', number: '03', note: 'Legally, these are jokes.' },
  { name: 'Nashville', number: '04', note: 'Bless your whole heart.' },
  { name: 'Pride', number: '05', note: 'Year-round behavior.' },
  { name: 'New Drops', number: '06', note: 'Freshly inappropriate.' },
];

function PinnedEditorial({ imageSrc, imageAlt = 'Bottom’s Line editorial snapshot' }: { imageSrc?: string; imageAlt?: string }) {
  return (
    <figure className="pinned-editorial">
      <Clothespin />
      <div className="pinned-editorial__image">
        {imageSrc ? (
          <img src={imageSrc} alt={imageAlt} />
        ) : (
          <div className="pinned-editorial__placeholder" aria-label="Future phone photo placeholder">
            <span className="pinned-editorial__ghost">BL</span>
            <Shirt art={['FOUND', 'EACH', 'OTHER']} tone="cream" />
          </div>
        )}
      </div>
      <figcaption><span>proof of concept</span> / phone photo goes here</figcaption>
    </figure>
  );
}

export default async function Home() {
  const catalog = await getCatalogProducts();
  const featured = catalog.filter((product) => product.featured);
  const featuredIds = new Set(featured.map((product) => product.id));
  const products = [...featured, ...catalog.filter((product) => !featuredIds.has(product.id))]
    .slice(0, 4)
    .map((product) => ({
      name: product.name,
      label: product.editorialDescriptor,
      price: `$${Math.round(product.price)}`,
      art: product.art,
      tone: product.tone,
      href: `/products/${product.slug}`,
      image: product.catalogImage,
    }));

  return (
    <main>
      <SiteHeader />

      <section className="hero shell" id="top">
        <div className="hero__copy">
          <p className="eyebrow"><span /> Shirts for loud inside thoughts</p>
          <h1>Skip the<br /><em>Small Talk.</em></h1>
          <p className="hero__lead">Wear something worth talking about.</p>
          <p className="hero__body">Bottom’s Line makes conversation-starting apparel for people who would rather be honest than boring.</p>
          <a className="button button--primary" href="/shop">Shop the collection <span aria-hidden="true">↗</span></a>
        </div>
        <div className="hero__visual">
          <span className="hero__line" aria-hidden="true"><Clothespin /></span>
          <span className="scribble scribble--top">GOOD FROM<br />EVERY ANGLE</span>
          <img className="hero-shirt" src={trimMockup('https://res.cloudinary.com/bihiyho3/image/upload/v1790043735/ChatGPT_Image_Aug_27_2026_05_18_54_PM_3.png') ?? undefined} alt="Support Local Bottoms shirt hanging on the Bottom’s Line clothesline" />
          <span className="scribble scribble--bottom">Wear responsibly.<br />Or don’t.</span>
        </div>
      </section>

      <div className="ticker" aria-hidden="true"><div>FLIRT RESPONSIBLY <span>✦</span> SAY THE QUIET PART OUT LOUD <span>✦</span> HOT PEOPLE READ THE SHIRT <span>✦</span> FLIRT RESPONSIBLY <span>✦</span> SAY THE QUIET PART OUT LOUD <span>✦</span> HOT PEOPLE READ THE SHIRT <span>✦</span></div></div>

      {products.length > 0 && <section className="products shell section" id="shop">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> Featured troublemakers</p><h2>Wear your<br /><em>inside voice.</em></h2></div>
          <p>Four ways to make eye contact easier.</p>
        </div>
        <div className="product-rail" aria-label="Featured shirts hanging on the Bottom’s Line clothesline">
          <div className="product-grid">
            {products.map((product, index) => (
              <article className="product-card" key={product.name} style={{ ["--pin-shift" as string]: pinShift(product.name), ["--pin-slant" as string]: pinSlant(product.name) } as CSSProperties}>
                <a className="product-card__image" href={product.href || '/shop'} aria-label={`Shop ${product.name}`}>
                  <Clothespin />
                  <span className="product-card__number">0{index + 1}</span>
                  <div className="product-card__media">{product.image ? <img src={product.image} alt={product.name} /> : <Shirt art={product.art} tone={product.tone} />}</div>
                </a>
                <div className="product-card__meta"><p>{product.label}</p><span>{product.price}</span></div>
                <h3>{product.name}</h3>
                <a href={product.href || '/shop'} aria-label={`Read the shirt: ${product.name}`}>Read the shirt <span aria-hidden="true">↗</span></a>
              </article>
            ))}
          </div>
        </div>
      </section>}

      <section className="manifesto section">
        <div className="shell manifesto__inner">
          <span className="manifesto__mark">“</span>
          <p>We make conversation starters<br />disguised as <em>t-shirts.</em></p>
          <p className="manifesto__aside">The right people already<br />know what you mean.</p>
        </div>
      </section>

      <div className="clothesline-divider shell" aria-hidden="true"><Clothespin compact /><span>hold this thought</span></div>

      <section className="story shell section" id="story">
        <div className="story__side"><p className="eyebrow"><span /> The origin story</p><PinnedEditorial /></div>
        <div className="story__copy">
          <h2>It started with<br /><em>one joke.</em></h2>
          <p>I made one shirt because I couldn’t stop laughing at a joke. Then I made another. Then my friends wanted them. Then strangers did.</p>
          <p>Bottom’s Line exists because the best shirts don’t just make people laugh. They help people find each other.</p>
          <span className="signature">— The Bottom Line</span>
        </div>
      </section>

      <section className="collections section">
        <div className="shell">
          <div className="section-heading section-heading--collections"><div><p className="eyebrow"><span /> Pick your poison</p><h2>Shop by<br /><em>mood.</em></h2></div><p>There’s a shirt for that.</p></div>
          <div className="collection-list">
            {collections.map((collection) => (
              <a href="/shop" className="collection-row" key={collection.name}><span className="collection-row__number">{collection.number}</span><h3>{collection.name}</h3><p>{collection.note}</p><span className="collection-row__arrow" aria-hidden="true">↗</span></a>
            ))}
          </div>
        </div>
      </section>

      <section className="signup shell section">
        <div className="signup__copy"><p className="eyebrow"><span /> Get on the list</p><h2>Be the first to hear<br /><em>the quiet part.</em></h2><p>New drops, bad ideas, and the occasional excellent one.</p></div>
        <EmailSignup />
      </section>

      <footer>
        <div className="shell footer__top">
          <p>Still here? You’re probably<br /><em>our kind of people.</em></p>
          <div className="footer__links"><div><span>Browse</span><a href="/shop">Shop all</a><a href="/shop">New drops</a><a href="#story">Our deal</a></div><div><span>Follow</span><a href="#top">Instagram</a><a href="#top">TikTok</a></div></div>
        </div>
        <div className="shell footer__bottom"><p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p><p>© 2026 Bottom’s Line Clothing <span>Made with poor judgment.</span></p></div>
      </footer>
    </main>
  );
}
