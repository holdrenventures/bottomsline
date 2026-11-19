import type { CatalogColor, CatalogProduct, CatalogVariant } from '../data/products';

export function styleName(color: CatalogColor) {
  return color.style?.trim() || 'Tee';
}

export function variantIsAvailable(variant: CatalogVariant) {
  return variant.active && (variant.inventoryQuantity === null || variant.inventoryQuantity > 0);
}

// Mirrors ProductPurchaseAny's default selection (first style, first color) so the
// server-rendered hero matches what the picker starts on — no flash on hydration.
export function defaultHeroImage(product: Pick<CatalogProduct, 'colors' | 'variants' | 'catalogImage'>) {
  const displayColors = product.colors.filter((color) => color.active);
  const sellableVariants = (product.variants ?? []).filter(variantIsAvailable);
  const firstStyle = product.variants?.length ? sellableVariants[0]?.style : displayColors[0] && styleName(displayColors[0]);
  const firstColor = displayColors.find((color) => styleName(color) === firstStyle);
  return firstColor?.mockupUrl ?? product.catalogImage ?? null;
}
