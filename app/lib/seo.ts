import type { Metadata } from 'next';
import { imageDimensions } from './delivery-images.ts';
import { FREE_SHIPPING_MIN_CENTS } from './pricing.ts';
import { SHIPS_IN_BUSINESS_DAYS, SIZE_SWAP_DAYS } from './promo.ts';

export const SITE_ORIGIN = 'https://bottomslineclothing.com';
export const SITE_NAME = 'Bottom’s Line Clothing';
export const DEFAULT_OG_IMAGE = '/og.png';
export const DEFAULT_OG_ALT = 'Skip the Small Talk — Bottom’s Line Clothing';

export const DESCRIPTION_MIN = 120;
export const DESCRIPTION_MAX = 158;

export const HOME_TITLE = 'Bottom’s Line — Queer Pride Apparel, Nashville';
export const HOME_DESCRIPTION = 'Cheeky queer and gay pride apparel from Nashville. LGBTQ tees, tanks, and sweatshirts for people who’d rather be honest than boring. Skip the small talk.';

export const SHOP_TITLE = 'Shop Queer & LGBTQ Apparel — Bottom’s Line';
export const SHOP_DESCRIPTION = 'Shop gay, queer, and pride apparel from Nashville. LGBTQ tees, tanks, and sweatshirts for people who’d rather be honest than boring.';

export const CUSTOM_TITLE = 'Custom Shirts — Bottom’s Line Clothing';
export const CUSTOM_DESCRIPTION = 'Customize a Bottom’s Line design or start from scratch. Team, crew, and group shirt orders are welcome, and I’ll be in touch.';

export const CUT_TITLE = 'How to Cut a T-Shirt: DIY Muscle Tee, Tank & Crop Top Guide';
export const CUT_META_DESCRIPTION = 'Free guide to cutting a t-shirt into a muscle tee, drop-arm tank, or crop top, with diagrams and a live modeler. No sewing.';

export const BAG_TITLE = 'Your Bag — Bottom’s Line Clothing';
export const BAG_DESCRIPTION = 'The shirts you were bold enough to choose are in your bag. Review the sizes and prices here before you head to checkout.';

export const CHECKOUT_TITLE = 'Order Received — Bottom’s Line Clothing';
export const CHECKOUT_DESCRIPTION = 'Your Bottom’s Line order page. Payment confirmation shows here after checkout, and the paper trail arrives in your inbox.';

export type SeoVariant = {
  sku: string;
  price: number;
  active: boolean;
  inventoryQuantity: number | null;
};

export type SeoColor = {
  active: boolean;
  mockupUrl: string | null;
  color?: string | null;
};

export type ProductSeoSource = {
  name: string;
  slug: string;
  description: string;
  editorialDescriptor: string;
  collection: string;
  collections?: string[] | null;
  price: number;
  currency?: string | null;
  catalogImage: string | null;
  active: boolean;
  draft?: boolean;
  material?: string | null;
  variants?: SeoVariant[];
  colors?: SeoColor[];
};

export function canonicalUrl(path: string): string {
  const url = new URL(path, SITE_ORIGIN);
  url.protocol = 'https:';
  url.hostname = 'bottomslineclothing.com';
  url.port = '';
  url.search = '';
  url.hash = '';
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  // Next renders the homepage canonical without a trailing slash. Match that in the sitemap.
  if (url.pathname === '/') return url.origin;
  return url.toString();
}

export function absoluteAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return new URL(url, SITE_ORIGIN).toString();
}

