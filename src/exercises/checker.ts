import type { ReportState } from '../report/report';
import { checkPages } from '../report/report';
import { Engine, scalarEquals } from '../engine/engine';
import type { CalcColumn, Measure, Relationship, Scalar } from '../engine/model';
import { QueryError, TYPE_LABEL, normalizeRow, runQuery } from '../engine/query';
import type { QTable, Step } from '../engine/query';
import { rawSource, sourceTables } from '../engine/rawSources';
import { functionsUsed, parseDax } from '../engine/parser';
import { DRILL_ALL, computeVisual, formatKey, formatValue, valueLabel } from '../engine/visual';
import type { FieldRef, VisualSpec, VisualType } from '../engine/visual';
import type { Exercise, ReportCheck } from './types';

export interface CheckResult {
  ok: boolean;
  messages: string[];
}

export const VISUAL_NAMES: Record<VisualType, string> = {
  card: 'Card',
  multiCard: 'Multi-row card',
  table: 'Table',
  matrix: 'Matrix',
  column: 'Stacked column chart',
  bar: 'Stacked bar chart',
  clusteredColumn: 'Clustered column chart',
  clusteredBar: 'Clustered bar chart',
  pctColumn: '100% Stacked column chart',
  pctBar: '100% Stacked bar chart',
  line: 'Line chart',
  area: 'Area chart',
  stackedArea: 'Stacked area chart',
  pie: 'Pie chart',
  donut: 'Donut chart',
  treemap: 'Treemap',
  lineColumn: 'Line and stacked column chart',
  waterfall: 'Waterfall chart',
  funnel: 'Funnel',
  gauge: 'Gauge',
  kpi: 'KPI',
};

const fieldKey = (f: FieldRef) => `${f.table.toLowerCase()}|${f.column.toLowerCase()}`;
const fieldName = (f: FieldRef) => `${f.table}[${f.column}]`;

function numbersMatch(a: Scalar, b: Scalar): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a === 'number' && typeof b === 'number') {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
    return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
  }
  return scalarEquals(a, b);
}

function compareFieldWell(name: string, actual: FieldRef[], expected: FieldRef[], out: string[]) {
  const a = new Set(actual.map(fieldKey));
  const e = new Set(expected.map(fieldKey));
  const missing = expected.filter((f) => !a.has(fieldKey(f)));
  const extra = actual.filter((f) => !e.has(fieldKey(f)));
  if (missing.length) out.push(`${name} should contain ${missing.map(fieldName).join(', ')}.`);
  if (extra.length) out.push(`Remove ${extra.map(fieldName).join(', ')} from ${name}.`);
}

function wellNames(type: VisualType): { cat: string; ser: string } {
  if (type === 'matrix') return { cat: 'Rows', ser: 'Columns' };
  if (type === 'table') return { cat: 'Columns', ser: 'Columns' };
  if (type === 'pie' || type === 'donut') return { cat: 'Legend', ser: 'Details' };
  if (type === 'treemap' || type === 'funnel' || type === 'waterfall') return { cat: 'Category', ser: 'Details' };
  if (type === 'kpi') return { cat: 'Trend axis', ser: 'Details' };
  if (type === 'bar' || type === 'clusteredBar' || type === 'pctBar') return { cat: 'Y-axis', ser: 'Legend' };
  return { cat: 'X-axis', ser: 'Legend' };
}

function withCols(base: Engine, columns: CalcColumn[]): Engine | string {
  try {
    return base.withColumns(columns);
  } catch (e) {
    return (e as Error).message;
  }
}

const FORMAT_DEFAULTS: Record<string, boolean> = { dataLabels: false };
const FORMAT_NAMES: Record<string, string> = {
  dataLabels: 'Data labels',
  legend: 'Legend',
  title: 'Title',
  xTitle: 'the X-axis title',
  yTitle: 'the Y-axis title',
  totals: 'Totals',
  categoryLabel: 'Category label',
};

