import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { baseEngine } from '../lib/base';
import { formatValue } from '../engine/visual';
import type { FilterContext, Scalar } from '../engine/model';
import { trackEvent } from '../lib/analytics';

interface Challenge {
  title: string;
  task: string;
  hint: string;
  answer: string;
  measure: string;
  format: 'currency' | 'integer';
}

/** Three quick DAX challenges on the sample model, checked by the same engine the exercises use. */
const CHALLENGES: Challenge[] = [
  {
    title: 'Total Sales',
    task: 'Write a measure that adds up the Sales Amount column of the Sales table.',
    hint: 'SUM takes one column, written as Table[Column].',
    answer: 'SUM(Sales[Sales Amount])',
    measure: 'Total Sales',
    format: 'currency',
  },
  {
    title: 'Orders',
    task: 'Count how many rows the Sales table has. Each row is one order line.',
    hint: 'COUNTROWS takes a table, not a column.',
    answer: 'COUNTROWS(Sales)',
    measure: 'Orders',
    format: 'integer',
  },
  {
    title: 'Bike Sales',
    task: 'Show the total Sales Amount for the Bikes category only, in every row of the table.',
    hint: 'CALCULATE(<expression>, <filter>). The filter is Product[Category] = "Bikes".',
    answer: 'CALCULATE(SUM(Sales[Sales Amount]), Product[Category] = "Bikes")',
    measure: 'Bike Sales',
    format: 'currency',
  },
];

const CATEGORIES = ['Bikes', 'Accessories', 'Clothing', 'Components'];

type Cell = { label: string; ctx: FilterContext };
const CELLS: Cell[] = [
  ...CATEGORIES.map((c) => ({ label: c, ctx: [{ table: 'Product', columns: ['Category'], test: (r: Record<string, Scalar>) => r.Category === c }] })),
  { label: 'Total', ctx: [] },
];

function evaluate(expression: string, ch: Challenge): { values: Scalar[] } | { error: string } {
  try {
    const engine = baseEngine().withMeasures([{ name: ch.measure, table: 'Sales', expression }]);
    return { values: CELLS.map((c) => engine.evaluateMeasure(ch.measure, c.ctx)) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'That formula could not be evaluated.' };
  }
}

const same = (a: Scalar, b: Scalar) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 0.005 : a === b);

export function TryDax() {
  const [step, setStep] = useState(0);
  const [formula, setFormula] = useState('');
  const [checked, setChecked] = useState<null | { ok: boolean; values?: Scalar[]; error?: string }>(null);
  const [showHint, setShowHint] = useState(false);
  const done = step >= CHALLENGES.length;
  const ch = CHALLENGES[Math.min(step, CHALLENGES.length - 1)];
  const expected = useMemo(() => {
    const r = evaluate(ch.answer, ch);
    return 'values' in r ? r.values : [];
  }, [ch]);

  const check = (e?: FormEvent) => {
    e?.preventDefault();
    const expr = formula.replace(/^\s*[^=(]*=\s*/, '').trim();
    if (!expr) return;
    const r = evaluate(expr, ch);
    if ('error' in r) {
      setChecked({ ok: false, error: r.error });
      return;
    }
    const ok = r.values.every((v, i) => same(v, expected[i]));
    setChecked({ ok, values: r.values });
    if (ok) trackEvent('try_dax_solved', { challenge: ch.title });
  };

  const next = () => {
    setStep((s) => s + 1);
    setFormula('');
    setChecked(null);
    setShowHint(false);
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200" data-testid="try-dax-done">
        <div className="text-4xl">🎉</div>
        <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">You just wrote three DAX measures.</h3>
        <p className="mx-auto mt-2 max-w-md text-slate-600">That is exactly how every exercise works: a real task, your formula, checked in seconds. There are 150+ more waiting.</p>
        <Link to="/exercises" className="mt-6 inline-block rounded-full bg-brand-500 px-6 py-3 font-display text-lg font-extrabold text-white shadow-[0_4px_0_var(--color-brand-700)] hover:bg-brand-600">
          Keep practicing for free
        </Link>
      </div>
    );
  }

  const shown = checked?.values ?? null;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" data-testid="try-dax">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="text-sm font-semibold text-slate-500">
          Challenge {step + 1} of {CHALLENGES.length}: <span className="text-ink">{ch.title}</span>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {CHALLENGES.map((c, i) => (
            <span key={c.title} className={`h-2 w-6 rounded-full ${i < step ? 'bg-brand-500' : i === step ? 'bg-sunrise-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0">
          <p className="text-[17px] font-semibold text-ink">{ch.task}</p>
          <form onSubmit={check} className="mt-4">
            <label className="block text-xs font-semibold tracking-wide text-slate-500 uppercase" htmlFor="try-dax-formula">
              Formula bar
            </label>
            <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border border-slate-300 focus-within:border-brand-500">
              <span className="flex items-center bg-slate-50 px-3 font-mono text-sm whitespace-nowrap text-slate-500">{ch.measure} =</span>
              <input
                id="try-dax-formula"
                value={formula}
                onChange={(e) => {
                  setFormula(e.target.value);
                  setChecked(null);
                }}
                spellCheck={false}
                autoComplete="off"
                placeholder={step === 0 ? 'SUM(Sales[Sales Amount])' : 'Type your DAX here'}
                className="min-w-0 flex-1 px-3 py-2.5 font-mono text-sm outline-none"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
                Check
              </button>
              {!showHint ? (
                <button type="button" onClick={() => setShowHint(true)} className="text-sm font-semibold text-brand-700 hover:underline">
                  Hint
                </button>
              ) : (
                <span className="text-sm text-slate-600">
                  💡 {ch.hint}{' '}
                  <button type="button" onClick={() => setFormula(ch.answer)} className="font-semibold text-brand-700 hover:underline">
                    Show answer
                  </button>
                </span>
              )}
            </div>
          </form>
          {checked && (
            <div role="status" className={`mt-4 rounded-xl p-3 text-sm ${checked.ok ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'}`}>
              {checked.ok ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">✓ Correct! The numbers match in every row.</span>
                  <button type="button" onClick={next} className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700">
                    {step + 1 < CHALLENGES.length ? 'Next challenge →' : 'Finish'}
                  </button>
                </div>
              ) : checked.error ? (
                <span>
                  <b>Not quite:</b> {checked.error}
                </span>
              ) : (
                <span>
                  <b>Not quite:</b> the formula runs, but the numbers in the table don't match yet. Compare your column with the expected one.
                </span>
              )}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <table className="w-full overflow-hidden rounded-lg text-sm ring-1 ring-slate-200">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 text-right font-semibold">Your {ch.measure}</th>
                <th className="px-3 py-2 text-right font-semibold">Expected</th>
              </tr>
            </thead>
            <tbody>
              {CELLS.map((c, i) => {
                const mine = shown?.[i];
                const match = shown ? same(mine ?? null, expected[i]) : null;
                return (
                  <tr key={c.label} className={`border-t border-slate-100 ${c.label === 'Total' ? 'font-bold' : ''}`}>
                    <td className="px-3 py-2">{c.label}</td>
                    <td className={`px-3 py-2 text-right font-mono ${match === false ? 'text-red-600' : match ? 'text-emerald-700' : 'text-slate-300'}`}>
                      {shown ? formatValue(mine ?? null, ch.format) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">{formatValue(expected[i] ?? null, ch.format)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">Sample data: a bike shop's Sales, Product, Customer and Date tables.</p>
        </div>
      </div>
    </div>
  );
}
