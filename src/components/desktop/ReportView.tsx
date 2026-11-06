import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as RMouseEvent, ReactNode } from 'react';
import type { Engine } from '../../engine/engine';
import type { Measure, Scalar } from '../../engine/model';
import { DRILL_ALL, computeVisual, formatKey, isHierarchyVisual, valueLabel, visualTitle } from '../../engine/visual';
import type { SlicerSpec, SortSpec, VisualSpec } from '../../engine/visual';
import { Chart } from '../Chart';
import { Menu } from './common';
import type { MenuItem } from './common';
import { Ico, VizGlyph, vizKeyFor } from './icons';

const FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif';

export type Selection = { kind: 'visual' } | { kind: 'slicer'; index: number } | { kind: 'none' };

interface Props {
  engine: Engine;
  spec: VisualSpec;
  allMeasures: Measure[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  onSpec: (s: VisualSpec) => void;
  onRemoveSlicer: (index: number) => void;
  onFiltersClick: () => void;
  /** Opens the formula bar for a new measure, optionally starting with its name. */
  onNewMeasure?: (name?: string) => void;
}

/** Visual container with the hover header, selection frame and handles. */
function Frame({
  selected,
  onSelect,
  header,
  style,
  testId,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  header: ReactNode;
  style: CSSProperties;
  testId: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="group absolute flex flex-col"
      style={{ ...style, fontFamily: FONT }}
    >
      <div className={`absolute -top-[26px] right-0 z-10 items-center gap-0.5 rounded-[2px] bg-white px-1 py-0.5 text-d-sub shadow-sm ${selected ? 'flex' : 'hidden group-hover:flex'}`}>{header}</div>
      <div className={`pointer-events-none absolute -inset-[3px] border ${selected ? 'border-[#8a8886]' : 'border-transparent group-hover:border-[#c8c6c4]'}`}>
        {selected &&
          ['-left-[3px] -top-[3px]', '-right-[3px] -top-[3px]', '-left-[3px] -bottom-[3px]', '-right-[3px] -bottom-[3px]', 'left-1/2 -top-[3px]', 'left-1/2 -bottom-[3px]', '-left-[3px] top-1/2', '-right-[3px] top-1/2'].map((p) => (
            <span key={p} className={`absolute h-[5px] w-[5px] border border-[#605e5c] bg-white ${p}`} />
          ))}
      </div>
      {children}
    </div>
  );
}

function HeaderButton({ title, onClick, children }: { title: string; onClick?: (e: RMouseEvent) => void; children: ReactNode }) {
  return (
    <button className="rounded p-0.5 hover:bg-d-hover" title={title} aria-label={title} onMouseDown={(e) => e.stopPropagation()} onClick={onClick}>
      {children}
    </button>
  );
}

function sortMenu(spec: VisualSpec, onSpec: (s: VisualSpec) => void): MenuItem[] {
  if (spec.type === 'card' || !spec.values.length) return [{ label: 'Sort is not available for this visual', disabled: true }];
  const cur: SortSpec | undefined = spec.sort;
  const set = (s: SortSpec | undefined) => onSpec({ ...spec, sort: s });
  const axisName = spec.category.map((c) => c.column).join(', ') || 'Axis';
  const items: MenuItem[] = [{ label: 'Sort axis', disabled: true }];
  if (spec.category.length) items.push({ label: axisName, checked: cur?.by === 'axis', onClick: () => set({ by: 'axis', dir: 'asc' }) });
  spec.values.forEach((v, i) => items.push({ label: valueLabel(v), checked: cur?.by === i, onClick: () => set({ by: i, dir: 'desc' }) }));
  items.push({ separator: true, label: '' });
  const by = cur?.by ?? 0;
  items.push({ label: 'Sort descending', checked: cur?.dir === 'desc', onClick: () => set({ by, dir: 'desc' }) });
  items.push({ label: 'Sort ascending', checked: cur?.dir === 'asc', onClick: () => set({ by, dir: 'asc' }) });
  if (cur) {
    items.push({ separator: true, label: '' });
    items.push({ label: 'Remove sort', onClick: () => set(undefined) });
  }
  return items;
}

export function ReportView({ engine, spec, allMeasures, selection, onSelect, onSpec, onRemoveSlicer, onFiltersClick, onNewMeasure, fill = false }: Props & { fill?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 450 });
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [drillMode, setDrillMode] = useState(false);
  const hierarchy = isHierarchyVisual(spec.type) && spec.category.length > 1;
  const level = hierarchy ? Math.min(spec.drill?.level ?? 0, spec.category.length - 1) : 0;
  const path = spec.drill?.path ?? [];
  const drillInto = (key: Scalar[]) => {
    if (!hierarchy || level >= spec.category.length - 1) return;
    onSpec({ ...spec, drill: { level: level + 1, path: [...path.slice(0, level), key[0]] } });
  };

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => {
      const W = e.contentRect.width - 32;
      const H = e.contentRect.height - 32;
      // `fill`: the page takes all the room it has (simple view); otherwise it keeps Power BI's 16:9 page.
      if (fill) return setSize({ w: Math.max(320, W), h: Math.max(220, H) });
      const w = Math.max(320, Math.min(W, (H * 16) / 9));
      setSize({ w, h: (w * 9) / 16 });
    });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [fill]);

  const missing = spec.values.filter((v) => v.kind === 'measure' && !allMeasures.some((m) => m.name.toLowerCase() === v.name.toLowerCase()));
  const shown: VisualSpec = { ...spec, values: spec.values.filter((v) => !missing.includes(v)) };
  const key = JSON.stringify(shown);
  const { result, error } = useMemo(() => {
    if (!shown.values.length || missing.length) return { result: null, error: null };
    try {
      return { result: computeVisual(engine, shown), error: null };
    } catch (e) {
      return { result: null, error: (e as Error).message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, key, missing.length]);

  const showTitle = spec.format?.title !== false && spec.values.length > 0;
  const title = spec.format?.titleText?.trim() || visualTitle(spec);
  const slicers = spec.slicers ?? [];
  const hasSlicers = slicers.length > 0;
  const visualSelected = selection.kind === 'visual';

  return (
    <div ref={wrap} className="relative flex min-h-0 flex-1 items-start justify-center overflow-auto bg-d-canvas p-4" onMouseDown={() => onSelect({ kind: 'none' })}>
      <div className="relative shrink-0 bg-white shadow-[0_1.6px_3.6px_rgba(0,0,0,.13),0_.3px_.9px_rgba(0,0,0,.11)]" style={{ width: size.w, height: size.h }}>
        {slicers.map((s, i) => {
          const h = 88 / slicers.length;
          return (
            <Frame
              key={i}
              testId={`slicer-${i}`}
              selected={selection.kind === 'slicer' && selection.index === i}
              onSelect={() => onSelect({ kind: 'slicer', index: i })}
              style={{ left: '2%', top: `${4 + i * h}%`, width: '17%', height: `${h - 2}%` }}
              header={
                <>
                  <HeaderButton title="Remove slicer" onClick={() => onRemoveSlicer(i)}>
                    <Ico.close className="h-3.5 w-3.5" />
                  </HeaderButton>
                </>
              }
            >
              <SlicerBody engine={engine} slicer={s} onChange={(values) => onSpec({ ...spec, slicers: slicers.map((x, j) => (j === i ? { ...x, values } : x)) })} />
            </Frame>
          );
        })}
        <Frame
          testId="visual"
          selected={visualSelected}
          onSelect={() => onSelect({ kind: 'visual' })}
          style={hasSlicers ? { left: '21%', top: '4%', width: '76%', height: '88%' } : fill ? { left: '2%', top: '7%', width: '96%', height: '89%' } : { left: '2.5%', top: '4%', width: '78%', height: '88%' }}
          header={
            <>
              {hierarchy && (
                <>
                  <HeaderButton title="Drill up" onClick={() => level > 0 && onSpec({ ...spec, drill: { level: level - 1, path: path.slice(0, level - 1) } })}>
                    <Ico.drillUp className={`h-3.5 w-3.5 ${level > 0 ? '' : 'opacity-30'}`} />
                  </HeaderButton>
                  <button
                    title={drillMode ? 'Drill down is on: click a data point' : 'Click to turn on Drill down'}
                    aria-label="Drill down mode"
                    aria-pressed={drillMode}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setDrillMode(!drillMode)}
                    className={`rounded p-0.5 hover:bg-d-hover ${drillMode ? 'bg-[#252423] text-white hover:bg-[#252423]' : ''}`}
                  >
                    <Ico.drillMode className="h-3.5 w-3.5" />
                  </button>
                  <HeaderButton
                    title="Go to the next level in the hierarchy"
                    onClick={() => level < spec.category.length - 1 && onSpec({ ...spec, drill: { level: level + 1, path: [...path.slice(0, level), DRILL_ALL] } })}
                  >
                    <Ico.nextLevel className={`h-3.5 w-3.5 ${level < spec.category.length - 1 ? '' : 'opacity-30'}`} />
                  </HeaderButton>
                </>
              )}
              <HeaderButton title="Pin visual">
                <Ico.pin className="h-3.5 w-3.5" />
              </HeaderButton>
              <HeaderButton title="Filters on visual" onClick={onFiltersClick}>
                <Ico.funnel className="h-3.5 w-3.5" />
              </HeaderButton>
              <HeaderButton title="Focus mode">
                <Ico.focus className="h-3.5 w-3.5" />
              </HeaderButton>
              <HeaderButton
                title="More options"
                onClick={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setMenu({ x: r.left - 120, y: r.bottom + 4, items: sortMenu(spec, onSpec) });
                }}
              >
                <Ico.more className="h-3.5 w-3.5" />
              </HeaderButton>
            </>
          }
        >
          {showTitle && (
            <div className="truncate px-2 pt-1.5 pb-1 text-[14px] text-[#252423]" data-testid="visual-title">
              {title}
            </div>
          )}
          {hierarchy && level > 0 && (
            <div className="px-2 pb-1 text-[11px] text-[#605e5c]" data-testid="drill-path">
              {spec.category
                .slice(0, level)
                .map((f, i) => `${f.column}: ${path[i] === DRILL_ALL || path[i] === undefined ? 'All' : formatKey(path[i])}`)
                .join('  ›  ')}
              {'  ›  '}
              {spec.category[level].column}
            </div>
          )}
          <div className="relative min-h-0 flex-1 px-2 pb-2">
            {missing.length > 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[12px] text-[#605e5c]" data-testid="waiting-measure">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ebf3fc] font-serif text-[18px] text-[#0f6cbd] italic">f</span>
                <div className="text-[13px] font-semibold text-[#252423]">Waiting for your measure</div>
                <div className="max-w-md">
                  This visual uses {missing.map((m) => `[${valueLabel(m)}]`).join(', ')}, which you haven't created yet. Write it in the formula bar and the numbers will appear here.
                </div>
                {onNewMeasure && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewMeasure(missing.length === 1 ? valueLabel(missing[0]) : undefined);
                    }}
                    className="mt-1 rounded border border-[#0f6cbd] px-3 py-1 text-[12px] font-semibold text-[#0f6cbd] hover:bg-[#ebf3fc]"
                  >
                    + New measure
                  </button>
                )}
              </div>
            ) : error ? (
              <ErrorBox title="Couldn't load the data for this visual">{error}</ErrorBox>
            ) : result ? (
              <Chart result={result} type={spec.type} format={spec.format} onCategoryClick={hierarchy && drillMode ? drillInto : undefined} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-[12px] text-[#605e5c]">
                <div className="opacity-30 grayscale">
                  <VizGlyph k={vizKeyFor(spec.type)} className="h-20 w-20" />
                </div>
                Build a visual by adding data fields from the Data pane
              </div>
            )}
          </div>
        </Frame>
      </div>
      {menu && <Menu {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
}

function ErrorBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[12px] text-[#605e5c]">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#a4262c] text-[16px] text-[#a4262c]">✕</span>
      <div className="font-semibold text-[#252423]">{title}</div>
      <div className="max-w-md">{children}</div>
    </div>
  );
}

