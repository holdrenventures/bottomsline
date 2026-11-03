import type { Metadata } from 'next';
import CustomShirtInquiry from '../CustomShirtInquiry';
import SiteHeader from '../SiteHeader';

export const metadata: Metadata = {
  title: 'Custom Shirts — Bottom’s Line Clothing',
  description: 'Customize a Bottom’s Line design or start from scratch. Custom team and group shirt orders are welcome.',
};

export default function CustomShirtsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="custom-work custom-work--page section">
          <div className="shell custom-work__inner">
            <div className="custom-work__copy">
              <p className="eyebrow"><span /> Made for you</p>
              <h1>Custom shirts.<br /><em>Your idea.</em></h1>
              <p className="custom-work__lead">Love a design and want to make it your own? I can customize something you’ve seen or make a shirt from scratch.</p>
              <p>Need a bigger order for your team, crew, or group? I can help with that, too. Tell me what you have in mind and I’ll be in touch.</p>
            </div>
            <CustomShirtInquiry />
          </div>
        </section>
      </main>
      <footer className="custom-page-footer">
        <div className="shell footer__bottom">
          <p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p>
          <p>© 2026 Bottom’s Line Clothing <span>Made with poor judgment.</span></p>
        </div>
      </footer>
    </>
  );
}
