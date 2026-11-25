import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Bottom’s Line Admin' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#101010', viewportFit: 'cover' };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
