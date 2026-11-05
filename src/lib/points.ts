import type { Exercise } from '../exercises/types';

const BASE: Record<Exercise['level'], number> = { Beginner: 100, Intermediate: 150, Advanced: 200 };

/** Points for solving an exercise: more for harder ones, a bonus for solving without hints or the solution. */
export function pointsFor(ex: Exercise, usedHelp: boolean): number {
  return BASE[ex.level] + (usedHelp ? 0 : 50);
}
