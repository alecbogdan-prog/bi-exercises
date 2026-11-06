import type { Exercise } from '../../exercises/types';

/**
 * Exercises that open in the simple view (only the parts of Power BI they need).
 * Multi-page report exercises keep the full editor: they need the page tabs and the whole report.
 */
export function canFocus(ex: Exercise): boolean {
  return ex.check.kind !== 'pages';
}

/** The exercise needs the Filters pane (filters on the answer, or the filters module). */
export function needsFilters(ex: Exercise): boolean {
  return ex.module === 'filters' || ex.solution.spec.filters.length > 0;
}

/** Only a visual type and fields to get right: the hint can point at every click on its own. */
export function isPlainVisual(ex: Exercise): boolean {
  if (ex.check.kind !== 'report') return false;
  const c = ex.check;
  const s = ex.solution.spec;
  return !c.requireSort && !c.requireFormat && !c.requireSlicer && !c.requireDrill && !c.requireConditional && !s.filters.length && !(s.slicers ?? []).length;
}
