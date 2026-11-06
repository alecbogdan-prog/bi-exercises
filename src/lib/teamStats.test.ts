import { describe, expect, it } from 'vitest';
import { chapterProgress, memberStats, teamCsv, teamTotals } from './teamStats';

const now = new Date(2026, 10, 5, 12);

describe('memberStats', () => {
  it('counts solved exercises, points, streak and best PL-300 score', () => {
    const s = memberStats({ completed: ['a', 'b', 'b'], points: { awarded: { a: 10, b: 20 }, days: { '2026-11-05': 10, '2026-11-04': 20, '2026-11-02': 5 } }, pl300: { 'test-1': 60, 'test-2': 85 } }, now);
    expect(s).toEqual({ solved: 2, points: 30, streak: 2, pl300Best: 85 });
  });

  it('ignores the per-question answer history when picking the best PL-300 score', () => {
    expect(memberStats({ pl300: { 'test-1': 0.75, 'q:p1': 3_500_000_000_001 } }, now).pl300Best).toBe(0.75);
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


describe('chapterProgress', () => {
  const chapters = [{ id: 'dax', title: 'DAX' }, { id: 'pq', title: 'Power Query' }];
  const exercises = [{ id: 'd1', module: 'dax' }, { id: 'd2', module: 'dax' }, { id: 'd3', module: 'dax' }, { id: 'd4', module: 'dax' }, { id: 'p1', module: 'pq' }, { id: 'x', module: 'project' }];
  it('gives the solved share of each chapter', () => {
    expect(chapterProgress(['d1', 'd2', 'd3', 'p1', 'x', 'gone'], chapters, exercises).map((c) => [c.id, c.done, c.total, c.pct])).toEqual([
      ['dax', 3, 4, 75],
      ['pq', 1, 1, 100],
    ]);
  });
  it('is zero for a member who has not started', () => {
    expect(chapterProgress(undefined, chapters, exercises).every((c) => c.pct === 0)).toBe(true);
  });
});

describe('teamCsv', () => {
  it('writes a header, one row per member and quotes values with commas', () => {
    const csv = teamCsv([
      { email: 'ana@x.com', status: 'Joined', joined: '2026-11-05', lastActive: '2026-11-05', stats: { solved: 3, points: 30, streak: 1, pl300Best: 80 }, chapters: [{ id: 'dax', title: 'DAX, basics', done: 3, total: 4, pct: 75 }] },
    ]);
    const [h, r] = csv.split('\r\n');
    expect(h).toBe('Email,Status,Joined,Last active,Exercises solved,Points,Streak (days),PL-300 best (%),"DAX, basics (%)"');
    expect(r).toBe('ana@x.com,Joined,2026-11-05,2026-11-05,3,30,1,80,75');
  });
});