export function checkReport(
  base: Engine,
  ex: Exercise,
  spec: VisualSpec,
  measures: Measure[],
  columns: CalcColumn[] = [],
  check?: ReportCheck,
  expRoot: Engine = base,
): CheckResult {
  const rc = check ?? (ex.check.kind === 'report' ? ex.check : null);
  if (!rc) throw new Error('not a report exercise');
  const out: string[] = [];
  const target = ex.solution.spec;
  if (!rc.allowedTypes.includes(spec.type)) {
    out.push(`Change the visual type to ${rc.allowedTypes.map((t) => VISUAL_NAMES[t]).join(' or ')}.`);
  }
  if (rc.requireSlicer) {
    const need = rc.requireSlicer;
    if (!(spec.slicers ?? []).some((sl) => fieldKey(sl) === fieldKey(need))) out.push(`Add a slicer for ${need.table}[${need.column}] to the page.`);
  }
  const wells = wellNames(target.type);
  compareFieldWell(wells.cat, spec.category, target.category, out);
  compareFieldWell(wells.ser, spec.series, target.series, out);
  if (spec.values.length === 0) {
    out.push(`Add ${target.values.map(valueLabel).join(' and ')} to Values.`);
  }
  if (target.type === 'lineColumn' && spec.type === 'lineColumn') {
    const want = (target.lineValues ?? []).map(valueLabel);
    const got = (spec.lineValues ?? []).map(valueLabel);
    if (want.join('|') !== got.join('|')) out.push(`Put ${want.join(' and ')} in the Line y-axis well (and the rest in Column y-axis).`);
  }
  if (out.length) return { ok: false, messages: out };

  const userBase = withCols(base, columns);
  if (typeof userBase === 'string') return { ok: false, messages: [`One of your calculated columns has an error: ${userBase}`] };
  const expBase = withCols(expRoot, ex.solution.columns ?? []) as Engine;
  const userEngine = userBase.withMeasures([...(ex.givenMeasures ?? []), ...measures]);
  const expEngine = expBase.withMeasures([...(ex.givenMeasures ?? []), ...(ex.solution.measures ?? [])]);
  let actual;
  try {
    actual = computeVisual(userEngine, spec);
  } catch (e) {
    return { ok: false, messages: [`Your visual has an error: ${(e as Error).message}`] };
  }
  const expected = computeVisual(expEngine, target);

  // Align rows by their keys (the order of fields inside a well does not matter).
  const keyOf = (fields: FieldRef[], keys: Scalar[], order: FieldRef[]) =>
    order.map((f) => JSON.stringify(keys[fields.findIndex((x) => fieldKey(x) === fieldKey(f))] ?? null)).join('|');
  const actualRows = new Map(
    actual.rows.map((r) => [keyOf(spec.category, r.keys, target.category) + '#' + keyOf(spec.series, r.series, target.series), r]),
  );

  const usedCols = new Set<number>();
  const missingValues: string[] = [];
  expected.valueLabels.forEach((label, j) => {
    const match = actual.valueLabels.findIndex((_, k) => {
      if (usedCols.has(k)) return false;
      if (!numbersMatch(actual.totals[k] ?? null, expected.totals[j] ?? null)) return false;
      if (actual.rows.length !== expected.rows.length) return false;
      return expected.rows.every((er) => {
        const ar = actualRows.get(keyOf(target.category, er.keys, target.category) + '#' + keyOf(target.series, er.series, target.series));
        return !!ar && numbersMatch(ar.values[k], er.values[j]);
      });
    });
    if (match === -1) missingValues.push(label);
    else usedCols.add(match);
  });

  if (missingValues.length) {
    const sameValueFields = missingValues.every((l) => actual.valueLabels.includes(l));
    if (sameValueFields && target.filters.length) {
      out.push('The numbers do not match the target yet. Check the filters: the target shows only part of the data.');
    } else if (sameValueFields) {
      out.push('The numbers do not match the target yet. Check the filters on this visual: the target has none.');
    } else {
      out.push(`Values should show ${missingValues.join(' and ')}.`);
    }
  }
  const extra = actual.valueLabels.filter((_, k) => !usedCols.has(k));
  if (!missingValues.length && extra.length) out.push(`Remove ${extra.join(', ')} from Values.`);
  if (out.length) return { ok: false, messages: out };

  if (rc.requireSort) {
    const want = rc.requireSort;
    const got = spec.sort;
    if (!got || got.by !== want.by || got.dir !== want.dir) {
      const byName = want.by === 'axis' ? target.category.map((f) => f.column).join(', ') : valueLabel(target.values[want.by]);
      out.push(`Sort the visual by ${byName}, ${want.dir === 'asc' ? 'ascending' : 'descending'} (visual header … More options → Sort axis).`);
    }
  }
  if (rc.requireFormat) {
    for (const [k, want] of Object.entries(rc.requireFormat)) {
      const f = (spec.format ?? {}) as Record<string, unknown>;
      if (k === 'titleText') {
        const got = String(f.titleText ?? '').trim().toLowerCase();
        if (got !== String(want).trim().toLowerCase()) out.push(`Set the visual title text to "${want}" (Format visual → General → Title → Text).`);
      } else {
        const got = f[k] ?? FORMAT_DEFAULTS[k] ?? true;
        if (got !== want) out.push(`Turn ${want ? 'on' : 'off'} ${FORMAT_NAMES[k] ?? k} in Format visual.`);
      }
    }
  }
  if (rc.requireConditional) {
    const want = rc.requireConditional;
    const got = (spec.format?.conditional ?? []).find((c) => c.valueIndex === want.valueIndex);
    const label = valueLabel(target.values[want.valueIndex]);
    if (want.background && !got?.background) out.push(`Turn on Background color for ${label} (Format visual → Cell elements).`);
    if (want.dataBars && !got?.dataBars) out.push(`Turn on Data bars for ${label} (Format visual → Cell elements).`);
  }
  if (rc.requireDrill) {
    const want = rc.requireDrill;
    const got = spec.drill ?? { level: 0, path: [] };
    const samePath = want.path.every((v, i) => scalarEquals(got.path[i] ?? null, v));
    if (got.level !== want.level || !samePath) {
      const lvl = target.category[want.level]?.column ?? '';
      const into = want.path.filter((v) => v !== DRILL_ALL).map((v) => formatKey(v));
      out.push(into.length ? `Drill down into ${into.join(' → ')} so the visual shows ${lvl}.` : `Go to the next level so the visual shows ${lvl}.`);
    }
  }
  return { ok: out.length === 0, messages: out };
}

