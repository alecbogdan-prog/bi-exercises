/**
 * Progress that follows the learner across devices, and how two copies are merged.
 * Pure functions (no storage, no network) so they are easy to test.
 */

export interface PointsLog {
  awarded: Record<string, number>;
  days: Record<string, number>;
}

export interface ProgressSnapshot {
  completed: string[];
  points: PointsLog;
  /** Exercise id → saved editor work. */
  work: Record<string, unknown>;
  /** PL-300 test id → best score (0–100). */
  pl300: Record<string, number>;
}

export const emptySnapshot = (): ProgressSnapshot => ({ completed: [], points: { awarded: {}, days: {} }, work: {}, pl300: {} });

function maxRecord(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? -Infinity, v);
  return out;
}

/**
 * Combines this device's progress with the account's, losing nothing:
 * solved exercises are unioned, scores keep the best, and saved work prefers this device
 * (it is what the learner is looking at) and fills in exercises only the account has.
 */
export function mergeProgress(local: ProgressSnapshot, remote: Partial<ProgressSnapshot> | null | undefined): ProgressSnapshot {
  if (!remote) return local;
  const r = { ...emptySnapshot(), ...remote, points: { awarded: {}, days: {}, ...(remote.points ?? {}) } };
  return {
    completed: [...new Set([...local.completed, ...(r.completed ?? [])])],
    points: {
      // Each exercise pays out once, so keep whichever device recorded it first.
      awarded: { ...r.points.awarded, ...local.points.awarded },
      // Points per day: the same day on two devices is usually the same work, so take the larger.
      days: maxRecord(local.points.days, r.points.days),
    },
    work: { ...(r.work ?? {}), ...local.work },
    pl300: maxRecord(local.pl300, r.pl300 ?? {}),
  };
}

export function sameProgress(a: ProgressSnapshot, b: ProgressSnapshot): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function normalize(s: ProgressSnapshot) {
  const sortObj = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).sort(([x], [y]) => x.localeCompare(y)));
  return {
    completed: [...s.completed].sort(),
    points: { awarded: sortObj(s.points.awarded), days: sortObj(s.points.days) },
    work: sortObj(s.work),
    pl300: sortObj(s.pl300),
  };
}
