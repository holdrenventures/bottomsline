import type { Metadata } from 'next';
import SiteHeader from '../../SiteHeader';
import { stripeClient } from '../../lib/stripe';
import { supabaseAdmin } from '../../lib/supabase-admin';
import ClearPaidBag, { type VerifiedPurchase } from './ClearPaidBag';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ session_id?: string }> };

async function verifiedPurchase(sessionId: string | undefined): Promise<VerifiedPurchase | null> {
  if (!sessionId || !/^cs_(test_)?[A-Za-z0-9_]+$/.test(sessionId)) return null;
  try {
    const session = await stripeClient().checkout.sessions.retrieve(sessionId);
    if (!['paid', 'no_payment_required'].includes(session.payment_status)) return null;
    const attemptId = session.client_reference_id ?? session.metadata?.checkout_attempt_id;
    if (!attemptId || attemptId !== session.metadata?.checkout_attempt_id) return null;

    const attempts = await supabaseAdmin(
      `checkout_attempts?select=id,stripe_checkout_session_id&id=eq.${encodeURIComponent(attemptId)}`,
    ) as Array<{ id: string; stripe_checkout_session_id: string | null }>;
    if (attempts[0]?.stripe_checkout_session_id !== sessionId) return null;

    const items = await supabaseAdmin(
      `checkout_attempt_items?select=product_id,quantity&checkout_attempt_id=eq.${encodeURIComponent(attemptId)}`,
    ) as Array<{ product_id: string; quantity: number }>;
    if (!items.length || session.amount_total === null || !session.currency) return null;

    return {
      sessionId,
      value: session.amount_total / 100,
      currency: session.currency.toUpperCase(),
      contentIds: [...new Set(items.map((item) => item.product_id))],
      numItems: items.reduce((total, item) => total + item.quantity, 0),
    };
  } catch {
    // A transient verification error must never create an unverified Purchase event.
    return null;
  }
}

export const metadata: Metadata = {
  title: 'Order Received — Bottom’s Line Clothing',
  description: 'Your Bottom’s Line order has been received.',
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const purchase = await verifiedPurchase((await searchParams).session_id);
  return (
    <>
      <ClearPaidBag purchase={purchase} />
      <SiteHeader />
      <main className="bag-page shell checkout-success">
        <section className="bag-empty">
          <p className="eyebrow"><span /> {purchase ? 'Payment received' : 'Payment confirmation pending'}</p>
          <h1>{purchase ? <>EXCELLENT<br /><em>judgment.</em></> : <>PAYMENT<br /><em>pending.</em></>}</h1>
          <p>{purchase
            ? 'Your order is being confirmed. Keep an eye on your inbox for the paper trail.'
            : 'We could not confirm your payment yet. Your bag is saved; check your email before trying checkout again.'}</p>
          <a className="button button--primary" href="/shop">Keep looking <span>↗</span></a>
        </section>
      </main>
      <footer className="shop-footer bag-footer">
        <div className="shell"><p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p><p>Evidence submitted.</p></div>
      </footer>
    </>
  );
}
