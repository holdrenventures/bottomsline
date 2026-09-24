import type { CatalogProduct } from '../../data/products';
import ProductPurchaseAny from '../[slug]/ProductPurchaseAny';

type PurchaseProduct = Pick<CatalogProduct, 'id' | 'slug' | 'name' | 'price' | 'availableSizes' | 'variants' | 'colors' | 'catalogImage' | 'sizeGuideUrl'>;

export default function ProductPurchase({ product }: { product: PurchaseProduct }) {
  return <ProductPurchaseAny product={product} />;
}
