import { useMemo, useState } from 'react';
import type { Engine } from '../../engine/engine';
import { formatKey, formatValue } from '../../engine/visual';
import { Ico } from './icons';

export function TableView({ base, table }: { base: Engine; table: string }) {
  const t = base.table(table);
  const [col, setCol] = useState<string | null>(null);
  const [limit, setLimit] = useState(300);
  const cols = t.columns;
  const distinct = useMemo(() => (col ? new Set(t.rows.map((r) => JSON.stringify(r[col] ?? null))).size : 0), [t, col]);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white" data-testid="table-view">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="border-collapse text-[12px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {cols.map((c) => (
                <th
                  key={c.name}
                  onClick={() => setCol(c.name)}
                  className={`h-8 min-w-[110px] cursor-pointer border-r border-b border-d-border px-2 text-left font-semibold whitespace-nowrap ${col === c.name ? 'bg-[#deecf9]' : 'hover:bg-d-hover'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1">
                      {c.hidden && <Ico.eye className="h-3 w-3 text-d-faint" />}
                      {c.calculated && <span className="font-serif text-[11px] font-normal text-d-sub italic">fx</span>}
                      {c.name}
                    </span>
                    <Ico.chevronDown className="h-3 w-3 text-d-sub" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.slice(0, limit).map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td
                    key={c.name}
                    className={`h-[22px] border-r border-b border-[#f3f2f1] px-2 whitespace-nowrap tabular-nums ${c.type === 'number' && c.format !== 'text' ? 'text-right' : ''} ${col === c.name ? 'bg-[#f3f9fd]' : ''}`}
                  >
                    {c.type === 'number' ? formatValue(r[c.name], c.format === 'currency' ? 'decimal' : c.format) : formatKey(r[c.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {limit < t.rows.length && (
          <button onClick={() => setLimit(limit + 500)} className="m-2 rounded-[2px] border border-d-strong px-3 py-1 text-[12px] hover:bg-d-hover">
            Load more rows
          </button>
        )}
      </div>
      <div className="flex h-6 shrink-0 items-center gap-4 border-t border-d-border bg-d-ribbon px-3 text-[11px] text-d-sub">
        <span>
          Table: {t.name} ({t.rows.length.toLocaleString()} rows)
        </span>
        {col && (
          <span>
            Column: {col} ({distinct.toLocaleString()} distinct values)
          </span>
        )}
      </div>
    </div>
  );
}
