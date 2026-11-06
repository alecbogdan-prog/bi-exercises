import { describe, expect, it } from 'vitest';
import { CASES, DOMAINS, QUESTIONS, TESTS, isCorrect, questionById, scaledScore } from './questions';

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

  it('has four 40-question tests, weighted like the exam, each ending with a case study', () => {
    expect(TESTS).toHaveLength(4);
    expect(TESTS.filter((t) => t.free).map((t) => t.id)).toEqual(['test-1']);
    for (const t of TESTS) {
      expect(t.questionIds, t.id).toHaveLength(40);
      const qs = t.questionIds.map(questionById);
      const count = (d: string) => qs.filter((x) => x.domain === d && !x.caseId).length;
      expect([count('prepare'), count('model'), count('visualize'), count('manage')], t.id).toEqual([10, 10, 9, 6]);
      const tail = qs.slice(-5);
      expect(tail.every((x) => x.caseId === t.caseId), t.id).toBe(true);
    }
  });

  it('every case study has a scenario and five questions, and every case question points to a case', () => {
    for (const c of CASES) {
      expect(c.scenario.length, c.id).toBeGreaterThan(0);
      expect(QUESTIONS.filter((x) => x.caseId === c.id), c.id).toHaveLength(5);
    }
    for (const x of QUESTIONS.filter((x) => x.caseId)) expect(CASES.some((c) => c.id === x.caseId), x.id).toBe(true);
  });

  it('options are unique within a question', () => {
    for (const x of QUESTIONS) expect(new Set(x.options).size, x.id).toBe(x.options.length);
  });

  it('scales scores like the exam: 70% is 700, never below 100', () => {
    expect(scaledScore(0.7)).toBe(700);
    expect(scaledScore(1)).toBe(1000);
    expect(scaledScore(0)).toBe(100);
  });

  it('scores exact answers only', () => {
    const multi = QUESTIONS.find((q) => q.correct.length > 1)!;
    expect(isCorrect(multi, multi.correct)).toBe(true);
    expect(isCorrect(multi, multi.correct.slice(0, 1))).toBe(false);
    expect(isCorrect(multi, [...multi.correct, 99])).toBe(false);
  });
});
