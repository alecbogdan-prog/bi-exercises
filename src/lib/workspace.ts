import type { Engine } from '../engine/engine';
import { DaxError } from '../engine/model';
import type { CalcColumn, Measure, ValueFormat } from '../engine/model';
import { parseDax, splitMeasureDefinition } from '../engine/parser';
import type { FieldRef, FilterScope, ValueField, VisualSpec, VisualType } from '../engine/visual';

export type DragItem = { kind: 'column'; table: string; column: string } | { kind: 'measure'; name: string };
/** `columns` is the single mixed well of a table visual; `unsupported` wells exist only for realism. */
export type WellId = 'category' | 'series' | 'values' | 'lineValues' | 'filters' | 'columns' | 'unsupported' | 'slicer';

export const DRAG_MIME = 'application/x-biex-field';

export interface WellDef {
  id: WellId;
  label: string;
  max?: number;
}

const SMALL_MULTIPLES: WellDef = { id: 'unsupported', label: 'Small multiples' };
const TOOLTIPS: WellDef = { id: 'unsupported', label: 'Tooltips' };

export function wellsFor(type: VisualType): WellDef[] {
  switch (type) {
    case 'card':
      return [{ id: 'values', label: 'Fields', max: 1 }];
    case 'multiCard':
      return [{ id: 'values', label: 'Fields' }];
    case 'gauge':
      return [
        { id: 'values', label: 'Value', max: 1 },
        { id: 'unsupported', label: 'Minimum value' },
        { id: 'unsupported', label: 'Maximum value' },
        { id: 'unsupported', label: 'Target value' },
        TOOLTIPS,
      ];
    case 'kpi':
      return [
        { id: 'values', label: 'Value', max: 1 },
        { id: 'category', label: 'Trend axis', max: 1 },
        { id: 'unsupported', label: 'Target' },
      ];
    case 'funnel':
      return [
        { id: 'category', label: 'Category', max: 1 },
        { id: 'values', label: 'Values', max: 1 },
        TOOLTIPS,
      ];
    case 'waterfall':
      return [
        { id: 'category', label: 'Category', max: 1 },
        { id: 'unsupported', label: 'Breakdown' },
        { id: 'values', label: 'Y-axis', max: 1 },
        TOOLTIPS,
      ];
    case 'lineColumn':
      return [
        { id: 'category', label: 'X-axis' },
        { id: 'values', label: 'Column y-axis' },
        { id: 'lineValues', label: 'Line y-axis' },
        { id: 'unsupported', label: 'Column legend' },
        SMALL_MULTIPLES,
        TOOLTIPS,
      ];
    case 'treemap':
      return [
        { id: 'category', label: 'Category' },
        { id: 'unsupported', label: 'Details' },
        { id: 'values', label: 'Values', max: 1 },
        TOOLTIPS,
      ];
    case 'table':
      return [{ id: 'columns', label: 'Columns' }];
    case 'matrix':
      return [
        { id: 'category', label: 'Rows' },
        { id: 'series', label: 'Columns' },
        { id: 'values', label: 'Values' },
      ];
    case 'pie':
    case 'donut':
      return [
        { id: 'category', label: 'Legend' },
        { id: 'values', label: 'Values', max: 1 },
        { id: 'unsupported', label: 'Details' },
        TOOLTIPS,
      ];
    case 'bar':
    case 'clusteredBar':
    case 'pctBar':
      return [
        { id: 'category', label: 'Y-axis' },
        { id: 'values', label: 'X-axis' },
        { id: 'series', label: 'Legend', max: 1 },
        SMALL_MULTIPLES,
        TOOLTIPS,
      ];
    case 'line':
    case 'area':
      return [
        { id: 'category', label: 'X-axis' },
        { id: 'values', label: 'Y-axis' },
        { id: 'unsupported', label: 'Secondary y-axis' },
        { id: 'series', label: 'Legend', max: 1 },
        SMALL_MULTIPLES,
        TOOLTIPS,
      ];
    default:
      return [
        { id: 'category', label: 'X-axis' },
        { id: 'values', label: 'Y-axis' },
        { id: 'series', label: 'Legend', max: 1 },
        SMALL_MULTIPLES,
        TOOLTIPS,
      ];
  }
}

export function isCategorical(engine: Engine, table: string, column: string): boolean {
  const c = engine.column(table, column);
  return !c || c.type !== 'number' || c.format === 'text';
}

const sameField = (a: FieldRef, b: FieldRef) => a.table === b.table && a.column === b.column;

export function setVisualType(spec: VisualSpec, type: VisualType): VisualSpec {
  const wells = wellsFor(type).map((w) => w.id);
  const next: VisualSpec = {
    ...spec,
    type,
    category: wells.includes('category') || wells.includes('columns') ? spec.category : [],
    series: wells.includes('series') ? spec.series.slice(0, type === 'matrix' ? undefined : 1) : [],
  };
  const vmax = wellsFor(type).find((w) => w.id === 'values')?.max;
  if (vmax) next.values = next.values.slice(0, vmax);
  const cmax = wellsFor(type).find((w) => w.id === 'category')?.max;
  if (cmax) next.category = next.category.slice(0, cmax);
  if (type !== 'lineColumn' && next.lineValues) {
    next.values = [...next.values, ...next.lineValues];
    delete next.lineValues;
  }
  return next;
}