export function checkDax(base: Engine, ex: Exercise, measures: Measure[], expRoot: Engine = base): CheckResult {
  if (ex.check.kind !== 'dax') throw new Error('not a dax exercise');
  const { measureName, requiredFunctions, contexts } = ex.check;
  const mine = measures.find((m) => m.name.trim().toLowerCase() === measureName.toLowerCase());
  if (!mine) {
    if (measures.length) {
      return { ok: false, messages: [`Name your measure exactly "${measureName}" (you have: ${measures.map((m) => m.name).join(', ')}).`] };
    }
    return { ok: false, messages: [`Create a measure named "${measureName}".`] };
  }
  const out: string[] = [];
  try {
    const used = functionsUsed(parseDax(mine.expression));
    const missing = (requiredFunctions ?? []).filter((fn) => !used.has(fn));
    if (missing.length) out.push(`For this exercise, use ${missing.join(' and ')} in your measure.`);
  } catch (e) {
    return { ok: false, messages: [(e as Error).message] };
  }

  const userEngine = base.withMeasures([...(ex.givenMeasures ?? []), ...measures]);
  const expEngine = expRoot.withMeasures([...(ex.givenMeasures ?? []), ...(ex.solution.measures ?? [])]);
  const solutionName = ex.solution.measures?.[0]?.name ?? measureName;

  for (const grouping of contexts) {
    const combos = grouping.reduce<Scalar[][]>(
      (acc, f) => acc.flatMap((a) => base.distinct(f.table, f.column, base.table(f.table).rows).map((v) => [...a, v])),
      [[]],
    );
    for (const keys of combos) {
      const ctx = grouping.reduce(
        (c, f, i) => base.applyFilter(c, base.equalityFilter(f.table, f.column, [keys[i]])),
        [] as ReturnType<typeof base.equalityFilter>[],
      );
      let got: Scalar;
      try {
        got = userEngine.evaluateMeasure(mine.name, ctx);
      } catch (e) {
        return { ok: false, messages: [...out, `Error: ${(e as Error).message}`] };
      }
      const want = expEngine.evaluateMeasure(solutionName, ctx);
      if (!numbersMatch(got, want)) {
        const where = grouping.length ? grouping.map((f, i) => `${f.column} = ${keys[i]}`).join(', ') : 'the grand total';
        out.push(`The result is not right yet. For ${where} the expected value is ${want === null ? 'BLANK' : formatValue(want)}, but your measure returns ${got === null ? 'BLANK' : formatValue(got)}.`);
        return { ok: false, messages: out };
      }
    }
  }
  return { ok: out.length === 0, messages: out };
}

