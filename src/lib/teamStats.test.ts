import { describe, expect, it } from 'vitest';
import { memberStats, teamTotals } from './teamStats';

const now = new Date(2026, 10, 5, 12);

describe('memberStats', () => {
  it('counts solved exercises, points, streak and best PL-300 score', () => {
    const s = memberStats({ completed: ['a', 'b', 'b'], points: { awarded: { a: 10, b: 20 }, days: { '2026-11-05': 10, '2026-11-04': 20, '2026-11-02': 5 } }, pl300: { 'test-1': 60, 'test-2': 85 } }, now);
    expect(s).toEqual({ solved: 2, points: 30, streak: 2, pl300Best: 85 });
  });

  it('keeps a streak alive when today has no practice yet', () => {
    expect(memberStats({ points: { awarded: {}, days: { '2026-11-04': 5, '2026-11-03': 5 } } }, now).streak).toBe(2);
  });

  it('handles a member who has not started', () => {
    expect(memberStats(null, now)).toEqual({ solved: 0, points: 0, streak: 0, pl300Best: null });
  });
});

describe('teamTotals', () => {
  it('sums solved and averages PL-300 scores of those who took a test', () => {
    const t = teamTotals([
      { solved: 3, points: 30, streak: 1, pl300Best: 80 },
      { solved: 0, points: 0, streak: 0, pl300Best: null },
      { solved: 5, points: 50, streak: 0, pl300Best: 61 },
    ]);
    expect(t).toEqual({ solved: 8, active: 2, avgPl300: 71 });
  });
});
