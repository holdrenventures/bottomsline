import type { Metadata } from 'next';
import './globals.css';
import MetaPixel from './MetaPixel';
import { HOME_DESCRIPTION, HOME_TITLE, SITE_ORIGIN } from './lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: HOME_TITLE, template: '%s' },
  description: HOME_DESCRIPTION,
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '64x64' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  verification: {
    google: '67FS0QwN1wEJqzhahLuMIVjD2Uu-ICzXp_a6E5wqKWI',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><MetaPixel />{children}</body>
    </html>
  );
}
