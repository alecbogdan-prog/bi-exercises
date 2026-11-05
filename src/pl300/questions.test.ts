import { describe, expect, it } from 'vitest';
import { DOMAINS, QUESTIONS, TESTS, isCorrect, questionById } from './questions';

describe('PL-300 practice questions', () => {
  it('have unique ids and valid answers', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) {
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
      expect(q.correct.length, q.id).toBeGreaterThan(0);
      for (const c of q.correct) expect(c, q.id).toBeLessThan(q.options.length);
      if (q.correct.length > 1) expect(q.prompt, q.id).toMatch(/Choose all that apply/);
      expect(q.explanation.length, q.id).toBeGreaterThan(20);
    }
  });

  it('every test covers every domain, and no question is used twice', () => {
    const used = TESTS.flatMap((t) => t.questionIds);
    expect(new Set(used).size).toBe(used.length);
    for (const t of TESTS) for (const d of DOMAINS) expect(t.questionIds.some((id) => questionById(id).domain === d.id), `${t.id} ${d.id}`).toBe(true);
  });

  it('scores exact answers only', () => {
    const multi = QUESTIONS.find((q) => q.correct.length > 1)!;
    expect(isCorrect(multi, multi.correct)).toBe(true);
    expect(isCorrect(multi, multi.correct.slice(0, 1))).toBe(false);
    expect(isCorrect(multi, [...multi.correct, 99])).toBe(false);
  });
});
