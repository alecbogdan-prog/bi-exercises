import { Engine } from '../engine/engine';
import { sampleModel } from '../engine/dataset';

let engine: Engine | null = null;

/** Shared engine over the sample dataset (no measures). */
export function baseEngine(): Engine {
  if (!engine) engine = new Engine(sampleModel());
  return engine;
}

export const BRAND = 'Power BI Exercises';
