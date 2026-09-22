import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Clothespin, ProductAnnotation, Shirt } from '../../BrandVisuals';
import { getProductBySlug } from '../../data/products';
import SiteHeader from '../../SiteHeader';
import ProductPurchaseAny from './ProductPurchaseAny';

// V1 PLACEHOLDER SPECS: replace with confirmed production details before live sales.
const productDetails = [
  ['Material', 'Midweight cotton tee — placeholder specification'],
  ['Fit', 'Relaxed unisex fit — placeholder fit guidance'],
  ['Care', 'Wash cold, inside out. Dry low. Keep the joke intact.'],
  ['Shipping', 'Estimated 5–7 business days — placeholder timing'],
];

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Not found — Bottom’s Line Clothing' };
  const title = `${product.name} — Bottom’s Line Clothing`;
  const description = product.description?.trim() || `${product.editorialDescriptor}. Say it with your chest.`;
  return {
    title,
    description,
    openGraph: { title, description, images: product.catalogImage ? [{ url: product.catalogImage }] : [] },
    twitter: { card: 'summary', title, description, images: product.catalogImage ? [product.catalogImage] : [] },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  // Reserved: the hand-tuned Support Local Bottoms page owns this slug.
  if (slug === 'support-local-bottoms') notFound();
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const eyebrow = product.editorialDescriptor || 'Conversation Starter';
  const priceLabel = `$${Math.round(product.price)}`;
  const nameParts = product.name.split(' ');
  const nameHead = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : product.name;
  const nameTail = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';

  return (
    <>
      <SiteHeader />
      <main className="product-page">
        <div className="shell product-back-row">
          <a href="/shop">← Back to the line</a>
          <span>{eyebrow} / {product.slug}</span>
        </div>

        <section className="product-detail shell">
          <div className="product-detail__visual">
            <div className="product-detail__line" aria-hidden="true"><Clothespin /></div>
            <ProductAnnotation>Read the shirt.<br />Twice, if needed.</ProductAnnotation>
            <span className="product-detail__index">BL / {product.slug}</span>
            {product.catalogImage
              ? <img className="product-detail__image" src={product.catalogImage} alt={product.name} />
              : <Shirt art={product.art} tone={product.tone} detail />}
          </div>

          <div className="product-detail__info">
            <p className="eyebrow"><span /> {eyebrow}</p>
            <div className="product-title-row">
              <h1>{nameTail ? <>{nameHead}<br /><em>{nameTail}</em></> : product.name}</h1>
              <p>{priceLabel}</p>
            </div>
            {product.description && <p className="product-description">{product.description}</p>}
            {product.draft && <p className="product-aside">Draft listing — final copy and pricing pending.</p>}

            <ProductPurchaseAny product={product} />

            <div className="product-specs">
              {productDetails.map(([label, value], index) => (
                <div key={label}>
                  <span className="product-specs__index">0{index + 1}</span>
                  <span className="product-specs__label">{label}</span>
                  <p>{value}</p>
                </div>
              ))}
            </div>
            <a className="continue-shopping" href="/shop" aria-label="Keep looking at related products">Keep looking. We won’t judge. <span>↗</span></a>
          </div>
        </section>

        <section className="product-statement">
          <div className="shell"><p>Read the room.<br /><em>Then ignore it.</em></p><span>Wear responsibly.</span></div>
        </section>
      </main>
      <footer className="product-footer">
        <div className="shell">
          <p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p>
          <a href="/shop">Return to shopping ↗</a>
        </div>
      </footer>
    </>
  );
}
