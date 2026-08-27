import BagLink from './BagLink';

export default function SiteHeader() {
  return (
    <header className="site-header shell">
      <a className="wordmark" href="/" aria-label="Bottom’s Line home">BOTTOM’S <span>LINE</span></a>
      <nav aria-label="Primary navigation"><a href="/shop">Shop</a><a href="/#story">Our deal</a></nav>
      <BagLink />
    </header>
  );
}
