import { describe, expect, it } from 'vitest';
import { Engine } from './engine';
import { buildModel } from './dataset';
import type { Row } from './model';
import { parseDax, splitMeasureDefinition } from './parser';

const model = buildModel();
const base = new Engine(model);
const sales = model.tables.find((t) => t.name === 'Sales')!.rows;
const products = new Map(model.tables.find((t) => t.name === 'Product')!.rows.map((r) => [r.ProductID, r]));
const customers = new Map(model.tables.find((t) => t.name === 'Customer')!.rows.map((r) => [r.CustomerID, r]));

const amt = (rows: Row[]) => rows.reduce((s, r) => s + (r['Sales Amount'] as number), 0);
const prod = (r: Row) => products.get(r.ProductID)!;
const year = (r: Row) => Number(String(r['Order Date']).slice(0, 4));

const eng = base.withMeasures([
  { name: 'Total Sales', table: 'Sales', expression: "SUM(Sales[Sales Amount])" },
  { name: 'Orders', table: 'Sales', expression: 'DISTINCTCOUNT(Sales[OrderID])' },
  { name: 'AOV', table: 'Sales', expression: 'DIVIDE([Total Sales], [Orders])' },
]);

const byCategory = (cat: string) => [eng.equalityFilter('Product', 'Category', [cat])];
const byYear = (y: number) => [eng.equalityFilter('Date', 'Year', [y])];

describe('parser', () => {
  it('parses precedence', () => {
    expect(base.evaluate('1 + 2 * 3')).toBe(7);
    expect(base.evaluate('(1 + 2) * 3')).toBe(9);
    expect(base.evaluate('-2 ^ 2')).toBe(-4);
    expect(base.evaluate('"a" & "b" = "ab"')).toBe(true);
    expect(base.evaluate('1 < 2 && 2 < 1 || TRUE()')).toBe(true);
    expect(base.evaluate('3 IN {1, 2, 3}')).toBe(true);
  });
  it('splits measure definitions', () => {
    expect(splitMeasureDefinition('Total Sales = SUM(Sales[Sales Amount])')).toEqual({
      name: 'Total Sales',
      expression: 'SUM(Sales[Sales Amount])',
    });
  });
  it('reports friendly errors', () => {
    expect(() => parseDax('SUM(Sales[Sales Amount]')).toThrow(/Expected "\)"/);
    expect(() => base.evaluate('Sales[Sales Amount]')).toThrow(/single value/);
    expect(() => base.evaluate('SUM(Sales[Nope])')).toThrow(/cannot be found/);
    expect(() => base.evaluate('FOO(1)')).toThrow(/not supported/);
  });
});

describe('aggregations and relationships', () => {
  it('SUM over all rows', () => {
    expect(eng.evaluateMeasure('Total Sales')).toBeCloseTo(amt(sales), 6);
  });
  it('filters propagate from dimension to fact', () => {
    const exp = amt(sales.filter((r) => prod(r).Category === 'Bikes'));
    expect(eng.evaluateMeasure('Total Sales', byCategory('Bikes'))).toBeCloseTo(exp, 6);
  });
  it('date table filters work', () => {
    expect(eng.evaluateMeasure('Total Sales', byYear(2025))).toBeCloseTo(amt(sales.filter((r) => year(r) === 2025)), 6);
  });
  it('COUNTROWS and DISTINCTCOUNT', () => {
    expect(eng.evaluate('COUNTROWS(Sales)')).toBe(sales.length);
    expect(eng.evaluateMeasure('Orders')).toBe(new Set(sales.map((r) => r.OrderID)).size);
  });
  it('measure referencing measures', () => {
    const exp = amt(sales) / new Set(sales.map((r) => r.OrderID)).size;
    expect(eng.evaluateMeasure('AOV')).toBeCloseTo(exp, 6);
  });
  it('blank when no rows', () => {
    const ctx = [eng.equalityFilter('Product', 'Category', ['Nothing'])];
    expect(eng.evaluateMeasure('Total Sales', ctx)).toBeNull();
    expect(eng.evaluate('DIVIDE(1, 0)')).toBeNull();
    expect(eng.evaluate('DIVIDE(1, 0, -1)')).toBe(-1);
  });
});

