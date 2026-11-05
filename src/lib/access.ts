import { EXERCISES } from '../exercises/exercises';
import type { Exercise } from '../exercises/types';
import { currentPlan } from './account';

export { FREE_PER_CHAPTER } from '../exercises/exercises';

/** Dev-server override for testing: `localStorage['pbx:pro'] = '1'` unlocks everything. */
function devOverride(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem('pbx:pro') === '1';
  } catch {
    return false;
  }
}

/** Whether the visitor has Pro (every exercise, project and practice test). */
export function hasPro(): boolean {
  return devOverride() || currentPlan() === 'pro';
}

/** Whether the visitor can take every PL-300 practice test (Pro, or the PL-300 Prep pass). */
export function hasPl300(): boolean {
  return hasPro() || currentPlan() === 'pl300';
}

export const canOpen = (ex: Exercise): boolean => ex.free || hasPro();

export const freeExercises = (): Exercise[] => EXERCISES.filter((e) => e.free);

/** The next free exercise after this one (wrapping around), for the "try a free one" link. */
export function nextFreeAfter(ex: Exercise): Exercise | undefined {
  const i = EXERCISES.findIndex((e) => e.id === ex.id);
  return [...EXERCISES.slice(i + 1), ...EXERCISES.slice(0, i)].find((e) => e.free);
}
