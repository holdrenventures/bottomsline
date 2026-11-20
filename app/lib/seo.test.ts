import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canonicalRedirectTarget } from './canonical-host.ts';
import { storefrontPathRedirect } from './canonical-host.ts';
import {
  BAG_DESCRIPTION,
  CHECKOUT_DESCRIPTION,
  CUSTOM_DESCRIPTION,
  CUT_META_DESCRIPTION,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  HOME_DESCRIPTION,
  SHOP_DESCRIPTION,
  canonicalUrl,
  collectionStructuredData,
  homeStructuredData,
  notFoundMetadata,
  productAvailability,
  productMetaDescription,
  productStructuredData,
  type ProductSeoSource,
} from './seo.ts';

const descriptions = [HOME_DESCRIPTION, SHOP_DESCRIPTION, CUSTOM_DESCRIPTION, CUT_META_DESCRIPTION, BAG_DESCRIPTION, CHECKOUT_DESCRIPTION];

function product(overrides: Partial<ProductSeoSource> = {}): ProductSeoSource {
  return {
    name: 'Support Local Bottoms',
    slug: 'support-local-bottoms',
    description: 'A public service announcement. Support locally.',
    editorialDescriptor: 'Community Outreach',
    collection: 'Support Local Bottoms',
    price: 25,
    currency: 'usd',
    catalogImage: 'https://res.cloudinary.com/bihiyho3/image/upload/example.png',
    active: true,
    draft: false,
    variants: [
      { sku: 'tee-m', price: 25, active: true, inventoryQuantity: null },
      { sku: 'tank-m', price: 25, active: true, inventoryQuantity: null },
    ],
    colors: [{ active: true, color: 'Black', mockupUrl: '/holiday-mockups/example.png' }],
    ...overrides,
  };
}

describe('meta descriptions', () => {
  it('keeps static descriptions inside the short/long bounds', () => {
    for (const description of descriptions) {
      assert.ok(description.length >= DESCRIPTION_MIN, description);
      assert.ok(description.length <= DESCRIPTION_MAX, description);
    }
  });

  it('extends a short catalog description with the real name, collection, and price', () => {
    const description = productMetaDescription(product(), '$25.00');
    assert.ok(description.length >= DESCRIPTION_MIN);
    assert.ok(description.length <= DESCRIPTION_MAX);
    assert.match(description, /public service announcement/i);
    assert.match(description, /Support Local Bottoms/);
    assert.doesNotMatch(description, /in stock|rating|review|stars|return policy/i);

    const short = productMetaDescription(product({
      description: 'Technically athletic equipment.',
      name: 'Athletic Supporter',
      collection: 'Cruising',
    }), '$25.00');
    assert.match(short, /Technically athletic equipment/);
    assert.match(short, /\$25\.00/);
    assert.ok(short.length >= DESCRIPTION_MIN && short.length <= DESCRIPTION_MAX);
  });

  it('uses a starting price when variants differ and does not invent a single price', () => {
    const description = productMetaDescription(product({
      name: 'Hung Holiday Sweatshirt',
      slug: 'hung-holiday-sweatshirt',
      description: 'Holiday cheer with absolutely no subtlety.',
      collection: 'Holiday',
      price: 40,
    }), 'From $40.00');
    assert.match(description, /Prices start at \$40\.00/);
    assert.doesNotMatch(description, /Priced at From/);
    assert.ok(description.length <= DESCRIPTION_MAX);
  });

  it('trims an already long description instead of appending more', () => {
    const long = 'Free step-by-step DIY guide with diagrams and a live modeler that previews the cut on your own shirt. Turn any t-shirt into a muscle tank, drop-arm tank, or crop top — no sewing, one pair of scissors.';
    const description = productMetaDescription(product({ description: long, name: 'Guide' }), '$25.00');
    assert.ok(description.length <= DESCRIPTION_MAX);
    assert.ok(description.startsWith('Free step-by-step'));
  });
});

