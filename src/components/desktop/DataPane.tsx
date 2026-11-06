import { useEffect, useState } from 'react';
import type { Engine } from '../../engine/engine';
import type { CalcColumn, Measure } from '../../engine/model';
import type { FieldRef, VisualSpec } from '../../engine/visual';
import { fieldUsed } from '../../lib/workspace';
import type { DragItem } from '../../lib/workspace';
import { Menu, SearchBox, startDrag } from './common';
import type { MenuItem } from './common';
import { Ico } from './icons';

interface Props {
  engine: Engine;
  spec: VisualSpec | null;
  /** When a slicer is selected, checkboxes show and set the slicer's field. */
  slicerField?: FieldRef;
  given: Measure[];
  measures: Measure[];
  /** In Table view, the selected table is highlighted and clicking a table selects it. */
  selectedTable?: string;
  onSelectTable?: (t: string) => void;
  onToggle: (i: DragItem) => void;
  onOpenMeasure: (m: Measure, mine: boolean) => void;
  onNewMeasure: () => void;
  onNewColumn: (table: string) => void;
  onDeleteMeasure: (m: Measure) => void;
  onOpenColumn: (c: CalcColumn) => void;
  onDeleteColumn: (c: CalcColumn) => void;
  /** Simple view: no dragging, a click anywhere on a field's row ticks or unticks it. */
  clickToTick?: boolean;
}

type Entry =
  | { kind: 'column'; name: string; type: string; format?: string; calc?: CalcColumn }
  | { kind: 'measure'; name: string; measure: Measure; mine: boolean };

