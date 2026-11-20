import type { Metadata } from 'next';
import { ShopScreen, shopFilters, shopMetadata } from './ShopScreen';

type ShopPageProps = {
  searchParams: Promise<{ collection?: string; q?: string; sort?: string; style?: string }>;
};

export function generateMetadata(): Metadata {
  return shopMetadata();
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const filters = await searchParams;
  // ?collection= is redirected in proxy.ts. If it still arrives, the catalog
  // stays on /shop and the canonical stays /shop. The style filter does too.
  return <ShopScreen collection="All" {...shopFilters(filters)} />;
}
