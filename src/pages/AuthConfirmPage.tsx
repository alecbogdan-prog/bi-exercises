import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { BRAND } from '../lib/base';
import { parseEmailLink } from '../lib/emailLink';
import { supabase } from '../lib/supabase';

/**
 * Where the sign-in, invite and change-email links in our emails land. The link stays on our domain;
 * this page sends the one-time token to Supabase and then continues to the page the user came from.
 * Email scanners that only open the link do not use up the token, because nothing happens without JavaScript.
 */
export default function AuthConfirmPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    document.title = `Signing you in | ${BRAND}`;
    if (started.current) return;
    started.current = true;
    const link = parseEmailLink(window.location.search, window.location.origin);
    if (!link || !supabase) {
      setError('This sign-in link is not complete.');
      return;
    }
    void supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type }).then(({ error: err }) => {
      if (err) setError(/expired|invalid/i.test(err.message) ? 'This link has expired or was already used.' : err.message);
      else navigate(link.next, { replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-full flex-col bg-mint">
      <Header />
      <main className="flex flex-1 items-start justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8" data-testid="auth-confirm">
          {error ? (
            <>
              <h1 className="font-display text-2xl font-extrabold text-ink">We couldn't sign you in</h1>
              <p className="mt-2 text-slate-600">{error} Ask for a new link and open it on this device.</p>
              <Link to="/login" className="mt-5 block rounded-full bg-brand-500 px-6 py-3 font-display text-lg font-extrabold text-white hover:bg-brand-600">
                Send me a new link
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-extrabold text-ink">Signing you in…</h1>
              <p className="mt-2 text-slate-600">One moment.</p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
