import { Engine } from '../engine/engine';
import { sampleModel } from '../engine/dataset';
import { festivalModel } from '../engine/festival';

let engine: Engine | null = null;

/** Shared engine over the sample dataset (no measures). */
export function baseEngine(): Engine {
  if (!engine) engine = new Engine(sampleModel());
  return engine;
}

let festival: Engine | null = null;

/** Shared engine over the themed Pinewave Festival dataset. */
export function festivalEngine(): Engine {
  if (!festival) festival = new Engine(festivalModel());
  return festival;
}

/** The engine an exercise runs on (bike shop unless the exercise picks another dataset). */
export function engineFor(ex: { dataset?: 'festival' }): Engine {
  return ex.dataset === 'festival' ? festivalEngine() : baseEngine();
}

export const BRAND = 'Power BI Exercises';
