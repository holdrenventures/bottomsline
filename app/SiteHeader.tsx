import Link from 'next/link';
import BagLink from './BagLink';
import PromoBanner from './PromoBanner';

export default function SiteHeader() {
  // Serialize request time so the client banner hydrates with the same copy.
  // eslint-disable-next-line react-hooks/purity
  const renderedAt = Date.now();
  return (
    <>
    <PromoBanner initialNow={renderedAt} />
    <header className="site-header shell">
      <Link className="wordmark" href="/" aria-label="Bottom’s Line home">BOTTOM’S <span>LINE</span></Link>
      <nav aria-label="Primary navigation"><a href="/shop">Shop</a><a href="/custom-shirts">Custom</a><a href="/cut-it-out">Cut It Out</a><Link href="/#story">Our deal</Link></nav>
      <BagLink />
    </header>
    </>
  );
}