function SlicerBody({ engine, slicer, onChange }: { engine: Engine; slicer: SlicerSpec; onChange: (v: Scalar[]) => void }) {
  const values = useMemo(() => {
    if (!slicer.column) return [];
    try {
      return engine.distinct(slicer.table, slicer.column, engine.table(slicer.table).rows);
    } catch {
      return [];
    }
  }, [engine, slicer.table, slicer.column]);
  if (!slicer.column) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center text-[11px] text-[#605e5c]">
        <div className="opacity-40">
          <VizGlyph k="slicer" className="h-10 w-10" />
        </div>
        Add a field to the slicer's Field well
      </div>
    );
  }
  const selected = new Set(slicer.values.map((v) => JSON.stringify(v)));
  return (
    <div className="flex min-h-0 flex-1 flex-col px-2 pt-1.5 pb-2">
      <div className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-[#252423]">
        {slicer.column}
        {slicer.values.length > 0 && (
          <button title="Clear selections" onMouseDown={(e) => e.stopPropagation()} onClick={() => onChange([])} className="rounded p-0.5 text-d-sub hover:bg-d-hover">
            <Ico.eraser className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-[3px] overflow-y-auto text-[12px] text-[#252423]">
        {values.map((v) => {
          const k = JSON.stringify(v);
          const on = selected.has(k);
          return (
            <label key={k} className="flex cursor-pointer items-center gap-2" data-slicer-item={formatKey(v)} onMouseDown={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? slicer.values.filter((x) => JSON.stringify(x) !== k) : [...slicer.values, v])}
                className="h-3.5 w-3.5 accent-[#252423]"
              />
              {formatKey(v)}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function PageTabs({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex h-8 shrink-0 items-end gap-1 border-t border-d-border bg-d-ribbon px-2">
      <button className="mb-1 rounded p-1 text-d-faint" disabled>
        <Ico.chevronLeft className="h-3 w-3" />
      </button>
      <button className="mb-1 rounded p-1 text-d-faint" disabled>
        <Ico.chevronRight className="h-3 w-3" />
      </button>
      <div className="relative rounded-t-[4px] border border-b-0 border-d-border bg-white px-4 py-1 text-[12px] font-semibold">
        Page 1<span className="absolute right-2 bottom-0 left-2 h-[2px] rounded bg-d-accent" />
      </div>
      <button onClick={onAdd} className="mb-1 rounded p-1 text-d-sub hover:bg-d-hover" title="New page">
        <Ico.plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function StatusBar({ left }: { left: string }) {
  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-d-border bg-d-ribbon px-3 text-[11px] text-d-sub">
      <span>{left}</span>
      <span className="flex items-center gap-2">
        <span>−</span>
        <span className="relative h-[2px] w-24 rounded bg-d-strong">
          <span className="absolute top-1/2 left-1/2 h-2.5 w-1 -translate-y-1/2 rounded bg-d-sub" />
        </span>
        <span>+</span>
        <span>100%</span>
      </span>
    </div>
  );
}
