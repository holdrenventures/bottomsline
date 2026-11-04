import type { CatalogProduct } from '../data/products';

export function productDetailRows(product: CatalogProduct): Array<[string, string]> {
  const variants = product.variants ?? [];
  const visibleColors = product.colors.filter((color) => color.active);
  const isSs3000Crewneck = visibleColors.length > 0
    && visibleColors.every((color) => color.garment?.toLowerCase() === 'ss3000')
    && variants.length > 0
    && variants.every((variant) => /\b(?:sweatshirt|crewneck|crew neck)\b/i.test(variant.style));
  const knownShirtStyles = variants.length === 0 || variants.some((variant) => /\b(?:tee|t-?shirt|tank)\b/i.test(variant.style));
  const details: Array<[string, string | null | undefined]> = isSs3000Crewneck
    ? [
        ['Material', '8.5 oz. midweight cotton/polyester fleece. Solid and camo colors are 80/20; heather blends vary.'],
        ['Fit', 'Unisex standard-fit crewneck sweatshirt.'],
        ['Care', 'Turn inside out. Wash cold and dry gently; do not iron the print.'],
        ['Shipping', product.shippingNote],
      ]
    : knownShirtStyles
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
