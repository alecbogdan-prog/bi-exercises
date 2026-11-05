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
  } catch {
    // Storage blocked: the score is just not remembered.
  }
}
