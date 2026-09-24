import type { Metadata } from 'next';
import OrdersDesk from './OrdersDesk';

export const metadata: Metadata = {
  title: 'Orders Desk — Bottom’s Line',
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <OrdersDesk />;
}
