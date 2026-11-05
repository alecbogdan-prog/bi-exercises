import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { EXERCISES } from '../exercises/exercises';
import { MODULES } from '../exercises/types';
import { BRAND } from '../lib/base';
import { RibbonChart } from '../components/RibbonChart';
import { KeyInfluencers } from '../components/KeyInfluencers';
import { TryDax } from '../components/TryDax';

const KEYWORDS = ['Reports & visuals', 'DAX measures', 'Power Query', 'Data modeling', 'Time intelligence', 'Much, much more'];

/** Illustrative learning path for the ribbon chart (scores out of 10, not measured data). */
const JOURNEY = {
  periods: ['Day 1', 'Week 1', 'Week 2', 'Week 4', 'Week 6', 'Week 8'],
  series: [
    { name: 'Confidence', color: '#E07B00', values: [2, 3, 5, 6.5, 8, 9], text: 'goes up: you know which field goes where and why.' },
    { name: 'DAX skills', color: '#118DFF', values: [1, 2.5, 4, 6, 7.5, 8.5], text: 'grow: CALCULATE, filter context and year-to-date stop being a mystery.' },
    { name: 'Report speed', color: '#12239E', values: [1.5, 2, 3.5, 5.5, 7, 8], text: 'improves: a report that took an afternoon now takes minutes.' },
    { name: 'Interview anxiety', color: '#C9A400', values: [8.5, 7, 5.5, 4, 2.5, 1.5], text: 'drops: a practical Power BI test feels like one more exercise.' },
  ],
};

/** Illustrative "key influencers" for the home page (examples, not measured data). */
const INFLUENCERS = [
  { when: 'Solved 20+ exercises', factor: 4.1 },
  { when: 'Practiced 3+ days a week', factor: 2.8 },
  { when: 'Finished the DAX chapters', factor: 2.3 },
  { when: 'Solved exercises without hints', factor: 1.9 },
  { when: 'Built a Power Query cleanup', factor: 1.6 },
  { when: 'Created a data model from scratch', factor: 1.3 },
];

const CAREER = [
  { role: 'Finance', task: 'Month-end dashboards, targets vs. actuals, year-over-year growth', chapters: 'Time Intelligence, Data Modeling' },
  { role: 'Sales', task: 'Revenue by region and product, top customers, rankings', chapters: 'Reports & Visuals, Advanced DAX' },
  { role: 'Operations', task: 'Cleaning supplier files, stock and order reports', chapters: 'Power Query, Filters & Slicers' },
  { role: 'Certification', task: 'Prepare for the PL-300 Power BI Data Analyst exam', chapters: 'all 9 chapters' },
];

/** Real reviews go here once learners send them. The section shows an invitation while this is empty. */
const TESTIMONIALS: { quote: string; name: string; place: string }[] = [
  { quote: 'Solved 5 DAX exercises on my break. Way faster and more engaging than sitting through a 40-minute video tutorial.', name: 'Grigore', place: 'Early tester' },
  { quote: 'The hint on the CALCULATE exercise showed me the exact syntax mistake I was making. The immediate feedback loop is great.', name: 'Madalina', place: 'Early tester' },
  { quote: 'The Power Query dataset felt just like the messy spreadsheets we deal with in real life. Loved the hands-on practice.', name: 'David', place: 'Early tester' },
];

const FAQ = [
  ['Do I need Power BI Desktop?', 'No. Everything runs in your browser, on Windows, Mac or a Chromebook. The editor follows the same layout as the real tool, so the skills transfer directly when you open Power BI Desktop at work.'],
  ['How is my answer checked?', 'Your visual, measure or query is evaluated against the real data model and compared with the expected result in every context: per category, per year and for the grand total. Different but equivalent DAX formulas are accepted.'],
  ['Who is it for?', 'Analysts, accountants, marketers, project managers and anyone who has to build reports. It is also good practice for the PL-300 (Power BI Data Analyst) exam.'],
  ['How long does an exercise take?', 'Most exercises take two to five minutes. Each one teaches one idea, so you can practice in a coffee break and still make progress.'],
  ['Is it free?', 'The first exercises in every chapter are free, with no sign-up. Pro unlocks the full path, projects and exam practice.'],
];

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden>
      <circle cx="10" cy="10" r="10" className="fill-brand-500" />
      <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h2 className="mb-3 border-l-4 border-brand-500 pl-3 font-display text-2xl leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-[28px]">{title}</h2>
      <div className="space-y-4 text-[17px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

