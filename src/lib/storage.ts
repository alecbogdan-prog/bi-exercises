import type { ReportState } from '../report/report';
import type { CalcColumn, Measure, Relationship } from '../engine/model';
import type { Step } from '../engine/query';
import type { VisualSpec } from '../engine/visual';

import { progressChanged } from './sync';

const PREFIX = 'biex:';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    progressChanged();
  } catch {
    /* storage unavailable (private mode etc.): progress is simply not saved */
  }
}

export function completedIds(): string[] {
  return read<string[]>('completed', []);
}

export function markCompleted(id: string): void {
  const ids = new Set(completedIds());
  ids.add(id);
  write('completed', [...ids]);
}

export interface SavedWork {
  spec: VisualSpec;
  measures: Measure[];
  columns?: CalcColumn[];
  steps?: Step[];
  relationships?: Relationship[];
  report?: ReportState;
}

export function loadWork(id: string): SavedWork | null {
  return read<SavedWork | null>(`work:${id}`, null);
}

export function saveWork(id: string, work: SavedWork): void {
  write(`work:${id}`, work);
}

export function clearWork(id: string): void {
  try {
    localStorage.removeItem(PREFIX + `work:${id}`);
    progressChanged();
  } catch {
    /* ignore */
  }
}

// ---------------- progress: "in progress", points and daily streak ----------------

/** Exercises the learner has started (saved work) but not necessarily solved. */
export function startedIds(): string[] {
  try {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX + 'work:')) out.push(k.slice((PREFIX + 'work:').length));
    }
    return out;
  } catch {
    return [];
  }
}

function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface PointsLog {
  /** Exercise id → points awarded (each exercise pays out once). */
  awarded: Record<string, number>;
  /** Day (YYYY-MM-DD) → points earned that day. */
  days: Record<string, number>;
}

export interface Stats {
  total: number;
  today: number;
  /** Consecutive days, ending today, with at least one solved exercise. */
  streak: number;
}

export function stats(now = new Date()): Stats {
  const log = read<PointsLog>('points', { awarded: {}, days: {} });
  let streak = 0;
  const d = new Date(now);
  while (log.days[today(d)] !== undefined) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return {
    total: Object.values(log.awarded).reduce((a, b) => a + b, 0),
    today: log.days[today(now)] ?? 0,
    streak,
  };
}

/** Records points for a solved exercise. Returns the points awarded now (0 if it was already rewarded). */
export function awardPoints(id: string, points: number, now = new Date()): number {
  const log = read<PointsLog>('points', { awarded: {}, days: {} });
  if (log.awarded[id] !== undefined) return 0;
  log.awarded[id] = points;
  const day = today(now);
  log.days[day] = (log.days[day] ?? 0) + points;
  write('points', log);
  return points;
}