describe('iterators', () => {
  it('SUMX with RELATED', () => {
    const exp = sales.reduce((s, r) => s + (r.Quantity as number) * (prod(r)['Unit Cost'] as number), 0);
    expect(eng.evaluate("SUMX(Sales, Sales[Quantity] * RELATED(Product[Unit Cost]))")).toBeCloseTo(exp, 6);
  });
  it('AVERAGEX over VALUES with context transition', () => {
    const perCustomer = new Map<unknown, number>();
    for (const r of sales) perCustomer.set(r.CustomerID, (perCustomer.get(r.CustomerID) ?? 0) + (r['Sales Amount'] as number));
    const custNames = new Map<string, number>();
    for (const [id, v] of perCustomer) {
      const n = customers.get(id as number)!.Customer as string;
      custNames.set(n, (custNames.get(n) ?? 0) + v);
    }
    const exp = [...custNames.values()].reduce((a, b) => a + b, 0) / custNames.size;
    expect(eng.evaluate('AVERAGEX(VALUES(Customer[Customer]), [Total Sales])')).toBeCloseTo(exp, 6);
  });
  it('FILTER inside COUNTROWS', () => {
    expect(eng.evaluate('COUNTROWS(FILTER(Sales, Sales[Sales Amount] > 500))')).toBe(
      sales.filter((r) => (r['Sales Amount'] as number) > 500).length,
    );
  });
  it('RELATED without row context errors', () => {
    expect(() => eng.evaluate('RELATED(Product[Color])')).toThrow(/row context/);
  });
});

describe('CALCULATE', () => {
  it('boolean filter', () => {
    const exp = amt(sales.filter((r) => prod(r).Color === 'Red'));
    expect(eng.evaluate('CALCULATE([Total Sales], Product[Color] = "Red")')).toBeCloseTo(exp, 6);
  });
  it('boolean filter overrides existing filter on same column', () => {
    const ctx = [eng.equalityFilter('Product', 'Color', ['Black'])];
    const exp = amt(sales.filter((r) => prod(r).Color === 'Red'));
    expect(eng.evaluate('CALCULATE([Total Sales], Product[Color] = "Red")', ctx)).toBeCloseTo(exp, 6);
  });
  it('boolean filter intersects filters on other columns', () => {
    const exp = amt(sales.filter((r) => prod(r).Color === 'Red' && prod(r).Category === 'Bikes'));
    expect(eng.evaluate('CALCULATE([Total Sales], Product[Color] = "Red")', byCategory('Bikes'))).toBeCloseTo(exp, 6);
  });
  it('KEEPFILTERS intersects instead of replacing', () => {
    const ctx = [eng.equalityFilter('Product', 'Color', ['Black'])];
    expect(eng.evaluate('CALCULATE([Total Sales], KEEPFILTERS(Product[Color] = "Red"))', ctx)).toBeNull();
  });
  it('ALL removes filters (percent of total)', () => {
    const exp = amt(sales.filter((r) => prod(r).Category === 'Bikes')) / amt(sales);
    expect(
      eng.evaluate('DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Product)))', byCategory('Bikes')),
    ).toBeCloseTo(exp, 9);
    expect(eng.evaluate('CALCULATE([Total Sales], ALL(Product[Category]))', byCategory('Bikes'))).toBeCloseTo(amt(sales), 6);
    expect(eng.evaluate('CALCULATE([Total Sales], REMOVEFILTERS())', byCategory('Bikes'))).toBeCloseTo(amt(sales), 6);
  });
  it('ALL(Sales) removes filters on related dimensions', () => {
    expect(eng.evaluate('CALCULATE([Total Sales], ALL(Sales))', byCategory('Bikes'))).toBeCloseTo(amt(sales), 6);
  });
  it('FILTER table argument', () => {
    const exp = amt(sales.filter((r) => (r.Quantity as number) >= 3));
    expect(eng.evaluate('CALCULATE([Total Sales], FILTER(Sales, Sales[Quantity] >= 3))')).toBeCloseTo(exp, 6);
  });
  it('IN list filter', () => {
    const exp = amt(sales.filter((r) => ['CA', 'TX'].includes(customers.get(r.CustomerID as number)!.State as string)));
    expect(eng.evaluate('CALCULATE([Total Sales], Customer[State] IN {"CA", "TX"})')).toBeCloseTo(exp, 6);
  });
  it('multi-table boolean filter errors', () => {
    expect(() => eng.evaluate('CALCULATE([Total Sales], Product[Color] = Customer[State])')).toThrow(/one table/);
  });
});

