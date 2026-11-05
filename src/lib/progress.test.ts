import { beforeEach, describe, expect, it } from 'vitest';
import { awardPoints, stats } from './storage';

class MemoryStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

describe('points and streaks', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });
  it('awards each exercise once and counts points per day', () => {
    const d1 = new Date(2026, 10, 2, 10);
    expect(awardPoints('a', 150, d1)).toBe(150);
    expect(awardPoints('a', 150, d1)).toBe(0);
    expect(awardPoints('b', 100, d1)).toBe(100);
    expect(stats(d1)).toEqual({ total: 250, today: 250, streak: 1 });
  });
  it('counts consecutive days ending today', () => {
    awardPoints('a', 100, new Date(2026, 10, 1, 9));
    awardPoints('b', 100, new Date(2026, 10, 2, 9));
    awardPoints('c', 100, new Date(2026, 10, 3, 9));
    expect(stats(new Date(2026, 10, 3, 20)).streak).toBe(3);
    expect(stats(new Date(2026, 10, 5, 20)).streak).toBe(0);
  });
});
