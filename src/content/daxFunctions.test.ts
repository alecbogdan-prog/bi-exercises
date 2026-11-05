import { describe, expect, it } from 'vitest';
import engineSrc from '../engine/engine.ts?raw';
import { DAX_CATEGORIES, DAX_FUNCTIONS, argumentsOf, exercisesByFunction, functionsIn } from './daxFunctions';

const supported = new Set([...engineSrc.matchAll(/case '([A-Z][A-Z0-9_.]*)'/g)].map((m) => m[1]));

describe('DAX functions list', () => {
  it('only lists functions the engine supports, once each', () => {
    const names = DAX_FUNCTIONS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((n) => !supported.has(n))).toEqual([]);
  });

  it('lists every function used in an exercise solution', () => {
    const listed = new Set(DAX_FUNCTIONS.map((f) => f.name));
    expect([...exercisesByFunction().keys()].filter((n) => !listed.has(n))).toEqual([]);
  });

  it('every listed function has at least one exercise', () => {
    const practice = exercisesByFunction();
    expect(DAX_FUNCTIONS.filter((f) => !practice.has(f.name)).map((f) => f.name)).toEqual([]);
  });

  it('every category has functions', () => {
    for (const c of DAX_CATEGORIES) expect(DAX_FUNCTIONS.some((f) => f.category === c.id)).toBe(true);
  });

  it('finds function calls but ignores text inside strings', () => {
    expect(functionsIn('CALCULATE([Sales], FILTER(Sales, Sales[X] = "SUM(1)"))').sort()).toEqual(['CALCULATE', 'FILTER']);
  });
});

describe('function arguments', () => {
  it('every argument has a description', () => {
    const missing = DAX_FUNCTIONS.flatMap((f) => argumentsOf(f).filter((a) => !a.description).map((a) => `${f.name}:${a.name}`));
    expect(missing).toEqual([]);
  });
  it('reads required and optional arguments', () => {
    const calc = argumentsOf(DAX_FUNCTIONS.find((f) => f.name === 'CALCULATE')!);
    expect(calc.map((a) => [a.name, a.optional])).toEqual([
      ['expression', false],
      ['filter1', true],
    ]);
  });
});