describe('canonical URLs', () => {
  it('normalizes query strings, trailing slashes, and the host', () => {
    assert.equal(canonicalUrl('/shop?collection=holiday&sort=name'), 'https://bottomslineclothing.com/shop');
    assert.equal(canonicalUrl('/products/ho-ho-hole/?size=L'), 'https://bottomslineclothing.com/products/ho-ho-hole');
    assert.equal(canonicalUrl('https://www.bottomslineclothing.com/custom-shirts/'), 'https://bottomslineclothing.com/custom-shirts');
    assert.equal(canonicalUrl('/'), 'https://bottomslineclothing.com');
  });

  it('redirects only the public http and www hosts', () => {
    assert.equal(canonicalRedirectTarget({ hostname: 'bottomslineclothing.com', protocol: 'http', pathname: '/shop/', search: '?q=tee' }), 'https://bottomslineclothing.com/shop?q=tee');
    assert.equal(canonicalRedirectTarget({ hostname: 'www.bottomslineclothing.com', protocol: 'https', pathname: '/', search: '' }), 'https://bottomslineclothing.com/');
    assert.equal(canonicalRedirectTarget({ hostname: 'bottomslineclothing.com', protocol: 'https', pathname: '/shop', search: '' }), null);
    assert.equal(canonicalRedirectTarget({ hostname: 'localhost', protocol: 'http', pathname: '/', search: '' }), null);
    assert.equal(canonicalRedirectTarget({ hostname: 'codex-ss3000-guide-correction-bottomsline.holdrenadam.workers.dev', protocol: 'https', pathname: '/', search: '' }), null);
  });

  it('301s trailing slashes and collection query params without touching the style filter', () => {
    assert.deepEqual(storefrontPathRedirect('/shop/', ''), { pathname: '/shop', search: '' });
    assert.deepEqual(storefrontPathRedirect('/shop', '?collection=pride&style=tee'), { pathname: '/shop/pride', search: '?style=tee' });
    assert.deepEqual(storefrontPathRedirect('/shop', '?collection=Support%20Local%20Bottoms&sort=name'), { pathname: '/shop/support-local-bottoms', search: '?sort=name' });
    assert.equal(storefrontPathRedirect('/shop', '?style=tee'), null);
    assert.deepEqual(storefrontPathRedirect('/shop', '?collection=nope'), { pathname: '/shop', search: '' });
    assert.deepEqual(storefrontPathRedirect('/products/ho-ho-hole/', '?size=L'), { pathname: '/products/ho-ho-hole', search: '?size=L' });
  });
});

