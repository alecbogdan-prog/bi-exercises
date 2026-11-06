import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Engine } from '../../engine/engine';
import type { Scalar } from '../../engine/model';
import { formatKey, valueLabel } from '../../engine/visual';
import type { FieldFilter, FieldRef, FilterScope, VisualSpec } from '../../engine/visual';
import { DRAG_MIME } from '../../lib/workspace';
import type { DragItem } from '../../lib/workspace';
import { SearchBox, readDrag } from './common';
import { Ico } from './icons';

interface Props {
  engine: Engine;
  spec: VisualSpec;
  onSpec: (s: VisualSpec) => void;
  onAdd: (item: DragItem, scope: FilterScope) => void;
  /** Simple view: choose the field from a list instead of dragging it in. */
  pickToAdd?: boolean;
}

const same = (a: FieldRef, b: FieldRef) => a.table === b.table && a.column === b.column;

export function FiltersPane({ engine, spec, onSpec, onAdd, pickToAdd = false }: Props) {
  const [q, setQ] = useState('');
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());

  const scopeOf = (f: FieldFilter): FilterScope => f.scope ?? 'visual';
  const visualFields: FieldRef[] = [...spec.category, ...spec.series, ...spec.values.flatMap((v) => (v.kind === 'column' ? [{ table: v.table, column: v.column }] : []))];
  // "Filters on this visual" = every field in the visual (auto cards) + explicit visual-level filters.
  const visualCards: FieldFilter[] = [];
  for (const f of visualFields) {
    if (visualCards.some((c) => same(c, f))) continue;
    const explicit = spec.filters.find((x) => same(x, f) && scopeOf(x) === 'visual');
    visualCards.push(explicit ?? { ...f, values: [], scope: 'visual' });
  }
  for (const f of spec.filters) if (scopeOf(f) === 'visual' && !visualCards.some((c) => same(c, f))) visualCards.push(f);
  const measureCards = spec.values.filter((v) => v.kind === 'measure' || v.kind === 'column');

  const update = (card: FieldFilter, patch: Partial<FieldFilter>) => {
    const exists = spec.filters.some((x) => same(x, card));
    const filters = exists ? spec.filters.map((x) => (same(x, card) ? { ...x, ...patch } : x)) : [...spec.filters, { ...card, ...patch }];
    onSpec({ ...spec, filters });
  };
  const valueLabels = spec.values.map(valueLabel);
  const remove = (card: FieldFilter) => onSpec({ ...spec, filters: spec.filters.filter((x) => !same(x, card)) });
  const isAuto = (card: FieldFilter) => visualFields.some((f) => same(f, card));

  const section = (title: string, scope: FilterScope, cards: FieldFilter[], extra?: ReactNode) => (
    <div className="mb-3">
      <div className="mb-1.5 text-[12px] font-semibold">{title}</div>
      <div className="space-y-1.5">
        {extra}
        {cards
          .filter((c) => match(c.column))
          .map((c) => (
            <FilterCard
              key={`${scope}:${c.table}.${c.column}`}
              engine={engine}
              filter={c}
              valueLabels={valueLabels}
              removable={!isAuto(c) || scope !== 'visual'}
              onPatch={(p) => update(c, p)}
              onRemove={() => remove(c)}
            />
          ))}
        {pickToAdd ? <FieldPicker engine={engine} onPick={(item) => onAdd(item, scope)} /> : <DropZone onDrop={(item) => onAdd(item, scope)} />}
      </div>
    </div>
  );

  return (
    <div className="px-3 pb-4" data-testid="filters-pane">
      <div className="mb-3">
        <SearchBox value={q} onChange={setQ} />
      </div>
      {section(
        'Filters on this visual',
        'visual',
        visualCards,
        measureCards
          .filter((v) => v.kind === 'measure' && match(v.name))
          .map((v) => (
            <div key={valueLabel(v)} className="rounded-[2px] border border-d-border bg-white px-2 py-1.5 text-[12px]">
              <div className="font-semibold">{valueLabel(v)}</div>
              <div className="text-d-sub">is (All)</div>
            </div>
          )),
      )}
      {section(
        'Filters on this page',
        'page',
        spec.filters.filter((f) => scopeOf(f) === 'page'),
      )}
      {section(
        'Filters on all pages',
        'all',
        spec.filters.filter((f) => scopeOf(f) === 'all'),
      )}
    </div>
  );
}

