import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { LockIcon } from '../components/ProLock';
import { DAX_CATEGORIES, DAX_FUNCTIONS, argumentsOf, exercisesByFunction, functionBySlug } from '../content/daxFunctions';
import { EXERCISES } from '../exercises/exercises';
import DaxFunctionsPage from './DaxFunctionsPage';
import { hasPro } from '../lib/access';
import { daxTitle } from '../lib/titles';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function DaxFunctionPage() {
  const { name = '' } = useParams();
  const fn = functionBySlug(name);
  const practice = useMemo(() => (fn ? (exercisesByFunction().get(fn.name) ?? []) : []), [fn]);

  useEffect(() => {
    if (fn) document.title = daxTitle(fn.name);
    window.scrollTo(0, 0);
  }, [fn]);

  if (!fn) return <DaxFunctionsPage />;

  const category = DAX_CATEGORIES.find((c) => c.id === fn.category)!;
  const args = argumentsOf(fn);
  const required = args.filter((a) => !a.optional).length;
  const optional = args.length - required;
  const related = DAX_FUNCTIONS.filter((f) => f.category === fn.category && f.name !== fn.name);
  const first = practice[0];
  const start = `/exercise/${EXERCISES[0].id}`;

  const argSummary =
    args.length === 0
      ? `The ${fn.name} function takes no arguments, but you still write the parentheses.`
      : `The ${fn.name} function has ${plural(required, 'required argument', 'required arguments')}${optional ? ` and ${plural(optional, 'optional one', 'optional ones')}` : ''}, separated by commas. The syntax is:`;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header>
        <Link to={start} className="whitespace-nowrap rounded-full bg-brand-500 px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-600">
          Start free
        </Link>
      </Header>

      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 pt-10 pb-14">
          <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
            <Link to="/dax-functions" className="hover:text-brand-700">
              DAX Functions
            </Link>{' '}
            › <span>{category.title}</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">DAX {fn.name} Function</h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-700">
            {fn.description} {fn.name} belongs to the {category.title.toLowerCase().replace('calculate', 'CALCULATE').replace('dax', 'DAX')}. {category.blurb}
          </p>

          <h2 className="mt-10 font-display text-2xl font-extrabold tracking-tight text-ink">Syntax of the {fn.name} function</h2>
          <p className="mt-2 text-slate-700">{argSummary}</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 px-4 py-3 font-mono text-[15px] text-brand-700">{fn.syntax}</pre>
          {args.length > 0 && (
            <ul className="mt-4 space-y-2.5 text-slate-700">
              {args.map((a) => (
                <li key={a.name} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                  <span className="min-w-0">
                    <b className="font-mono text-[15px] text-ink">{a.name}</b>{' '}
                    <span className={`text-xs font-semibold tracking-wide uppercase ${a.optional ? 'text-slate-500' : 'text-brand-700'}`}>({a.optional ? 'optional' : 'required'})</span> – {a.description}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-10 font-display text-2xl font-extrabold tracking-tight text-ink">Example</h2>
          <p className="mt-2 text-slate-700">A measure on the sample data used in our exercises (Ridgeline Cycles, a fictional bike shop):</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-ink px-4 py-3 font-mono text-[14px] text-white">{fn.example}</pre>

          {related.length > 0 && (
            <>
              <h2 className="mt-10 font-display text-2xl font-extrabold tracking-tight text-ink">Related functions</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {related.map((r) => (
                  <Link key={r.name} to={`/dax-functions/${r.name.toLowerCase()}`} className="rounded-full border border-slate-200 px-3 py-1.5 font-mono text-sm font-semibold text-brand-700 hover:border-brand-500">
                    {r.name}
                  </Link>
                ))}
              </div>
            </>
          )}
        </article>

        <section className="border-t border-slate-200 bg-mint">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center">
            {first ? (
              <>
                <Link to={`/exercise/${first.id}`} className="font-display text-2xl font-extrabold tracking-tight text-ink underline decoration-sunrise-500 decoration-4 underline-offset-4 hover:text-brand-700 sm:text-3xl">
                  Continue to {fn.name} practice exercises! →
                </Link>
                <p className="mt-3 text-slate-600">
                  {plural(practice.length, 'exercise uses', 'exercises use')} {fn.name}. Each one is a real request from a colleague, checked instantly in your browser.
                </p>
                <ul className="mx-auto mt-6 grid max-w-2xl gap-2 text-left sm:grid-cols-2">
                  {practice.map((e) => (
                    <li key={e.id}>
                      <Link to={`/exercise/${e.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-brand-500">
                        <span className="min-w-0 truncate">{e.title}</span>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500">
                          {hasPro() ? null : e.free ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">FREE</span> : <LockIcon className="h-3 w-3 text-amber-700" />}
                          {e.level}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Link to={start} className="font-display text-2xl font-extrabold text-ink underline decoration-sunrise-500 decoration-4 underline-offset-4">
                Start practicing DAX →
              </Link>
            )}
            <div className="mt-8">
              <Link to="/dax-functions" className="text-sm font-semibold text-brand-700 hover:underline">
                ← All DAX functions
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
