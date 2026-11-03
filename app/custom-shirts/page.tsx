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

        <section className="custom-gallery section" aria-labelledby="custom-gallery-title">
          <div className="shell">
            <div className="custom-gallery__heading">
              <p className="eyebrow"><span /> Past custom work</p>
              <h2 id="custom-gallery-title">Made for <em>your people.</em></h2>
              <p>From team gear to a one-off idea, here are a few shirts made for groups and good times.</p>
            </div>
            <div className="custom-gallery__grid">
              <figure className="custom-gallery__item custom-gallery__item--wide">
                <img src="/custom-work/invictus-pink.jpg" alt="A school community wearing custom pink charity walk shirts" loading="lazy" />
                <figcaption>Community shirts · Invictus Nashville</figcaption>
              </figure>
              <figure className="custom-gallery__item custom-gallery__item--wide">
                <img src="/custom-work/pink-walk.jpg" alt="A crowd wearing custom shirts at a pink charity walk" loading="lazy" />
                <figcaption>Event shirts · made for the whole crew</figcaption>
              </figure>
              <figure className="custom-gallery__item">
                <img src="/custom-work/pink-family.jpg" alt="A family wearing custom charity walk shirts" loading="lazy" />
                <figcaption>Matching shirts · made personal</figcaption>
              </figure>
              <figure className="custom-gallery__item">
                <img src="/custom-work/yellow-team.jpg" alt="A school team wearing matching custom yellow shirts" loading="lazy" />
                <figcaption>Team shirts · Invictus Nashville</figcaption>
              </figure>
              <figure className="custom-gallery__item">
                <img src="/custom-work/kick-pics-team.jpg" alt="A group wearing custom Nashville's Unsolicited Kick Pics shirts" loading="lazy" />
                <figcaption>Group shirts · Nashville’s Unsolicited Kick Pics</figcaption>
              </figure>
              <figure className="custom-gallery__item custom-gallery__item--design">
                <img src="/custom-work/kick-pics-mockup.jpg" alt="A custom multi-shirt design concept for Nashville’s Unsolicited Kick Pics" loading="lazy" />
                <figcaption>From-scratch design · Nashville’s Unsolicited Kick Pics</figcaption>
              </figure>
              <figure className="custom-gallery__item custom-gallery__item--design">
                <img src="/custom-work/two-hits-custom.jpg" alt="A custom Two Hits and Anything Fits shirt design with a personal name added" loading="lazy" />
                <figcaption>Custom detail · made it their own</figcaption>
              </figure>
            </div>
            <p className="custom-gallery__note">Have a group idea of your own? <a href="#custom-inquiry">Tell me about it <span aria-hidden="true">↗</span></a></p>
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
