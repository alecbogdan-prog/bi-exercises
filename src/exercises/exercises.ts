import type { Measure } from '../engine/model';
import type { FieldRef, ValueField, VisualSpec } from '../engine/visual';
import { emptySpec } from '../engine/visual';
import { SCENARIOS } from './scenarios';
import { EXERCISES_2 } from './exercises2';
import { EXERCISES_3 } from './exercises3';
import { EXERCISES_4 } from './exercises4';
import { EXERCISES_5 } from './exercises5';
import { EXERCISES_6 } from './exercises6';
import { EXERCISES_7 } from './exercises7';
import { EXERCISES_8 } from './exercises8';
import { EXERCISES_9 } from './exercises9';
import { PROJECT_STEPS } from '../projects/projects';
import type { Exercise } from './types';
import { MODULES } from './types';

const f = (table: string, column: string): FieldRef => ({ table, column });
const sum = (table: string, column: string): ValueField => ({ kind: 'column', table, column, agg: 'SUM' });
const meas = (name: string): ValueField => ({ kind: 'measure', name });
const spec = (s: Partial<VisualSpec>): VisualSpec => ({ ...emptySpec(), ...s });
const m = (name: string, expression: string, format?: Measure['format']): Measure => ({ name, table: 'Sales', expression, format });

const TOTAL_SALES = m('Total Sales', 'SUM(Sales[Sales Amount])', 'currency');
const ORDERS = m('Orders', 'DISTINCTCOUNT(Sales[OrderID])', 'integer');

