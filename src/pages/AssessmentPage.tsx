import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { EXERCISES } from '../exercises/exercises';
import { MODULES } from '../exercises/types';
import type { ModuleId } from '../exercises/types';
import { ASSESSMENT_FAQ, ASSESSMENT_FORMATS, ASSESSMENT_SKILLS, PREP_PLAN, SAMPLE_QUESTIONS } from '../content/assessment';
import type { SampleQuestion } from '../content/assessment';
import { BRAND } from '../lib/base';
import { withBrand } from '../lib/titles';

/** The first free exercise of a chapter (or its first exercise), so every link opens without a paywall when possible. */
function firstExercise(module: ModuleId) {
  const list = EXERCISES.filter((e) => e.module === module);
  return list.find((e) => e.free) ?? list[0];
}

const moduleTitle = (id: ModuleId) => MODULES.find((m) => m.id === id)?.title ?? id;

function QuestionCard({ n, item }: { n: number; item: SampleQuestion }) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" data-testid={`sample-q-${n}`}>
      <div className="text-xs font-bold tracking-widest text-brand-600 uppercase">Question {n}</div>
      <p className="mt-2 text-[17px] font-semibold text-ink">{item.q}</p>
      {item.code && <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-sm text-slate-100">{item.code}</pre>}
      <ul className="mt-4 space-y-2">
        {item.options.map((o, i) => {
          const right = done && i === item.answer;
          const wrong = done && i === picked && i !== item.answer;
          return (
            <li key={o}>
              <button
                type="button"
                disabled={done}
                onClick={() => setPicked(i)}
                className={`w-full rounded-lg border px-4 py-2.5 text-left text-[15px] break-words transition ${
                  right ? 'border-2 border-green-600 bg-green-100 font-semibold text-green-900' : wrong ? 'border-2 border-red-500 bg-red-100 text-red-900' : done ? 'border-slate-200 text-slate-500' : 'border-slate-300 text-slate-800 hover:border-brand-500 hover:bg-brand-50'
                }`}
              >
                {right ? '✓ ' : wrong ? '✗ ' : ''}
                {o}
              </button>
            </li>
          );
        })}
      </ul>
      {done && (
        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-[15px] text-slate-700" role="status">
          <b className={picked === item.answer ? 'text-green-700' : 'text-red-700'}>{picked === item.answer ? 'Correct. ' : 'Not quite. '}</b>
          {item.why}
        </p>
      )}
    </div>
  );
}

export default function AssessmentPage() {
  useEffect(() => {
    document.title = withBrand('Power BI Assessment Test: Interview Practice');
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
            <div className="text-xs font-semibold tracking-widest text-brand-700 uppercase">Interview prep</div>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-ink sm:text-6xl">Power BI Assessment Test Practice</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-balance text-slate-600">
              Got a Power BI test before your interview? See what these tests look like, try {SAMPLE_QUESTIONS.length} sample questions with explanations, and practice every skill
              hands-on in your browser.
            </p>
            <a
              href="#sample-questions"
              className="mt-8 inline-block rounded-full bg-brand-500 px-8 py-4 font-display text-xl font-extrabold text-white shadow-[0_5px_0_var(--color-brand-700)] hover:bg-brand-600"
            >
              Try the sample questions
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">What a Power BI assessment test looks like</h2>
          <p className="mt-2 max-w-3xl text-[17px] text-slate-600">Employers check Power BI skills in three common ways. Many use more than one.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ASSESSMENT_FORMATS.map((f) => (
              <div key={f.title} className="min-w-0 rounded-2xl border border-slate-200 p-6">
                <h3 className="font-display text-xl font-bold text-ink">{f.title}</h3>
                <p className="mt-2 text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">Skills the test checks, and where to practice them</h2>
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {ASSESSMENT_SKILLS.map((s) => {
                const ex = firstExercise(s.module);
                return (
                  <li key={s.module} className="flex min-w-0 flex-col gap-1 rounded-xl border border-slate-200 bg-white px-5 py-4">
                    <span className="text-slate-800">{s.skill}</span>
                    {ex && (
                      <Link to={`/exercise/${ex.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                        Practice: {moduleTitle(s.module)} →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section id="sample-questions" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-14">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">Sample Power BI assessment questions</h2>
          <p className="mt-2 text-[17px] text-slate-600">Pick an answer to see if you are right and why. These are the kinds of questions online assessment tests ask.</p>
          <div className="mt-6 space-y-4">
            {SAMPLE_QUESTIONS.map((item, i) => (
              <QuestionCard key={item.q} n={i + 1} item={item} />
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-ink p-6 text-white sm:p-8">
            <h3 className="font-display text-2xl font-extrabold">Want a full timed test?</h3>
            <p className="mt-2 text-white/80">The PL-300 practice tests cover the same skills with exam-style questions and a score for each area. The first one is free.</p>
            <Link to="/pl300" className="mt-4 inline-block rounded-full bg-sunrise-500 px-6 py-3 font-bold text-ink hover:brightness-95">
              Take a practice test →
            </Link>
          </div>
        </section>

        <section className="bg-mint/60">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">A 7-day plan before your assessment</h2>
            <p className="mt-2 max-w-3xl text-[17px] text-slate-600">
              Quizzes test what you know. Take-home tasks and live interviews test what you can build. Fifteen to thirty minutes of hands-on practice a day covers both.
            </p>
            <ol className="mt-6 space-y-3">
              {PREP_PLAN.map((p) => {
                const ex = p.module ? firstExercise(p.module) : undefined;
                const link = ex ? { href: `/exercise/${ex.id}`, text: moduleTitle(p.module!) } : p.link;
                return (
                  <li key={p.day} className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
                    <span className="w-16 shrink-0 font-display text-lg font-extrabold text-brand-600">{p.day}</span>
                    <span className="min-w-0 flex-1 text-slate-800">{p.focus}</span>
                    {link && (
                      <Link to={link.href} className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
                        {link.text} →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">Frequently asked questions</h2>
          <dl className="mt-6 divide-y divide-slate-200">
            {ASSESSMENT_FAQ.map(([q, a]) => (
              <div key={q} className="py-4">
                <dt className="text-lg font-bold text-ink">{q}</dt>
                <dd className="mt-1 text-[17px] text-slate-600">{a}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 text-center">
            <Link
              to={`/exercise/${EXERCISES[0].id}`}
              className="inline-block rounded-full bg-brand-500 px-10 py-5 font-display text-xl font-extrabold text-white shadow-[0_6px_0_var(--color-brand-700)] hover:bg-brand-600"
            >
              Start practicing for free
            </Link>
          </div>
          <p className="mt-10 text-center text-xs text-slate-500">
            The sample questions are original, written by {BRAND}. They are not taken from any employer's test.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