function FieldPicker({ engine, onPick }: { engine: Engine; onPick: (i: DragItem) => void }) {
  return (
    <select
      value=""
      aria-label="Add a field to filter on"
      onChange={(e) => {
        const [table, column] = e.target.value.split('\u0000');
        if (table && column) onPick({ kind: 'column', table, column });
      }}
      className="h-[30px] w-full rounded-[2px] border border-dashed border-d-strong bg-white px-1.5 text-[12px] text-d-faint"
    >
      <option value="">+ Add a field…</option>
      {engine.model.tables.map((t) => (
        <optgroup key={t.name} label={t.name}>
          {t.columns
            .filter((c) => !c.hidden)
            .map((c) => (
              <option key={c.name} value={`${t.name}\u0000${c.name}`}>
                {c.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

function DropZone({ onDrop }: { onDrop: (i: DragItem) => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      data-dropzone="filters"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const item = readDrag(e);
        if (item) onDrop(item);
      }}
      className={`flex h-[30px] items-center rounded-[2px] border border-dashed px-2 text-[12px] text-d-faint ${over ? 'border-d-accent bg-[#deecf9]' : 'border-d-strong'}`}
    >
      Add data fields here
    </div>
  );
}

function FilterCard({
  engine,
  filter,
  valueLabels,
  removable,
  onPatch,
  onRemove,
}: {
  engine: Engine;
  filter: FieldFilter;
  valueLabels: string[];
  removable: boolean;
  onPatch: (p: Partial<FieldFilter>) => void;
  onRemove: () => void;
}) {
  const onChange = (values: Scalar[]) => onPatch({ values, topN: undefined });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'basic' | 'topn'>(filter.topN ? 'topn' : 'basic');
  const [topDir, setTopDir] = useState<'top' | 'bottom'>(filter.topN?.bottom ? 'bottom' : 'top');
  const [topCount, setTopCount] = useState(String(filter.topN?.n ?? 3));
  const [byValue, setByValue] = useState(filter.topN ? String(filter.topN.valueIndex) : valueLabels.length ? '0' : '');
  const all = useMemo(() => engine.distinct(filter.table, filter.column, engine.table(filter.table).rows), [engine, filter.table, filter.column]);
  const selected = new Set(filter.values.map((v) => JSON.stringify(v)));
  const summary = filter.topN
    ? `is ${filter.topN.bottom ? 'Bottom' : 'Top'} ${filter.topN.n} by ${valueLabels[filter.topN.valueIndex] ?? 'value'}`
    : filter.values.length === 0
      ? 'is (All)'
      : filter.values.length === 1
        ? `is ${formatKey(filter.values[0])}`
        : `is ${filter.values.length} items`;
  const toggle = (v: Scalar) => {
    const k = JSON.stringify(v);
    onChange(selected.has(k) ? filter.values.filter((x) => JSON.stringify(x) !== k) : [...filter.values, v]);
  };
  const shown = all.filter((v) => !q || formatKey(v).toLowerCase().includes(q.toLowerCase()));
  const active = filter.values.length > 0 || !!filter.topN;
  return (
    <div className={`rounded-[2px] border bg-white text-[12px] ${active ? 'border-d-sub' : 'border-d-border'}`} data-filter-card={filter.column}>
      <div role="button" onClick={() => setOpen(!open)} className="flex cursor-pointer items-start gap-1 px-2 py-1.5 hover:bg-d-hover">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{filter.column}</div>
          <div className={active ? 'text-d-text' : 'text-d-sub'}>{summary}</div>
        </div>
        {active && (
          <button
            title="Clear filter"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            className="rounded p-0.5 text-d-sub hover:bg-d-pressed"
          >
            <Ico.eraser className="h-3.5 w-3.5" />
          </button>
        )}
        {removable && (
          <button
            title="Remove filter"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded p-0.5 text-d-sub hover:bg-d-pressed"
          >
            <Ico.close className="h-3.5 w-3.5" />
          </button>
        )}
        <Ico.chevronDown className={`mt-0.5 h-3.5 w-3.5 text-d-sub transition ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="space-y-2 border-t border-d-border px-2 py-2">
          <label className="block text-[11px] text-d-sub">
            Filter type
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'basic' | 'topn')}
              aria-label="Filter type"
              className="mt-0.5 h-7 w-full rounded-[2px] border border-d-strong bg-white px-1 text-[12px] text-d-text"
            >
              <option value="basic">Basic filtering</option>
              <option disabled>Advanced filtering</option>
              <option value="topn">Top N</option>
            </select>
          </label>
          {mode === 'topn' ? (
            <div className="space-y-2" data-testid="topn">
              <div className="text-[11px] text-d-sub">Show items</div>
              <div className="flex gap-1">
                <select value={topDir} onChange={(e) => setTopDir(e.target.value as 'top' | 'bottom')} aria-label="Top or bottom" className="h-7 rounded-[2px] border border-d-strong bg-white px-1 text-[12px]">
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
                <input
                  value={topCount}
                  onChange={(e) => setTopCount(e.target.value.replace(/[^0-9]/g, ''))}
                  aria-label="Number of items"
                  className="h-7 w-full min-w-0 rounded-[2px] border border-d-strong px-2 text-[12px] outline-none focus:border-d-accent"
                />
              </div>
              <div className="text-[11px] text-d-sub">By value</div>
              {valueLabels.length ? (
                <select value={byValue} onChange={(e) => setByValue(e.target.value)} aria-label="By value" className="h-7 w-full rounded-[2px] border border-d-strong bg-white px-1 text-[12px]">
                  {valueLabels.map((l, i) => (
                    <option key={l} value={String(i)}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-[2px] border border-dashed border-d-strong px-2 py-1 text-[11px] text-d-faint">Add a value to the visual first</div>
              )}
              <button
                disabled={!valueLabels.length || !Number(topCount)}
                onClick={() => onPatch({ values: [], topN: { n: Number(topCount), valueIndex: Number(byValue || 0), bottom: topDir === 'bottom' || undefined } })}
                className="h-7 w-full rounded-[2px] border border-d-strong text-[12px] font-semibold hover:bg-d-hover disabled:opacity-40"
              >
                Apply filter
              </button>
            </div>
          ) : (
            <>
          {all.length > 8 && <SearchBox value={q} onChange={setQ} />}
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            <label className="flex cursor-pointer items-center gap-2 px-0.5 py-0.5">
              <input type="checkbox" checked={filter.values.length === all.length && all.length > 0} onChange={() => onChange(filter.values.length === all.length ? [] : all)} />
              Select all
            </label>
            {shown.map((v) => (
              <label key={JSON.stringify(v)} className="flex cursor-pointer items-center gap-2 px-0.5 py-0.5">
                <input type="checkbox" checked={selected.has(JSON.stringify(v))} onChange={() => toggle(v)} />
                {formatKey(v)}
              </label>
            ))}
          </div>
          <div className="text-[11px] text-d-sub">Require single selection: Off</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
