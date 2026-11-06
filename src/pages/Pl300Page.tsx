import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { LockIcon } from '../components/ProLock';
import { hasPl300 } from '../lib/access';
import { BRAND } from '../lib/base';
import { bestScore } from '../pl300/scores';
import { CASES, DOMAINS, EXAM_MINUTES, PASS_MARK, QUESTIONS, TESTS, caseById } from '../pl300/questions';
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
              {TESTS.length} full practice tests with {QUESTIONS.length} exam-style questions and {CASES.length} case studies for the Microsoft Power BI Data Analyst certification.
              Practice with an explanation after every answer, or take a timed exam with a score out of 1,000.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="mb-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <b className="text-ink">Practice mode</b>: check each answer and read why it is right.
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <b className="text-ink">Exam mode</b>: {EXAM_MINUTES} minutes, flag questions, results at the end, score out of 1,000.
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <b className="text-ink">Weak-topic review</b>: every question you missed, weakest area first.{' '}
              <Link to="/pl300/review" className="font-semibold text-brand-700 hover:underline">
                Open review →
              </Link>
            </div>
          </div>
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
                    {t.questionIds.length} questions across all four skill areas, ending with the <b className="text-ink">{caseById(t.caseId)?.title}</b> case study.
                  </p>
                  <div className="mt-3 text-sm text-slate-500">
                    {best === null ? 'Not taken yet' : `Your best score: ${Math.round(best * 100)}% ${best >= PASS_MARK ? '(pass)' : '(below the 70% pass mark)'}`}
                  </div>
                  <div className="flex-1" />
                  {locked ? (
                    <Link to="/pricing" className="mt-5 rounded-full border-2 border-ink/10 px-6 py-3 text-center font-display text-lg font-extrabold text-ink hover:border-brand-500">
                      Unlock with Pro
                    </Link>
                  ) : (
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <Link
                        to={`/pl300/${t.id}`}
                        className="rounded-full bg-brand-500 px-5 py-3 text-center font-display text-lg font-extrabold text-white shadow-[0_4px_0_var(--color-brand-700)] hover:bg-brand-600"
                      >
                        Practice
                      </Link>
                      <Link
                        to={`/pl300/${t.id}?mode=exam`}
                        className="rounded-full border-2 border-ink/15 px-5 py-3 text-center font-display text-lg font-extrabold text-ink hover:border-brand-500"
                      >
                        Exam · {EXAM_MINUTES} min
                      </Link>
                    </div>
                  )}
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
                The real exam is scored from 100 to 1,000 and you need 700 to pass. Start in practice mode to learn from the explanations, then take each test in exam mode
                against the clock. The weak-topic review collects your mistakes from every test and links to the hands-on chapters for each area.
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
