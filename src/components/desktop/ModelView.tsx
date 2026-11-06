import { useEffect, useRef, useState } from 'react';
import type { Engine } from '../../engine/engine';
import type { Relationship } from '../../engine/model';
import { Ico } from './icons';

const CARD_W = 180;
const HEADER_H = 30;
const ROW_H = 22;
const REL_MIME = 'application/x-biex-relcol';

const POS: Record<string, { x: number; y: number }> = {
  Product: { x: 20, y: 20 },
  Customer: { x: 410, y: 20 },
  Sales: { x: 215, y: 150 },
  Date: { x: 20, y: 330 },
  Store: { x: 410, y: 330 },
  Targets: { x: 215, y: 520 },
};

const same = (a: Relationship, b: Relationship) =>
  a.fromTable === b.fromTable && a.fromColumn === b.fromColumn && a.toTable === b.toTable && a.toColumn === b.toColumn;

/** Decides the many (from) and one (to) side from the data, like Power BI's cardinality detection. */
export function orientRelationship(base: Engine, a: { table: string; column: string }, b: { table: string; column: string }): Relationship | string {
  if (a.table === b.table) return 'Choose columns from two different tables.';
  const unique = (t: string, c: string) => {
    const rows = base.table(t).rows;
    return new Set(rows.map((r) => JSON.stringify(r[c] ?? null))).size === rows.length;
  };
  const ua = unique(a.table, a.column);
  const ub = unique(b.table, b.column);
  if (!ua && !ub) return `Neither ${a.table}[${a.column}] nor ${b.table}[${b.column}] has unique values. Many-to-many relationships are not used in these exercises.`;
  if (ub) return { fromTable: a.table, fromColumn: a.column, toTable: b.table, toColumn: b.column };
  return { fromTable: b.table, fromColumn: b.column, toTable: a.table, toColumn: a.column };
}

