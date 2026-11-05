import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { completedIds } from '../lib/storage';
import { BRAND } from '../lib/base';

/** Sign-up and log-in screens. Accounts are not live yet, so submitting explains that instead of pretending. */
export default function AuthPage({ mode }: { mode: 'signup' | 'login' }) {
  const [sent, setSent] = useState(false);
  const signup = mode === 'signup';
  const solved = completedIds().length;

  useEffect(() => {
    document.title = `${signup ? 'Create your free account' : 'Log in'} | ${BRAND}`;
    setSent(false);
  }, [signup]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
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

          {sent ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status" data-testid="accounts-soon">
              <div className="font-semibold">Accounts are launching soon</div>
              <p className="mt-1">
                We are not creating accounts yet, so nothing was sent or saved. Until then, your progress stays saved in this browser.{' '}
                <Link to="/exercises" className="font-semibold underline">
                  Keep practicing →
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <button type="button" onClick={() => setSent(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-ink hover:border-slate-400">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
                  <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.2a11 11 0 0 0 0 9.9z" />
                  <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
                </svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <label className="block text-sm font-medium text-ink">
                Email
                <input type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500" />
              </label>
              <label className="block text-sm font-medium text-ink">
                Password
                <input type="password" required minLength={8} autoComplete={signup ? 'new-password' : 'current-password'} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500" />
              </label>
              <button type="submit" className="w-full rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-600">
                {signup ? 'Create free account' : 'Log in'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            {signup ? (
              <>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-brand-700 hover:underline">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New here?{' '}
                <Link to="/signup" className="font-semibold text-brand-700 hover:underline">
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
