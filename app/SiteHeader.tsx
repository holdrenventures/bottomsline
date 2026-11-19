import Link from 'next/link';
import BagLink from './BagLink';
import { PROMO_BANNER } from './lib/promo';

export default function SiteHeader() {
  return (
    <>
    <p className="promo-banner">{PROMO_BANNER}</p>
    <header className="site-header shell">
      <Link className="wordmark" href="/" aria-label="Bottom’s Line home">BOTTOM’S <span>LINE</span></Link>
      <nav aria-label="Primary navigation"><a href="/shop">Shop</a><a href="/custom-shirts">Custom</a><a href="/cut-it-out">Cut It Out</a><Link href="/#story">Our deal</Link></nav>
      <BagLink />
    </header>
    </>
  );
}