export function DataPane({ engine: base, spec, slicerField, given, measures, selectedTable, onSelectTable, onToggle, onOpenMeasure, onNewMeasure, onNewColumn, onDeleteMeasure, onOpenColumn, onDeleteColumn, clickToTick = false }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({ Sales: true });
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  // Expand the selected table (e.g. after adding a column to it).
  useEffect(() => {
    if (selectedTable) setOpen((o) => (o[selectedTable] ? o : { ...o, [selectedTable]: true }));
  }, [selectedTable]);

  return (
    <div className="px-2 pb-4" data-testid="data-pane">
      <div className="mb-2 px-1">
        <SearchBox value={q} onChange={setQ} />
      </div>
      {base.model.tables.map((t) => {
        const entries: Entry[] = [
          ...t.columns
            .filter((c) => !c.hidden)
            .map((c): Entry => ({ kind: 'column', name: c.name, type: c.type, format: c.format, calc: c.calculated ? { table: t.name, name: c.name, expression: c.expression ?? '' } : undefined })),
          ...(t.name === 'Sales'
            ? [...given.map((m) => ({ m, mine: false })), ...measures.map((m) => ({ m, mine: true }))].map(({ m, mine }): Entry => ({ kind: 'measure', name: m.name, measure: m, mine }))
            : []),
        ]
          .filter((e) => match(e.name))
          .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
        if (q && !entries.length) return null;
        const isOpen = open[t.name] || !!q;
        const isSel = selectedTable === t.name;
        return (
          <div key={t.name}>
            <div
              role="button"
              data-table={t.name}
              onClick={() => {
                setOpen({ ...open, [t.name]: !open[t.name] });
                onSelectTable?.(t.name);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    { label: 'New measure', onClick: onNewMeasure },
                    { label: 'New column', onClick: () => onNewColumn(t.name) },
                    { label: 'Refresh data', disabled: true },
                    { separator: true, label: '' },
                    { label: 'Expand all', onClick: () => setOpen(Object.fromEntries(base.model.tables.map((x) => [x.name, true]))) },
                    { label: 'Collapse all', onClick: () => setOpen({}) },
                  ],
                });
              }}
              className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-[2px] px-1 text-[12px] hover:bg-d-hover ${isSel ? 'bg-d-pressed' : ''}`}
            >
              <Ico.chevronRight className={`h-3 w-3 text-d-sub transition ${isOpen ? 'rotate-90' : ''}`} />
              <Ico.table className="h-4 w-4 text-d-sub" />
              <span className="font-semibold">{t.name}</span>
            </div>
            {isOpen &&
              entries.map((e) => {
                const item: DragItem = e.kind === 'measure' ? { kind: 'measure', name: e.name } : { kind: 'column', table: t.name, column: e.name };
                const used = slicerField
                  ? item.kind === 'column' && slicerField.table === item.table && slicerField.column === item.column
                  : spec
                    ? fieldUsed(spec, item)
                    : false;
                return (
                  <div
                    key={e.kind + e.name}
                    draggable={!clickToTick}
                    onDragStart={clickToTick ? undefined : (ev) => startDrag(ev, item)}
                    onClick={clickToTick && spec ? () => onToggle(item) : undefined}
                    onContextMenu={(ev) => {
                      if (e.kind === 'column') {
                        if (!e.calc) return;
                        const c = e.calc;
                        ev.preventDefault();
                        setMenu({
                          x: ev.clientX,
                          y: ev.clientY,
                          items: [
                            { label: 'Edit column', onClick: () => onOpenColumn(c) },
                            { label: 'Delete from model', onClick: () => onDeleteColumn(c) },
                            { separator: true, label: '' },
                            { label: 'New column', onClick: () => onNewColumn(t.name) },
                          ],
                        });
                        return;
                      }
                      ev.preventDefault();
                      setMenu({
                        x: ev.clientX,
                        y: ev.clientY,
                        items: e.mine
                          ? [
                              { label: 'Edit measure', onClick: () => onOpenMeasure(e.measure, true) },
                              { label: 'Delete from model', onClick: () => onDeleteMeasure(e.measure) },
                              { separator: true, label: '' },
                              { label: 'New measure', onClick: onNewMeasure },
                            ]
                          : [
                              { label: 'View formula', onClick: () => onOpenMeasure(e.measure, false) },
                              { label: 'Delete from model', disabled: true },
                            ],
                      });
                    }}
                    className={`group flex h-[26px] ${clickToTick ? 'cursor-pointer' : 'cursor-grab'} items-center gap-1.5 rounded-[2px] pr-1 pl-6 text-[12px] hover:bg-d-hover`}
                    data-field={`${t.name}.${e.name}`}
                  >
                    {spec && (
                      <input
                        type="checkbox"
                        checked={used}
                        onChange={() => onToggle(item)}
                        onClick={clickToTick ? (ev) => ev.stopPropagation() : undefined}
                        aria-label={`Use ${e.name}`}
                        className="h-3.5 w-3.5 shrink-0 accent-[#0f6cbd]"
                      />
                    )}
                    <span className="flex w-4 shrink-0 justify-center text-d-sub">
                      {e.kind === 'measure' ? (
                        <Ico.calculator className="h-3.5 w-3.5" />
                      ) : e.calc ? (
                        <span className="font-serif text-[11px] italic" title="Calculated column">
                          fx
                        </span>
                      ) : e.type === 'date' ? (
                        <Ico.calendar className="h-3.5 w-3.5" />
                      ) : e.type === 'number' && e.format !== 'text' ? (
                        <Ico.sigma className="h-3.5 w-3.5" />
                      ) : null}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate"
                      onClick={clickToTick ? undefined : () => (e.kind === 'measure' ? onOpenMeasure(e.measure, e.mine) : e.calc && onOpenColumn(e.calc))}
                      title={e.kind === 'measure' ? `${e.name} = ${e.measure.expression}` : e.calc ? `${e.name} = ${e.calc.expression}` : `${t.name}[${e.name}]`}
                    >
                      {e.name}
                    </span>
                    {(e.kind === 'measure' || e.calc) && (
                      <button
                        aria-label="More options"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                          ev.currentTarget.parentElement?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: r.left, clientY: r.bottom }));
                        }}
                        className="invisible rounded p-0.5 text-d-sub group-hover:visible hover:bg-d-pressed"
                      >
                        <Ico.more className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
      {menu && <Menu {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
}
