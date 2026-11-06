import type { Exercise } from '../../exercises/types';

/** Exercises that open in the simple view (only the parts of Power BI they need). Every exercise does now. */
export function canFocus(ex: Exercise): boolean {
  return !!ex.check;
}

/** The exercise needs the Filters pane (filters on the answer, or the filters module). */
export function needsFilters(ex: Exercise): boolean {
  return ex.module === 'filters' || ex.solution.spec.filters.length > 0;
}