describe('product schema', () => {
  it('describes a $25 tee as in stock when inventory is not tracked', () => {
    const data = productStructuredData(product());
    assert.equal(data['@type'], 'Product');
    assert.equal(data.name, 'Support Local Bottoms');
    assert.equal(data.url, 'https://bottomslineclothing.com/products/support-local-bottoms');
    assert.equal(data.offers['@type'], 'Offer');
    assert.equal(data.offers.price, '25.00');
    assert.equal(data.offers.priceCurrency, 'USD');
    assert.equal(data.offers.availability, 'https://schema.org/InStock');
    assert.equal(productAvailability(product()), 'https://schema.org/InStock');
    assert.equal(data.offers.shippingDetails.name, 'Free shipping on orders of $60+');
    assert.equal(data.offers.shippingDetails.shippingRate.value, '0.00');
    assert.match(data.offers.shippingDetails.shippingRate.description, /\$60/);
    assert.equal(data.offers.hasMerchantReturnPolicy.merchantReturnDays, 30);
    assert.match(data.offers.hasMerchantReturnPolicy.description, /size swaps/i);
    assert.equal(data.offers.hasMerchantReturnPolicy.returnFees, 'https://schema.org/FreeReturn');
    assert.deepEqual(data.image[0], 'https://res.cloudinary.com/bihiyho3/image/upload/example.png');
    assert.equal(data.image[1], 'https://bottomslineclothing.com/holiday-mockups/example.png');
    assert.equal('aggregateRating' in data, false);
    assert.equal('review' in data, false);
  });

  it('describes a $40 holiday sweatshirt and a real in-stock quantity', () => {
    const sweatshirt = product({
      name: 'Hung Holiday Sweatshirt',
      slug: 'hung-holiday-sweatshirt',
      description: 'Holiday cheer with absolutely no subtlety.',
      collection: 'Holiday',
      price: 40,
      variants: [{ sku: 'ss-m', price: 40, active: true, inventoryQuantity: 4 }],
    });
    const data = productStructuredData(sweatshirt);
    assert.equal(data.offers.price, '40.00');
    assert.equal(data.offers.availability, 'https://schema.org/InStock');
    assert.equal(data.sku, 'ss-m');
  });

  it('uses an aggregate offer when sellable prices differ', () => {
    const data = productStructuredData(product({
      variants: [
        { sku: 'tee-m', price: 25, active: true, inventoryQuantity: 2 },
        { sku: 'crew-m', price: 40, active: true, inventoryQuantity: 2 },
      ],
    }));
    assert.equal(data.offers['@type'], 'AggregateOffer');
    assert.equal(data.offers.lowPrice, '25.00');
    assert.equal(data.offers.highPrice, '40.00');
    assert.equal(data.offers.offerCount, 2);
    assert.equal(data.sku, undefined);
  });

  it('marks out of stock only when every active variant quantity is zero', () => {
    const data = productStructuredData(product({
      variants: [
        { sku: 'tee-m', price: 25, active: true, inventoryQuantity: 0 },
        { sku: 'tee-l', price: 25, active: false, inventoryQuantity: 3 },
      ],
    }));
    assert.equal(data.offers.availability, 'https://schema.org/OutOfStock');
    assert.equal(data.offers.price, '25.00');
  });

  it('treats a mix of counted and untracked sizes as in stock', () => {
    const mixed = product({
      variants: [
        { sku: 'tee-m', price: 25, active: true, inventoryQuantity: 2 },
        { sku: 'tee-l', price: 25, active: true, inventoryQuantity: null },
      ],
    });
    assert.equal(productStructuredData(mixed).offers.availability, 'https://schema.org/InStock');
  });

  it('keeps holiday sweatshirts at $37 and reports real size and hoodie spreads', () => {
    const sweatshirt = productStructuredData(product({
      name: 'Hung Holiday Sweatshirt',
      slug: 'hung-holiday-sweatshirt',
      collection: 'Holiday',
      price: 37,
      variants: [{ sku: 'ss-m', price: 37, active: true, inventoryQuantity: null }],
    }));
    assert.equal(sweatshirt.offers.price, '37.00');
    assert.equal(sweatshirt.offers.highPrice, undefined);

    // House list: tees are $25, 2XL tees are $27, hoodies are $42. The schema
    // reports those variant prices; it does not invent a higher number.
    const spread = productStructuredData(product({
      variants: [
        { sku: 'tee-m', price: 25, active: true, inventoryQuantity: null },
        { sku: 'tee-2xl', price: 27, active: true, inventoryQuantity: null },
        { sku: 'hoodie-m', price: 42, active: true, inventoryQuantity: null },
        { sku: 'old', price: 99, active: false, inventoryQuantity: 4 },
      ],
    }));
    assert.equal(spread.offers.lowPrice, '25.00');
    assert.equal(spread.offers.highPrice, '42.00');
    assert.equal(spread.offers.offerCount, 3);
  });

  it('lists every collection the shop filter uses', () => {
    const data = productStructuredData(product({
      name: "I'll Be Homo for Christmas",
      slug: 'ill-be-homo-for-christmas',
      collection: 'Holiday',
      collections: ['Holiday', 'Pride'],
    }));
    assert.equal(data.category, 'Holiday, Pride');
  });

  it('puts organization and website data on the homepage and an item list on a collection', () => {
    const home = homeStructuredData();
    assert.equal(home['@graph'][0]['@type'], 'Organization');
    assert.equal(home['@graph'][1]['@type'], 'WebSite');
    assert.match(home['@graph'][0].address.addressLocality, /Nashville/);
    const shop = collectionStructuredData({
      path: '/shop/pride',
      name: 'Pride',
      description: 'Pride apparel.',
      products: [{ slug: 'tn-pride-flag', name: 'TN Pride Flag' }],
    });
    assert.equal(shop['@type'], 'CollectionPage');
    assert.equal(shop.url, 'https://bottomslineclothing.com/shop/pride');
    assert.equal(shop.mainEntity.itemListElement[0].url, 'https://bottomslineclothing.com/products/tn-pride-flag');
  });

  it('gives 404 pages their own title and no canonical', () => {
    const metadata = notFoundMetadata();
    assert.equal(metadata.title, 'Page not found — Bottom’s Line Clothing');
    assert.equal(metadata.robots?.index, false);
    assert.equal('alternates' in metadata, false);
  });
});
