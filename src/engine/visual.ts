import type { Engine } from './engine';
import type { FilterContext, Scalar, ValueFormat } from './model';
import { parseDax } from './parser';
import type { Node } from './parser';

export type VisualType =
  | 'card'
  | 'multiCard'
  | 'table'
  | 'matrix'
  | 'column'
  | 'bar'
  | 'clusteredColumn'
  | 'clusteredBar'
  | 'pctColumn'
  | 'pctBar'
  | 'line'
  | 'area'
  | 'stackedArea'
  | 'pie'
  | 'donut'
  | 'treemap'
  | 'lineColumn'
  | 'waterfall'
  | 'funnel'
  | 'gauge'
  | 'kpi';

const CARTESIAN: VisualType[] = ['column', 'bar', 'clusteredColumn', 'clusteredBar', 'pctColumn', 'pctBar', 'line', 'area', 'stackedArea'];
export const isCartesian = (t: VisualType) => CARTESIAN.includes(t);
export const isHorizontal = (t: VisualType) => t === 'bar' || t === 'clusteredBar' || t === 'pctBar';
export const isLineLike = (t: VisualType) => t === 'line' || t === 'area' || t === 'stackedArea';
export const isPieLike = (t: VisualType) => t === 'pie' || t === 'donut' || t === 'treemap';
export const isCardLike = (t: VisualType) => t === 'card' || t === 'multiCard' || t === 'gauge';
/** Visuals where several axis fields form a drillable hierarchy (tables and matrices show all levels at once). */
export const isHierarchyVisual = (t: VisualType) => isCartesian(t) || isPieLike(t);
/** Marker used in a drill path for "all values of this level" (Go to the next level). */
export const DRILL_ALL = '\u0000ALL';
export type Agg = 'SUM' | 'AVERAGE' | 'MIN' | 'MAX' | 'COUNT' | 'DISTINCTCOUNT';

export interface FieldRef {
  table: string;
  column: string;
}

export type ValueField =
  | { kind: 'column'; table: string; column: string; agg: Agg }
  | { kind: 'measure'; name: string };

export type FilterScope = 'visual' | 'page' | 'all';

export interface FieldFilter extends FieldRef {
  /** Values to keep. Empty means "all" (no filter). */
  values: Scalar[];
  /** Which section of the Filters pane the filter lives in. All scopes apply to the single visual. */
  scope?: FilterScope;
  /** "Top N" filter type: keep the N items of this field with the highest value of spec.values[valueIndex]. */
  topN?: { n: number; valueIndex: number; bottom?: boolean };
}

export interface SlicerSpec extends FieldRef {
  values: Scalar[];
}

export interface SortSpec {
  /** 'axis' = by the category field, otherwise the index of the value to sort by. */
  by: 'axis' | number;
  dir: 'asc' | 'desc';
}

/** Formatting options from the Format visual pane. They never affect answer checking. */
export interface VisualFormat {
  title?: boolean;
  titleText?: string;
  xTitle?: boolean;
  yTitle?: boolean;
  legend?: boolean;
  dataLabels?: boolean;
  categoryLabel?: boolean;
  totals?: boolean;
  /** Conditional formatting on table/matrix values. */
  conditional?: ConditionalFormat[];
}

export interface ConditionalFormat {
  valueIndex: number;
  background?: boolean;
  dataBars?: boolean;
}

export interface DrillState {
  /** Index of the axis field currently shown. */
  level: number;
  /** Value drilled into at each upper level (DRILL_ALL = all values). */
  path: Scalar[];
}

export interface VisualSpec {
  type: VisualType;
  /** Axis / Rows / Category */
  category: FieldRef[];
  /** Legend (charts) or Columns (matrix) */
  series: FieldRef[];
  values: ValueField[];
  filters: FieldFilter[];
  format?: VisualFormat;
  /** Slicers on the same report page; their selections filter the visual. */
  slicers?: SlicerSpec[];
  sort?: SortSpec;
  drill?: DrillState;
  /** Line and column chart: the values drawn as lines (Line y-axis well). */
  lineValues?: ValueField[];
}

/** Applies the drill state: hierarchy visuals show one axis level, filtered by the drilled-into values. */
export function effectiveSpec(input: VisualSpec): VisualSpec {
  let spec: VisualSpec = input;
  if (isCardLike(input.type)) spec = { ...input, category: [], series: [] };
  else if (input.type === 'table' || isPieLike(input.type) || input.type === 'funnel' || input.type === 'waterfall' || input.type === 'kpi') spec = { ...input, series: [] };
  else if (input.type === 'lineColumn') spec = { ...input, series: [], values: [...input.values, ...(input.lineValues ?? [])], lineValues: undefined };
  if (isHierarchyVisual(spec.type) && spec.category.length > 1) {
    const level = Math.min(spec.drill?.level ?? 0, spec.category.length - 1);
    const path = spec.drill?.path ?? [];
    const drillFilters: FieldFilter[] = [];
    for (let i = 0; i < level; i++) {
      const v = path[i];
      if (v !== undefined && v !== DRILL_ALL) drillFilters.push({ ...spec.category[i], values: [v], scope: 'visual' });
    }
    spec = { ...spec, category: [spec.category[level]], filters: [...spec.filters, ...drillFilters] };
  }
  return spec;
}

