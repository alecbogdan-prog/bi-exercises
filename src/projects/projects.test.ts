import { describe, expect, it } from 'vitest';
import { checkExercise } from '../exercises/checker';
import { EXERCISES } from '../exercises/exercises';
import { baseEngine } from '../lib/base';
import { PROJECTS, PROJECT_STEPS, dashboardTiles } from './projects';

const base = baseEngine();

describe('projects', () => {
  for (const ex of PROJECT_STEPS) {
    it(`${ex.id}: solution passes, starter fails`, () => {
      const sol = checkExercise(base, ex, ex.solution.spec, ex.solution.measures ?? [], ex.solution.columns ?? [], { steps: ex.solution.steps, relationships: ex.solution.relationships });
      expect(sol.messages).toEqual([]);
      expect(sol.ok).toBe(true);
      const start = checkExercise(base, ex, ex.starter, []);
      expect(start.ok).toBe(false);
    }, 30_000);
  }

  it('step ids are unique and never clash with exercises', () => {
    const ids = [...EXERCISES.map((e) => e.id), ...PROJECT_STEPS.map((e) => e.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every project has a scenario on every step and dashboard tiles', () => {
    for (const p of PROJECTS) {
      expect(p.steps.every((s) => s.scenario && s.project === p.id)).toBe(true);
      expect(dashboardTiles(p).length).toBeGreaterThanOrEqual(4);
    }
  });
});