export function ModelView({
  base,
  editable,
  onRelationships,
  onToast,
}: {
  base: Engine;
  editable: boolean;
  onRelationships: (rels: Relationship[]) => void;
  onToast: (m: string) => void;
}) {
  const [sel, setSel] = useState<Relationship | null>(null);
  const [pending, setPending] = useState<Relationship | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  /** Click-to-connect: the column clicked first, waiting for its partner in another table. */
  const [linkFrom, setLinkFrom] = useState<{ table: string; column: string } | null>(null);
  const rels = base.model.relationships;
  const tables = base.model.tables;
  // The bike model has hand-placed tables; other datasets get a star: the fact table (first) in the middle, the rest around it.
  const known = tables.every((t) => POS[t.name]);
  const STAR = [
    { x: 215, y: 140 },
    { x: 20, y: 20 },
    { x: 410, y: 20 },
    { x: 20, y: 300 },
    { x: 410, y: 300 },
    { x: 215, y: 420 },
  ];
  const W = 610;
  /** Fit the whole diagram to the canvas width, so no table hides off-screen (never above 100%). */
  const scroller = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFit(Math.max(0.6, Math.min(1, (el.clientWidth - 8) / W))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);
  const pos = (name: string, i: number) => (known ? POS[name] : (STAR[i] ?? { x: 20 + (i % 3) * 195, y: 600 }));
  const height = (name: string) => HEADER_H + base.table(name).columns.length * ROW_H + 8;
  const idx = (n: string) => tables.findIndex((t) => t.name === n);
  const center = (name: string) => {
    const p = pos(name, idx(name));
    return { x: p.x + CARD_W / 2, y: p.y + height(name) / 2 };
  };
  const edge = (name: string, toward: { x: number; y: number }) => {
    const c = center(name);
    const hw = CARD_W / 2;
    const hh = height(name) / 2;
    const dx = toward.x - c.x;
    const dy = toward.y - c.y;
    const s = Math.min(Math.abs(hw / (dx || 1e-9)), Math.abs(hh / (dy || 1e-9)));
    return { x: c.x + dx * s, y: c.y + dy * s };
  };
  const H = Math.max(...tables.map((t, i) => pos(t.name, i).y + height(t.name))) + 40;
  const selected = sel && rels.find((r) => same(r, sel));
  const connect = (src: { table: string; column: string }, dst: { table: string; column: string }) => {
    const r = orientRelationship(base, src, dst);
    if (typeof r === 'string') return onToast(r);
    if (rels.some((x) => same(x, r))) return onToast('This relationship already exists.');
    setPending(r);
  };

  return (
    <div className="flex min-h-0 flex-1" data-testid="model-view">
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-auto bg-[#faf9f8]">
        <div className="relative" style={{ width: W, height: H, zoom: fit }} onMouseDown={() => setSel(null)}>
          <svg className="absolute inset-0" width={W} height={H}>
            {rels.map((r) => {
              if (idx(r.fromTable) === -1 || idx(r.toTable) === -1) return null;
              const a = center(r.fromTable);
              const b = center(r.toTable);
              const pa = edge(r.fromTable, b);
              const pb = edge(r.toTable, a);
              const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
              const ang = (Math.atan2(pa.y - pb.y, pa.x - pb.x) * 180) / Math.PI;
              const active = !!selected && same(selected, r);
              const off = (p: { x: number; y: number }, q: { x: number; y: number }) => {
                const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
                return { x: p.x + ((q.x - p.x) / d) * 14, y: p.y + ((q.y - p.y) / d) * 14 - 6 };
              };
              const la = off(pa, pb);
              const lb = off(pb, pa);
              return (
                <g
                  key={`${r.fromTable}.${r.fromColumn}-${r.toTable}.${r.toColumn}`}
                  data-rel={`${r.fromTable}.${r.fromColumn}->${r.toTable}.${r.toColumn}`}
                  className="cursor-pointer"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSel(r);
                  }}
                >
                  <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="transparent" strokeWidth={14} />
                  <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={active ? '#0f6cbd' : '#8a8886'} strokeWidth={active ? 2 : 1.3} />
                  <g transform={`translate(${mid.x} ${mid.y}) rotate(${ang})`}>
                    <path d="M-5 -5 L4 0 L-5 5 Z" fill={active ? '#0f6cbd' : '#605e5c'} />
                  </g>
                  <text x={la.x} y={la.y} fontSize={13} textAnchor="middle" fill="#252423" fontFamily="Segoe UI, sans-serif">
                    *
                  </text>
                  <text x={lb.x} y={lb.y} fontSize={12} textAnchor="middle" fill="#252423" fontFamily="Segoe UI, sans-serif">
                    1
                  </text>
                </g>
              );
            })}
          </svg>
          {tables.map((t, i) => {
            const p = pos(t.name, i);
            const related = selected && (selected.fromTable === t.name || selected.toTable === t.name);
            return (
              <div
                key={t.name}
                data-model-table={t.name}
                className={`absolute overflow-hidden rounded-[4px] border bg-white shadow-[0_1.6px_3.6px_rgba(0,0,0,.13)] ${related ? 'border-d-accent' : 'border-d-border'}`}
                style={{ left: p.x, top: p.y, width: CARD_W }}
              >
                <div className="flex items-center gap-1.5 border-b border-d-border bg-d-ribbon px-2 text-[12px] font-semibold" style={{ height: HEADER_H }}>
                  <Ico.table className="h-4 w-4 text-d-sub" />
                  {t.name}
                </div>
                <div className="py-1">
                  {t.columns.map((c) => {
                    const key = selected && ((selected.fromTable === t.name && selected.fromColumn === c.name) || (selected.toTable === t.name && selected.toColumn === c.name));
                    const id = `${t.name}.${c.name}`;
                    return (
                      <div
                        key={c.name}
                        data-model-field={id}
                        data-link-from={linkFrom?.table === t.name && linkFrom.column === c.name ? true : undefined}
                        draggable={editable}
                        onDragStart={(e) => {
                          e.dataTransfer.setData(REL_MIME, JSON.stringify({ table: t.name, column: c.name }));
                          e.dataTransfer.effectAllowed = 'link';
                        }}
                        onDragOver={(e) => {
                          if (e.dataTransfer.types.includes(REL_MIME)) {
                            e.preventDefault();
                            setDropTarget(id);
                          }
                        }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDropTarget(null);
                          try {
                            connect(JSON.parse(e.dataTransfer.getData(REL_MIME)) as { table: string; column: string }, { table: t.name, column: c.name });
                          } catch {
                            /* not a column drag */
                          }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          if (!editable) return;
                          const here = { table: t.name, column: c.name };
                          if (!linkFrom || linkFrom.table === t.name) return setLinkFrom(linkFrom && linkFrom.column === c.name && linkFrom.table === t.name ? null : here);
                          setLinkFrom(null);
                          connect(linkFrom, here);
                        }}
                        className={`flex items-center gap-1.5 px-2 text-[12px] ${editable ? 'cursor-pointer hover:bg-d-hover' : ''} ${key ? 'bg-[#deecf9] font-semibold' : ''} ${dropTarget === id ? 'bg-[#c7e0f4]' : ''} ${linkFrom?.table === t.name && linkFrom.column === c.name ? 'bg-[#c7e0f4] font-semibold ring-1 ring-d-accent ring-inset' : ''} ${c.hidden ? 'text-d-faint' : ''}`}
                        style={{ height: ROW_H }}
                      >
                        <span className="flex w-4 justify-center text-d-sub">
                          {c.type === 'date' ? <Ico.calendar className="h-3.5 w-3.5" /> : c.type === 'number' && c.format !== 'text' ? <Ico.sigma className="h-3.5 w-3.5" /> : null}
                        </span>
                        <span className="flex-1 truncate">{c.name}</span>
                        {c.hidden && <Ico.eye className="h-3 w-3" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="w-64 shrink-0 overflow-y-auto border-l border-d-border bg-white p-3 text-[12px]">
        <h2 className="mb-2 text-[14px] font-semibold">Properties</h2>
        {selected ? (
          <dl className="space-y-2">
            <Prop k="From table (many)" v={`${selected.fromTable} (${selected.fromColumn})`} />
            <Prop k="To table (one)" v={`${selected.toTable} (${selected.toColumn})`} />
            <Prop k="Cardinality" v="Many to one (*:1)" />
            <Prop k="Cross-filter direction" v="Single" />
            <p className="pt-1 text-d-sub">
              Filters flow from <b>{selected.toTable}</b> to <b>{selected.fromTable}</b> (arrow direction).
            </p>
            {editable && (
              <button
                data-testid="delete-rel"
                onClick={() => {
                  onRelationships(rels.filter((x) => !same(x, selected)));
                  setSel(null);
                  onToast('Relationship deleted.');
                }}
                className="mt-2 h-8 w-full rounded-[2px] border border-d-strong text-[12px] font-semibold hover:bg-d-hover"
              >
                Delete relationship
              </button>
            )}
          </dl>
        ) : (
          <>
            <p className="mb-3 text-d-sub">
              {editable
                ? linkFrom
                  ? `Now click the matching column in another table to connect it to ${linkFrom.table}[${linkFrom.column}].`
                  : 'Click a column, then the matching column of another table, to create a relationship (or drag one onto the other). Click a line to see or delete it.'
                : 'Select a relationship line to see its properties.'}
            </p>
            <div className="mb-1 font-semibold">Relationships ({rels.length})</div>
            <ul className="space-y-1" data-testid="rel-list">
              {rels.map((r) => (
                <li key={`${r.fromTable}.${r.fromColumn}-${r.toTable}.${r.toColumn}`}>
                  <button onClick={() => setSel(r)} className="w-full rounded-[2px] px-1.5 py-1 text-left hover:bg-d-hover">
                    {r.fromTable}[{r.fromColumn}] <span className="text-d-sub">*→1</span> {r.toTable}[{r.toColumn}]
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
      {pending && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/20" onMouseDown={() => setPending(null)}>
          <div role="dialog" aria-label="Create relationship" className="w-[440px] rounded-[4px] bg-white p-5 text-[12px] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-[16px] font-semibold">New relationship</h3>
            <div className="grid grid-cols-2 gap-3">
              <Prop k="From table" v={`${pending.fromTable}`} />
              <Prop k="Column" v={pending.fromColumn} />
              <Prop k="To table" v={pending.toTable} />
              <Prop k="Column" v={pending.toColumn} />
              <Prop k="Cardinality" v="Many to one (*:1)" />
              <Prop k="Cross-filter direction" v="Single" />
            </div>
            <label className="mt-3 flex items-center gap-2">
              <input type="checkbox" checked readOnly /> Make this relationship active
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                data-testid="save-rel"
                onClick={() => {
                  onRelationships([...rels, pending]);
                  setPending(null);
                  onToast('Relationship created.');
                }}
                className="h-8 rounded-[2px] bg-d-accent px-5 font-semibold text-white hover:bg-[#115ea3]"
              >
                Save
              </button>
              <button onClick={() => setPending(null)} className="h-8 rounded-[2px] border border-d-strong px-5 hover:bg-d-hover">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Prop({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-d-sub">{k}</dt>
      <dd className="mt-0.5 rounded-[2px] border border-d-border px-2 py-1">{v}</dd>
    </div>
  );
}
