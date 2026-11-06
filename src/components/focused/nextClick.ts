import type { HintTarget } from '../HintSpotlight';
import { VIZ_GALLERY } from '../desktop/icons';
import type { CalcColumn, Measure, Relationship, Scalar } from '../../engine/model';
import type { Step } from '../../engine/query';
import type { FieldFilter, FieldRef, FilterScope, VisualSpec } from '../../engine/visual';
import { DRILL_ALL, formatKey, valueLabel } from '../../engine/visual';
import { queryStep } from './pqHints';
import { pagesStep } from './pagesHints';
import type { ReportState } from '../../report/report';
import type { Exercise } from '../../exercises/types';
import type { DragItem } from '../../lib/workspace';
import { fieldUsed, wellsFor } from '../../lib/workspace';

export interface NextClick {
  hint: HintTarget;
  text: string;
}

/** What the learner has built so far (the parts the hints look at). */
export interface WorkState {
  spec: VisualSpec;
  measures: Measure[];
  columns: CalcColumn[];
  /** Power Query steps so far (starter steps included). */
  steps?: Step[];
  /** The model's relationships as the learner has them now. */
  relationships?: Relationship[];
  /** Multi-page exercises: the report as the learner has it now. */
  report?: ReportState;
}

const SECTION: Record<FilterScope, string> = { visual: 'Filters on this visual', page: 'Filters on this page', all: 'Filters on all pages' };
const sameField = (a: FieldRef, b: FieldRef) => a.table.toLowerCase() === b.table.toLowerCase() && a.column.toLowerCase() === b.column.toLowerCase();
const key = (v: Scalar) => JSON.stringify(v);
const exists = (sel: string) => !!document.querySelector(sel);
const plain = (s: string) => s.replace(/\*\*|`/g, '');

const itemsOf = (spec: VisualSpec): DragItem[] => [
  ...[...spec.category, ...spec.series].map((f): DragItem => ({ kind: 'column', table: f.table, column: f.column })),
  ...[...spec.values, ...(spec.lineValues ?? [])].map((v): DragItem => (v.kind === 'measure' ? { kind: 'measure', name: v.name } : { kind: 'column', table: v.table, column: v.column })),
];
const nameOf = (i: DragItem) => (i.kind === 'measure' ? i.name : i.column);
const sameItem = (a: DragItem, b: DragItem) => (a.kind === 'measure' || b.kind === 'measure' ? a.kind === b.kind && nameOf(a).toLowerCase() === nameOf(b).toLowerCase() : sameField(a, b));

/** A field in the Data pane, or its table if that table is collapsed. */
function dataField(item: DragItem, fact: string, verb: string): NextClick {
  const table = item.kind === 'measure' ? fact : item.table;
  const row = `[data-testid="data-pane"] [data-field="${table}.${nameOf(item)}"]`;
  if (!exists(row)) return { hint: { target: `[data-testid="data-pane"] [data-table="${table}"]` }, text: `Open the ${table} table in Data.` };
  return { hint: { target: row }, text: `${verb} ${nameOf(item)} in the ${table} table.` };
}

const CHECK: NextClick = { hint: { target: '[data-testid="check-answer"]' }, text: 'Everything is in place. Check your answer.' };

/** Visual type, fields, slicers and filters, in the order a learner builds them. Null once the visual matches. */
function reportStep(ex: Exercise, spec: VisualSpec, fact: string): NextClick | null {
  const goal = ex.solution.spec;
  const allowed = ex.check.kind === 'report' ? ex.check.allowedTypes : [goal.type];
  if (!allowed.includes(spec.type)) {
    const label = VIZ_GALLERY.find((g) => g.type === goal.type)?.label ?? goal.type;
    return { hint: { target: `[data-testid="pane-viz"] button[aria-label="${label}"]` }, text: `Click the ${label} icon in Visualizations.` };
  }

  // Fields on the visual: axis and values first (ticked in Data), then the Legend (chosen from its box: ticking a
  // second text field would add it to the axis).
  const seriesWell = wellsFor(goal.type).find((w) => w.id === 'series');
  const wanted = itemsOf(goal);
  const isSeries = (i: DragItem) => i.kind === 'column' && goal.series.some((f) => sameField(f, i));
  const missing = wanted.find((w) => !isSeries(w) && !fieldUsed(spec, w));
  if (missing) return dataField(missing, fact, 'Tick');
  for (const f of goal.series) {
    if (!spec.series.some((s) => sameField(s, f)) && seriesWell) {
      if (spec.category.some((c) => sameField(c, f))) return dataField({ kind: 'column', ...f }, fact, `${f.column} belongs in the ${seriesWell.label}, not on the axis. Untick`);
      return { hint: { target: `select[aria-label="Add a field to ${seriesWell.label}"]` }, text: `Choose ${f.column} from “+ Add a field…” in the ${seriesWell.label} box.` };
    }
  }
  const extra = itemsOf(spec).find((i) => !wanted.some((w) => sameItem(w, i)));
  if (extra) {
    const asFilter = extra.kind === 'column' && [...goal.filters, ...(goal.slicers ?? [])].some((g) => sameField(g, extra));
    return dataField(extra, fact, asFilter ? `${nameOf(extra)} is not needed on the visual (it goes in ${goal.slicers?.some((g) => sameField(g, extra)) ? 'a slicer' : 'Filters'}). Untick` : `${nameOf(extra)} is not needed here. Untick`);
  }

  // Slicers, in order.
  const slicers = spec.slicers ?? [];
  for (const [i, want] of (goal.slicers ?? []).entries()) {
    const at = slicers.findIndex((s) => sameField(s, want));
    if (at < 0) {
      if (slicers.some((s) => !s.column)) return dataField({ kind: 'column', table: want.table, column: want.column }, fact, 'With the new slicer selected, tick');
      return {
        hint: { target: '[data-testid="pane-viz"] button[aria-label="Slicer"]' },
        text: i > 0 || slicers.length ? 'Click the visual first, then click the Slicer icon to add another slicer.' : 'Click the Slicer icon to add a slicer to the page.',
      };
    }
    const have = new Set(slicers[at].values.map(key));
    const need = new Set(want.values.map(key));
    const toTick = want.values.find((v) => !have.has(key(v)));
    const toUntick = slicers[at].values.find((v) => !need.has(key(v)));
    const v = toTick ?? toUntick;
    if (v !== undefined) return { hint: { target: `[data-testid="slicer-${at}"] [data-slicer-item="${formatKey(v)}"]` }, text: `${toTick !== undefined ? 'Tick' : 'Untick'} ${formatKey(v)} in the ${want.column} slicer.` };
  }

  // Filters, in order.
  for (const want of goal.filters) {
    const scope = want.scope ?? 'visual';
    const card = `[data-filter-section="${scope}"] [data-filter-card="${want.column}"]`;
    const have: FieldFilter | undefined = spec.filters.find((f) => sameField(f, want) && (f.scope ?? 'visual') === scope);
    if (!exists(card)) {
      return { hint: { target: `[data-filter-section="${scope}"] select[aria-label="Add a field to filter on"]` }, text: `In ${SECTION[scope]}, choose ${want.column} from “+ Add a field…”.` };
    }
    const open = exists(`${card} input, ${card} select`);
    if (want.topN) {
      const t = want.topN;
      const ok = have?.topN && have.topN.n === t.n && !!have.topN.bottom === !!t.bottom && have.topN.valueIndex === t.valueIndex;
      if (ok) continue;
      if (!open) return { hint: { target: `${card} [role="button"]` }, text: `Open the ${want.column} filter card.` };
      if ((document.querySelector(`${card} select[aria-label="Filter type"]`) as HTMLSelectElement | null)?.value !== 'topn') {
        return { hint: { target: `${card} select[aria-label="Filter type"]` }, text: 'Set Filter type to Top N.' };
      }
      return {
        hint: { target: `${card} [data-apply-filter]` },
        text: `Show ${t.bottom ? 'Bottom' : 'Top'} ${t.n} by ${valueLabel(goal.values[t.valueIndex])}, then click Apply filter.`,
      };
    }
    const got = new Set((have?.values ?? []).map(key));
    const need = new Set(want.values.map(key));
    const toTick = want.values.find((v) => !got.has(key(v)));
    const toUntick = (have?.values ?? []).find((v) => !need.has(key(v)));
    const v = toTick ?? toUntick;
    if (v === undefined) continue;
    if (!open) return { hint: { target: `${card} [role="button"]` }, text: `Open the ${want.column} filter card.` };
    return { hint: { target: `${card} [data-filter-value="${formatKey(v)}"]` }, text: `${toTick !== undefined ? 'Tick' : 'Untick'} ${formatKey(v)}.` };
  }
  return ex.check.kind === 'report' ? extrasStep(ex.check, spec) : null;
}

const FORMAT_CARD: Record<string, string> = { dataLabels: 'Data labels', legend: 'Legend', totals: 'Totals', title: 'Title', xTitle: 'X-axis', yTitle: 'Y-axis' };
const formatTabOpen = () => exists('[data-format-sub]');
const openFormat: NextClick = { hint: { target: '[data-testid="pane-viz"] button[aria-label="Format visual"]' }, text: 'Open the Format visual tab (the brush icon) in Visualizations.' };

/** Sorting, formatting, drill-down and conditional formatting: the controls after the fields and filters. */
function extrasStep(c: Extract<Exercise['check'], { kind: 'report' }>, spec: VisualSpec): NextClick | null {
  if (c.requireSort) {
    const s = c.requireSort;
    if (!spec.sort || spec.sort.by !== s.by || spec.sort.dir !== s.dir) {
      const by = s.by === 'axis' ? spec.category.map((f) => f.column).join(', ') : valueLabel(spec.values[s.by]);
      return {
        hint: { target: '[data-testid="visual"] [aria-label="More options"]' },
        text: `Open More options (…) on the visual, choose ${by}, then Sort ${s.dir === 'asc' ? 'ascending' : 'descending'}.`,
      };
    }
  }
  if (c.requireFormat) {
    for (const [k, want] of Object.entries(c.requireFormat)) {
      const f = spec.format ?? {};
      if (k === 'titleText') {
        if ((f.titleText ?? '').trim() === String(want)) continue;
        if (!formatTabOpen()) return openFormat;
        if (exists('input[aria-label="Title text"]')) return { hint: { target: 'input[aria-label="Title text"]' }, text: `Type the title “${want}”.` };
        if (exists('[data-format-card="Title"]')) return { hint: { target: '[data-format-card="Title"] [role="button"]' }, text: 'Open the Title card.' };
        return { hint: { target: '[data-format-sub="general"]' }, text: 'Click General: the title settings are there.' };
      }
      const on = k === 'dataLabels' ? !!f.dataLabels : (f as Record<string, unknown>)[k] !== false;
      if (on === want) continue;
      const card = spec.type === 'pie' || spec.type === 'donut' ? (k === 'dataLabels' ? 'Detail labels' : FORMAT_CARD[k]) : FORMAT_CARD[k];
      if (!formatTabOpen()) return openFormat;
      if (!exists(`[data-format-card="${card}"]`)) return { hint: { target: '[data-format-sub="visual"]' }, text: 'Click Visual.' };
      return { hint: { target: `[data-format-card="${card}"] [aria-label="${card}"]` }, text: `Turn ${want ? 'on' : 'off'} ${card}.` };
    }
  }
  if (c.requireConditional) {
    const r = c.requireConditional;
    const have = (spec.format?.conditional ?? []).find((x) => x.valueIndex === r.valueIndex);
    const missing = (r.background && !have?.background) || (r.dataBars && !have?.dataBars);
    if (missing) {
      if (!formatTabOpen()) return openFormat;
      const sw = r.background ? 'Background color' : 'Data bars';
      if (exists(`[data-format-card="Cell elements"] [aria-label="${sw}"]`)) {
        return { hint: { target: `[data-format-card="Cell elements"] [aria-label="${sw}"]` }, text: `Turn on ${sw} for ${valueLabel(spec.values[r.valueIndex])}.` };
      }
      if (!exists('[data-format-card="Cell elements"]')) return { hint: { target: '[data-format-sub="visual"]' }, text: 'Click Visual.' };
      return { hint: { target: '[data-format-card="Cell elements"] [role="button"]' }, text: 'Open the Cell elements card.' };
    }
  }
  if (c.requireDrill) {
    const d = c.requireDrill;
    const ok = spec.drill?.level === d.level && JSON.stringify(spec.drill?.path ?? []) === JSON.stringify(d.path);
    if (!ok) {
      if (d.path[0] === DRILL_ALL) {
        return { hint: { target: '[data-testid="visual"] [aria-label="Go to the next level in the hierarchy"]' }, text: 'Click Go to the next level in the hierarchy (the double down arrow).' };
      }
      const mode = document.querySelector('[data-testid="visual"] [aria-label="Drill down mode"]');
      if (mode?.getAttribute('aria-pressed') !== 'true') return { hint: { target: '[data-testid="visual"] [aria-label="Drill down mode"]' }, text: 'Turn on Drill down (the single down arrow).' };
      return { hint: { target: '[data-testid="visual"]' }, text: `Now click the ${formatKey(d.path[0])} data point to drill into it.` };
    }
  }
  return null;
}

/** Model view: create the missing relationships, delete the wrong ones. */
function modelStep(c: Extract<Exercise['check'], { kind: 'model' }>, rels: Relationship[]): NextClick | null {
  const same = (a: Relationship, b: Relationship) => a.fromTable === b.fromTable && a.fromColumn === b.fromColumn && a.toTable === b.toTable && a.toColumn === b.toColumn;
  if (exists('[role="dialog"][aria-label="Create relationship"]')) return { hint: { target: '[data-testid="save-rel"]' }, text: 'It should say many to one (*:1). Click Save.' };
  const wrong = (c.forbidden ?? []).find((f) => rels.some((r) => same(r, f)));
  const missing = c.required.find((r) => !rels.some((x) => same(x, r)));
  if (!wrong && !missing) return null;
  if (!exists('[data-testid="model-view"]')) return { hint: { target: '[data-testid="mini-view-model"]' }, text: 'Open the Model view.' };
  if (wrong) {
    if (exists('[data-testid="delete-rel"]')) return { hint: { target: '[data-testid="delete-rel"]' }, text: 'Delete this relationship.' };
    return {
      hint: { target: `[data-rel="${wrong.fromTable}.${wrong.fromColumn}->${wrong.toTable}.${wrong.toColumn}"]` },
      text: `The relationship ${wrong.fromTable}[${wrong.fromColumn}] → ${wrong.toTable}[${wrong.toColumn}] is wrong. Click its line to select it.`,
    };
  }
  const r = missing!;
  const from = `${r.fromTable}.${r.fromColumn}`;
  const to = `${r.toTable}.${r.toColumn}`;
  const picked = (document.querySelector('[data-link-from]') as HTMLElement | null)?.dataset.modelField;
  const next = picked === from ? to : picked === to ? from : from;
  const [t, col] = next.split('.');
  return {
    hint: { target: `[data-model-field="${next}"]` },
    text: picked === from || picked === to ? `Now click ${t}[${col}] to connect them.` : `Click ${r.fromTable}[${r.fromColumn}], then ${r.toTable}[${r.toColumn}].`,
  };
}

/**
 * Simple view hint: where the learner should click next, given what they already did.
 * Charts, filters, slicers and Top N are worked out step by step; DAX measures and calculated columns point at
 * New measure / New column and then the formula bar. Null when the next step is something the hints cannot see
 * (sorting, formatting, Power Query, the model…): the page then shows the exercise's written hints.
 */
export function nextClick(ex: Exercise, work: WorkState, fact = 'Sales'): NextClick | null {
  const c = ex.check;
  if (c.kind === 'dax' || c.kind === 'column') {
    const name = c.kind === 'dax' ? c.measureName : c.name;
    const done = c.kind === 'dax' ? work.measures.some((m) => m.name.toLowerCase() === name.toLowerCase()) : work.columns.some((x) => x.name.toLowerCase() === name.toLowerCase());
    if (done) return CHECK;
    const help = ex.hints[0] ? ` ${plain(ex.hints[0])}` : '';
    if (exists('[data-testid="formula-bar"] textarea')) {
      return { hint: { target: '[data-testid="formula-bar"]' }, text: `Write the ${name} ${c.kind === 'dax' ? 'measure' : 'column'} here.${help}` };
    }
    return { hint: { target: '[data-testid="mini-new"]' }, text: c.kind === 'dax' ? 'Click New measure to open the formula bar.' : 'Click New column to open the formula bar.' };
  }
  if (c.kind === 'pages') return work.report ? (pagesStep(c.require, work.report) ?? CHECK) : null;
  if (c.kind === 'query') return queryStep(ex.solution.steps ?? [], work.steps ?? ex.query?.starterSteps ?? []) ?? CHECK;
  if (c.kind === 'model') return modelStep(c, work.relationships ?? ex.starterRelationships ?? []) ?? (c.report ? reportStep({ ...ex, check: c.report }, work.spec, fact) : null) ?? CHECK;
  if (c.kind !== 'report') return null;
  return reportStep(ex, work.spec, fact) ?? CHECK;
}
