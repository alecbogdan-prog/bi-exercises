import { describe, expect, it } from 'vitest';
import { Engine } from '../engine/engine';
import { buildModel } from '../engine/dataset';
import { autoUnits, emptySpec, formatTick, visualTitle } from '../engine/visual';
import { EXERCISES } from '../exercises/exercises';
import { addFilter, addToWell, autoAdd, setVisualType, wellsFor } from './workspace';

const engine = new Engine(buildModel());

describe('field wells', () => {
  it('uses the real well names', () => {
    expect(wellsFor('column').map((w) => w.label)).toEqual(['X-axis', 'Y-axis', 'Legend', 'Small multiples', 'Tooltips']);
    expect(wellsFor('bar').map((w) => w.label).slice(0, 2)).toEqual(['Y-axis', 'X-axis']);
    expect(wellsFor('table').map((w) => w.label)).toEqual(['Columns']);
    expect(wellsFor('card').map((w) => w.label)).toEqual(['Fields']);
  });
  it('table "Columns" well routes text to grouping and numbers to values', () => {
    let s = setVisualType(emptySpec(), 'table');
    s = addToWell(engine, s, 'columns', { kind: 'column', table: 'Product', column: 'Category' }).spec;
    s = addToWell(engine, s, 'columns', { kind: 'column', table: 'Sales', column: 'Quantity' }).spec;
    s = addToWell(engine, s, 'columns', { kind: 'measure', name: 'X' }).spec;
    expect(s.category).toEqual([{ table: 'Product', column: 'Category' }]);
    expect(s.values.map((v) => (v.kind === 'measure' ? v.name : v.column))).toEqual(['Quantity', 'X']);
  });
  it('ticking a field in a table uses the Columns well', () => {
    const s = autoAdd(engine, setVisualType(emptySpec(), 'table'), { kind: 'column', table: 'Date', column: 'Year' }).spec;
    expect(s.category).toEqual([{ table: 'Date', column: 'Year' }]);
  });
  it('unsupported wells and measures in axis wells give a message', () => {
    expect(addToWell(engine, emptySpec(), 'unsupported', { kind: 'measure', name: 'X' }).error).toMatch(/not available/);
    expect(addToWell(engine, emptySpec(), 'category', { kind: 'measure', name: 'X' }).error).toMatch(/Y-axis/);
  });
  it('filters remember their scope', () => {
    const s = addFilter(emptySpec(), { kind: 'column', table: 'Date', column: 'Year' }, 'page').spec;
    expect(s.filters[0]).toMatchObject({ table: 'Date', column: 'Year', scope: 'page', values: [] });
    const moved = addFilter(s, { kind: 'column', table: 'Date', column: 'Year' }, 'all').spec;
    expect(moved.filters).toHaveLength(1);
    expect(moved.filters[0].scope).toBe('all');
  });
});

describe('display units and titles', () => {
  it('picks units like the Auto display unit', () => {
    expect(autoUnits(950)).toEqual({ div: 1, suffix: '' });
    expect(autoUnits(1_800)).toEqual({ div: 1e3, suffix: 'K' });
    expect(autoUnits(1_007_351)).toEqual({ div: 1e6, suffix: 'M' });
    expect(formatTick(200_000, 'currency', autoUnits(600_000))).toBe('$200K');
    expect(formatTick(1_007_351.6, 'currency', autoUnits(1_007_351.6))).toBe('$1.01M');
    expect(formatTick(0.256, 'percent', autoUnits(1))).toBe('25.6%');
  });
  it('builds the automatic visual title', () => {
    const ex = EXERCISES.find((e) => e.id === 'stacked-column-color')!;
    expect(visualTitle(ex.solution.spec)).toBe('Sum of Quantity by Category and Color');
  });
});

describe('scenarios', () => {
  it('every exercise has a workplace request', () => {
    for (const e of EXERCISES) {
      expect(e.scenario, e.id).toBeTruthy();
      expect(e.scenario!.message.length).toBeGreaterThan(40);
    }
  });
});
