import { describe, expect, it } from 'vitest';
import { applyStep, evalFormula, runQuery, stepM, stepNames } from './query';
import type { Step } from './query';
import { rawSource, sourceTables } from './rawSources';

const S = sourceTables();
const supplier = rawSource('Supplier Orders').table;
const col = (t: { columns: { name: string }[]; rows: unknown[][] }, name: string) => t.rows.map((r) => r[t.columns.findIndex((c) => c.name === name)]);

describe('Power Query steps', () => {
  it('promotes headers, removes columns and changes types', () => {
    const t = runQuery(
      supplier,
      [{ op: 'promoteHeaders' }, { op: 'removeColumns', columns: ['Notes'] }, { op: 'changeType', columns: ['Qty'], type: 'int' }, { op: 'changeType', columns: ['Unit Cost'], type: 'decimal' }],
      S,
    );
    expect(t.columns.map((c) => c.name)).toEqual(['OrderRef', 'Supplier', 'Product Code', 'Qty', 'Unit Cost']);
    expect(t.columns[3].type).toBe('int');
    expect(col(t, 'Qty')[0]).toBe(20);
    expect(col(t, 'Unit Cost')[0]).toBe(290);
    expect(col(t, 'Qty')[4]).toBeNull(); // blank row → null after type change
  });
  it('removes blank rows and duplicates', () => {
    const base: Step[] = [{ op: 'promoteHeaders' }];
    expect(runQuery(supplier, [...base, { op: 'removeBlankRows' }], S).rows).toHaveLength(11);
    expect(runQuery(supplier, [...base, { op: 'removeBlankRows' }, { op: 'removeDuplicates' }], S).rows).toHaveLength(10);
  });
  it('cleans text: trim and capitalize each word', () => {
    const t = runQuery(supplier, [{ op: 'promoteHeaders' }, { op: 'transformText', columns: ['Supplier'], fn: 'trim' }, { op: 'transformText', columns: ['Supplier'], fn: 'proper' }], S);
    const names = new Set(col(t, 'Supplier').filter(Boolean));
    expect([...names].sort()).toEqual(['Northgear', 'Spoke & Co', 'Velo Parts']);
  });
  it('splits, replaces, filters', () => {
    const r = rawSource('Returns').table;
    const split = applyStep(r, { op: 'split', column: 'Product Code', delimiter: '-' }, S);
    expect(split.columns.map((c) => c.name)).toEqual(['ReturnID', 'Product Code.1', 'Product Code.2', 'Reason', 'Qty']);
    expect(col(split, 'Product Code.2')[0]).toBe('0003');
    const rep = applyStep(r, { op: 'replaceValues', columns: ['Reason'], find: 'N/A', replace: 'Unknown' }, S);
    expect(col(rep, 'Reason').filter((x) => x === 'Unknown')).toHaveLength(3);
    const f = applyStep(r, { op: 'filterRows', column: 'Reason', cond: 'notEquals', value: 'N/A' }, S);
    expect(f.rows).toHaveLength(7);
    expect(applyStep(r, { op: 'filterRows', column: 'Qty', cond: 'greaterThan', value: 1 }, S).rows).toHaveLength(3);
  });
  it('unpivots, groups, merges and appends', () => {
    const u = applyStep(rawSource('Store Targets').table, { op: 'unpivotOther', keep: ['Store'] }, S);
    expect(u.rows).toHaveLength(24);
    expect(u.columns.map((c) => c.name)).toEqual(['Store', 'Attribute', 'Value']);
    const g = applyStep(rawSource('Store Sales').table, { op: 'groupBy', by: ['Store'], aggs: [{ name: 'Total', op: 'sum', column: 'Amount' }, { name: 'Orders', op: 'count' }] }, S);
    const online = g.rows.find((r) => r[0] === 'Online')!;
    expect(online[1]).toBeCloseTo(2210 + 1675.25 + 455 + 3020.75 + 820, 6);
    expect(online[2]).toBe(5);
    const m = applyStep(rawSource('Returns').table, { op: 'merge', with: 'Product Lookup', leftKey: 'Product Code', rightKey: 'Product Code', expand: ['Product', 'Category'] }, S);
    expect(col(m, 'Category')[0]).toBe('Bikes');
    const a = applyStep(rawSource('Web Orders 2025').table, { op: 'append', with: 'Store Orders 2025' }, S);
    expect(a.rows).toHaveLength(9);
  });
  it('custom column formulas', () => {
    expect(evalFormula('[A] * [B]', (n) => (n === 'A' ? 3 : 2.5))).toBe(7.5);
    expect(evalFormula('= [A] & " - " & [B]', (n) => (n === 'A' ? 'x' : 'y'))).toBe('x - y');
    expect(() => evalFormula('[A] *', () => 1)).toThrow(/ended/);
  });
  it('errors look like Power Query errors', () => {
    expect(() => applyStep(supplier, { op: 'removeColumns', columns: ['Nope'] }, S)).toThrow(/wasn't found/);
  });
  it('names steps and writes M', () => {
    const steps: Step[] = [{ op: 'promoteHeaders' }, { op: 'changeType', columns: ['Qty'], type: 'int' }, { op: 'changeType', columns: ['Unit Cost'], type: 'decimal' }];
    expect(stepNames(steps)).toEqual(['Promoted Headers', 'Changed Type', 'Changed Type1']);
    expect(stepM(steps, 1, 'x.csv')).toBe('= Table.TransformColumnTypes(#"Promoted Headers",{{"Qty", Int64.Type}})');
    expect(stepM(steps, 0, 'x.csv')).toBe('= Table.PromoteHeaders(Source, [PromoteAllScalars=true])');
  });
});