export const emptySpec = (type: VisualType = 'column'): VisualSpec => ({ type, category: [], series: [], values: [], filters: [] });

export const AGG_LABEL: Record<Agg, string> = {
  SUM: 'Sum',
  AVERAGE: 'Average',
  MIN: 'Min',
  MAX: 'Max',
  COUNT: 'Count',
  DISTINCTCOUNT: 'Count (Distinct)',
};

export function valueLabel(v: ValueField): string {
  return v.kind === 'measure' ? v.name : `${AGG_LABEL[v.agg]} of ${v.column}`;
}

export function valueNode(v: ValueField): Node {
  if (v.kind === 'measure') return { k: 'bracket', name: v.name };
  return { k: 'call', name: v.agg, args: [{ k: 'col', table: v.table, col: v.column }] };
}

export function valueFormat(engine: Engine, v: ValueField): ValueFormat | undefined {
  if (v.kind === 'measure') {
    const m = engine.measure(v.name);
    if (m?.format) return m.format;
    try {
      // Guess: a measure that only aggregates currency columns is currency.
      const n = parseDax(m?.expression ?? '');
      if (n.k === 'call' && n.args[0]?.k === 'col') {
        const c = engine.column(n.args[0].table, n.args[0].col);
        if (c?.format === 'currency' && ['SUM', 'AVERAGE', 'MIN', 'MAX', 'SUMX'].includes(n.name)) return 'currency';
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }
  if (v.agg === 'COUNT' || v.agg === 'DISTINCTCOUNT') return 'integer';
  return engine.column(v.table, v.column)?.format;
}

export interface ResultRow {
  keys: Scalar[];
  series: Scalar[];
  values: Scalar[];
}

export interface VisualResult {
  categoryLabels: string[];
  seriesLabels: string[];
  valueLabels: string[];
  formats: (ValueFormat | undefined)[];
  rows: ResultRow[];
  /** Distinct series combinations, in order (for legend/matrix columns). */
  seriesKeys: Scalar[][];
  /** Totals per value (over everything in the visual's filter context). */
  totals: Scalar[];
  /** Matrix/legend helpers: totals per category combo (all series) and per series combo (all categories). */
  rowTotals: Map<string, Scalar[]>;
  seriesTotals: Map<string, Scalar[]>;
  /** True when the learner chose an explicit sort; charts then keep the row order. */
  sorted: boolean;
  /** Line and column chart: how many of the last values are drawn as lines. */
  lineCount?: number;
}

/** Filter context of a visual: basic filters, slicer selections, then Top N filters (evaluated in that context). */
export function filterContext(engine: Engine, filters: FieldFilter[], slicers: SlicerSpec[] = [], values: ValueField[] = []): FilterContext {
  let ctx: FilterContext = [];
  for (const f of filters) {
    if (!f.topN && f.values.length) ctx = [...ctx, engine.equalityFilter(f.table, f.column, f.values)];
  }
  for (const s of slicers) {
    if (s.values.length) ctx = [...ctx, engine.equalityFilter(s.table, s.column, s.values)];
  }
  for (const f of filters) {
    const v = f.topN && values[f.topN.valueIndex];
    if (!f.topN || !v || f.topN.n < 1) continue;
    const node = valueNode(v);
    const base = ctx;
    const scored = engine
      .distinct(f.table, f.column, engine.rowsOf(f.table, base))
      .map((key) => ({ key, val: engine.evaluate(node, engine.applyFilter(base, engine.equalityFilter(f.table, f.column, [key]))) }))
      .filter((x) => x.val !== null)
      .sort((a, b) => (f.topN!.bottom ? Number(a.val) - Number(b.val) : Number(b.val) - Number(a.val)));
    const keep = scored.slice(0, Math.floor(f.topN.n)).map((x) => x.key);
    ctx = [...ctx, engine.equalityFilter(f.table, f.column, keep)];
  }
  return ctx;
}

function cross(lists: Scalar[][]): Scalar[][] {
  return lists.reduce<Scalar[][]>((acc, l) => acc.flatMap((a) => l.map((v) => [...a, v])), [[]]);
}

export function computeVisual(engine: Engine, input: VisualSpec): VisualResult {
  const spec = effectiveSpec(input);
  const ctx = filterContext(engine, spec.filters, spec.slicers ?? [], spec.values);
  const nodes = spec.values.map(valueNode);
  const evalAll = (c: FilterContext) => nodes.map((n) => engine.evaluate(n, c));

  const distinctFor = (f: FieldRef) => engine.distinct(f.table, f.column, engine.rowsOf(f.table, ctx));
  const catCombos = cross(spec.category.map(distinctFor));
  const serCombos = cross(spec.series.map(distinctFor));

  const ctxFor = (fields: FieldRef[], keys: Scalar[], c: FilterContext) =>
    fields.reduce((acc, f, i) => engine.applyFilter(acc, engine.equalityFilter(f.table, f.column, [keys[i]])), c);

  const rows: ResultRow[] = [];
  const usedSeries = new Set<string>();
  for (const keys of catCombos) {
    const cctx = ctxFor(spec.category, keys, ctx);
    for (const ser of serCombos) {
      const values = evalAll(ctxFor(spec.series, ser, cctx));
      if (values.every((v) => v === null)) continue;
      rows.push({ keys, series: ser, values });
      usedSeries.add(JSON.stringify(ser));
    }
  }

  const rowTotals = new Map<string, Scalar[]>();
  const seriesTotals = new Map<string, Scalar[]>();
  if (spec.series.length && spec.values.length) {
    for (const keys of catCombos) {
      if (rows.some((r) => JSON.stringify(r.keys) === JSON.stringify(keys))) {
        rowTotals.set(JSON.stringify(keys), evalAll(ctxFor(spec.category, keys, ctx)));
      }
    }
    for (const ser of serCombos) {
      if (usedSeries.has(JSON.stringify(ser))) seriesTotals.set(JSON.stringify(ser), evalAll(ctxFor(spec.series, ser, ctx)));
    }
  }

  if (spec.sort) {
    const sort = spec.sort;
    const sign = sort.dir === 'asc' ? 1 : -1;
    if (sort.by === 'axis') {
      // Rows are already in ascending axis order (respecting "sort by column").
      if (sort.dir === 'desc') {
        const order = catCombos.map((k) => JSON.stringify(k)).reverse();
        rows.sort((a, b) => order.indexOf(JSON.stringify(a.keys)) - order.indexOf(JSON.stringify(b.keys)));
      }
    } else {
      const j = sort.by;
      const val = (r: ResultRow) => {
        const v = spec.series.length ? rowTotals.get(JSON.stringify(r.keys))?.[j] : r.values[j];
        return typeof v === 'number' ? v : -Infinity;
      };
      rows.sort((a, b) => sign * (val(a) - val(b)));
    }
  }

  return {
    sorted: !!spec.sort,
    lineCount: input.type === 'lineColumn' ? (input.lineValues?.length ?? 0) : undefined,
    rowTotals,
    seriesTotals,
    categoryLabels: spec.category.map((f) => f.column),
    seriesLabels: spec.series.map((f) => f.column),
    valueLabels: spec.values.map(valueLabel),
    formats: spec.values.map((v) => valueFormat(engine, v)),
    rows,
    seriesKeys: serCombos.filter((s) => usedSeries.has(JSON.stringify(s))),
    totals: spec.values.length ? evalAll(ctx) : [],
  };
}

// ---------- formatting ----------

export function formatValue(v: Scalar, fmt?: ValueFormat, compact = false): string {
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'string') return v;
  if (!Number.isFinite(v)) return v > 0 ? '∞' : 'NaN';
  if (fmt === 'text') return String(v);
  if (compact && Math.abs(v) >= 10000) {
    const units: [number, string][] = [
      [1e9, 'bn'],
      [1e6, 'M'],
      [1e3, 'K'],
    ];
    for (const [d, s] of units) {
      if (Math.abs(v) >= d) return `${fmt === 'currency' ? '$' : ''}${+(v / d).toFixed(2)}${s}`;
    }
  }
  if (fmt === 'percent') return `${(v * 100).toFixed(2)}%`;
  if (fmt === 'currency') return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  if (fmt === 'integer' || Number.isInteger(v)) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Display units chosen automatically from the largest value, like the "Auto" display unit in BI tools. */
export function autoUnits(maxAbs: number): { div: number; suffix: string } {
  if (maxAbs >= 1e9) return { div: 1e9, suffix: 'bn' };
  if (maxAbs >= 1e6) return { div: 1e6, suffix: 'M' };
  if (maxAbs >= 1e3) return { div: 1e3, suffix: 'K' };
  return { div: 1, suffix: '' };
}

/** Formats an axis tick or data label with a display unit, e.g. $0.2M, 1.5K, 25%. */
export function formatTick(v: number, fmt: ValueFormat | undefined, unit: { div: number; suffix: string }): string {
  if (fmt === 'percent') return `${+(v * 100).toFixed(1)}%`;
  const n = +(v / unit.div).toFixed(unit.div > 1 ? 2 : 2);
  const body = `${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}${unit.suffix}`;
  const sign = n < 0 ? '-' : '';
  return fmt === 'currency' ? `${sign}$${body}` : `${sign}${body}`;
}

/** Automatic visual title, e.g. "Sum of Sales Amount by Category and Color". */
export function visualTitle(input: VisualSpec): string {
  const vals = input.values.map(valueLabel).join(' and ');
  if (isCardLike(input.type)) return vals;
  const spec = isHierarchyVisual(input.type) && input.category.length > 1 ? { ...input, category: input.category } : input;
  const groups = [...spec.category, ...(spec.type === 'table' || isPieLike(spec.type) ? [] : spec.series)].map((f) => f.column);
  return groups.length ? `${vals} by ${groups.join(' and ')}` : vals;
}

export function formatKey(v: Scalar): string {
  return v === null ? '(Blank)' : String(v);
}
