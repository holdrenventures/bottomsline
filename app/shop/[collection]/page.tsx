import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { collectionBySlug, collectionCopy, collectionSlug } from '../../lib/collections';
import { ShopScreen, shopFilters, shopMetadata } from '../ShopScreen';

type PageProps = {
  params: Promise<{ collection: string }>;
  searchParams: Promise<{ q?: string; sort?: string; style?: string }>;
};

export function generateStaticParams() {
  return collectionCopy.map((collection) => ({ collection: collectionSlug(collection.name) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { collection } = await params;
  if (!collectionBySlug(collection)) return { title: 'Page not found — Bottom’s Line Clothing', robots: { index: false, follow: true } };
  return shopMetadata(collection);
}

export default async function CollectionShopPage({ params, searchParams }: PageProps) {
  const { collection } = await params;
  const copy = collectionBySlug(collection);
  if (!copy) notFound();
  const filters = await searchParams;
  return <ShopScreen collection={copy.name} {...shopFilters(filters)} />;
}
