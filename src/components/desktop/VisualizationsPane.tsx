import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Engine } from '../../engine/engine';
import { AGG_LABEL, valueLabel } from '../../engine/visual';
import type { Agg, FieldRef, ValueField, VisualFormat, VisualSpec, VisualType } from '../../engine/visual';
import { isCategorical, setVisualType, wellsFor } from '../../lib/workspace';
import type { DragItem, WellDef, WellId } from '../../lib/workspace';
import { Menu, Switch, readDrag } from './common';
import type { Selection } from './ReportView';
import type { MenuItem } from './common';
import { DRAG_MIME } from '../../lib/workspace';
import { Ico, VIZ_GALLERY, VizGlyph } from './icons';

const AGG_MENU: Record<Agg, string> = { ...AGG_LABEL, MIN: 'Minimum', MAX: 'Maximum' };

interface Props {
  engine: Engine;
  spec: VisualSpec;
  selection: Selection;
  onSpec: (s: VisualSpec) => void;
  onSelectVisual: () => void;
  onAddSlicer: () => void;
  onDrop: (well: WellId, item: DragItem) => void;
  onUnavailable: (label: string) => void;
  /** Simple view: each field well gets a "+ Add a field…" list, so nothing needs dragging. */
  pickToAdd?: boolean;
}

export function VisualizationsPane({ engine, spec, selection, onSpec, onSelectVisual, onAddSlicer, onDrop, onUnavailable, pickToAdd = false }: Props) {
  const [tab, setTab] = useState<'build' | 'format'>('build');
  const slicerIndex = selection.kind === 'slicer' ? selection.index : -1;
  const slicer = slicerIndex >= 0 ? spec.slicers?.[slicerIndex] : undefined;
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 px-3 pb-2">
        <PaneTab active={tab === 'build'} onClick={() => setTab('build')} title="Build visual">
          <Ico.build className="h-4 w-4" />
        </PaneTab>
        <PaneTab active={tab === 'format'} onClick={() => setTab('format')} title="Format visual">
          <Ico.brush className="h-4 w-4" />
        </PaneTab>
      </div>
      {tab === 'build' ? (
        <>
          <div className="grid grid-cols-8 gap-[2px] px-2.5 pb-3">
            {VIZ_GALLERY.map((g) => {
              const isSlicer = g.key === 'slicer';
              const enabled = !!g.type || isSlicer;
              const active = slicer ? isSlicer : g.type === spec.type;
              return (
                <button
                  key={g.key}
                  title={enabled ? g.label : `${g.label} (not available in the exercises yet)`}
                  aria-label={g.label}
                  onClick={() => {
                    if (isSlicer) return slicer ? undefined : onAddSlicer();
                    if (!g.type) return onUnavailable(g.label);
                    onSelectVisual();
                    onSpec(setVisualType(spec, g.type as VisualType));
                  }}
                  className={`flex h-[26px] items-center justify-center rounded-[2px] ${active ? 'bg-d-pressed ring-1 ring-d-sub' : 'hover:bg-d-hover'} ${enabled ? '' : 'opacity-45'}`}
                >
                  <VizGlyph k={g.key} />
                </button>
              );
            })}
          </div>
          <div className="space-y-3 border-t border-d-border px-3 pt-3 pb-4">
            {slicer ? (
              <SlicerWell
                field={slicer.column ? `${slicer.column}` : null}
                title={slicer.column ? `${slicer.table}[${slicer.column}]` : ''}
                onDrop={(item) => onDrop('slicer', item)}
                onRemove={() => onSpec({ ...spec, slicers: (spec.slicers ?? []).map((x, i) => (i === slicerIndex ? { table: '', column: '', values: [] } : x)) })}
              />
            ) : (
              wellsFor(spec.type).map((w, i) => <Well key={w.label + i} def={w} engine={engine} spec={spec} onSpec={onSpec} onDrop={(item) => onDrop(w.id, item)} pickToAdd={pickToAdd} />)
            )}
          </div>
        </>
      ) : slicer ? (
        <div className="px-3 text-[12px] text-d-sub">Slicer settings: multi-select with checkboxes. More slicer formatting is not available in the exercises yet.</div>
      ) : (
        <FormatPane spec={spec} onSpec={onSpec} />
      )}
    </div>
  );
}

function SlicerWell({ field, title, onDrop, onRemove }: { field: string | null; title: string; onDrop: (i: DragItem) => void; onRemove: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <div data-well="Field">
      <div className="mb-1 text-[12px] font-semibold">Field</div>
      <div
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
        className={`rounded-[2px] ${over ? 'bg-[#deecf9] outline outline-1 outline-d-accent' : ''}`}
      >
        {field ? (
          <Chip label={field} title={title} menu={[{ label: 'Remove field', onClick: onRemove }]} />
        ) : (
          <div className="flex h-[26px] items-center rounded-[2px] border border-d-strong px-2 text-[12px] text-d-faint">Add data fields here</div>
        )}
      </div>
    </div>
  );
}

