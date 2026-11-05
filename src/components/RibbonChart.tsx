import { useMemo } from 'react';

const W = 640;
const H = 300;
const PAD_X = 30;
const PAD_TOP = 10;
const PAD_BOTTOM = 28;
const GAP = 3; // vertical gap between stacked segments

export interface RibbonSeries {
  name: string;
  color: string;
  values: number[];
}

interface Seg {
  key: string;
  value: number;
  y0: number;
  y1: number;
}

/**
 * Ribbon chart: one stacked column per period (largest on top), with ribbons joining the same
 * series between columns, so changes in rank are visible as ribbons crossing.
 */
export function RibbonChart({ title, periods, series, note, unit = '' }: { title: string; periods: string[]; series: RibbonSeries[]; note?: string; unit?: string }) {
  const { columns, colW, xs } = useMemo(() => {
    const maxTotal = Math.max(...periods.map((_, i) => series.reduce((a, s) => a + s.values[i], 0)));
    const plotH = H - PAD_TOP - PAD_BOTTOM - GAP * (series.length - 1);
    const scale = plotH / maxTotal;
    const n = periods.length;
    const cw = Math.min(46, ((W - PAD_X * 2) / n) * 0.42);
    const step = (W - PAD_X * 2 - cw) / (n - 1);
    const cols = periods.map((_, i) => {
      const vals = series.map((s) => ({ key: s.name, value: s.values[i] })).sort((a, b) => a.value - b.value);
      let y = H - PAD_BOTTOM; // smallest at the bottom, largest on top
      return vals.map((v): Seg => {
        const h = v.value * scale;
        const seg = { key: v.key, value: v.value, y0: y - h, y1: y };
        y -= h + GAP;
        return seg;
      });
    });
    return { columns: cols, colW: cw, xs: periods.map((_, i) => PAD_X + i * step) };
  }, [periods, series]);

  const color = (name: string) => series.find((s) => s.name === name)?.color ?? '#999';

  return (
    <figure className="min-w-0 rounded-xl border border-[#d6d3cf] bg-white p-4" style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}>
      <figcaption className="mb-2 text-[14px] font-semibold text-[#252423]">{title}</figcaption>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#605e5c]">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title}>
        {columns.slice(0, -1).map((col, i) =>
          col.map((s) => {
            const t = columns[i + 1].find((x) => x.key === s.key)!;
            const x0 = xs[i] + colW;
            const x1 = xs[i + 1];
            const mx = (x0 + x1) / 2;
            const d = `M${x0},${s.y0} C${mx},${s.y0} ${mx},${t.y0} ${x1},${t.y0} L${x1},${t.y1} C${mx},${t.y1} ${mx},${s.y1} ${x0},${s.y1} Z`;
            return <path key={`${i}-${s.key}`} d={d} fill={color(s.key)} opacity={0.38} />;
          }),
        )}
        {columns.map((col, i) =>
          col.map((s) => (
            <rect key={`${i}-${s.key}`} x={xs[i]} y={s.y0} width={colW} height={Math.max(1, s.y1 - s.y0)} fill={color(s.key)}>
              <title>{`${periods[i]} · ${s.key}: ${s.value}${unit}`}</title>
            </rect>
          )),
        )}
        {periods.map((p, i) => (
          <text key={p} x={xs[i] + colW / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="#605e5c">
            {p}
          </text>
        ))}
      </svg>
      {note && <p className="mt-1 text-[11px] text-[#8a8886]">{note}</p>}
    </figure>
  );
}
