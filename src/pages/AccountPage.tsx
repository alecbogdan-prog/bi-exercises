import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { BRAND } from '../lib/base';
import { currentPlan, refreshAccount, signOut, useAccount } from '../lib/account';
import { openPortal } from '../lib/billing';

const PLAN_NAMES = { pro: 'Pro', pl300: 'PL-300 Prep' } as const;

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

/** The signed-in visitor's plan, with links to Stripe billing and log-out. */
export default function AccountPage() {
  const account = useAccount();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = currentPlan();
  const justPaid = params.get('checkout') === 'success';
  const waiting = justPaid && !plan && !timedOut;
  const ent = account.entitlement;

  useEffect(() => {
    document.title = `Your account | ${BRAND}`;
  }, []);

  useEffect(() => {
    if (account.ready && !account.email) navigate('/login?next=%2Faccount', { replace: true });
  }, [account.ready, account.email, navigate]);

  // Right after Checkout, Stripe's webhook may take a few seconds to record the purchase: poll until it shows up.
  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      void refreshAccount();
      if (tries >= 15) setTimedOut(true);
    }, 2000);
    return () => clearInterval(timer);
  }, [waiting]);

  const manage = async () => {
    setError(null);
    try {
      await openPortal();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Your account</h1>
        {account.email && <p className="mt-1 text-slate-600">{account.email}</p>}

        {justPaid && plan && (
          <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="font-semibold">Thank you! {PLAN_NAMES[plan]} is now unlocked.</div>
            <Link to={plan === 'pl300' ? '/pl300' : '/exercises'} className="mt-1 inline-block font-semibold underline">
              Start practicing →
            </Link>
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Plan</h2>
          {waiting ? (
            <p className="mt-2 text-lg font-bold text-ink" data-testid="confirming">
              Confirming your payment…
            </p>
          ) : justPaid && timedOut && !plan ? (
            <p className="mt-2 text-sm text-slate-700">
              We have not received the payment confirmation yet. If you were charged, refresh this page in a minute.
            </p>
          ) : plan && ent ? (
            <>
              <p className="mt-2 text-2xl font-extrabold text-ink">{PLAN_NAMES[plan]}</p>
              {ent.current_period_end && (
                <p className="mt-1 text-sm text-slate-600">
                  {ent.status === 'paid' ? 'Access until ' : ent.cancel_at_period_end ? 'Cancelled. Access until ' : 'Renews on '}
                  {date(ent.current_period_end)}
                  {ent.status === 'past_due' && ' · Your last payment failed. Please update your card.'}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-2 text-2xl font-extrabold text-ink">Free</p>
              <p className="mt-1 text-sm text-slate-600">Upgrade to unlock every exercise, project and practice test.</p>
              <Link to="/pricing" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                See plans
              </Link>
            </>
          )}
          {ent && (
            <div className="mt-4">
              <button type="button" onClick={() => void manage()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-brand-500">
                Billing and invoices
              </button>
              {plan === 'pl300' && (
                <Link to="/pricing" className="ml-3 text-sm font-semibold text-brand-700 hover:underline">
                  Upgrade to Pro
                </Link>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        {account.team && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Team</h2>
            <p className="mt-2 text-lg font-bold text-ink">{account.team.name}</p>
            <p className="mt-1 text-sm text-slate-600">
              {account.team.role === 'owner' ? `You manage this team: ${account.team.used} of ${account.team.seats} seats used.` : 'Your company gives you Pro through this team.'}
            </p>
            <Link to="/team" className="mt-4 inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-brand-500">
              {account.team.role === 'owner' ? 'Open team dashboard' : 'View team'}
            </Link>
          </section>
        )}

        <button
          type="button"
          onClick={() => void signOut().then(() => navigate('/'))}
          className="mt-6 text-sm font-semibold text-slate-500 hover:text-ink"
        >
          Log out
        </button>
      </main>
      <Footer />
    </div>
  );
}
