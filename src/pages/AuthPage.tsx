import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { completedIds } from '../lib/storage';
import { BRAND } from '../lib/base';
import { useAccount } from '../lib/account';
import { accountsEnabled, supabase } from '../lib/supabase';
import { GOOGLE_CLIENT_ID, renderGoogleButton } from '../lib/googleSignIn';

// Google sign-in needs the Google provider set up in Supabase first; turn the button on with VITE_GOOGLE_AUTH=1.
const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH === '1';

/** Only follow same-site paths after log-in, never another domain. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/account';
}

/**
 * Google's own button (the Google window then shows our domain). If Google's script cannot load,
 * for example because of a blocker, it falls back to the redirect button.
 */
function GoogleButton({ fallback, onError }: { fallback: () => void; onError: (m: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!GOOGLE_CLIENT_ID || !supabase);
  useEffect(() => {
    const el = box.current;
    if (failed || !el) return;
    renderGoogleButton(el, Math.min(400, Math.max(200, Math.round(el.getBoundingClientRect().width))), onError).catch(() => setFailed(true));
  }, [failed, onError]);
  if (failed) return <RedirectGoogleButton onClick={fallback} />;
  return <div ref={box} className="flex min-h-11 w-full justify-center" data-testid="google-button" />;
}

function RedirectGoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-ink hover:border-slate-400">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
        <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.2a11 11 0 0 0 0 9.9z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
      </svg>
      Continue with Google
    </button>
  );
}

/**
 * Sign-up and log-in. Accounts are passwordless: we email a one-click sign-in link, or use Google.
 * Without Supabase keys in the build, submitting explains that accounts are coming soon.
 */
export default function AuthPage({ mode }: { mode: 'signup' | 'login' }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const account = useAccount();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'soon'>('idle');
  const [error, setError] = useState<string | null>(null);
  const signup = mode === 'signup';
  const solved = completedIds().length;
  const next = safeNext(params.get('next'));
  const query = params.get('next') ? `?next=${encodeURIComponent(next)}` : '';

  useEffect(() => {
    document.title = `${signup ? 'Create your free account' : 'Log in'} | ${BRAND}`;
    setStatus('idle');
    setError(null);
  }, [signup]);

  // Already signed in (or just came back from the email link / Google): continue.
  useEffect(() => {
    if (account.ready && account.email) navigate(next, { replace: true });
  }, [account.ready, account.email, next, navigate]);

  const redirectTo = `${window.location.origin}${next}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return setStatus('soon');
    setStatus('sending');
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (err) {
      setError(err.message);
      setStatus('idle');
    } else setStatus('sent');
  };

  const google = async () => {
    if (!supabase) return setStatus('soon');
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (err) setError(err.message);
  };

  return (
    <div className="flex min-h-full flex-col bg-mint">
      <Header />
      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{signup ? 'Create your free account' : 'Welcome back'}</h1>
          <p className="mt-2 text-slate-600">
            {signup
              ? solved
                ? `Keep the ${solved} exercise${solved === 1 ? '' : 's'} you solved, your points and your streak on every device.`
                : 'Save your progress, points and streak on every device.'
              : 'Log in to continue where you left off.'}
          </p>

          {status === 'soon' ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status" data-testid="accounts-soon">
              <div className="font-semibold">Accounts are launching soon</div>
              <p className="mt-1">
                We are not creating accounts yet, so nothing was sent or saved. Until then, your progress stays saved in this browser.{' '}
                <Link to="/exercises" className="font-semibold underline">
                  Keep practicing →
                </Link>
              </p>
            </div>
          ) : status === 'sent' ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status" data-testid="link-sent">
              <div className="font-semibold">Check your email</div>
              <p className="mt-1">
                We sent a sign-in link to <strong>{email}</strong>. Open it on this device to continue. It can take a minute; check your spam folder too.
              </p>
              <button type="button" onClick={() => setStatus('idle')} className="mt-2 font-semibold underline">
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-3">
              {(googleEnabled || !accountsEnabled) && (
                <>
              <GoogleButton fallback={() => void google()} onError={setError} />
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or
                <span className="h-px flex-1 bg-slate-200" />
              </div>
                </>
              )}
              <label className="block text-sm font-medium text-ink">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500"
                />
              </label>
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              <button type="submit" disabled={status === 'sending'} className="w-full rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60">
                {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
              </button>
              {accountsEnabled && <p className="text-center text-xs text-slate-500">No password needed. We email you a link that signs you in.</p>}
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            {signup ? (
              <>
                Already have an account?{' '}
                <Link to={`/login${query}`} className="font-semibold text-brand-700 hover:underline">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New here?{' '}
                <Link to={`/signup${query}`} className="font-semibold text-brand-700 hover:underline">
                  Create a free account
                </Link>
              </>
            )}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