function PaneTab({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className={`relative flex h-8 w-9 items-center justify-center rounded-[3px] hover:bg-d-hover ${active ? 'text-d-text' : 'text-d-sub'}`}>
      {children}
      {active && <span className="absolute right-2 bottom-0 left-2 h-[2px] rounded bg-d-accent" />}
    </button>
  );
}

function Well({ def, engine, spec, onSpec, onDrop, pickToAdd = false }: { def: WellDef; engine: Engine; spec: VisualSpec; onSpec: (s: VisualSpec) => void; onDrop: (i: DragItem) => void; pickToAdd?: boolean }) {
  const [over, setOver] = useState(false);
  const removeAt = (list: 'category' | 'series' | 'values', i: number) => onSpec({ ...spec, [list]: (spec[list] as unknown[]).filter((_, j) => j !== i) });
  const setAgg = (i: number, agg: Agg) => onSpec({ ...spec, values: spec.values.map((x, j) => (j === i && x.kind === 'column' ? { ...x, agg } : x)) });

  let chips: ReactNode[] = [];
  if (def.id === 'category' || def.id === 'series') {
    chips = spec[def.id].map((f, i) => <FieldChip key={i} label={f.column} title={`${f.table}[${f.column}]`} onRemove={() => removeAt(def.id as 'category' | 'series', i)} />);
  } else if (def.id === 'values') {
    chips = spec.values.map((v, i) => <ValueChip key={i} engine={engine} v={v} onRemove={() => removeAt('values', i)} onAgg={(a) => setAgg(i, a)} />);
  } else if (def.id === 'lineValues') {
    const lv = spec.lineValues ?? [];
    chips = lv.map((v, i) => (
      <ValueChip
        key={i}
        engine={engine}
        v={v}
        onRemove={() => onSpec({ ...spec, lineValues: lv.filter((_, j) => j !== i) })}
        onAgg={(a) => onSpec({ ...spec, lineValues: lv.map((x, j) => (j === i && x.kind === 'column' ? { ...x, agg: a } : x)) })}
      />
    ));
  } else if (def.id === 'columns') {
    chips = [
      ...spec.category.map((f: FieldRef, i) => <FieldChip key={'c' + i} label={f.column} title={`${f.table}[${f.column}]`} onRemove={() => removeAt('category', i)} />),
      ...spec.values.map((v, i) => <ValueChip key={'v' + i} engine={engine} v={v} onRemove={() => removeAt('values', i)} onAgg={(a) => setAgg(i, a)} />),
    ];
  }

  return (
    <div data-well={def.label}>
      <div className="mb-1 text-[12px] font-semibold">{def.label}</div>
      <div
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
        className={`space-y-[3px] rounded-[2px] ${over ? 'bg-[#deecf9] outline outline-1 outline-d-accent' : ''}`}
      >
        {chips}
        {(!def.max || chips.length < def.max) &&
          (pickToAdd && def.id !== 'unsupported' ? (
            <WellPicker engine={engine} label={def.label} measures={def.id === 'values' || def.id === 'lineValues' || def.id === 'columns'} onPick={onDrop} />
          ) : (
            <div className={`flex h-[26px] items-center rounded-[2px] border px-2 text-[12px] ${chips.length ? 'border-dashed border-d-border text-d-faint' : 'border-d-strong text-d-faint'}`}>Add data fields here</div>
          ))}
      </div>
    </div>
  );
}

