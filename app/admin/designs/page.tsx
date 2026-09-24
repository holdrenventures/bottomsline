import type { Metadata } from 'next';
import DesignAdjusterDesk from './DesignAdjusterDesk';

export const metadata: Metadata = {
  title: 'Design Adjuster — Bottom’s Line',
  robots: { index: false, follow: false },
};

export default function DesignsAdminPage() {
  return <DesignAdjusterDesk />;
}
