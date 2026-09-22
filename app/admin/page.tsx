import type { Metadata } from 'next';
import AdminCatalog from './AdminCatalog';

export const metadata: Metadata = {
  title: 'Product Desk — Bottom’s Line',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminCatalog />;
}
