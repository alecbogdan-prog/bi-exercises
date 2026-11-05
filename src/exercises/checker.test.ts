import { describe, expect, it } from 'vitest';
import { Engine } from '../engine/engine';
import { buildModel } from '../engine/dataset';
import { checkExercise } from './checker';
import { EXERCISES, exerciseById } from './exercises';

const base = new Engine(buildModel());

describe('every exercise', () => {
  for (const ex of EXERCISES) {
    it(`${ex.id}: solution passes, starter fails`, () => {
      const sol = checkExercise(base, ex, ex.solution.spec, ex.solution.measures ?? [], ex.solution.columns ?? [], { steps: ex.solution.steps, relationships: ex.solution.relationships, report: ex.solution.report });
      expect(sol.messages).toEqual([]);
      expect(sol.ok).toBe(true);
      const start = checkExercise(base, ex, ex.starter, []);
      expect(start.ok).toBe(false);
      expect(start.messages.length).toBeGreaterThan(0);
    }, 30_000); // per-order iterators evaluate a measure for every order, which is slow in the test engine
  }
});

describe('alternative solutions', () => {
  const dax = (id: string, name: string, expression: string) => {
    const ex = exerciseById(id)!;
    return checkExercise(base, ex, ex.solution.spec, [{ name, table: 'Sales', expression }]);
  };
  it('accepts equivalent formulas', () => {
    expect(dax('calc-big-orders', 'Large Lines', 'COUNTROWS(FILTER(Sales, Sales[Sales Amount] > 500))').ok).toBe(true);
    expect(dax('time-last-year', 'Sales LY', "CALCULATE([Total Sales], DATEADD('Date'[Date], -1, YEAR))").ok).toBe(true);
    expect(dax('time-ytd', 'Sales YTD', "CALCULATE([Total Sales], DATESYTD('Date'[Date]))").ok).toBe(true);
    expect(dax('dax-total-sales', 'total sales', 'SUM(Sales[Sales Amount])').ok).toBe(true);
  });
  it('rejects wrong formulas with a helpful message', () => {
    const r = dax('calc-percent-of-total', '% of Total', 'DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Product[Color])))');
    expect(r.ok).toBe(false);
    expect(r.messages[0]).toMatch(/expected value/);
    const n = dax('dax-order-count', 'Order Count', 'DISTINCTCOUNT(Sales[OrderID])');
    expect(n.messages[0]).toMatch(/Name your measure exactly "Orders"/);
    const fn = dax('dax-order-count', 'Orders', 'COUNTROWS(Sales)');
    expect(fn.ok).toBe(false);
  });
  it('report: wrong type and missing filter', () => {
    const ex = exerciseById('filter-year-2025')!;
    const noFilter = { ...ex.solution.spec, filters: [] };
    expect(checkExercise(base, ex, noFilter, []).messages[0]).toMatch(/filters/);
    const bar = { ...ex.solution.spec, type: 'bar' as const };
    expect(checkExercise(base, ex, bar, []).messages[0]).toMatch(/Stacked column chart/);
  });
  it('report: measure instead of implicit sum is accepted', () => {
    const ex = exerciseById('column-sales-by-category')!;
    const spec = { ...ex.solution.spec, values: [{ kind: 'measure' as const, name: 'TS' }] };
    expect(checkExercise(base, ex, spec, [{ name: 'TS', table: 'Sales', expression: 'SUM(Sales[Sales Amount])' }]).ok).toBe(true);
  });
});

