import type { Metadata } from 'next';
import SiteHeader from '../SiteHeader';
import BagClient from './BagClient';

export const metadata: Metadata = {
  title: 'Your Bag — Bottom’s Line Clothing',
  description: 'The shirts you were bold enough to choose.',
};

export default function BagPage() {
  return (
    <>
      <SiteHeader />
      <main className="bag-page shell">
        <header className="bag-intro">
          <p className="eyebrow"><span /> Your selections</p>
          <h1>BAG<br /><em>the evidence.</em></h1>
        </header>
        <BagClient />
      </main>
      <footer className="shop-footer bag-footer">
        <div className="shell"><p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p><p>Good choices. Allegedly.</p></div>
      </footer>
    </>
  );
}
