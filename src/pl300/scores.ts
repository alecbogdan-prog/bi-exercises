import { progressChanged } from '../lib/sync';
// Best practice-test scores, kept in this browser only.
const KEY = 'pbx:pl300';

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

export function bestScore(testId: string): number | null {
  const v = read()[testId];
  return typeof v === 'number' ? v : null;
}

export function saveScore(testId: string, score: number): void {
  const all = read();
  if (all[testId] === undefined || score > all[testId]) all[testId] = score;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    progressChanged();
  } catch {
    // Storage blocked: the score is just not remembered.
  }
}

// Per-question history for the weak-topic review. Stored in the same record as the test scores
// (so it syncs with the account) under "q:<question id>". The value is the time of the last answer
// times two, plus 1 if it was right: the account merge keeps the larger number, which is the latest answer.
const Q_PREFIX = 'q:';

export function recordAnswers(results: { id: string; correct: boolean }[], now = Date.now()): void {
  if (!results.length) return;
  const all = read();
  for (const r of results) all[Q_PREFIX + r.id] = now * 2 + (r.correct ? 1 : 0);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    progressChanged();
  } catch {
    // Storage blocked: the history is just not remembered.
  }
}

/** Question id → whether the last answer was right. Questions never answered are missing. */
export function lastAnswers(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(read())) if (k.startsWith(Q_PREFIX) && typeof v === 'number') out[k.slice(Q_PREFIX.length)] = v % 2 === 1;
  return out;
}
