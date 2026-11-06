import { Engine } from '../engine/engine';
import { sampleModel } from '../engine/dataset';
import { DATASETS } from '../engine/datasets';
import type { DatasetId } from '../engine/datasets';

let engine: Engine | null = null;

/** Shared engine over the sample dataset (no measures). */
export function baseEngine(): Engine {
  if (!engine) engine = new Engine(sampleModel());
  return engine;
}

const themed = new Map<DatasetId, Engine>();

/** The engine an exercise or project runs on (the bike shop unless it picks a themed dataset). */
export function engineFor(ex: { dataset?: DatasetId }): Engine {
  if (!ex.dataset) return baseEngine();
  let e = themed.get(ex.dataset);
  if (!e) themed.set(ex.dataset, (e = new Engine(DATASETS[ex.dataset].build())));
  return e;
}

export const BRAND = 'Power BI Exercises';
