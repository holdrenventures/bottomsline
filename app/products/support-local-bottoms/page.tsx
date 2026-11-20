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
import { ProductHeroImage, ProductHeroProvider } from '../[slug]/ProductHero';
import ProductPurchase from './ProductPurchase';
import RelatedProducts from '../RelatedProducts';

export async function generateMetadata(): Promise<Metadata> {
  const product = (await getCatalogProducts()).find((item) => item.slug === 'support-local-bottoms');
  if (!product) return notFoundMetadata();
  return productPageMetadata(product, productPriceLabel(product));
}

export default async function SupportLocalBottomsPage() {
  const catalog = await getCatalogProducts();
  const product = catalog.find((item) => item.slug === 'support-local-bottoms');

  if (!product) notFound();
  const productDetails = productDetailRows(product);

  return (
    <>
      <JsonLd data={productStructuredData(product)} />
      <SiteHeader />
      <main className="product-page">
        <div className="shell product-back-row"><a href="/shop">← Back to the line</a><span>Community Outreach / 001</span></div>

        <ProductHeroProvider initialImage={defaultHeroImage(product)} initialAlt={product.name}>
        <section className="product-detail shell">
          <div className="product-detail__visual" data-ghost="LOCAL">
            <div className="product-detail__line" aria-hidden="true"><Clothespin /></div>
            <ProductAnnotation>A public service,<br />more or less.</ProductAnnotation>
            <span className="product-detail__index">BL / 001</span>
            <ProductHeroImage fallback={<Shirt art={['SUPPORT', 'LOCAL', 'BOTTOMS']} tone="coral" detail />} />
          </div>

          <div className="product-detail__info">
            <p className="eyebrow"><span /> Community Outreach</p>
            <div className="product-title-row"><h1>Support Local<br /><em>Bottoms</em></h1><p>{productPriceLabel(product)}</p></div>
            <p className="product-description">A public service announcement.<br />Support locally.</p>
            <p className="product-aside">The right people will read it twice.</p>
            <ProductPurchase product={product} />
            <ProductDetailGallery images={product.galleryImages} />

            {productDetails.length > 0 && <div className="product-specs">
              {productDetails.map(([label, value], index) => <div key={label}><span className="product-specs__index">0{index + 1}</span><span className="product-specs__label">{label}</span><p>{value}</p></div>)}
            </div>}
            <a className="continue-shopping" href="/shop" aria-label="Keep looking at related products">Keep looking. We won’t judge. <span>↗</span></a>
          </div>
        </section>
        </ProductHeroProvider>

        <RelatedProducts product={product} catalog={catalog} />
        <section className="product-statement">
          <div className="shell"><p>Community support<br />looks good <em>on you.</em></p><span>Wear locally.</span></div>
        </section>
      </main>
      <footer className="product-footer"><div className="shell"><p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p><a href="/shop">Return to shopping ↗</a></div></footer>
    </>
  );
}
