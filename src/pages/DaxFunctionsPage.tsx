import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { DAX_CATEGORIES, DAX_FUNCTIONS, exercisesByFunction } from '../content/daxFunctions';
import type { DaxFunction } from '../content/daxFunctions';
import { EXERCISES } from '../exercises/exercises';
import { BRAND } from '../lib/base';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function DaxFunctionsPage() {
  const [query, setQuery] = useState('');
  const practice = useMemo(() => exercisesByFunction(), []);
  const start = `/exercise/${EXERCISES[0].id}`;

  useEffect(() => {
    document.title = `DAX Functions List with Practice Exercises | ${BRAND}`;
  }, []);

  const q = query.trim().toLowerCase();
  const visible = (fn: DaxFunction) => !q || fn.name.toLowerCase().includes(q) || fn.description.toLowerCase().includes(q) || fn.category.toLowerCase().includes(q);
  const shown = DAX_FUNCTIONS.filter(visible);
  const withPractice = DAX_FUNCTIONS.filter((fn) => practice.has(fn.name)).length;

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header>
        <Link to={start} className="whitespace-nowrap rounded-full bg-brand-500 px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-600">
          Start free
        </Link>
      </Header>

      <main className="flex-1">
        <section className="relative overflow-hidden bg-mint">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ backgroundImage: 'linear-gradient(#f5e6b0 1px, transparent 1px), linear-gradient(90deg, #f5e6b0 1px, transparent 1px)', backgroundSize: '44px 44px' }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-12 text-center sm:pt-20">
            <h1 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-ink sm:text-6xl">
              DAX Functions{' '}
              <span className="relative whitespace-nowrap text-brand-600">
                <span className="absolute inset-x-0 bottom-1 h-3 rounded bg-sunrise-500/60 sm:h-4" aria-hidden />
                <span className="relative">List</span>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-balance text-slate-600">
              The {DAX_FUNCTIONS.length} DAX functions you will use most in Power BI, grouped by what they do. Each one has a plain-English explanation, its syntax, a real example, and
              links to hands-on exercises where you write it yourself.
            </p>
            <div className="mx-auto mt-8 max-w-xl">
              <label htmlFor="dax-search" className="sr-only">
                Search DAX functions
              </label>
              <input
                id="dax-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a function, e.g. CALCULATE or year-to-date"
                className="w-full rounded-full border-2 border-ink/10 bg-white px-6 py-4 text-lg shadow-sm outline-none focus:border-brand-500"
              />
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {withPractice} of {DAX_FUNCTIONS.length} functions have interactive practice exercises.
            </p>
          </div>
        </section>

        <nav className="sticky top-14 z-10 border-b border-slate-200 bg-white/95 backdrop-blur" aria-label="Function categories">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3">
            {DAX_CATEGORIES.map((c) => {
              const n = shown.filter((fn) => fn.category === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => jump(slug(c.id))}
                  disabled={!n}
                  className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-ink hover:border-brand-500 hover:text-brand-700 disabled:opacity-40"
                >
                  {c.id} <span className="font-normal text-slate-500 tabular-nums">{n}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="mx-auto max-w-6xl space-y-14 px-4 py-12">
          {shown.length === 0 && <p className="text-center text-slate-600">No function matches “{query}”.</p>}
          {DAX_CATEGORIES.map((c) => {
            const list = shown.filter((fn) => fn.category === c.id);
            if (!list.length) return null;
            return (
              <section key={c.id} id={slug(c.id)} className="scroll-mt-32">
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{c.title}</h2>
                <p className="mt-1 max-w-2xl text-slate-600">{c.blurb}</p>
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                  <div className="hidden grid-cols-[180px_minmax(0,1fr)_260px] gap-4 bg-slate-50 px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase md:grid">
                    <span>Function</span>
                    <span>What it does</span>
                    <span>Practice</span>
                  </div>
                  <ul className="divide-y divide-slate-200">
                    {list.map((fn) => (
                      <FunctionRow key={fn.name} fn={fn} exercises={practice.get(fn.name) ?? []} />
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>

        <section className="bg-mint">
          <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-10 px-4 py-16 md:grid-cols-2">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">What is DAX?</h2>
              <div className="mt-4 space-y-4 text-slate-700">
                <p>
                  DAX (Data Analysis Expressions) is the formula language of Power BI. You use it to write measures such as Total Sales or Margin %, calculated columns such as a price band,
                  and calculated tables. It looks a little like Excel formulas, but it works on whole tables and columns instead of single cells.
                </p>
                <p>
                  The key idea is the <b>filter context</b>: the same measure gives a different number in every cell of a visual, because each cell filters the data differently. Functions
                  like CALCULATE, ALL and FILTER let you change that context on purpose.
                </p>
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">How to learn DAX functions</h2>
              <div className="mt-4 space-y-4 text-slate-700">
                <p>
                  Reading a function list helps you know what exists. Remembering it at work takes practice. Start with SUM, COUNTROWS and DIVIDE, then move on to CALCULATE and filter
                  context, iterators like SUMX, and finally time intelligence such as TOTALYTD and SAMEPERIODLASTYEAR.
                </p>
                <p>
                  Each exercise on {BRAND} gives you a real request from a colleague, a report editor in your browser, and instant feedback on your formula. Most take two to five minutes.
                </p>
              </div>
            </div>
          </div>
          <div className="pb-16 text-center">
            <Link
              to={start}
              className="inline-block rounded-full bg-brand-500 px-10 py-5 font-display text-xl font-extrabold tracking-tight text-white shadow-[0_6px_0_var(--color-brand-700)] transition hover:bg-brand-600 active:translate-y-1 active:shadow-[0_2px_0_var(--color-brand-700)] sm:px-14 sm:text-2xl"
            >
              Start Practicing for Free
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FunctionRow({ fn, exercises }: { fn: DaxFunction; exercises: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="px-4 py-3.5" data-testid={`fn-${fn.name}`}>
      <div className="grid gap-x-4 gap-y-2 md:grid-cols-[180px_minmax(0,1fr)_260px] md:items-start">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setOpen(!open)} className="p-0.5 text-xs text-slate-400 hover:text-brand-700" aria-expanded={open} aria-label={`Show ${fn.name} syntax`}>
            <span className={`inline-block transition ${open ? 'rotate-90' : ''}`}>▶</span>
          </button>
          <Link to={`/dax-functions/${fn.name.toLowerCase()}`} className="font-mono text-[15px] font-semibold text-brand-700 hover:underline">
            {fn.name}
          </Link>
        </div>
        <p className="min-w-0 text-[15px] text-slate-700">{fn.description}</p>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {exercises.length ? (
            exercises.slice(0, 3).map((e) => (
              <Link key={e.id} to={`/exercise/${e.id}`} className="max-w-full truncate rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                {e.title} →
              </Link>
            ))
          ) : (
            <span className="text-xs text-slate-400">Exercise coming soon</span>
          )}
          {exercises.length > 3 && <span className="px-1 py-1 text-xs text-slate-500">+{exercises.length - 3} more</span>}
        </div>
      </div>
      {open && (
        <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm md:ml-[196px]">
          <div className="min-w-0">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Syntax</span>
            <pre className="mt-1 overflow-x-auto font-mono text-[13px] text-ink">{fn.syntax}</pre>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Example</span>
            <pre className="mt-1 overflow-x-auto font-mono text-[13px] text-ink">{fn.example}</pre>
          </div>
          <Link to={`/dax-functions/${fn.name.toLowerCase()}`} className="text-sm font-semibold text-brand-700 hover:underline">
            Full {fn.name} guide and practice →
          </Link>
        </div>
      )}
    </li>
  );
}
