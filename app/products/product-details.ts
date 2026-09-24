import type { CatalogProduct } from '../data/products';

export function productDetailRows(product: CatalogProduct): Array<[string, string]> {
  const variants = product.variants ?? [];
  const knownShirtStyles = variants.length === 0 || variants.some((variant) => /tee|t-?shirt|tank/i.test(variant.style));
  const details: Array<[string, string | null | undefined]> = knownShirtStyles
    ? [
        ['Material', 'Soft, lightweight cotton jersey. Heather blends vary.'],
        ['Fit', 'Unisex fit. Sleeves optional.'],
        ['Care', 'Get dirty. Wash gently.'],
        ['Shipping', product.shippingNote],
      ]
    : [
        ['Material', product.material],
        ['Fit', product.fitNotes],
        ['Care', product.careInstructions],
        ['Shipping', product.shippingNote],
      ];

  return details.filter((detail): detail is [string, string] => Boolean(detail[1]));
}
