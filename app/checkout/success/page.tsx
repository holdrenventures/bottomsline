import type { Metadata } from 'next';
import SiteHeader from '../../SiteHeader';
import ClearPaidBag from './ClearPaidBag';

export const metadata: Metadata = {
  title: 'Order Received — Bottom’s Line Clothing',
  description: 'Your Bottom’s Line order has been received.',
};

export default function CheckoutSuccessPage() {
  return (
    <>
      <ClearPaidBag />
      <SiteHeader />
      <main className="bag-page shell checkout-success">
        <section className="bag-empty">
          <p className="eyebrow"><span /> Payment received</p>
          <h1>EXCELLENT<br /><em>judgment.</em></h1>
          <p>Your order is being confirmed. Keep an eye on your inbox for the paper trail.</p>
          <a className="button button--primary" href="/shop">Keep looking <span>↗</span></a>
        </section>
      </main>
      <footer className="shop-footer bag-footer">
        <div className="shell"><p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p><p>Evidence submitted.</p></div>
      </footer>
    </>
  );
}
