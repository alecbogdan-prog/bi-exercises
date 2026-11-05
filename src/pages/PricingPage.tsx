import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { currentPlan, useAccount } from '../lib/account';
import { BillingError, startCheckout } from '../lib/billing';
import type { OfferId } from '../lib/billing';
import { accountsEnabled } from '../lib/supabase';
import { ENTERPRISE_EMAIL } from '../lib/enterprise';
import { Footer, Header } from '../components/Layout';
import { EXERCISES } from '../exercises/exercises';

export const PLANS = [
  { name: 'Free', price: '$0', period: '', features: ['The first 2 exercises in every chapter', 'The Sales Overview Dashboard project', 'PL-300 practice test 1', 'Instant answer checking', 'Full DAX functions guide', 'Progress saved on this device'], cta: 'Start now', highlight: false },
  { name: 'Pro', price: '$79', period: '/year', sub: 'or $12.99/month', features: [`All ${EXERCISES.length} exercises`, 'All end-to-end dashboard projects, with data downloads', 'Every PL-300 practice test', 'Power Query & data modeling modules', 'Certificate for LinkedIn', 'Progress synced across devices'], cta: 'Get Pro yearly', offer: 'pro-year' as OfferId, alt: { label: 'or pay $12.99 monthly', offer: 'pro-month' as OfferId }, highlight: true },
  { name: 'PL-300 Prep', price: '$49', period: ' one-time', sub: '3 months of access', features: ['Exam-style practice tests', 'Explanations for every answer', 'Weak-topic review'], cta: 'Buy PL-300 Prep', offer: 'pl300' as OfferId, highlight: false },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    sub: 'per user, billed yearly by invoice',
    features: ['Pro for everyone on your team', 'Manager dashboard with each person’s progress', 'Invite and remove people any time', 'One company invoice with your VAT ID', 'Volume discounts'],
    cta: 'Contact us',
    highlight: false,
  },
];

const OFFER_IDS: OfferId[] = ['pro-year', 'pro-month', 'pl300'];

export default function PricingPage() {
  const account = useAccount();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState<OfferId | null>(null);
  const [error, setError] = useState<{ text: string; manage: boolean } | null>(null);
  const plan = currentPlan();

  const buy = async (offer: OfferId) => {
    if (!accountsEnabled) return;
    setError(null);
    if (!account.email) {
      // Log in first, then come back here and continue to checkout.
      navigate(`/signup?next=${encodeURIComponent(`/pricing?buy=${offer}`)}`);
      return;
    }
    setBusy(offer);
    try {
      await startCheckout(offer);
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : 'Something went wrong.', manage: e instanceof BillingError && e.manage });
      setBusy(null);
    }
  };

  // Returning from log-in with ?buy=… continues straight to checkout, once.
  const resumed = useRef(false);
  useEffect(() => {
    const offer = params.get('buy') as OfferId | null;
    if (resumed.current || !account.ready || !offer || !OFFER_IDS.includes(offer)) return;
    resumed.current = true;
    setParams({}, { replace: true });
    if (account.email) void buy(offer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.ready, account.email]);

  const owned = (name: string) => (name === 'Pro' && plan === 'pro') || (name === 'PL-300 Prep' && plan === 'pl300');
  const btn = (highlight: boolean) => `mt-6 rounded-lg px-4 py-2 text-center text-sm font-semibold disabled:opacity-60 ${highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-300 hover:border-brand-500'}`;

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
        <h1 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">Simple pricing</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">Start free. Upgrade when you want the full path from your first chart to job-ready DAX.</p>
        {error && (
          <div role="alert" className="mx-auto mt-6 max-w-xl rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-800">
            {error.text}{' '}
            {error.manage && (
              <Link to="/account" className="font-semibold underline">
                Go to your account
              </Link>
            )}
          </div>
        )}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.name} className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${p.highlight ? 'border-brand-500 ring-2 ring-brand-500' : 'border-slate-200'}`}>
              {p.highlight && <div className="mb-2 self-start rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">Most popular</div>}
              <h2 className="text-lg font-bold">{p.name}</h2>
              <div className="mt-2">
                <span className="text-3xl font-extrabold">{p.price}</span>
                <span className="text-slate-500">{p.period}</span>
              </div>
              <div className="h-5 text-xs text-slate-500">{p.sub}</div>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-brand-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {owned(p.name) ? (
                <Link to="/account" className={btn(p.highlight)}>
                  Your plan · Manage
                </Link>
              ) : 'offer' in p && p.offer && accountsEnabled ? (
                <>
                  <button type="button" disabled={busy !== null} onClick={() => void buy(p.offer!)} className={btn(p.highlight)}>
                    {busy === p.offer ? 'Opening checkout…' : p.cta}
                  </button>
                  {'alt' in p && p.alt && (
                    <button type="button" disabled={busy !== null} onClick={() => void buy(p.alt!.offer)} className="mt-2 text-center text-xs font-semibold text-brand-700 hover:underline disabled:opacity-60">
                      {busy === p.alt.offer ? 'Opening checkout…' : p.alt.label}
                    </button>
                  )}
                </>
              ) : p.name === 'Enterprise' ? (
                account.team ? (
                  <Link to="/team" className={btn(p.highlight)}>
                    Your team plan
                  </Link>
                ) : (
                  <a href={`mailto:${ENTERPRISE_EMAIL}?subject=${encodeURIComponent('Enterprise plan for my team')}`} className={btn(p.highlight)}>
                    {p.cta}
                  </a>
                )
              ) : (
                <Link to={p.name === 'Free' ? '/exercises' : '#'} className={btn(p.highlight)}>
                  {p.name === 'Free' ? p.cta : 'Coming soon'}
                </Link>
              )}
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">
          {accountsEnabled ? 'Secure payment by Stripe. Cancel any time from your account.' : 'Payments are not live yet. Pro plans open soon; until then the free exercises are open to everyone.'}
        </p>
      </main>
      <Footer />
    </div>
  );
}
