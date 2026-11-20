import ProductDetailGallery from '../ProductDetailGallery';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Clothespin, ProductAnnotation, Shirt } from '../../BrandVisuals';
import { getCatalogProducts, productPriceLabel } from '../../data/products';
import { JsonLd } from '../../lib/JsonLd';
import { notFoundMetadata, productPageMetadata, productStructuredData } from '../../lib/seo';
import SiteHeader from '../../SiteHeader';
import { productDetailRows } from '../product-details';
import { defaultHeroImage } from '../product-selection';
import { ProductHeroImage, ProductHeroProvider } from './ProductHero';
import ProductPurchaseAny from './ProductPurchaseAny';
import RelatedProducts from '../RelatedProducts';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getCatalogProducts()).find((item) => item.slug === slug);
  if (!product || slug === 'support-local-bottoms') return notFoundMetadata();
  return productPageMetadata(product, productPriceLabel(product));
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  // Reserved: the hand-tuned Support Local Bottoms page owns this slug.
  if (slug === 'support-local-bottoms') notFound();
  const catalog = await getCatalogProducts();
  const product = catalog.find((item) => item.slug === slug);
  if (!product) notFound();

  const eyebrow = product.editorialDescriptor || 'Conversation Starter';
  const priceLabel = productPriceLabel(product);
  const productDetails = productDetailRows(product);
  const nameParts = product.name.split(' ');
  const nameHead = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : product.name;
  const nameTail = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';

  return (
    <>
      <JsonLd data={productStructuredData(product)} />
      <SiteHeader />
      <main className="product-page">
        <div className="shell product-back-row">
          <a href="/shop">← Back to the line</a>
          <span>{eyebrow} / {product.slug}</span>
        </div>

        <ProductHeroProvider initialImage={defaultHeroImage(product)} initialAlt={product.name}>
        <section className="product-detail shell">
          <div className="product-detail__visual" data-ghost={nameParts[0]?.toUpperCase() || 'BOTTOMS'}>
            <div className="product-detail__line" aria-hidden="true"><Clothespin /></div>
            <ProductAnnotation>Read the shirt.<br />Twice, if needed.</ProductAnnotation>
            <span className="product-detail__index">BL / {product.slug}</span>
            <ProductHeroImage fallback={<Shirt art={product.art} tone={product.tone} detail />} />
          </div>

          <div className="product-detail__info">
            <p className="eyebrow"><span /> {eyebrow}</p>
            <div className="product-title-row">
              <h1>{nameTail ? <>{nameHead}<br /><em>{nameTail}</em></> : product.name}</h1>
              <p>{priceLabel}</p>
            </div>
            {product.description && <p className="product-description">{product.description}</p>}
            {product.productAnnotation && <p className="product-aside">{product.productAnnotation}</p>}
            {product.draft && <p className="product-aside">Draft listing — final copy and pricing pending.</p>}

            <ProductPurchaseAny product={product} />
            <ProductDetailGallery images={product.galleryImages} />

            {productDetails.length > 0 && <div className="product-specs">
              {productDetails.map(([label, value], index) => (
                <div key={label}>
                  <span className="product-specs__index">0{index + 1}</span>
                  <span className="product-specs__label">{label}</span>
                  <p>{value}</p>
                </div>
              ))}
            </div>}
            <a className="continue-shopping" href="/shop" aria-label="Keep looking at related products">Keep looking. We won’t judge. <span>↗</span></a>
          </div>
        </section>
        </ProductHeroProvider>

        <RelatedProducts product={product} catalog={catalog} />
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
