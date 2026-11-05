import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GA_ID, getConsent, onConsentChange, setConsent, trackPageView } from '../lib/analytics';

/** Sends a GA page view on every route change (only with consent). */
export function PageViews() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    // Wait a tick so the page has set document.title.
    const t = setTimeout(() => trackPageView(pathname + search), 0);
    return () => clearTimeout(t);
  }, [pathname, search]);
  return null;
}

/** Asks for analytics consent until the visitor chooses. Accept and Reject are equally prominent. */
export function CookieBanner() {
  const [open, setOpen] = useState(() => GA_ID !== null && getConsent() === null);

  useEffect(() => onConsentChange(() => setOpen(GA_ID !== null && getConsent() === null)), []);

  if (!open) return null;
  const btn = 'rounded-lg px-4 py-2 text-sm font-semibold';
  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4" data-testid="cookie-banner">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl bg-ink p-4 text-sm text-white/85 shadow-2xl ring-1 ring-white/10 sm:flex-row sm:items-center sm:gap-5">
        <p className="flex-1">
          We use Google Analytics cookies to see which pages help people learn, so we can improve them. Nothing is sent until you accept.{' '}
          <Link to="/privacy" className="font-semibold text-white underline">
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setConsent('denied')} className={`${btn} bg-white/10 text-white hover:bg-white/20`}>
            Reject
          </button>
          <button type="button" onClick={() => setConsent('granted')} className={`${btn} bg-white text-ink hover:bg-white/90`}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