function collapse(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function fitMetaDescription(primary: string, supplements: string[] = []): string {
  const pieces = [primary, ...supplements].map(collapse).filter(Boolean);
  let text = '';
  for (const piece of pieces) {
    const next = text ? `${text} ${piece}` : piece;
    if (next.length > DESCRIPTION_MAX) {
      if (!text) text = piece.slice(0, DESCRIPTION_MAX).replace(/\s+\S*$/, '').replace(/[.,;:!-]+$/, '');
      break;
    }
    text = next;
    if (text.length >= DESCRIPTION_MIN) break;
  }
  if (text.length > DESCRIPTION_MAX) {
    text = text.slice(0, DESCRIPTION_MAX).replace(/\s+\S*$/, '').replace(/[.,;:!-]+$/, '');
  }
  if (text.length < DESCRIPTION_MIN) {
    const closer = `See it at ${SITE_NAME}.`;
    if (text.length + closer.length + 1 <= DESCRIPTION_MAX) text = `${text} ${closer}`;
  }
  return text;
}

export function productMetaDescription(product: Pick<ProductSeoSource, 'name' | 'description' | 'editorialDescriptor' | 'collection'>, priceLabel: string): string {
  const primary = collapse(product.description) || `${product.name}. ${product.editorialDescriptor}.`;
  const nameAlreadyPresent = primary.toLowerCase().includes(product.name.toLowerCase());
  const priceSentence = priceLabel.startsWith('From ')
    ? `Prices start at ${priceLabel.slice('From '.length)}.`
    : `Priced at ${priceLabel}.`;
  return fitMetaDescription(primary, [
    priceSentence,
    nameAlreadyPresent ? `From ${SITE_NAME}.` : `${product.name} from ${SITE_NAME}.`,
    `${product.collection} collection.`,
  ]);
}

type SocialImage = { url: string; alt: string; width?: number; height?: number };

export const NOT_FOUND_TITLE = 'Page not found — Bottom’s Line Clothing';

export function notFoundMetadata(): Metadata {
  return {
    title: NOT_FOUND_TITLE,
    description: 'That page left the line. The shop is still open.',
    robots: { index: false, follow: true },
  };
}

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  image?: string | null;
  imageAlt?: string;
}): Metadata {
  const index = input.index !== false;
  const url = canonicalUrl(input.path);
  const specificImage = absoluteAssetUrl(input.image);
  const sized = imageDimensions(input.image) ?? (specificImage ? imageDimensions(specificImage) : null);
  const image: SocialImage = specificImage
    ? { url: specificImage, alt: input.imageAlt || input.title, ...(sized ? { width: sized.width, height: sized.height } : {}) }
    : { url: new URL(DEFAULT_OG_IMAGE, SITE_ORIGIN).toString(), width: 1200, height: 630, alt: DEFAULT_OG_ALT };
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: { index, follow: true },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
      locale: 'en_US',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [image.url],
    },
  };
}

function sellableVariants(product: ProductSeoSource) {
  return (product.variants ?? []).filter((variant) => variant.active && (variant.inventoryQuantity === null || variant.inventoryQuantity > 0));
}

function offerPrices(product: ProductSeoSource): number[] {
  const prices = sellableVariants(product).map((variant) => variant.price).filter((price) => Number.isFinite(price));
  if (prices.length) return prices;
  return Number.isFinite(product.price) ? [product.price] : [];
}

// Inventory is often untracked (null) because shirts are made to order. An active
// variant is in stock unless every active variant is explicitly at zero.
export function productAvailability(product: ProductSeoSource): 'https://schema.org/InStock' | 'https://schema.org/OutOfStock' {
  if (product.draft || product.active === false) return 'https://schema.org/OutOfStock';
  const active = (product.variants ?? []).filter((variant) => variant.active);
  if (active.length && active.every((variant) => variant.inventoryQuantity === 0)) return 'https://schema.org/OutOfStock';
  return 'https://schema.org/InStock';
}

function productCategory(product: ProductSeoSource) {
  const names = (product.collections?.length ? product.collections : [product.collection]).map((name) => name.trim()).filter(Boolean);
  return [...new Set(names)].join(', ');
}

