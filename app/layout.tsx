import type { Metadata } from 'next';
import './globals.css';
import MetaPixel from './MetaPixel';
import { HOME_DESCRIPTION, HOME_TITLE, SITE_ORIGIN, pageMetadata } from './lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: '/',
  }),
  metadataBase: new URL(SITE_ORIGIN),
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
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
      </head>
      <body><MetaPixel />{children}</body>
    </html>
  );
}