export function addToWell(
  engine: Engine,
  spec: VisualSpec,
  well: WellId,
  item: DragItem,
  /** Internal: called from the table's mixed "Columns" well, which has no wells of its own. */
  viaColumns = false,
): { spec: VisualSpec; error?: string } {
  if (well === 'unsupported') return { spec, error: 'This field well is not available in the exercises yet.' };
  if (well === 'slicer') return { spec };
  if (well === 'columns') {
    const categorical = item.kind === 'column' && isCategorical(engine, item.table, item.column);
    return addToWell(engine, { ...spec }, categorical ? 'category' : 'values', item, true);
  }
  const def: WellDef | undefined = viaColumns ? { id: well, label: 'Columns' } : wellsFor(spec.type).find((w) => w.id === well);
  if (well === 'filters') return addFilter(spec, item, 'visual');
  if (!def) return { spec };
  if (well === 'values' || well === 'lineValues') {
    let v: ValueField;
    if (item.kind === 'measure') {
      if ([...spec.values, ...(spec.lineValues ?? [])].some((x) => x.kind === 'measure' && x.name === item.name)) return { spec };
      v = { kind: 'measure', name: item.name };
    } else {
      v = { kind: 'column', table: item.table, column: item.column, agg: isCategorical(engine, item.table, item.column) ? 'COUNT' : 'SUM' };
    }
    if (well === 'lineValues') return { spec: { ...spec, lineValues: [...(spec.lineValues ?? []), v] } };
    const values = def.max === 1 ? [v] : [...spec.values, v];
    return { spec: { ...spec, values } };
  }
  if (item.kind === 'measure') {
    const valuesWell = wellsFor(spec.type).find((w) => w.id === 'values' || w.id === 'columns');
    return { spec, error: `A measure can't be used here. Put it in ${valuesWell?.label ?? 'Values'}.` };
  }
  const field = { table: item.table, column: item.column };
  const list = spec[well as 'category' | 'series'];
  if (list.some((f) => sameField(f, field))) return { spec };
  const nextList = def.max === 1 ? [field] : [...list, field];
  return { spec: { ...spec, [well]: nextList } };
}

export function addFilter(spec: VisualSpec, item: DragItem, scope: FilterScope): { spec: VisualSpec; error?: string } {
  if (item.kind === 'measure') return { spec, error: 'Measures cannot be used as filters in this exercise environment yet.' };
  if (spec.filters.some((f) => sameField(f, item))) {
    return { spec: { ...spec, filters: spec.filters.map((f) => (sameField(f, item) ? { ...f, scope } : f)) } };
  }
  return { spec: { ...spec, filters: [...spec.filters, { table: item.table, column: item.column, values: [], scope }] } };
}

/** Where a field goes when the learner just ticks its checkbox. */
export function autoAdd(engine: Engine, spec: VisualSpec, item: DragItem): { spec: VisualSpec; error?: string } {
  const wells = wellsFor(spec.type).map((w) => w.id);
  if (wells.includes('columns')) return addToWell(engine, spec, 'columns', item);
  if (item.kind === 'column' && isCategorical(engine, item.table, item.column) && wells.includes('category')) {
    return addToWell(engine, spec, 'category', item);
  }
  return addToWell(engine, spec, 'values', item);
}

export function removeField(spec: VisualSpec, item: DragItem): VisualSpec {
  if (item.kind === 'measure') {
    const keepM = (v: ValueField) => !(v.kind === 'measure' && v.name === item.name);
    return { ...spec, values: spec.values.filter(keepM), ...(spec.lineValues ? { lineValues: spec.lineValues.filter(keepM) } : {}) };
  }
  const keep = (f: FieldRef) => !(f.table === item.table && f.column === item.column);
  return {
    ...spec,
    category: spec.category.filter(keep),
    series: spec.series.filter(keep),
    values: spec.values.filter((v) => v.kind !== 'column' || keep(v)),
    ...(spec.lineValues ? { lineValues: spec.lineValues.filter((v) => v.kind !== 'column' || keep(v)) } : {}),
  };
}

export function fieldUsed(spec: VisualSpec, item: DragItem): boolean {
  const vals = [...spec.values, ...(spec.lineValues ?? [])];
  if (item.kind === 'measure') return vals.some((v) => v.kind === 'measure' && v.name === item.name);
  const is = (f: FieldRef) => f.table === item.table && f.column === item.column;
  return spec.category.some(is) || spec.series.some(is) || vals.some((v) => v.kind === 'column' && is(v));
}

const CURRENCY_HINT = /Sales Amount|Unit Price|Unit Cost|List Price/i;

