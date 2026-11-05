import { useMemo } from 'react';
import { autoUnits, computeVisual, emptySpec, formatTick } from '../engine/visual';
import type { VisualSpec, VisualType } from '../engine/visual';
import { baseEngine } from '../lib/base';
import { Chart } from './Chart';

const f = (table: string, column: string) => ({ table, column });
const amount = { kind: 'column' as const, table: 'Sales', column: 'Sales Amount', agg: 'SUM' as const };
const qty = { kind: 'column' as const, table: 'Sales', column: 'Quantity', agg: 'SUM' as const };
const spec = (s: Partial<VisualSpec>): VisualSpec => ({ ...emptySpec(), ...s });

const TILES: { title: string; type: VisualType; spec: VisualSpec; area: string }[] = [
  { title: 'Units by State and Year', type: 'bar', spec: spec({ type: 'bar', category: [f('Customer', 'State')], series: [f('Date', 'Year')], values: [qty] }), area: 'lg:col-span-1' },
  { title: 'Sales Amount by Product', type: 'treemap', spec: spec({ type: 'treemap', category: [f('Product', 'Product')], values: [amount] }), area: 'lg:col-span-1' },
  { title: 'Sales by Category and Year', type: 'matrix', spec: spec({ type: 'matrix', category: [f('Product', 'Category')], series: [f('Date', 'Year')], values: [amount] }), area: 'lg:col-span-1' },
  { title: 'Sales Amount by Year Month', type: 'area', spec: spec({ type: 'area', category: [f('Date', 'Year Month')], values: [amount] }), area: 'lg:col-span-2' },
  { title: 'Sales by Segment and Year', type: 'clusteredColumn', spec: spec({ type: 'clusteredColumn', category: [f('Customer', 'Segment')], series: [f('Date', 'Year')], values: [amount] }), area: 'lg:col-span-1' },
];

/** A report "overview" page built from the same sample data the exercises use. */
export function DashboardShowcase() {
  const { kpis, tiles } = useMemo(() => {
    const eng = baseEngine();
    const byCat = computeVisual(eng, spec({ type: 'table', category: [f('Product', 'Category')], values: [amount] }));
    const total = Number(byCat.totals[0] ?? 0);
    return {
      kpis: [
        { label: 'Total sales', value: total },
        ...byCat.rows.map((r) => ({ label: String(r.keys[0]), value: Number(r.values[0] ?? 0) })).sort((a, b) => b.value - a.value),
      ],
      tiles: TILES.map((t) => ({ ...t, result: computeVisual(eng, t.spec) })),
    };
  }, []);

  return (
    <div className="rounded-2xl bg-[#e9e7e4] p-3 shadow-xl shadow-slate-300/50 sm:p-4" style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}>
      <div className="mb-3 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-[#d6d3cf] bg-white px-5 py-3">
        <div className="mr-auto">
          <div className="text-lg font-bold tracking-wide text-[#252423]">OVERVIEW</div>
          <div className="text-xs font-semibold text-[#605e5c]">Ridgeline Cycles · Sales Report</div>
        </div>
        {kpis.map((k) => (
          <div key={k.label} className="min-w-[88px] text-center">
            <div className="text-xl font-semibold text-[#252423] tabular-nums sm:text-2xl">{formatTick(k.value, 'currency', autoUnits(k.value))}</div>
            <div className="text-[11px] text-[#605e5c]">{k.label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <figure key={t.title} className={`min-w-0 rounded-lg border border-[#d6d3cf] bg-white p-3 ${t.area}`}>
            <figcaption className="mb-1 truncate text-[13px] font-semibold text-[#252423]">{t.title}</figcaption>
            <div className="h-56">
              <Chart result={t.result} type={t.type} format={{ xTitle: false, yTitle: false }} />
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
