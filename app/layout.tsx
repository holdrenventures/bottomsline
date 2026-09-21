import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bottom’s Line Clothing — Skip the Small Talk',
  description: 'Conversation-starting apparel for people who would rather be honest than boring.',
  openGraph: {
    title: 'Bottom’s Line Clothing — Skip the Small Talk',
    description: 'Conversation-starting apparel for people who would rather be honest than boring.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Skip the Small Talk — Bottom’s Line Clothing' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bottom’s Line Clothing — Skip the Small Talk',
    description: 'Conversation-starting apparel for people who would rather be honest than boring.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
