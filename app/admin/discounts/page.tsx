import type { Metadata } from 'next';
import DiscountsDesk from './DiscountsDesk';

export const metadata: Metadata = {
  title: 'Discounts — Bottom’s Line',
  robots: { index: false, follow: false },
};

export default function DiscountsPage() { return <DiscountsDesk />; }