describe('time intelligence', () => {
  const monthCtx = (ym: string) => [eng.equalityFilter('Date', 'Year Month', [ym])];
  it('TOTALYTD', () => {
    const exp = amt(sales.filter((r) => String(r['Order Date']) >= '2025-01-01' && String(r['Order Date']) <= '2025-03-31'));
    expect(eng.evaluate("TOTALYTD([Total Sales], 'Date'[Date])", monthCtx('2025-03'))).toBeCloseTo(exp, 6);
    expect(eng.evaluate("CALCULATE([Total Sales], DATESYTD('Date'[Date]))", monthCtx('2025-03'))).toBeCloseTo(exp, 6);
  });
  it('SAMEPERIODLASTYEAR', () => {
    const exp = amt(sales.filter((r) => String(r['Order Date']).startsWith('2024-03')));
    expect(eng.evaluate("CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))", monthCtx('2025-03'))).toBeCloseTo(exp, 6);
    expect(eng.evaluate("CALCULATE([Total Sales], DATEADD('Date'[Date], -1, YEAR))", monthCtx('2025-03'))).toBeCloseTo(exp, 6);
  });
  it('PREVIOUSMONTH and DATEADD month', () => {
    const exp = amt(sales.filter((r) => String(r['Order Date']).startsWith('2025-02')));
    expect(eng.evaluate("CALCULATE([Total Sales], PREVIOUSMONTH('Date'[Date]))", monthCtx('2025-03'))).toBeCloseTo(exp, 6);
    expect(eng.evaluate("CALCULATE([Total Sales], DATEADD('Date'[Date], -1, MONTH))", monthCtx('2025-03'))).toBeCloseTo(exp, 6);
  });
  it('date filter replaces other Date table filters', () => {
    const ctx = [eng.equalityFilter('Date', 'Year', [2025]), eng.equalityFilter('Date', 'Month', ['Mar'])];
    const exp = amt(sales.filter((r) => String(r['Order Date']).startsWith('2024-03')));
    expect(eng.evaluate("CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))", ctx)).toBeCloseTo(exp, 6);
  });
});

describe('logical and misc', () => {
  it('IF / SWITCH / SELECTEDVALUE', () => {
    expect(eng.evaluate('IF(1 > 2, "a", "b")')).toBe('b');
    expect(eng.evaluate('SWITCH(2, 1, "one", 2, "two", "other")')).toBe('two');
    expect(eng.evaluate('SWITCH(TRUE(), 1 > 2, "x", "else")')).toBe('else');
    expect(eng.evaluate('SELECTEDVALUE(Product[Category], "Many")', byCategory('Bikes'))).toBe('Bikes');
    expect(eng.evaluate('SELECTEDVALUE(Product[Category], "Many")')).toBe('Many');
  });
  it('detects circular measures', () => {
    const e = base.withMeasures([
      { name: 'A', table: 'Sales', expression: '[B]' },
      { name: 'B', table: 'Sales', expression: '[A]' },
    ]);
    expect(() => e.evaluateMeasure('A')).toThrow(/circular/);
  });
});

