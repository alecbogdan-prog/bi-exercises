import type { HintTarget } from '../HintSpotlight';
import { VIZ_GALLERY } from '../desktop/icons';
import type { VisualSpec } from '../../engine/visual';
import type { Exercise } from '../../exercises/types';
import type { DragItem } from '../../lib/workspace';
import { fieldUsed } from '../../lib/workspace';
import { isPlainVisual } from './canFocus';

export interface NextClick {
  hint: HintTarget;
  text: string;
}

const itemsOf = (spec: VisualSpec): DragItem[] => [
  ...[...spec.category, ...spec.series].map((f): DragItem => ({ kind: 'column', table: f.table, column: f.column })),
  ...[...spec.values, ...(spec.lineValues ?? [])].map((v): DragItem => (v.kind === 'measure' ? { kind: 'measure', name: v.name } : { kind: 'column', table: v.table, column: v.column })),
];

const tableOf = (i: DragItem) => (i.kind === 'measure' ? 'Sales' : i.table);
const nameOf = (i: DragItem) => (i.kind === 'measure' ? i.name : i.column);
const sameItem = (a: DragItem, b: DragItem) => tableOf(a) === tableOf(b) && nameOf(a).toLowerCase() === nameOf(b).toLowerCase();

/**
 * Simple view hint: where the learner should click next, given what they already did.
 * Wrong visual → its icon; a missing field → that field (or its table, if collapsed);
 * a field that does not belong → untick it; everything in place → Check answer.
 * Null when the next step is something else (DAX, Power Query, filters…): use the exercise's written hints.
 */
export function nextClick(ex: Exercise, spec: VisualSpec): NextClick | null {
  if (ex.check.kind !== 'report') return null;
  const goal = ex.solution.spec;
  const allowed = ex.check.kind === 'report' ? ex.check.allowedTypes : [goal.type];
  if (!allowed.includes(spec.type)) {
    const label = VIZ_GALLERY.find((g) => g.type === goal.type)?.label ?? goal.type;
    return { hint: { target: `[data-testid="pane-viz"] button[aria-label="${label}"]` }, text: `Click the ${label} icon in Visualizations.` };
  }
  const wanted = itemsOf(goal);
  const missing = wanted.find((w) => !fieldUsed(spec, w));
  if (missing) {
    const table = tableOf(missing);
    const row = `[data-testid="data-pane"] [data-field="${table}.${nameOf(missing)}"]`;
    if (!document.querySelector(row)) return { hint: { target: `[data-testid="data-pane"] [data-table="${table}"]` }, text: `Open the ${table} table in Data.` };
    return { hint: { target: row }, text: `Tick ${nameOf(missing)} in the ${table} table.` };
  }
  const extra = itemsOf(spec).find((i) => !wanted.some((w) => sameItem(w, i)));
  if (extra) {
    return { hint: { target: `[data-testid="data-pane"] [data-field="${tableOf(extra)}.${nameOf(extra)}"]` }, text: `${nameOf(extra)} is not needed here. Untick it.` };
  }
  // Sorting, formatting, filters, slicers, drill: the written hints explain the rest.
  if (!isPlainVisual(ex)) return null;
  return { hint: { target: '[data-testid="check-answer"]' }, text: 'Everything is in place. Check your answer.' };
}