export function checkColumn(base: Engine, ex: Exercise, spec: VisualSpec, measures: Measure[], columns: CalcColumn[], expRoot: Engine = base): CheckResult {
  if (ex.check.kind !== 'column') throw new Error('not a column exercise');
  const { table, name, report } = ex.check;
  const mine = columns.find((c) => c.table.toLowerCase() === table.toLowerCase() && c.name.trim().toLowerCase() === name.toLowerCase());
  if (!mine) {
    const inTable = columns.filter((c) => c.table.toLowerCase() === table.toLowerCase());
    if (inTable.length) return { ok: false, messages: [`Name your column exactly "${name}" (you have: ${inTable.map((c) => c.name).join(', ')}).`] };
    const elsewhere = columns.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
    if (elsewhere) return { ok: false, messages: [`The column "${name}" must be created in the ${table} table, not in ${elsewhere.table}. Select ${table} in the Data pane, then New column.`] };
    return { ok: false, messages: [`Create a calculated column named "${name}" in the ${table} table.`] };
  }
  const userBase = withCols(base, columns);
  if (typeof userBase === 'string') return { ok: false, messages: [userBase] };
  const expBase = withCols(expRoot, ex.solution.columns ?? []) as Engine;
  const solName = (ex.solution.columns ?? []).find((c) => c.table === table)?.name ?? name;
  const ut = userBase.table(table);
  const et = expBase.table(table);
  const label = et.columns.find((c) => !c.hidden && c.type !== 'number')?.name ?? et.columns[0].name;
  for (let i = 0; i < et.rows.length; i++) {
    const got = ut.rows[i][mine.name] ?? null;
    const want = et.rows[i][solName] ?? null;
    if (!numbersMatch(got, want)) {
      const fmt = (v: Scalar) => (v === null ? 'BLANK' : typeof v === 'number' ? formatValue(v) : `"${v}"`);
      return { ok: false, messages: [`For the row where ${label} = ${et.rows[i][label]}, the expected value is ${fmt(want)}, but your column returns ${fmt(got)}.`] };
    }
  }
  if (report) return checkReport(base, ex, spec, measures, columns, report, expRoot);
  return { ok: true, messages: [] };
}

// ---------------- Power Query ----------------

export function queryResult(ex: Exercise, steps: Step[]): QTable {
  if (!ex.query) throw new Error('not a query exercise');
  return runQuery(rawSource(ex.query.source).table, steps, sourceTables());
}

