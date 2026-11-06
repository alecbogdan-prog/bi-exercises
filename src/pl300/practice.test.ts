import { describe, expect, it } from 'vitest';
import { mergeProgress, emptySnapshot } from '../lib/progressMerge';
import { QUESTIONS } from './questions';
import { REVIEW_MAX, REVIEW_MIN, chapterLinks, domainStats, reviewQuestions } from './practice';

const ids = (domain: string, n: number) => QUESTIONS.filter((x) => x.domain === domain && !x.caseId).slice(0, n).map((x) => x.id);

describe('weak-topic review', () => {
  it('scores each domain from the last answers', () => {
    const last: Record<string, boolean> = {};
    for (const id of ids('prepare', 4)) last[id] = true;
    for (const [i, id] of ids('model', 4).entries()) last[id] = i === 0;
    const stats = domainStats(last);
    expect(stats.find((s) => s.domain === 'prepare')).toMatchObject({ answered: 4, right: 4, rate: 1 });
    expect(stats.find((s) => s.domain === 'model')).toMatchObject({ answered: 4, right: 1, rate: 0.25 });
    expect(stats.find((s) => s.domain === 'manage')?.rate).toBeNull();
  });

  it('puts missed questions first, weakest domain first, and tops up from the weakest domain', () => {
    const last: Record<string, boolean> = {};
    const [p1, p2] = ids('prepare', 2);
    last[p1] = false; // prepare: 50%
    last[p2] = true;
    for (const id of ids('model', 3)) last[id] = false; // model: 0%
    const queue = reviewQuestions(last);
    expect(queue.slice(0, 3).every((x) => x.domain === 'model')).toBe(true);
    expect(queue[3].id).toBe(p1);
    expect(queue).toHaveLength(REVIEW_MIN);
    expect(queue.slice(4).every((x) => x.domain === 'model' && !(x.id in last))).toBe(true);
  });

  it('caps the review and returns nothing before any test', () => {
    const last = Object.fromEntries(QUESTIONS.map((x) => [x.id, false]));
    expect(reviewQuestions(last)).toHaveLength(REVIEW_MAX);
    expect(reviewQuestions({})).toEqual([]);
  });

  it('links each domain to hands-on chapters, except the service-only one', () => {
    expect(chapterLinks('prepare').length).toBeGreaterThan(0);
    expect(chapterLinks('model').length).toBeGreaterThan(0);
    expect(chapterLinks('manage')).toEqual([]);
  });

  it('keeps the latest answer when two devices are merged', () => {
    const wrongEarlier = 1000 * 2 + 0;
    const rightLater = 2000 * 2 + 1;
    const wrongLatest = 3000 * 2 + 0;
    const a = { ...emptySnapshot(), pl300: { 'q:p1': rightLater } };
    expect(mergeProgress(a, { pl300: { 'q:p1': wrongEarlier } }).pl300['q:p1'] % 2).toBe(1);
    expect(mergeProgress(a, { pl300: { 'q:p1': wrongLatest } }).pl300['q:p1'] % 2).toBe(0);
  });
});