/** Simple view: pick a field for this well from a list (columns by table, plus measures where they are allowed). */
function WellPicker({ engine, label, measures, onPick }: { engine: Engine; label: string; measures: boolean; onPick: (i: DragItem) => void }) {
  const ms = measures ? (engine.model.measures ?? []) : [];
  return (
    <select
      value=""
      aria-label={`Add a field to ${label}`}
      onChange={(e) => {
        if (e.target.value) onPick(JSON.parse(e.target.value) as DragItem);
      }}
      className="h-[26px] w-full rounded-[2px] border border-dashed border-d-strong bg-white px-1.5 text-[12px] text-d-faint"
    >
      <option value="">+ Add a field…</option>
      {ms.length > 0 && (
        <optgroup label="Measures">
          {ms.map((m) => (
            <option key={m.name} value={JSON.stringify({ kind: 'measure', name: m.name })}>
              {m.name}
            </option>
          ))}
        </optgroup>
      )}
      {engine.model.tables.map((t) => (
        <optgroup key={t.name} label={t.name}>
          {t.columns
            .filter((c) => !c.hidden)
            .map((c) => (
              <option key={c.name} value={JSON.stringify({ kind: 'column', table: t.name, column: c.name })}>
                {c.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

function Chip({ label, title, menu }: { label: ReactNode; title?: string; menu: MenuItem[] }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <div title={title} className="group flex h-[26px] items-center rounded-[2px] border border-d-strong bg-white pl-2 text-[12px] hover:border-d-sub">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <button
        aria-label="Field options"
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPos({ x: r.left - 160, y: r.bottom + 2 });
        }}
        className="flex h-full w-6 items-center justify-center text-d-sub hover:bg-d-hover"
      >
        <Ico.chevronDown className="h-3 w-3" />
      </button>
      {pos && <Menu x={pos.x} y={pos.y} items={menu} onClose={() => setPos(null)} />}
    </div>
  );
}

function FieldChip({ label, title, onRemove }: { label: string; title: string; onRemove: () => void }) {
  return (
    <Chip
      label={label}
      title={title}
      menu={[
        { label: 'Remove field', onClick: onRemove },
        { label: 'Rename for this visual', disabled: true },
        { separator: true, label: '' },
        { label: "Don't summarize", checked: true, disabled: true },
        { label: 'Show items with no data', disabled: true },
      ]}
    />
  );
}

function ValueChip({ engine, v, onRemove, onAgg }: { engine: Engine; v: ValueField; onRemove: () => void; onAgg: (a: Agg) => void }) {
  if (v.kind === 'measure') {
    return (
      <Chip
        label={v.name}
        title={`Measure [${v.name}]`}
        menu={[
          { label: 'Remove field', onClick: onRemove },
          { label: 'Rename for this visual', disabled: true },
          { label: 'Show value as', disabled: true },
          { label: 'New quick measure', disabled: true },
        ]}
      />
    );
  }
  const text = isCategorical(engine, v.table, v.column);
  const aggs: Agg[] = text ? ['DISTINCTCOUNT', 'COUNT'] : ['SUM', 'AVERAGE', 'MIN', 'MAX', 'DISTINCTCOUNT', 'COUNT'];
  return (
    <Chip
      label={valueLabel(v)}
      title={`${v.table}[${v.column}]`}
      menu={[
        { label: 'Remove field', onClick: onRemove },
        { label: 'Rename for this visual', disabled: true },
        { separator: true, label: '' },
        ...aggs.map((a) => ({ label: AGG_MENU[a], checked: v.agg === a, onClick: () => onAgg(a) })),
        { separator: true, label: '' },
        { label: 'Show value as', disabled: true },
        { label: 'New quick measure', disabled: true },
      ]}
    />
  );
}

// ---------------- Format pane ----------------

function FormatPane({ spec, onSpec }: { spec: VisualSpec; onSpec: (s: VisualSpec) => void }) {
  const [sub, setSub] = useState<'visual' | 'general'>('visual');
  const [open, setOpen] = useState<string | null>(null);
  const f = spec.format ?? {};
  const set = (patch: Partial<VisualFormat>) => onSpec({ ...spec, format: { ...f, ...patch } });

  const visualSections: { name: string; key?: keyof VisualFormat; on: boolean; locked?: boolean; cell?: boolean }[] = (() => {
    switch (spec.type) {
      case 'card':
        return [
          { name: 'Callout value', on: true, locked: true },
          { name: 'Category label', key: 'categoryLabel', on: f.categoryLabel !== false },
        ];
      case 'table':
      case 'matrix':
        return [
          { name: 'Style presets', on: true, locked: true },
          { name: 'Grid', on: true, locked: true },
          { name: 'Values', on: true, locked: true },
          { name: 'Column headers', on: true, locked: true },
          { name: 'Cell elements', on: true, locked: true, cell: true },
          { name: 'Totals', key: 'totals', on: f.totals !== false },
        ];
      case 'pie':
      case 'donut':
        return [
          { name: 'Legend', key: 'legend', on: f.legend !== false },
          { name: 'Slices', on: true, locked: true },
          { name: 'Detail labels', key: 'dataLabels', on: f.dataLabels !== false },
        ];
      default:
        return [
          { name: spec.type === 'bar' ? 'Y-axis' : 'X-axis', key: 'xTitle', on: f.xTitle !== false },
          { name: spec.type === 'bar' ? 'X-axis' : 'Y-axis', key: 'yTitle', on: f.yTitle !== false },
          { name: 'Legend', key: 'legend', on: f.legend !== false },
          { name: 'Gridlines', on: true, locked: true },
          { name: 'Data labels', key: 'dataLabels', on: !!f.dataLabels },
        ];
    }
  })();

  return (
    <div className="pb-4">
      <div className="flex gap-4 border-b border-d-border px-3">
        {(['visual', 'general'] as const).map((s) => (
          <button key={s} data-format-sub={s} onClick={() => setSub(s)} className={`relative pb-1.5 text-[12px] capitalize ${sub === s ? 'font-semibold' : 'text-d-sub'}`}>
            {s === 'visual' ? 'Visual' : 'General'}
            {sub === s && <span className="absolute right-0 bottom-0 left-0 h-[2px] rounded bg-d-accent" />}
          </button>
        ))}
      </div>
      <div className="space-y-1.5 px-3 pt-3">
        {sub === 'visual' ? (
          visualSections.map((s) => (
            <FormatCard
              key={s.name}
              name={s.name}
              on={s.on}
              locked={s.locked || !s.key}
              open={open === s.name}
              onOpen={() => setOpen(open === s.name ? null : s.name)}
              onToggle={(v) => s.key && set({ [s.key]: v } as Partial<VisualFormat>)}
            >
              {s.cell ? (
                <CellElements spec={spec} onSpec={onSpec} />
              ) : (
                <div className="text-[11px] text-d-sub">{s.key ? `Turn the ${s.name.toLowerCase()} on or off.` : 'More options for this card are not available in the exercises yet.'}</div>
              )}
            </FormatCard>
          ))
        ) : (
          <>
            <FormatCard name="Title" on={f.title !== false} open={open === 'Title'} onOpen={() => setOpen(open === 'Title' ? null : 'Title')} onToggle={(v) => set({ title: v })}>
              <label className="block text-[11px] text-d-sub">
                Text
                <input
                  aria-label="Title text"
                  value={f.titleText ?? ''}
                  onChange={(e) => set({ titleText: e.target.value })}
                  placeholder="Auto"
                  className="mt-1 h-7 w-full rounded-[2px] border border-d-strong px-2 text-[12px] text-d-text outline-none focus:border-d-accent"
                />
              </label>
            </FormatCard>
            {['Properties', 'Effects', 'Header icons', 'Tooltips', 'Alt text'].map((n) => (
              <FormatCard key={n} name={n} on locked open={false} onOpen={() => {}} onToggle={() => {}} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function CellElements({ spec, onSpec }: { spec: VisualSpec; onSpec: (s: VisualSpec) => void }) {
  const [idx, setIdx] = useState(0);
  const rules = spec.format?.conditional ?? [];
  const rule = rules.find((r) => r.valueIndex === idx) ?? { valueIndex: idx };
  const set = (patch: { background?: boolean; dataBars?: boolean }) => {
    const next = { ...rule, ...patch };
    const others = rules.filter((r) => r.valueIndex !== idx);
    onSpec({ ...spec, format: { ...(spec.format ?? {}), conditional: next.background || next.dataBars ? [...others, next] : others } });
  };
  if (!spec.values.length) return <div className="text-[11px] text-d-sub">Add a value to the visual first.</div>;
  return (
    <div className="space-y-2 text-[12px]">
      <label className="block text-[11px] text-d-sub">
        Apply settings to
        <select value={idx} onChange={(e) => setIdx(Number(e.target.value))} aria-label="Apply settings to" className="mt-0.5 h-7 w-full rounded-[2px] border border-d-strong bg-white px-1 text-[12px] text-d-text">
          {spec.values.map((v, i) => (
            <option key={i} value={i}>
              {valueLabel(v)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center justify-between">
        Background color
        <Switch checked={!!rule.background} onChange={(v) => set({ background: v })} label="Background color" />
      </div>
      <div className="flex items-center justify-between">
        Data bars
        <Switch checked={!!rule.dataBars} onChange={(v) => set({ dataBars: v })} label="Data bars" />
      </div>
    </div>
  );
}

function FormatCard({
  name,
  on,
  locked,
  open,
  onOpen,
  onToggle,
  children,
}: {
  name: string;
  on: boolean;
  locked?: boolean;
  open: boolean;
  onOpen: () => void;
  onToggle: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[4px] border border-d-border" data-format-card={name}>
      <div role="button" onClick={onOpen} className="flex h-9 cursor-pointer items-center gap-2 px-2 hover:bg-d-hover">
        <Ico.chevronRight className={`h-3 w-3 text-d-sub transition ${open ? 'rotate-90' : ''}`} />
        <span className="flex-1 text-[12px] font-semibold">{name}</span>
        {!locked && <Switch checked={on} onChange={onToggle} label={name} />}
      </div>
      {open && children && <div className="border-t border-d-border px-3 py-2">{children}</div>}
    </div>
  );
}
