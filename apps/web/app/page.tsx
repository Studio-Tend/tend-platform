import '@/components/site/site.css';
import { WaitlistForm, WaitlistNavLink } from '@/components/site/WaitlistForm';

export default function HomePage() {
  return (
    <div className="tend-site">
      <nav className="tend-site__nav">
        <div className="tend-site__wordmark">tend</div>

        <WaitlistNavLink />
      </nav>

      <section className="tend-site__hero">
        <h1 className="tend-site__title">
          Goals, <em>with intention.</em>
        </h1>

        <p className="tend-site__subhead">Focus on what matters. Enjoy the rest.</p>

        <a className="tend-site__scroll-cue" href="#thought">
          why tend
          <span className="tend-site__arrow" aria-hidden="true">
            ↓
          </span>
        </a>
      </section>

      <section className="tend-site__thought" id="thought">
        <div className="tend-site__thought-inner">
          <div className="tend-site__thought-copy">
            <h2>
              <span>You have things you want to do.</span>
              <span>You also have a life you want to enjoy.</span>
            </h2>

            <p>Tend is about making room for both.</p>
          </div>
        </div>
      </section>

      <section className="tend-site__philosophy" aria-labelledby="philosophy-title">
        <div className="tend-site__philosophy-inner">
          <div className="tend-site__philosophy-copy">
            <h2 id="philosophy-title">Doing more isn't always the point.</h2>

            <p>
              Tend is exploring a different way to think about goals — focusing your energy where it
              matters, so there's more room for everything else.
            </p>

            <div className="tend-site__philosophy-note">Prioritization should create freedom.</div>
          </div>
        </div>
      </section>

      <section className="tend-site__waitlist" id="waitlist">
        <h2>Want to see where this goes?</h2>

        <p>Join the waitlist to follow along and get early access when it's ready.</p>

        <WaitlistForm />
      </section>

      <footer className="tend-site__footer">
        <div>heytend.co</div>

        <div className="tend-site__footer-links">
          <a href="https://www.tiktok.com/@buildingtend" target="_blank" rel="noopener">
            TikTok
          </a>

          <a href="https://www.instagram.com/buildingtend" target="_blank" rel="noopener">
            Instagram
          </a>
        </div>
      </footer>
    </div>
  );
}
