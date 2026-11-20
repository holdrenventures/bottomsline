import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from './SiteHeader';
import { NOT_FOUND_TITLE, notFoundMetadata } from './lib/seo';

export const metadata: Metadata = {
  ...notFoundMetadata(),
  title: NOT_FOUND_TITLE,
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="shop-page">
        <section className="shop-intro shell">
          <p className="eyebrow"><span /> 404</p>
          <div>
            <h1>Page not<br /><em>found.</em></h1>
            <p>That one left the line.</p>
          </div>
        </section>
        <section className="shell section">
          <Link className="button button--primary" href="/shop">Back to the shop <span aria-hidden="true">↗</span></Link>
        </section>
      </main>
    </>
  );
}