describe('VAR / RETURN', () => {
  it('evaluates variables once in their definition context', () => {
    expect(eng.evaluate('VAR a = 2 VAR b = a * 3 RETURN a + b')).toBe(8);
    const exp = amt(sales.filter((r) => prod(r).Category === 'Bikes')) / amt(sales);
    expect(
      eng.evaluate('VAR s = [Total Sales] VAR allS = CALCULATE([Total Sales], ALL(Product)) RETURN DIVIDE(s, allS)', byCategory('Bikes')),
    ).toBeCloseTo(exp, 9);
  });
  it('keeps variables visible inside CALCULATE and iterators', () => {
    expect(eng.evaluate('VAR t = 500 RETURN CALCULATE(COUNTROWS(Sales), FILTER(Sales, Sales[Sales Amount] > t))')).toBe(
      sales.filter((r) => (r['Sales Amount'] as number) > 500).length,
    );
  });
  it('reports a missing RETURN', () => {
    expect(() => eng.evaluate('VAR a = 1')).toThrow(/RETURN/);
  });
});

describe('RANKX', () => {
  const productRank = (name: string) =>
    eng.evaluate('RANKX(ALL(Product[Product]), [Total Sales])', [eng.equalityFilter('Product', 'Product', [name])]);
  it('ranks products by sales (1 = best)', () => {
    const totals = new Map<string, number>();
    for (const r of sales) totals.set(prod(r).Product as string, (totals.get(prod(r).Product as string) ?? 0) + (r['Sales Amount'] as number));
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    expect(productRank(sorted[0][0])).toBe(1);
    expect(productRank(sorted[3][0])).toBe(4);
    expect(eng.evaluate('RANKX(ALL(Product[Product]), [Total Sales], , ASC)', [eng.equalityFilter('Product', 'Product', [sorted[0][0]])])).toBe(sorted.length);
  });
});

describe('calculated columns', () => {
  it('adds columns evaluated row by row, usable in filters and RELATED', () => {
    const e2 = eng.withColumns([
      { table: 'Product', name: 'Price Band', expression: 'IF(Product[List Price] >= 500, "Premium", "Standard")' },
      { table: 'Sales', name: 'Margin', expression: 'Sales[Sales Amount] - Sales[Quantity] * RELATED(Product[Unit Cost])' },
      { table: 'Sales', name: 'Band', expression: 'RELATED(Product[Price Band])' },
    ]);
    const prem = amt(sales.filter((r) => (prod(r)['List Price'] as number) >= 500));
    expect(e2.evaluateMeasure('Total Sales', [e2.equalityFilter('Product', 'Price Band', ['Premium'])])).toBeCloseTo(prem, 6);
    const margin = sales.reduce((s, r) => s + (r['Sales Amount'] as number) - (r.Quantity as number) * (prod(r)['Unit Cost'] as number), 0);
    expect(e2.evaluate('SUM(Sales[Margin])')).toBeCloseTo(margin, 6);
    expect(e2.column('Sales', 'Margin')?.calculated).toBe(true);
    expect(e2.evaluate('COUNTROWS(FILTER(Sales, Sales[Band] = "Premium"))')).toBe(sales.filter((r) => (prod(r)['List Price'] as number) >= 500).length);
  });
  it('rejects duplicate names and bad formulas', () => {
    expect(() => eng.withColumns([{ table: 'Product', name: 'Color', expression: '1' }])).toThrow(/already has/);
    expect(() => eng.withColumns([{ table: 'Product', name: 'X', expression: 'Sales[Quantity]' }])).toThrow(/single value/);
  });
});

