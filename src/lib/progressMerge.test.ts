import { describe, expect, it } from 'vitest';
import { emptySnapshot, mergeProgress, sameProgress } from './progressMerge';

describe('mergeProgress', () => {
  it('keeps everything from both devices', () => {
    const local = { ...emptySnapshot(), completed: ['a', 'b'], work: { a: { x: 1 } }, pl300: { 'test-1': 60 }, points: { awarded: { a: 10 }, days: { '2026-11-05': 10 } } };
    const remote = { completed: ['b', 'c'], work: { c: { y: 2 } }, pl300: { 'test-1': 80, 'test-2': 50 }, points: { awarded: { c: 20 }, days: { '2026-11-04': 20, '2026-11-05': 5 } } };
    const m = mergeProgress(local, remote);
    expect(m.completed.sort()).toEqual(['a', 'b', 'c']);
    expect(m.work).toEqual({ a: { x: 1 }, c: { y: 2 } });
    expect(m.pl300).toEqual({ 'test-1': 80, 'test-2': 50 });
    expect(m.points.awarded).toEqual({ a: 10, c: 20 });
    expect(m.points.days).toEqual({ '2026-11-04': 20, '2026-11-05': 10 });
  });

  it('prefers this device for work saved on both', () => {
    const m = mergeProgress({ ...emptySnapshot(), work: { a: 'local' } }, { work: { a: 'remote' } });
    expect(m.work.a).toBe('local');
  });

  it('handles an empty or partial account copy', () => {
    const local = { ...emptySnapshot(), completed: ['a'] };
    expect(mergeProgress(local, null)).toBe(local);
    expect(mergeProgress(local, {}).completed).toEqual(['a']);
  });

  it('compares snapshots regardless of order', () => {
    const a = { ...emptySnapshot(), completed: ['x', 'y'] };
    const b = { ...emptySnapshot(), completed: ['y', 'x'] };
    expect(sameProgress(a, b)).toBe(true);
  });
});