// Matches the banner and checkout rule: free shipping at $60+, free size swaps.
function offerPolicies() {
  const freeAt = (FREE_SHIPPING_MIN_CENTS / 100).toFixed(0);
  const days = SHIPS_IN_BUSINESS_DAYS.match(/\d+/g)?.map(Number) ?? [];
  const handlingMin = days[0] ?? 3;
  const handlingMax = days[1] ?? handlingMin;
  return {
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      name: `Free shipping on orders of $${freeAt}+`,
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: '0.00',
        currency: 'USD',
        description: `Free shipping on US orders of $${freeAt} or more. Orders under $${freeAt} are quoted at checkout.`,
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: handlingMin,
          maxValue: handlingMax,
          unitCode: 'DAY',
        },
      },
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'US',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: SIZE_SWAP_DAYS,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
      refundType: 'https://schema.org/ExchangeRefund',
      description: `Free size swaps within ${SIZE_SWAP_DAYS} days.`,
    },
  };
}

function productImages(product: ProductSeoSource): string[] {
  const urls = [
    product.catalogImage,
    ...(product.colors ?? []).filter((color) => color.active).map((color) => color.mockupUrl),
  ];
  const absolute = urls.map((url) => absoluteAssetUrl(url)).filter((url): url is string => Boolean(url));
  return [...new Set(absolute)].slice(0, 8);
}

export function productStructuredData(product: ProductSeoSource) {
  const url = canonicalUrl(`/products/${product.slug}`);
  const description = collapse(product.description);
  const images = productImages(product);
  const prices = offerPrices(product);
  const currency = (product.currency || 'usd').trim().toUpperCase();
  const validCurrency = /^[A-Z]{3}$/.test(currency);
  const availability = productAvailability(product);
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;
  const activeSkus = (product.variants ?? []).filter((variant) => variant.active && variant.sku).map((variant) => variant.sku);
  const colors = [...new Set((product.colors ?? []).filter((color) => color.active && color.color?.trim()).map((color) => color.color!.trim()))];
  const material = product.material?.trim();

  const policies = offerPolicies();
  const offers = validCurrency && low !== null && high !== null
    ? low === high
      ? {
          '@type': 'Offer',
          url,
          priceCurrency: currency,
          price: low.toFixed(2),
          availability,
          ...policies,
        }
      : {
          '@type': 'AggregateOffer',
          url,
          priceCurrency: currency,
          lowPrice: low.toFixed(2),
          highPrice: high.toFixed(2),
          offerCount: prices.length,
          availability,
          ...policies,
        }
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url,
    name: product.name,
    url,
    ...(description ? { description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(activeSkus.length === 1 ? { sku: activeSkus[0] } : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: productCategory(product),
    ...(colors.length ? { color: colors.length === 1 ? colors[0] : colors } : {}),
    ...(material ? { material } : {}),
    ...(offers ? { offers } : {}),
  };
}

export function productPageMetadata(product: ProductSeoSource, priceLabel: string, index = true): Metadata {
  const title = `${product.name} — ${SITE_NAME}`;
  const description = productMetaDescription(product, priceLabel);
  const image = product.colors?.find((color) => color.active && color.mockupUrl)?.mockupUrl ?? product.catalogImage;
  return pageMetadata({
    title,
    description,
    path: `/products/${product.slug}`,
    index: index && product.active && !product.draft,
    image,
    imageAlt: product.name,
  });
}

export function homeStructuredData() {
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const websiteId = `${SITE_ORIGIN}/#website`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        logo: `${SITE_ORIGIN}/apple-touch-icon.png`,
        image: `${SITE_ORIGIN}${DEFAULT_OG_IMAGE}`,
        description: HOME_DESCRIPTION,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Nashville',
          addressRegion: 'TN',
          addressCountry: 'US',
        },
        sameAs: [
          'https://www.instagram.com/thebottomslineclothing/',
          'https://www.facebook.com/bottomslineclothing',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: SITE_ORIGIN,
        name: SITE_NAME,
        description: HOME_DESCRIPTION,
        inLanguage: 'en-US',
        publisher: { '@id': organizationId },
      },
    ],
  };
}

export function collectionStructuredData(input: {
  path: string;
  name: string;
  description: string;
  products: Array<{ slug: string; name: string }>;
}) {
  const url = canonicalUrl(input.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': url,
    name: input.name,
    url,
    description: input.description,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.products.length,
      itemListElement: input.products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: canonicalUrl(`/products/${product.slug}`),
        name: product.name,
      })),
    },
  };
}