const BASE_EXERCISES: Exercise[] = [
  // ---------------- Reports & Visuals ----------------
  {
    id: 'card-total-sales',
    module: 'reports',
    title: 'Your first card',
    level: 'Beginner',
    free: true,
    lesson:
      'A **card** shows one big number: the kind of KPI a manager looks at first.\n\nWhen you drop a numeric column into a visual, it is aggregated automatically (by default with **Sum**). This is called an *implicit measure*.',
    task: ['Select the **Card** visual.', 'Add `Sales[Sales Amount]` to **Fields**.'],
    hints: ['Click the card icon in the Visualizations pane.', 'Drag "Sales Amount" from the Sales table onto the Fields well, or tick its checkbox.'],
    hintTargets: [{ target: 'button[aria-label="Card"]' }, { target: '[data-testid="data-pane"] [title="Sales[Sales Amount]"]', to: '[data-well="Fields"]' }],
    starter: spec({ type: 'column' }),
    solution: { spec: spec({ type: 'card', values: [sum('Sales', 'Sales Amount')] }) },
    check: { kind: 'report', allowedTypes: ['card'] },
    explanation: 'The card sums every row of Sales[Sales Amount]. No filters are applied, so this is the grand total for both years.',
  },
  {
    id: 'column-sales-by-category',
    module: 'reports',
    title: 'Sales by category',
    level: 'Beginner',
    free: true,
    lesson:
      'Column charts compare a value across categories. The field on the **X-axis** decides how the data is grouped.\n\nNotice that `Category` lives in the **Product** table, while `Sales Amount` lives in **Sales**. The relationship between the two tables makes the grouping work.',
    task: ['Create a **Stacked column chart**.', 'Put `Product[Category]` on the **X-axis**.', 'Put `Sales[Sales Amount]` on the **Y-axis** (Sum).'],
    hints: ['Expand the Product table in the Data pane.', 'Drop Category onto "X-axis" and Sales Amount onto "Y-axis".'],
    starter: spec({ type: 'column' }),
    solution: { spec: spec({ type: 'column', category: [f('Product', 'Category')], values: [sum('Sales', 'Sales Amount')] }) },
    check: { kind: 'report', allowedTypes: ['column'] },
    explanation: 'Each column is the Sales Amount filtered to one category. The filter flows from Product to Sales through the ProductID relationship.',
  },
  {
    id: 'bar-quantity-by-state',
    module: 'reports',
    title: 'Units sold by state',
    level: 'Beginner',
    free: true,
    lesson:
      'Bar charts are column charts turned sideways. They are easier to read when category names are long or when there are many categories.',
    task: ['Create a **Stacked bar chart**.', 'Put `Customer[State]` on the **Y-axis**.', 'Put the **Sum of Quantity** from Sales on the **X-axis**.'],
    hints: ['State is in the Customer table.', 'Quantity is in the Sales table.'],
    starter: spec({ type: 'column' }),
    solution: { spec: spec({ type: 'bar', category: [f('Customer', 'State')], values: [sum('Sales', 'Quantity')] }) },
    check: { kind: 'report', allowedTypes: ['bar'] },
    explanation: 'The Customer table filters Sales through CustomerID, so every bar is the quantity bought by customers from that state.',
  },
  {
    id: 'line-sales-trend',
    module: 'reports',
    title: 'Monthly sales trend',
    level: 'Beginner',
    free: true,
    lesson:
      'Line charts show how a value changes over time. Always use a column from the **Date** table on the axis: it contains every day, month and year, even when nothing was sold.',
    task: ['Create a **Line chart**.', "Put `'Date'[Year Month]` on the **X-axis**.", 'Put `Sales[Sales Amount]` on the **Y-axis**.'],
    hints: ['Year Month looks like "2025-03", so it sorts correctly as text.'],
    starter: spec({ type: 'line' }),
    solution: { spec: spec({ type: 'line', category: [f('Date', 'Year Month')], values: [sum('Sales', 'Sales Amount')] }) },
    check: { kind: 'report', allowedTypes: ['line'] },
    explanation: 'You can see the seasonality: spring and summer are the strongest months, and 2025 is higher than 2024.',
  },
  {
    id: 'table-category-details',
    module: 'reports',
    title: 'A detail table',
    level: 'Beginner',
    free: true,
    lesson: 'A **table** visual is the closest thing to a spreadsheet: one row per group, one column per value, plus a total row.',
    task: ['Create a **Table**.', 'Add `Product[Category]`.', 'Add the **Sum of Quantity** and the **Sum of Sales Amount**.'],
    hints: ['In a table, the grouping field goes to "Columns" first, then the numbers.'],
    starter: spec({ type: 'table' }),
    solution: {
      spec: spec({ type: 'table', category: [f('Product', 'Category')], values: [sum('Sales', 'Quantity'), sum('Sales', 'Sales Amount')] }),
    },
    check: { kind: 'report', allowedTypes: ['table'] },
    explanation: 'The total row is not a sum of the rows above it. It is the same calculation evaluated without the Category filter. That difference matters a lot once you write DAX.',
  },
  {
    id: 'pie-segment-share',
    module: 'reports',
    title: 'Share by customer segment',
    level: 'Beginner',
    free: true,
    lesson: 'Pie and donut charts show parts of a whole. Use them only with a few categories (ideally 2 to 5).',
    task: ['Create a **Pie chart**.', 'Use `Customer[Segment]` as the **Legend**.', 'Show `Sales[Sales Amount]` as **Values**.'],
    hints: ['For pie charts, the grouping field goes to the "Legend" well.'],
    starter: spec({ type: 'pie' }),
    solution: { spec: spec({ type: 'pie', category: [f('Customer', 'Segment')], values: [sum('Sales', 'Sales Amount')] }) },
    check: { kind: 'report', allowedTypes: ['pie'] },
    explanation: 'Three segments: a good use of a pie chart. With 12 slices it would be unreadable; use a bar chart instead.',
  },
  {
    id: 'matrix-category-year',
    module: 'reports',
    title: 'Matrix: category by year',
    level: 'Intermediate',
    free: true,
    lesson: 'A **matrix** is a pivot table. It groups by one field on rows and another on columns.',
    task: ['Create a **Matrix**.', 'Rows: `Product[Category]`.', "Columns: `'Date'[Year]`.", 'Values: `Sales[Sales Amount]`.'],
    hints: ['The matrix has three wells: Rows, Columns and Values.'],
    starter: spec({ type: 'matrix' }),
    solution: {
      spec: spec({ type: 'matrix', category: [f('Product', 'Category')], series: [f('Date', 'Year')], values: [sum('Sales', 'Sales Amount')] }),
    },
    check: { kind: 'report', allowedTypes: ['matrix'] },
    explanation: 'Each cell is filtered by two tables at once: Product (row) and Date (column). Both filters reach Sales through their relationships.',
  },
  {
    id: 'stacked-column-color',
    module: 'reports',
    title: 'Stacked by color',
    level: 'Intermediate',
    free: false,
    lesson: 'Adding a field to the **Legend** of a column chart splits every column into colored segments.',
    task: ['Create a **Stacked column chart**.', 'X-axis: `Product[Category]`.', 'Legend: `Product[Color]`.', 'Y-axis: `Sales[Quantity]`.'],
    hints: ['Legend is the second well under X-axis.'],
    starter: spec({ type: 'column' }),
    solution: {
      spec: spec({ type: 'column', category: [f('Product', 'Category')], series: [f('Product', 'Color')], values: [sum('Sales', 'Quantity')] }),
    },
    check: { kind: 'report', allowedTypes: ['column'] },
    explanation: 'Every segment is filtered by Category and Color at the same time. Combinations without sales are not shown.',
  },

  // ---------------- Filters ----------------
  {
    id: 'filter-year-2025',
    module: 'filters',
    title: 'Only 2025, please',
    level: 'Beginner',
    free: true,
    lesson:
      'The **Filters** well limits the data a visual uses, without showing the filter field in the visual itself.',
    task: [
      'Create a **Stacked column chart** of `Sales[Sales Amount]` by `Product[Category]`.',
      "Drag `'Date'[Year]` into **Filters on this visual** and keep only **2025**.",
    ],
    hints: ['After dropping Year in the Filters well, tick 2025 in the list that appears.'],
    starter: spec({ type: 'column' }),
    solution: {
      spec: spec({
        type: 'column',
        category: [f('Product', 'Category')],
        values: [sum('Sales', 'Sales Amount')],
        filters: [{ table: 'Date', column: 'Year', values: [2025] }],
      }),
    },
    check: { kind: 'report', allowedTypes: ['column'] },
    explanation: 'The Year filter is added to the filter context of every column in the chart.',
  },
  {
    id: 'filter-west-coast-bikes',
    module: 'filters',
    title: 'West coast bikes',
    level: 'Intermediate',
    free: false,
    lesson: 'You can combine several filters. They are combined with AND: a row must satisfy all of them.',
    task: [
      'Create a **Table** with `Product[Product]` and the **Sum of Sales Amount**.',
      'Filter `Product[Category]` to **Bikes**.',
      'Filter `Customer[State]` to **CA** and **WA**.',
    ],
    hints: ['Use two separate fields in the Filters well.', 'Inside one filter, the selected values are combined with OR.'],
    starter: spec({ type: 'table' }),
    solution: {
      spec: spec({
        type: 'table',
        category: [f('Product', 'Product')],
        values: [sum('Sales', 'Sales Amount')],
        filters: [
          { table: 'Product', column: 'Category', values: ['Bikes'] },
          { table: 'Customer', column: 'State', values: ['CA', 'WA'] },
        ],
      }),
    },
    check: { kind: 'report', allowedTypes: ['table'] },
    explanation: 'CA OR WA, AND Category = Bikes. Values inside one filter are OR-ed, separate filters are AND-ed.',
  },

  // ---------------- DAX basics ----------------
  {
    id: 'dax-total-sales',
    module: 'dax-basics',
    title: 'Your first measure',
    level: 'Beginner',
    free: true,
    lesson:
      'A **measure** is a named DAX formula that is evaluated for every cell of a visual. Measures are better than implicit measures: you write them once and reuse them everywhere.\n\nSyntax: `Measure Name = EXPRESSION`',
    task: ['Click **New measure**.', 'Create `Total Sales = SUM(Sales[Sales Amount])`.', 'The preview table already uses it.'],
    hints: ['Type the whole line, including the name and the "=" sign, then press Commit (or Ctrl+Enter).'],
    starter: spec({ type: 'table', category: [f('Product', 'Category')], values: [meas('Total Sales')] }),
    solution: { spec: spec({ type: 'table', category: [f('Product', 'Category')], values: [meas('Total Sales')] }), measures: [TOTAL_SALES] },
    check: { kind: 'dax', measureName: 'Total Sales', requiredFunctions: ['SUM'], contexts: [[], [f('Product', 'Category')], [f('Date', 'Year')]] },
    explanation: 'SUM adds up the column for the rows visible in the current filter context: one category per row, and everything for the total.',
  },
  {
    id: 'dax-order-count',
    module: 'dax-basics',
    title: 'Counting orders',
    level: 'Beginner',
    free: true,
    lesson:
      'One order can have several lines (products). `COUNTROWS(Sales)` counts **lines**, while `DISTINCTCOUNT(Sales[OrderID])` counts **orders**.',
    task: ['Create a measure called `Orders` that returns the number of **distinct orders**.'],
    hints: ['DISTINCTCOUNT takes a single column.'],
    givenMeasures: [TOTAL_SALES],
    starter: spec({ type: 'table', category: [f('Date', 'Year')], values: [meas('Total Sales'), meas('Orders')] }),
    solution: { spec: spec({ type: 'table', category: [f('Date', 'Year')], values: [meas('Total Sales'), meas('Orders')] }), measures: [ORDERS] },
    check: { kind: 'dax', measureName: 'Orders', requiredFunctions: ['DISTINCTCOUNT'], contexts: [[], [f('Date', 'Year')], [f('Product', 'Category')]] },
    explanation: 'Notice: the Orders total is lower than the sum of orders per category, because one order can contain products from several categories.',
  },
  {
    id: 'dax-average-order-value',
    module: 'dax-basics',
    title: 'Average order value',
    level: 'Beginner',
    free: true,
    lesson:
      'Measures can reference other measures with square brackets: `[Total Sales]`.\n\nUse `DIVIDE(a, b)` instead of `a / b`: it returns BLANK instead of an error when b is 0.',
    task: ['Create `AOV` = Total Sales divided by Orders, using **DIVIDE**.'],
    hints: ['AOV = DIVIDE([Total Sales], [Orders])'],
    givenMeasures: [TOTAL_SALES, ORDERS],
    starter: spec({ type: 'table', category: [f('Customer', 'Segment')], values: [meas('Total Sales'), meas('Orders'), meas('AOV')] }),
    solution: {
      spec: spec({ type: 'table', category: [f('Customer', 'Segment')], values: [meas('Total Sales'), meas('Orders'), meas('AOV')] }),
      measures: [m('AOV', 'DIVIDE([Total Sales], [Orders])', 'currency')],
    },
    check: { kind: 'dax', measureName: 'AOV', requiredFunctions: ['DIVIDE'], contexts: [[], [f('Customer', 'Segment')], [f('Date', 'Year Month')]] },
    explanation: 'A ratio must be computed as a ratio of totals, per cell. Averaging the row-level ratios would give a different (wrong) answer.',
  },
  {
    id: 'dax-sumx-cost',
    module: 'dax-basics',
    title: 'Total cost with SUMX and RELATED',
    level: 'Intermediate',
    free: false,
    lesson:
      'There is no cost column in Sales. Cost per unit lives in the Product table.\n\n`SUMX(table, expression)` loops over every row of a table, evaluates the expression for that row, and sums the results. Inside the loop, `RELATED(Product[Unit Cost])` fetches the value from the related product.',
    task: ['Create `Total Cost` = sum over Sales of **Quantity × the related Unit Cost**.'],
    hints: ['Total Cost = SUMX(Sales, Sales[Quantity] * RELATED(Product[Unit Cost]))'],
    givenMeasures: [TOTAL_SALES],
    starter: spec({ type: 'table', category: [f('Product', 'Category')], values: [meas('Total Sales'), meas('Total Cost')] }),
    solution: {
      spec: spec({ type: 'table', category: [f('Product', 'Category')], values: [meas('Total Sales'), meas('Total Cost')] }),
      measures: [m('Total Cost', 'SUMX(Sales, Sales[Quantity] * RELATED(Product[Unit Cost]))', 'currency')],
    },
    check: { kind: 'dax', measureName: 'Total Cost', requiredFunctions: ['SUMX', 'RELATED'], contexts: [[], [f('Product', 'Category')], [f('Customer', 'State')]] },
    explanation: 'SUMX creates a row context. RELATED follows the many-to-one relationship from the current Sales row to its Product.',
  },

  // ---------------- CALCULATE ----------------
  {
    id: 'calc-red-sales',
    module: 'calculate',
    title: 'CALCULATE: red products only',
    level: 'Intermediate',
    free: false,
    lesson:
      '`CALCULATE(expression, filter1, filter2, …)` evaluates an expression in a **modified** filter context.\n\nA simple filter like `Product[Color] = "Red"` **replaces** any existing filter on that column, and keeps filters on other columns.',
    task: ['Create `Red Sales` = Total Sales for products whose color is **Red**.'],
    hints: ['Red Sales = CALCULATE([Total Sales], Product[Color] = "Red")'],
    givenMeasures: [TOTAL_SALES],
    starter: spec({ type: 'table', category: [f('Product', 'Category')], values: [meas('Total Sales'), meas('Red Sales')] }),
    solution: {
      spec: spec({ type: 'table', category: [f('Product', 'Category')], values: [meas('Total Sales'), meas('Red Sales')] }),
      measures: [m('Red Sales', 'CALCULATE([Total Sales], Product[Color] = "Red")', 'currency')],
    },
    check: { kind: 'dax', measureName: 'Red Sales', requiredFunctions: ['CALCULATE'], contexts: [[], [f('Product', 'Category')], [f('Product', 'Color')]] },
    explanation: 'In the row for Bikes, the filter context is Category = Bikes AND Color = Red. Grouped by Color, every row shows the red total, because the Color filter is replaced.',
  },
  {
    id: 'calc-percent-of-total',
    module: 'calculate',
    title: '% of all categories',
    level: 'Intermediate',
    free: false,
    lesson:
      '`ALL(Product)` used inside CALCULATE **removes** every filter from the Product table. That gives you the grand total in every row, which you can divide by.',
    task: ['Create `% of Total` = Total Sales divided by Total Sales for **all products**.'],
    hints: ['% of Total = DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Product)))'],
    givenMeasures: [TOTAL_SALES],
    starter: spec({ type: 'table', category: [f('Product', 'Category')], values: [meas('Total Sales'), meas('% of Total')] }),
    solution: {
      spec: spec({ type: 'table', category: [f('Product', 'Category')], values: [meas('Total Sales'), meas('% of Total')] }),
      measures: [m('% of Total', 'DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Product)))', 'percent')],
    },
    check: { kind: 'dax', measureName: '% of Total', requiredFunctions: ['CALCULATE', 'ALL'], contexts: [[], [f('Product', 'Category')], [f('Product', 'Product')]] },
    explanation: 'The denominator ignores the Product filters but still respects filters from other tables (e.g. Year), so it works in any report.',
  },
  {
    id: 'calc-big-orders',
    module: 'calculate',
    title: 'Count of large order lines',
    level: 'Intermediate',
    free: false,
    lesson:
      'When the condition is more complex or uses a whole table, use `FILTER(table, condition)` as a CALCULATE argument. FILTER returns only the rows that meet the condition.',
    task: ['Create `Large Lines` = number of Sales rows where **Sales Amount > 500**.'],
    hints: ['Large Lines = CALCULATE(COUNTROWS(Sales), FILTER(Sales, Sales[Sales Amount] > 500))', 'COUNTROWS(FILTER(Sales, ...)) also works.'],
    starter: spec({ type: 'column', category: [f('Customer', 'Segment')], values: [meas('Large Lines')] }),
    solution: {
      spec: spec({ type: 'column', category: [f('Customer', 'Segment')], values: [meas('Large Lines')] }),
      measures: [m('Large Lines', 'CALCULATE(COUNTROWS(Sales), FILTER(Sales, Sales[Sales Amount] > 500))', 'integer')],
    },
    check: { kind: 'dax', measureName: 'Large Lines', requiredFunctions: ['FILTER', 'COUNTROWS'], contexts: [[], [f('Customer', 'Segment')], [f('Date', 'Year')]] },
    explanation: 'FILTER iterates the Sales rows that are visible in the current context, so the result still respects the Segment of each column.',
  },

  // ---------------- Time intelligence ----------------
  {
    id: 'time-ytd',
    module: 'time',
    title: 'Sales year-to-date',
    level: 'Intermediate',
    free: false,
    lesson:
      'Time intelligence functions need a proper **Date table**. `TOTALYTD(expression, \'Date\'[Date])` returns the running total from January 1st up to the last date in the current context.',
    task: ['Create `Sales YTD` using **TOTALYTD**.'],
    hints: ["Sales YTD = TOTALYTD([Total Sales], 'Date'[Date])"],
    givenMeasures: [TOTAL_SALES],
    starter: spec({ type: 'line', category: [f('Date', 'Year Month')], values: [meas('Total Sales'), meas('Sales YTD')] }),
    solution: {
      spec: spec({ type: 'line', category: [f('Date', 'Year Month')], values: [meas('Total Sales'), meas('Sales YTD')] }),
      measures: [m('Sales YTD', "TOTALYTD([Total Sales], 'Date'[Date])", 'currency')],
    },
    check: { kind: 'dax', measureName: 'Sales YTD', contexts: [[f('Date', 'Year Month')], [f('Date', 'Year')]] },
    explanation: 'The line restarts every January. CALCULATE([Total Sales], DATESYTD(\'Date\'[Date])) gives exactly the same result.',
  },
  {
    id: 'time-last-year',
    module: 'time',
    title: 'Same period last year',
    level: 'Advanced',
    free: false,
    lesson:
      '`SAMEPERIODLASTYEAR(\'Date\'[Date])` shifts the dates in the current context back by one year. Combine it with CALCULATE to compare with last year.',
    task: ['Create `Sales LY` = Total Sales for the same period one year earlier.'],
    hints: ["Sales LY = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))"],
    givenMeasures: [TOTAL_SALES],
    starter: spec({ type: 'table', category: [f('Date', 'Year Month')], values: [meas('Total Sales'), meas('Sales LY')] }),
    solution: {
      spec: spec({ type: 'table', category: [f('Date', 'Year Month')], values: [meas('Total Sales'), meas('Sales LY')] }),
      measures: [m('Sales LY', "CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))", 'currency')],
    },
    check: { kind: 'dax', measureName: 'Sales LY', requiredFunctions: ['CALCULATE'], contexts: [[f('Date', 'Year Month')], [f('Date', 'Year')], [f('Date', 'Quarter')]] },
    explanation: 'For 2024 the measure is blank: there is no 2023 data. DATEADD(\'Date\'[Date], -1, YEAR) is an equivalent alternative.',
  },
  {
    id: 'time-yoy-growth',
    module: 'time',
    title: 'Year-over-year growth %',
    level: 'Advanced',
    free: false,
    lesson: 'Growth % = (this period − last year) ÷ last year. Build it from the measures you already have.',
    task: ['Create `YoY %` using **DIVIDE** and the existing `[Total Sales]` and `[Sales LY]` measures.'],
    hints: ['YoY % = DIVIDE([Total Sales] - [Sales LY], [Sales LY])'],
    givenMeasures: [TOTAL_SALES, m('Sales LY', "CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))", 'currency')],
    starter: spec({ type: 'table', category: [f('Date', 'Year Month')], values: [meas('Total Sales'), meas('Sales LY'), meas('YoY %')] }),
    solution: {
      spec: spec({ type: 'table', category: [f('Date', 'Year Month')], values: [meas('Total Sales'), meas('Sales LY'), meas('YoY %')] }),
      measures: [m('YoY %', 'DIVIDE([Total Sales] - [Sales LY], [Sales LY])', 'percent')],
    },
    check: { kind: 'dax', measureName: 'YoY %', requiredFunctions: ['DIVIDE'], contexts: [[f('Date', 'Year Month')], [f('Date', 'Year')]] },
    explanation: 'DIVIDE returns BLANK for 2024 (no last year), so the visual stays clean instead of showing errors or infinity.',
  },
];

/** All exercises, ordered module by module (this order drives Prev/Next). */
export const EXERCISES: Exercise[] = MODULES.flatMap((mod) => [...BASE_EXERCISES, ...EXERCISES_2, ...EXERCISES_3, ...EXERCISES_4, ...EXERCISES_5, ...EXERCISES_6, ...EXERCISES_7, ...EXERCISES_8, ...EXERCISES_9].filter((e) => e.module === mod.id));

for (const e of EXERCISES) e.scenario = SCENARIOS[e.id];

/** How many exercises at the start of every chapter are open to everyone, without an account. */
export const FREE_PER_CHAPTER = 2;
for (const mod of MODULES) EXERCISES.filter((e) => e.module === mod.id).forEach((e, i) => (e.free = i < FREE_PER_CHAPTER));

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id) ?? PROJECT_STEPS.find((e) => e.id === id);
}