export function guessFormat(name: string, expression: string, measures: Measure[]): ValueFormat | undefined {
  if (/%|percent|pct|ratio/i.test(name)) return 'percent';
  if (/^\s*(COUNTROWS|DISTINCTCOUNT|COUNT|COUNTA)\s*\(/i.test(expression)) return 'integer';
  if (/CALCULATE\s*\(\s*COUNTROWS/i.test(expression)) return 'integer';
  if (CURRENCY_HINT.test(expression)) return 'currency';
  const refs = [...expression.matchAll(/\[([^\]]+)\]/g)].map((x) => x[1].toLowerCase());
  const refMeasures = measures.filter((m) => refs.includes(m.name.toLowerCase()));
  if (refMeasures.length && refMeasures.every((m) => m.format === 'currency') && !/DIVIDE|\//i.test(expression)) return 'currency';
  if (refMeasures.some((m) => m.format === 'currency') && /DIVIDE/i.test(expression) && refMeasures.some((m) => m.format === 'integer')) {
    return 'currency';
  }
  return undefined;
}

/**
 * Validates a "Name = expression" definition and returns the new measures list.
 * `editing` is the name of the measure being edited (if any).
 */
export function commitMeasure(
  base: Engine,
  text: string,
  given: Measure[],
  mine: Measure[],
  editing: string | null,
): { measures: Measure[]; name: string } {
  const { name, expression } = splitMeasureDefinition(text);
  const lower = name.toLowerCase();
  if (given.some((m) => m.name.toLowerCase() === lower)) {
    throw new DaxError(`A measure named "${name}" already exists in this model. Pick another name.`);
  }
  if (mine.some((m) => m.name.toLowerCase() === lower && m.name !== editing)) {
    throw new DaxError(`You already have a measure named "${name}".`);
  }
  parseDax(expression);
  const measure: Measure = { name, table: 'Sales', expression, format: guessFormat(name, expression, [...given, ...mine]) };
  const others = mine.filter((m) => m.name !== editing);
  const measures = [...others, measure];
  // Evaluate once to surface semantic errors (unknown columns, missing row context, ...).
  base.withMeasures([...given, ...measures]).evaluateMeasure(name, []);
  return { measures, name };
}

export function renameMeasureInSpec(spec: VisualSpec, from: string | null, to: string): VisualSpec {
  if (!from || from === to) return spec;
  return { ...spec, values: spec.values.map((v) => (v.kind === 'measure' && v.name === from ? { ...v, name: to } : v)) };
}

/**
 * Validates a "Name = expression" calculated column for `table` and returns the new column list.
 * `editing` is the name of the column being edited (if any).
 */
export function commitColumn(
  base: Engine,
  text: string,
  table: string,
  columns: CalcColumn[],
  editing: string | null,
): { columns: CalcColumn[]; name: string } {
  const { name, expression } = splitMeasureDefinition(text);
  const t = base.table(table);
  const others = columns.filter((c) => !(c.table === t.name && c.name === editing));
  if (t.columns.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    throw new DaxError(`The table '${t.name}' already has a column named "${name}".`);
  }
  if (others.some((c) => c.table === t.name && c.name.toLowerCase() === name.toLowerCase())) {
    throw new DaxError(`You already have a column named "${name}" in '${t.name}'.`);
  }
  parseDax(expression);
  const next = [...others, { table: t.name, name, expression }];
  base.withColumns(next); // surfaces errors such as a missing row context or unknown columns
  return { columns: next, name };
}

/** Renames a calculated column wherever the visual uses it. */
export function renameColumnInSpec(spec: VisualSpec, table: string, from: string | null, to: string): VisualSpec {
  if (!from || from === to) return spec;
  const fix = <T extends FieldRef>(f: T): T => (f.table === table && f.column === from ? { ...f, column: to } : f);
  return {
    ...spec,
    category: spec.category.map(fix),
    series: spec.series.map(fix),
    values: spec.values.map((v) => (v.kind === 'column' ? fix(v) : v)),
    filters: spec.filters.map(fix),
    slicers: spec.slicers?.map(fix),
  };
}

/** Removes every use of a column (wells, filters, slicer fields). */
export function removeColumnEverywhere(spec: VisualSpec, table: string, column: string): VisualSpec {
  const keep = (f: FieldRef) => !(f.table === table && f.column === column);
  return {
    ...removeField(spec, { kind: 'column', table, column }),
    filters: spec.filters.filter(keep),
    slicers: spec.slicers?.filter(keep),
  };
}

// ---------------- slicers ----------------

export function addSlicer(spec: VisualSpec): { spec: VisualSpec; index: number } {
  const slicers = [...(spec.slicers ?? []), { table: '', column: '', values: [] }];
  return { spec: { ...spec, slicers }, index: slicers.length - 1 };
}

export function setSlicerField(spec: VisualSpec, index: number, item: DragItem): { spec: VisualSpec; error?: string } {
  if (item.kind === 'measure') return { spec, error: 'A slicer needs a column, not a measure.' };
  const slicers = (spec.slicers ?? []).map((s, i) => (i === index ? { table: item.table, column: item.column, values: [] } : s));
  return { spec: { ...spec, slicers } };
}

export function removeSlicer(spec: VisualSpec, index: number): VisualSpec {
  return { ...spec, slicers: (spec.slicers ?? []).filter((_, i) => i !== index) };
}
