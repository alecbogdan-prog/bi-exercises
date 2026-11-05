import { EXERCISES } from '../exercises/exercises';
import type { Exercise } from '../exercises/types';

export { FREE_PER_CHAPTER } from '../exercises/exercises';

/**
 * Whether the visitor has Pro. Accounts and payments are not live yet, so nobody has Pro in a build.
 * On the dev server, `localStorage['pbx:pro'] = '1'` unlocks everything for testing.
 */
export function hasPro(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem('pbx:pro') === '1';
  } catch {
    return false;
  }
}

export const canOpen = (ex: Exercise): boolean => ex.free || hasPro();

export const freeExercises = (): Exercise[] => EXERCISES.filter((e) => e.free);

/** The next free exercise after this one (wrapping around), for the "try a free one" link. */
export function nextFreeAfter(ex: Exercise): Exercise | undefined {
  const i = EXERCISES.findIndex((e) => e.id === ex.id);
  return [...EXERCISES.slice(i + 1), ...EXERCISES.slice(0, i)].find((e) => e.free);
}