export function checkQuery(ex: Exercise, steps: Step[]): CheckResult {
  const expected = queryResult(ex, ex.solution.steps ?? []);
  let actual: QTable;
  try {
    actual = queryResult(ex, steps);
  } catch (e) {
    if (e instanceof QueryError) return { ok: false, messages: [`One of your steps has an error: ${e.message} Select it in Applied Steps and delete or fix it.`] };
    throw e;
  }
  const out: string[] = [];
  const aNames = actual.columns.map((c) => c.name);
  for (const c of expected.columns) {
    if (!aNames.includes(c.name)) {
      const near = aNames.find((n) => n.trim().toLowerCase() === c.name.toLowerCase());
      out.push(near ? `Rename the column '${near}' to '${c.name}' (exact spelling).` : `The column '${c.name}' is missing.`);
    }
  }
  for (const n of aNames) {
    if (!expected.columns.some((c) => c.name === n) && !expected.columns.some((c) => c.name.toLowerCase() === n.trim().toLowerCase())) out.push(`Remove the column '${n}'.`);
  }
  if (out.length) return { ok: false, messages: out };
  for (const c of expected.columns) {
    const a = actual.columns.find((x) => x.name === c.name)!;
    if (c.type !== 'any' && a.type !== c.type) out.push(`Set the data type of '${c.name}' to ${TYPE_LABEL[c.type]}.`);
  }
  if (out.length) return { ok: false, messages: out };
  const order = expected.columns.map((c) => aNames.indexOf(c.name));
  const aRows = actual.rows.map((r) => normalizeRow(order.map((i) => r[i])));
  const eRows = expected.rows.map((r) => normalizeRow(r));
  if (aRows.length > eRows.length) {
    out.push(`Your table has ${aRows.length - eRows.length} row${aRows.length - eRows.length > 1 ? 's' : ''} too many (${aRows.length} instead of ${eRows.length}). Look for blank rows, duplicates or rows that should be filtered out.`);
  } else if (aRows.length < eRows.length) {
    out.push(`Your table is missing ${eRows.length - aRows.length} row${eRows.length - aRows.length > 1 ? 's' : ''} (${aRows.length} instead of ${eRows.length}). Did a step remove too much?`);
  } else {
    const pool = new Map<string, number>();
    for (const r of aRows) pool.set(r, (pool.get(r) ?? 0) + 1);
    const firstMissing = eRows.findIndex((r) => {
      const n = pool.get(r) ?? 0;
      if (!n) return true;
      pool.set(r, n - 1);
      return false;
    });
    if (firstMissing !== -1) {
      const row = expected.rows[firstMissing].map((v) => (v === null ? 'null' : String(v))).join(' | ');
      out.push(`Some values are not right yet. For example, this expected row is missing: ${row}`);
    }
  }
  return { ok: out.length === 0, messages: out };
}

// ---------------- Data modeling ----------------

const relKey = (r: Relationship) => `${r.fromTable}.${r.fromColumn}->${r.toTable}.${r.toColumn}`.toLowerCase();
const relName = (r: Relationship) => `${r.fromTable}[${r.fromColumn}] → ${r.toTable}[${r.toColumn}]`;

export function checkModel(base: Engine, ex: Exercise, spec: VisualSpec, measures: Measure[], columns: CalcColumn[], rels: Relationship[], expRoot: Engine): CheckResult {
  if (ex.check.kind !== 'model') throw new Error('not a model exercise');
  const have = new Set(rels.map(relKey));
  const out: string[] = [];
  for (const f of ex.check.forbidden ?? []) {
    if (have.has(relKey(f))) out.push(`The relationship ${relName(f)} filters in the wrong direction (${f.fromTable} is treated as the "many" side). Delete it and create it again between the right columns.`);
  }
  for (const r of ex.check.required) {
    if (!have.has(relKey(r))) out.push(`Create a relationship between ${r.fromTable}[${r.fromColumn}] and ${r.toTable}[${r.toColumn}] in the Model view.`);
  }
  if (out.length) return { ok: false, messages: out };
  if (ex.check.report) return checkReport(base, ex, spec, measures, columns, ex.check.report, expRoot);
  return { ok: true, messages: [] };
}

export interface ExtraWork {
  steps?: Step[];
  relationships?: Relationship[];
  report?: ReportState;
}

export function checkExercise(base: Engine, ex: Exercise, spec: VisualSpec, measures: Measure[], columns: CalcColumn[] = [], extra: ExtraWork = {}): CheckResult {
  if (ex.check.kind === 'query') return checkQuery(ex, extra.steps ?? ex.query?.starterSteps ?? []);
  if (ex.check.kind === 'pages') {
    const messages = checkPages(extra.report ?? ex.report!, ex.check.require);
    return { ok: messages.length === 0, messages };
  }
  const rels = extra.relationships ?? ex.starterRelationships ?? base.model.relationships;
  const userRoot = base.withRelationships(rels);
  const expRoot = base.withRelationships(ex.solution.relationships ?? base.model.relationships);
  if (ex.check.kind === 'model') return checkModel(userRoot, ex, spec, measures, columns, rels, expRoot);
  if (ex.check.kind === 'report') return checkReport(userRoot, ex, spec, measures, columns, undefined, expRoot);
  if (ex.check.kind === 'column') return checkColumn(userRoot, ex, spec, measures, columns, expRoot);
  const withC = withCols(userRoot, columns);
  if (typeof withC === 'string') return { ok: false, messages: [`One of your calculated columns has an error: ${withC}`] };
  return checkDax(withC, ex, measures, withCols(expRoot, ex.solution.columns ?? []) as Engine);
}