function PrimaryButton({ to, children, tone = 'green' }: { to: string; children: ReactNode; tone?: 'green' | 'sun' }) {
  const c =
    tone === 'green'
      ? 'bg-brand-500 text-white shadow-[0_6px_0_var(--color-brand-700)] hover:bg-brand-600 active:translate-y-1 active:shadow-[0_2px_0_var(--color-brand-700)]'
      : 'bg-ink text-white shadow-[0_6px_0_#000] hover:bg-[#22313d] active:translate-y-1 active:shadow-[0_2px_0_#000]';
  return (
    <Link to={to} className={`inline-block rounded-full px-10 py-5 font-display text-xl font-extrabold tracking-tight transition sm:px-14 sm:text-2xl ${c}`}>
      {children}
    </Link>
  );
}

export default function HomePage() {
  useEffect(() => {
    document.title = 'Power BI Practice Exercises Online: Learn Power BI and DAX by Doing';
  }, []);
  const first = EXERCISES[0];
  const start = `/exercise/${first.id}`;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header>
        <Link to={start} className="rounded-full bg-brand-500 px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-600">
          Start free
        </Link>
      </Header>
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-mint">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ backgroundImage: 'linear-gradient(#f5e6b0 1px, transparent 1px), linear-gradient(90deg, #f5e6b0 1px, transparent 1px)', backgroundSize: '44px 44px' }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-14 text-center sm:pt-24">
            <h1 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-ink sm:text-6xl">
              {BRAND} helps busy people learn{' '}
              <span className="relative whitespace-nowrap text-brand-600">
                <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded bg-sunrise-500/60 sm:h-4" aria-hidden />
                <span className="relative">Power BI</span>
              </span>{' '}
              by doing.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-balance text-slate-600 sm:text-xl">
              Short, interactive exercises in a report editor that runs in your browser. Build the visual, write the DAX, clean the data, and get your answer checked in seconds.
            </p>
            <div className="mt-10">
              <PrimaryButton to={start}>Start Practicing for Free</PrimaryButton>
            </div>
            <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-x-7 gap-y-3 text-[17px] font-semibold text-ink">
              {KEYWORDS.map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <Check />
                  {k}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Facts strip (real numbers only) */}
        <section className="bg-ink text-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-5 text-center text-[17px]">
            <span>
              <b className="text-sunrise-500">{EXERCISES.length}</b> hands-on exercises
            </span>
            <span className="hidden h-5 w-px bg-white/30 sm:block" />
            <span>
              <b className="text-sunrise-500">{MODULES.length}</b> chapters, from your first chart to advanced DAX
            </span>
            <span className="hidden h-5 w-px bg-white/30 sm:block" />
            <span>
              <b className="text-sunrise-500">2–5</b> minutes per exercise
            </span>
          </div>
        </section>

        {/* Try it right here: three DAX challenges checked by the real engine */}
        <section className="bg-white" id="try-it">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <div className="mb-6 text-center">
              <div className="text-sm font-bold tracking-wide text-brand-600 uppercase">Try it now, no sign-up</div>
              <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Write your first DAX measure</h2>
              <p className="mx-auto mt-2 max-w-2xl text-slate-600">Three quick challenges on a real sales model. Type a formula, press Check, and see if your numbers match.</p>
            </div>
            <TryDax />
          </div>
        </section>

        {/* PL-300 band */}
        <section className="bg-ink text-white">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-4 py-12 text-center md:flex-row md:text-left">
            <div className="flex-1">
              <div className="text-sm font-bold tracking-wide text-sunrise-500 uppercase">Preparing for the exam?</div>
              <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Pass the PL-300 with confidence</h2>
              <p className="mt-2 max-w-2xl text-white/75">
                Exam-style PL-300 practice tests across all four domains (prepare, model, visualize, manage), with an explanation for every answer and a score that tells you if
                you're ready. The first test is free.
              </p>
            </div>
            <Link to="/pl300" className="shrink-0 rounded-full bg-sunrise-500 px-6 py-3 font-display text-lg font-extrabold text-ink hover:bg-sunrise-400">
              Take a free PL-300 practice test
            </Link>
          </div>
        </section>

        {/* What changes when you practice (journey chart + key influencers) */}
        <section className="bg-[#f3f2f1]">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="grid items-end gap-x-12 gap-y-6 lg:grid-cols-2">
              <div className="min-w-0">
                <p className="mb-2 text-sm font-bold tracking-widest text-brand-600 uppercase">What changes when you practice</p>
                <h2 className="font-display text-3xl leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-4xl">From nervous beginner to confident report builder</h2>
                <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
                  Watching tutorials makes Power BI look familiar. Building reports yourself makes you good at it. Every exercise you solve adds a little more skill, and the blank canvas stops being scary.
                </p>
              </div>
              <ul className="min-w-0 space-y-3">
                {JOURNEY.series.map((sr) => (
                  <li key={sr.name} className="flex gap-3 text-[16px] text-slate-700">
                    <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ background: sr.color }} />
                    <span>
                      <b className="text-ink">{sr.name}</b> {sr.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
              <RibbonChart title="Your Power BI Learning Journey" periods={JOURNEY.periods} series={JOURNEY.series} unit="/10" />
              <KeyInfluencers question="What influences feeling" outcome="job-ready" items={INFLUENCERS} />
            </div>
            <p className="mt-3 text-[12px] text-slate-500">Both visuals illustrate a typical learning path. They are examples, not measured data.</p>
          </div>
        </section>

        {/* Chapters, with every exercise linked */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">What you will learn</h2>
            <p className="mt-2 max-w-2xl text-[17px] text-slate-600">Nine chapters that follow the way reports are built at work: get the data in shape, model it, then report on it with visuals and DAX.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((m, i) => {
                const list = EXERCISES.filter((e) => e.module === m.id);
                return (
                  <div key={m.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
                    <div className="text-xs font-bold tracking-widest text-brand-600 uppercase">Chapter {i + 1}</div>
                    <h3 className="mt-1 font-display text-xl font-bold text-ink">{m.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{m.blurb}</p>
                    <ul className="mt-3 space-y-1 text-sm">
                      {list.slice(0, 4).map((e) => (
                        <li key={e.id}>
                          <Link to={`/exercise/${e.id}`} className="text-slate-700 hover:text-brand-700 hover:underline">
                            {e.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link to="/exercises" className="mt-auto pt-3 text-sm font-semibold text-brand-700 hover:underline">
                      All {list.length} exercises →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials: shown only once real reviews exist */}
        {TESTIMONIALS.length > 0 && (
          <section className="border-y border-brand-100 bg-brand-50">
           <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">What our first testers say</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                  <blockquote className="text-[17px] leading-relaxed text-slate-700">"{t.quote}"</blockquote>
                  <figcaption className="mt-auto pt-5">
                    <div className="font-bold text-ink">{t.name}</div>
                    <div className="text-xs font-bold tracking-widest text-brand-600 uppercase">{t.place}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
           </div>
          </section>
        )}

        {/* Long-form copy (SEO) */}
        <section className="bg-mint">
          <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-12 px-4 py-16 md:grid-cols-2">
            <div className="space-y-12">
              <CopyBlock title="The Fun Way to Learn Power BI Skills">
                <p>
                  Most people learn Power BI the hard way. They watch a few hours of tutorials, open Power BI Desktop at work, and then realize they don't remember which field goes where or why their measure shows the same number in every row. Knowing about a feature and being able to use it under pressure are two different things.
                </p>
                <p>
                  {BRAND} closes that gap. Each exercise gives you one realistic task and a report editor that looks and behaves like the real thing: a Data pane, a Visualizations pane, a Filters pane and a formula bar. You do the work yourself, and the site checks the result against the data, not against a screenshot.
                </p>
              </CopyBlock>
              <CopyBlock title="Power BI Practice for Busy People">
                <p>
                  You don't need a free weekend. Exercises take two to five minutes and focus on a single idea: a slicer, a relationship, a CALCULATE filter, a year-to-date measure. Do one on your lunch break and you have learned something you can use the same afternoon.
                </p>
                <p>
                  Your progress is saved in your browser, so you can stop in the middle of a chapter and pick up where you left off. Every chapter has a progress bar, and every lesson shows whether it is new, in progress or solved.
                </p>
              </CopyBlock>
            </div>
            <div className="space-y-12">
              <CopyBlock title={`${BRAND} Solves the "Boring Video" Problem`}>
                <p>
                  Video courses are easy to start and hard to finish. You pause, rewind, switch windows to copy a formula, and by the next module the earlier lessons are already fading. Watching someone else write DAX doesn't build the muscle memory you need to write it yourself.
                </p>
                <p>
                  Here there is nothing to watch. You read a short explanation, try it, and find out right away whether it worked. If it didn't, the feedback tells you exactly what is different: a missing filter, a measure in the wrong well, a relationship pointing the wrong way. You fix it and move on, which is how skills actually stick.
                </p>
              </CopyBlock>
              <CopyBlock title="Have Fun While You Learn">
                <p>
                  Practice works better when it feels like progress. You earn points for every solved exercise, a bonus when you solve one without hints, and a daily streak for coming back. It is a small thing, but it turns "I should practice Power BI" into "one more exercise before lunch".
                </p>
                <p>
                  The exercises build on each other. You start with a single card and a column chart, then add filters and slicers, clean data in Power Query, connect tables in the model, and finish with variables, ranking and time intelligence in DAX.
                </p>
              </CopyBlock>
            </div>
          </div>
        </section>

        {/* Career band */}
        <section className="bg-sunrise-500 text-ink">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1fr_1.15fr]">
            <div className="min-w-0">
              <h2 className="font-display text-3xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">Use {BRAND} to Power Up Your Career</h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink/90 sm:text-lg">
                Reporting is now part of almost every office job, and many analyst, finance and operations roles list Power BI next to Excel. Interviews increasingly include a practical task. The scenarios you practice here are the ones you will be asked to build.
              </p>
              <div className="mt-8">
                <PrimaryButton to={start} tone="sun">
                  Get Started for Free!
                </PrimaryButton>
              </div>
              <p className="mt-4 text-ink/90">
                <b>No sign-up needed.</b> Open the first exercise and start building.
              </p>
            </div>
            <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
              {CAREER.map((c) => (
                <li key={c.role} className="rounded-2xl bg-white/85 p-5 shadow-[0_4px_0_rgba(20,33,43,0.12)]">
                  <div className="text-xs font-bold tracking-widest text-brand-700 uppercase">{c.role}</div>
                  <div className="mt-1 font-display text-lg leading-snug font-bold text-ink">{c.task}</div>
                  <div className="mt-2 text-sm text-slate-600">Practice it in: {c.chapters}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Beginners & experts + hands-on */}
        <section className="bg-white">
         <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-12 px-4 py-16 md:grid-cols-2">
          <CopyBlock title="Hands-on Exercises">
            <p>
              You learn a tool by using it. Every exercise asks you to produce something: a visual with the right fields, a measure that returns the right numbers in every row, a query whose output matches the expected table. Because the answer is checked against the data, equivalent solutions count too, just like at work.
            </p>
            <p>
              The sample company, Ridgeline Cycles, has products, customers, stores, monthly targets and two years of orders. It is small enough to understand at a glance and rich enough to practice the patterns you will meet in real reports.
            </p>
          </CopyBlock>
          <CopyBlock title="Power BI Exercises for Beginners and Experts">
            <p>
              If you have never opened Power BI, start with chapter one: your first card, a column chart, a table with totals. Each lesson explains one idea in plain language before you try it.
            </p>
            <p>
              If you already build reports, jump to the chapters on CALCULATE and filter context, advanced DAX with VAR and RANKX, or time intelligence with year-to-date and last-year comparisons. Those are the topics that separate a report builder from a Power BI expert.
            </p>
          </CopyBlock>
         </div>
        </section>

        {/* FAQ */}
        <section className="bg-slate-50">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">Frequently asked questions</h2>
            <dl className="mt-6 divide-y divide-slate-200">
              {FAQ.map(([q, a]) => (
                <div key={q} className="py-4">
                  <dt className="text-lg font-bold text-ink">{q}</dt>
                  <dd className="mt-1 text-[17px] text-slate-600">{a}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-12 text-center">
              <PrimaryButton to={start}>Start Practicing for Free</PrimaryButton>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
