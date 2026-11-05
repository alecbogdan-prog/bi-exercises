import { Link } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { EXERCISES } from '../exercises/exercises';

export const PLANS = [
  { name: 'Free', price: '$0', period: '', features: ['The first 2 exercises in every chapter', 'The Sales Overview Dashboard project', 'PL-300 practice test 1', 'Instant answer checking', 'Full DAX functions guide', 'Progress saved on this device'], cta: 'Start now', highlight: false },
  { name: 'Pro', price: '$79', period: '/year', sub: 'or $12.99/month', features: [`All ${EXERCISES.length} exercises`, 'All end-to-end dashboard projects, with data downloads', 'Every PL-300 practice test', 'Power Query & data modeling modules', 'Certificate for LinkedIn', 'Progress synced across devices'], cta: 'Join the waitlist', highlight: true },
  { name: 'PL-300 Prep', price: '$49', period: ' one-time', sub: '3 months of access', features: ['Exam-style practice tests', 'Explanations for every answer', 'Weak-topic review'], cta: 'Join the waitlist', highlight: false },
  { name: 'Team', price: '$12', period: '/user/month', sub: 'billed yearly, 5+ seats', features: ['Everything in Pro', 'Manager dashboard & progress reports', 'Invoice billing'], cta: 'Contact us', highlight: false },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
        <h1 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">Simple pricing</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">Start free. Upgrade when you want the full path from your first chart to job-ready DAX.</p>
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
              <Link to={p.name === 'Free' ? '/exercises' : '#'} className={`mt-6 rounded-lg px-4 py-2 text-center text-sm font-semibold ${p.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-300 hover:border-brand-500'}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">Payments are not live yet. Pro plans open soon; until then the free exercises are open to everyone.</p>
      </main>
      <Footer />
    </div>
  );
}