describe('second batch: alternatives and feedback', () => {
  const ex = (id: string) => exerciseById(id)!;
  it('calculated columns: equivalent formulas pass, wrong table/name explained', () => {
    const e = ex('col-price-band');
    const ok = checkExercise(base, e, e.solution.spec, [], [{ table: 'Product', name: 'Price Band', expression: 'IF(Product[List Price] < 500, "Standard", "Premium")' }]);
    expect(ok.ok).toBe(true);
    const wrongTable = checkExercise(base, e, e.solution.spec, [], [{ table: 'Sales', name: 'Price Band', expression: '"x"' }]);
    expect(wrongTable.messages[0]).toMatch(/must be created in the Product table/);
    const wrongVal = checkExercise(base, e, e.solution.spec, [], [{ table: 'Product', name: 'Price Band', expression: 'IF(Product[List Price] > 1000, "Premium", "Standard")' }]);
    expect(wrongVal.ok).toBe(false);
    expect(wrongVal.messages[0]).toMatch(/expected value/);
  });
  it('Half column accepts MonthNum or MONTH()', () => {
    const e = ex('col-half');
    expect(checkExercise(base, e, e.solution.spec, [], [{ table: 'Date', name: 'Half', expression: 'IF(\'Date\'[MonthNum] <= 6, "H1", "H2")' }]).ok).toBe(true);
  });
  it('sorting and formatting are required only where they are the topic', () => {
    const e = ex('bar-sort-alphabetical');
    const noSort = { ...e.solution.spec, sort: undefined };
    expect(checkExercise(base, e, noSort, []).messages[0]).toMatch(/Sort the visual by State, ascending/);
    const t = ex('custom-title');
    expect(checkExercise(base, t, { ...t.solution.spec, format: { titleText: '  revenue BY year ' } }, []).ok).toBe(true);
    expect(checkExercise(base, t, { ...t.solution.spec, format: {} }, []).messages[0]).toMatch(/Revenue by Year/);
  });
  it('slicer exercises need a slicer, not just a visual filter', () => {
    const e = ex('slicer-year');
    const viaFilter = { ...e.solution.spec, slicers: [], filters: [{ table: 'Date', column: 'Year', values: [2025] }] };
    expect(checkExercise(base, e, viaFilter, []).messages[0]).toMatch(/Add a slicer/);
  });
  it('top N: without the filter the numbers do not match', () => {
    const e = ex('topn-products');
    expect(checkExercise(base, e, { ...e.solution.spec, filters: [] }, []).ok).toBe(false);
  });
  it('DAX alternatives', () => {
    const d = (id: string, name: string, expression: string) => checkExercise(base, ex(id), ex(id).solution.spec, [{ name, table: 'Sales', expression }]);
    expect(d('dax-var-margin', 'Margin %', 'VAR s = [Total Sales] VAR c = [Total Cost] RETURN DIVIDE(s - c, s)').ok).toBe(true);
    expect(d('dax-var-margin', 'Margin %', 'DIVIDE([Total Sales] - [Total Cost], [Total Sales])').messages[0]).toMatch(/VAR/);
    expect(d('time-prev-month', 'Sales PM', "CALCULATE([Total Sales], DATEADD('Date'[Date], -1, MONTH))").ok).toBe(true);
    expect(d('calc-pct-category', '% of Category', 'DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Product[Product])))').ok).toBe(true);
    expect(d('dax-big-customers', 'Big Customers', 'COUNTROWS(FILTER(VALUES(Customer[CustomerID]), [Total Sales] > 25000))').ok).toBe(true);
    expect(d('dax-rankx', 'Product Rank', 'RANKX(ALL(Product), [Total Sales])').ok).toBe(true);
    expect(d('dax-rankx', 'Product Rank', 'RANKX(Product, [Total Sales])').ok).toBe(false);
  });
});

describe('third batch: feedback', () => {
  const ex = (id: string) => exerciseById(id)!;
  it('Power Query: explains missing columns, types and extra rows', () => {
    const e = ex('pq-types');
    const r1 = checkExercise(base, e, e.starter, [], [], { steps: e.query!.starterSteps });
    expect(r1.messages.join(' ')).toMatch(/Order ID/);
    const r2 = checkExercise(base, e, e.starter, [], [], { steps: [...e.query!.starterSteps!, { op: 'rename', from: 'OrderRef', to: 'Order ID' }] });
    expect(r2.messages.join(' ')).toMatch(/data type of 'Qty' to Whole Number/);
    const d = ex('pq-duplicates');
    expect(checkExercise(base, d, d.starter, [], [], { steps: d.query!.starterSteps }).messages[0]).toMatch(/1 row too many/);
    const bad = checkExercise(base, d, d.starter, [], [], { steps: [{ op: 'removeColumns', columns: ['Nope'] }] });
    expect(bad.messages[0]).toMatch(/has an error/);
  });
  it('Power Query: equivalent step orders pass', () => {
    const e = ex('pq-clean-text');
    const alt = [...e.query!.starterSteps!, { op: 'transformText' as const, columns: ['Supplier'], fn: 'proper' as const }, { op: 'transformText' as const, columns: ['Supplier'], fn: 'trim' as const }];
    expect(checkExercise(base, e, e.starter, [], [], { steps: alt }).ok).toBe(true);
  });
  it('modeling: missing and backwards relationships', () => {
    const e = ex('model-fix-direction');
    const start = checkExercise(base, e, e.solution.spec, [], [], { relationships: e.starterRelationships });
    expect(start.messages[0]).toMatch(/wrong direction/);
    const m = ex('model-sales-product');
    expect(checkExercise(base, m, m.solution.spec, [], []).messages[0]).toMatch(/Create a relationship between Sales\[ProductID\]/);
  });
  it('drill-down and conditional formatting are required', () => {
    const d = ex('drill-quarters');
    expect(checkExercise(base, d, { ...d.solution.spec, drill: undefined }, []).ok).toBe(false);
    const c = ex('cf-databars');
    expect(checkExercise(base, c, { ...c.solution.spec, format: {} }, []).messages[0]).toMatch(/Data bars/);
  });
});
