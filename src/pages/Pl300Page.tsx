import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { LockIcon } from '../components/ProLock';
import { hasPl300 } from '../lib/access';
import { BRAND } from '../lib/base';
import { bestScore } from '../pl300/scores';
import { DOMAINS, PASS_MARK, QUESTIONS, TESTS } from '../pl300/questions';
import { withBrand } from '../lib/titles';

export default function Pl300Page() {
  useEffect(() => {
    document.title = withBrand('PL-300 Practice Test: Power BI Exam Prep');
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-mint">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ backgroundImage: 'linear-gradient(#f5e6b0 1px, transparent 1px), linear-gradient(90deg, #f5e6b0 1px, transparent 1px)', backgroundSize: '44px 44px' }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-12 text-center sm:pt-20">
            <div className="text-xs font-semibold tracking-widest text-brand-700 uppercase">Exam prep</div>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-ink sm:text-6xl">PL-300 Practice Tests</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-balance text-slate-600">
              Exam-style questions for the Microsoft Power BI Data Analyst certification, with an explanation for every answer and a score for each skill area. Combine them with the
              hands-on exercises to learn the skills, not just the answers.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid gap-4 md:grid-cols-2">
            {TESTS.map((t) => {
              const locked = !t.free && !hasPl300();
              const best = bestScore(t.id);
              return (
                <div key={t.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-testid={`card-${t.id}`}>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">{t.title}</h2>
                    {hasPl300() ? null : t.free ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">FREE</span>
                    ) : (
                      <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        <LockIcon className="h-3 w-3" /> PRO
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-slate-600">
                    {t.questionIds.length} questions across all four skill areas. Practice mode: see the right answer and the explanation after each question.
                  </p>
                  <div className="mt-3 text-sm text-slate-500">
                    {best === null ? 'Not taken yet' : `Your best score: ${Math.round(best * 100)}% ${best >= PASS_MARK ? '(pass)' : '(below the 70% pass mark)'}`}
                  </div>
                  <div className="flex-1" />
                  <Link
                    to={locked ? '/pricing' : `/pl300/${t.id}`}
                    className={`mt-5 rounded-full px-6 py-3 text-center font-display text-lg font-extrabold ${locked ? 'border-2 border-ink/10 text-ink hover:border-brand-500' : 'bg-brand-500 text-white shadow-[0_4px_0_var(--color-brand-700)] hover:bg-brand-600'}`}
                  >
                    {locked ? 'Unlock with Pro' : best === null ? 'Start the test' : 'Take it again'}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-2">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">What the PL-300 exam covers</h2>
              <p className="mt-2 text-slate-600">The questions follow the four skill areas of Microsoft's published skills outline:</p>
              <ul className="mt-4 space-y-2">
                {DOMAINS.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
                    <span className="font-semibold text-ink">{d.title}</span>
                    <span className="shrink-0 text-sm text-slate-500 tabular-nums">
                      {d.weight} · {QUESTIONS.filter((x) => x.domain === d.id).length} questions here
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">Weights can change; check the official skills outline on Microsoft Learn before your exam.</p>
            </div>
            <div className="min-w-0 space-y-4 text-slate-700">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">How to use these tests</h2>
              <p>
                The real exam is scored from 100 to 1,000 and you need 700 to pass. We use 70% as the pass mark here. Take a test once to find your weak areas, practice those
                chapters with hands-on exercises, then take the test again.
              </p>
              <p>
                Many PL-300 questions describe a situation and ask what you should do. The fastest way to get those right is to have done it: building relationships, cleaning data
                in Power Query and writing CALCULATE measures.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link to="/exercises" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-[#22313d]">
                  Hands-on exercises →
                </Link>
                <Link to="/dax-functions" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-ink hover:border-brand-500">
                  DAX functions list
                </Link>
                <Link to="/power-bi-assessment-test" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-ink hover:border-brand-500">
                  Interview assessment prep
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-12 text-center text-xs text-slate-500">
            These are original practice questions written by {BRAND}. They are not real exam questions, and this site is not affiliated with Microsoft.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