describe('visual features', () => {
  it('Top N keeps the best items by the chosen value', async () => {
    const { computeVisual } = await import('./visual');
    const r = computeVisual(eng, {
      type: 'column',
      category: [{ table: 'Product', column: 'Product' }],
      series: [],
      values: [{ kind: 'measure', name: 'Total Sales' }],
      filters: [{ table: 'Product', column: 'Product', values: [], topN: { n: 3, valueIndex: 0 } }],
    });
    expect(r.rows).toHaveLength(3);
    const all = computeVisual(eng, { type: 'column', category: [{ table: 'Product', column: 'Product' }], series: [], values: [{ kind: 'measure', name: 'Total Sales' }], filters: [] });
    const top = [...all.rows].sort((a, b) => (b.values[0] as number) - (a.values[0] as number)).slice(0, 3).map((x) => x.keys[0]);
    expect(r.rows.map((x) => x.keys[0]).sort()).toEqual(top.sort());
  });
  it('sorts rows and applies slicers', async () => {
    const { computeVisual } = await import('./visual');
    const base = { type: 'table' as const, category: [{ table: 'Customer', column: 'State' }], series: [], values: [{ kind: 'measure' as const, name: 'Total Sales' }], filters: [] };
    const desc = computeVisual(eng, { ...base, sort: { by: 'axis', dir: 'desc' } });
    expect(desc.rows.map((r) => r.keys[0])).toEqual(['WA', 'TX', 'NY', 'IL', 'FL', 'CA']);
    const byVal = computeVisual(eng, { ...base, sort: { by: 0, dir: 'asc' } });
    const vals = byVal.rows.map((r) => r.values[0] as number);
    expect(vals).toEqual([...vals].sort((a, b) => a - b));
    const sliced = computeVisual(eng, { ...base, slicers: [{ table: 'Date', column: 'Year', values: [2025] }] });
    expect(sliced.totals[0]).toBeCloseTo(amt(sales.filter((r) => year(r) === 2025)), 6);
  });
});

describe('more functions', () => {
  const monthSales = (prefix: string) => amt(sales.filter((r) => String(r['Order Date']).startsWith(prefix)));

  it('DATEDIFF and EOMONTH', () => {
    expect(base.evaluate('DATEDIFF(DATE(2025,1,31), DATE(2025,3,1), DAY)')).toBe(29);
    expect(base.evaluate('DATEDIFF(DATE(2024,11,30), DATE(2025,2,1), MONTH)')).toBe(3);
    expect(base.evaluate('DATEDIFF(DATE(2024,12,31), DATE(2025,1,1), YEAR)')).toBe(1);
    expect(base.evaluate('EOMONTH(DATE(2024,1,15), 1)')).toBe('2024-02-29');
    expect(base.evaluate('EOMONTH(DATE(2025,3,10), -1)')).toBe('2025-02-28');
  });

  it('DATESINPERIOD gives a rolling window', () => {
    const v = eng.evaluate("CALCULATE([Total Sales], DATESINPERIOD('Date'[Date], DATE(2025,3,31), -3, MONTH))");
    expect(v).toBeCloseTo(monthSales('2025-01') + monthSales('2025-02') + monthSales('2025-03'), 2);
  });

  it('PARALLELPERIOD returns whole periods', () => {
    const v = eng.evaluate("CALCULATE([Total Sales], PARALLELPERIOD('Date'[Date], -1, QUARTER))", [eng.equalityFilter('Date', 'Year Month', ['2025-05'])]);
    expect(v).toBeCloseTo(monthSales('2025-01') + monthSales('2025-02') + monthSales('2025-03'), 2);
  });

  it('TOPN keeps the best rows, CONCATENATEX joins in order, LOOKUPVALUE finds a value', () => {
    expect(base.evaluate('COUNTROWS(TOPN(2, VALUES(Product[Category]), 1))')).toBe(4); // all tie
    expect(eng.evaluate('COUNTROWS(TOPN(2, VALUES(Product[Product]), [Total Sales]))')).toBe(2);
    expect(base.evaluate('CONCATENATEX(VALUES(Product[Category]), Product[Category], "|", Product[Category], ASC)')).toBe('Accessories|Bikes|Clothing|Components');
    expect(base.evaluate('LOOKUPVALUE(Product[Product], Product[ProductID], 2)')).toBe('Road Bike');
    expect(base.evaluate('LOOKUPVALUE(Product[Product], Product[ProductID], 99, "none")')).toBe('none');
  });
});
