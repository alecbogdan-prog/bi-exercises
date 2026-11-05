// Seventh batch: popular DAX patterns and functions people search for. Original content.
import type { Measure } from '../engine/model';
import type { FieldRef } from '../engine/visual';
import { columnEx, measureEx } from './exercises4';
import type { Exercise } from './types';

const f = (table: string, column: string): FieldRef => ({ table, column });
const m = (name: string, expression: string, format?: Measure['format']): Measure => ({ name, table: 'Sales', expression, format });

const YM = f('Date', 'Year Month');
const YEAR = f('Date', 'Year');
const CATEGORY = f('Product', 'Category');
const SEGMENT = f('Customer', 'Segment');

export const EXERCISES_7: Exercise[] = [
  measureEx({
    id: 'dax-running-total',
    module: 'time',
    title: 'Running total',
    level: 'Intermediate',
    lesson:
      'A running total adds everything up to the current date, without restarting each year. The classic pattern removes the date filter with `ALL(\'Date\')` and keeps only the dates up to the last date in context:\n\n`CALCULATE([Total Sales], FILTER(ALL(\'Date\'), \'Date\'[Date] <= MAX(\'Date\'[Date])))`',
    task: 'Create `Running Total` that adds up Total Sales from the first date up to the current month, across years.',
    measure: m('Running Total', "CALCULATE([Total Sales], FILTER(ALL('Date'), 'Date'[Date] <= MAX('Date'[Date])))", 'currency'),
    required: ['CALCULATE', 'FILTER', 'ALL'],
    rows: [YM],
    contexts: [[YM], [YEAR]],
    explanation: 'Unlike TOTALYTD, this total keeps growing into 2025. MAX is evaluated in the outer context, so each row gets its own cut-off date.',
  }),
  measureEx({
    id: 'dax-rolling-3m',
    module: 'time',
    title: 'Rolling 3 months',
    level: 'Intermediate',
    lesson:
      '`DATESINPERIOD(dates, start, number, interval)` returns a window of dates. With the last date in context as the start and **-3 MONTH**, you get the last three months, which is the base of rolling totals and moving averages.',
    task: 'Create `Sales Last 3M` = Total Sales for the three months ending at the current month, using **DATESINPERIOD**.',
    measure: m('Sales Last 3M', "CALCULATE([Total Sales], DATESINPERIOD('Date'[Date], MAX('Date'[Date]), -3, MONTH))", 'currency'),
    required: ['DATESINPERIOD', 'CALCULATE'],
    rows: [YM],
    contexts: [[YM]],
    explanation: 'Divide it by 3 and you have a 3-month moving average, which smooths out the seasonal peaks.',
  }),
  measureEx({
    id: 'dax-parallel-period',
    module: 'time',
    title: 'Previous quarter, whole quarter',
    level: 'Advanced',
    lesson:
      '`PARALLELPERIOD(dates, -1, QUARTER)` shifts the dates in context back one quarter and always returns **whole** quarters. In a monthly table, every month of a quarter shows the full total of the previous quarter.',
    task: 'Create `Sales PQ` = Total Sales of the previous quarter, using **PARALLELPERIOD**.',
    measure: m('Sales PQ', "CALCULATE([Total Sales], PARALLELPERIOD('Date'[Date], -1, QUARTER))", 'currency'),
    required: ['PARALLELPERIOD', 'CALCULATE'],
    rows: [YM],
    contexts: [[YM], [YEAR]],
    explanation: 'Compare with DATEADD(..., -1, QUARTER): DATEADD shifts month by month, PARALLELPERIOD always takes the whole quarter.',
  }),
  measureEx({
    id: 'dax-avg-per-month',
    module: 'dax-basics',
    title: 'Average monthly sales',
    level: 'Intermediate',
    lesson: 'To average per month, iterate over the months and evaluate the measure for each one: `AVERAGEX(VALUES(\'Date\'[Year Month]), [Total Sales])`. Context transition does the rest.',
    task: 'Create `Avg Monthly Sales` = the average of Total Sales per `Date[Year Month]`.',
    measure: m('Avg Monthly Sales', "AVERAGEX(VALUES('Date'[Year Month]), [Total Sales])", 'currency'),
    required: ['AVERAGEX', 'VALUES'],
    rows: [YEAR],
    contexts: [[], [YEAR], [CATEGORY]],
    explanation: 'AVERAGE(Sales[Sales Amount]) would average single sales lines. Iterating over months answers the question managers actually ask.',
  }),
  measureEx({
    id: 'dax-topn-products',
    module: 'dax-advanced',
    title: 'Sales of the top 3 products',
    level: 'Advanced',
    lesson:
      '`TOPN(n, table, orderBy)` returns the n rows with the highest value. Combine it with SUMX to add up only those rows: `SUMX(TOPN(3, VALUES(Product[Product]), [Total Sales]), [Total Sales])`.',
    task: 'Create `Top 3 Product Sales` = Total Sales of the three best-selling products in the current context.',
    measure: m('Top 3 Product Sales', 'SUMX(TOPN(3, VALUES(Product[Product]), [Total Sales]), [Total Sales])', 'currency'),
    required: ['TOPN', 'SUMX'],
    rows: [CATEGORY],
    contexts: [[], [CATEGORY], [YEAR]],
    explanation: 'Per category, the top 3 is recalculated, so each row shows how concentrated that category is.',
  }),
  measureEx({
    id: 'dax-concatenatex',
    module: 'dax-advanced',
    title: 'List the products in one cell',
    level: 'Intermediate',
    lesson: '`CONCATENATEX(table, expression, delimiter, orderBy)` joins text from every row of a table. It is perfect for labels like "Helmet, Gloves, Water Bottle".',
    task: 'Create `Product List` = the product names in the current context, separated by **", "** and sorted by name.',
    measure: m('Product List', 'CONCATENATEX(VALUES(Product[Product]), Product[Product], ", ", Product[Product], ASC)', 'text'),
    required: ['CONCATENATEX'],
    rows: [CATEGORY],
    contexts: [[CATEGORY], [f('Product', 'Color')]],
    explanation: 'Without the sort arguments the order is not guaranteed, so always sort lists that people will read.',
  }),
  measureEx({
    id: 'dax-datediff-days',
    module: 'dax-advanced',
    title: 'Days between first and last order',
    level: 'Intermediate',
    lesson: '`DATEDIFF(start, end, interval)` counts the intervals between two dates. Use MIN and MAX on the order date to measure how long customers keep buying.',
    task: 'Create `Active Days` = the number of days between the first and the last `Sales[Order Date]`.',
    measure: m('Active Days', 'DATEDIFF(MIN(Sales[Order Date]), MAX(Sales[Order Date]), DAY)', 'integer'),
    required: ['DATEDIFF'],
    rows: [SEGMENT],
    contexts: [[], [SEGMENT], [f('Customer', 'Customer')]],
    explanation: 'Per customer, this is the length of the relationship: a simple input for loyalty analysis.',
  }),
  measureEx({
    id: 'dax-isinscope',
    module: 'dax-advanced',
    title: 'Which level am I on?',
    level: 'Advanced',
    lesson:
      'In a matrix with Category and Product on rows, `ISINSCOPE(column)` tells you which level a cell belongs to. Test the lowest level first: `IF(ISINSCOPE(Product[Product]), "Product", IF(ISINSCOPE(Product[Category]), "Category", "Total"))`.',
    task: 'Create `Row Level` that returns **Product**, **Category** or **Total** depending on the level of the row.',
    measure: m('Row Level', 'IF(ISINSCOPE(Product[Product]), "Product", IF(ISINSCOPE(Product[Category]), "Category", "Total"))', 'text'),
    required: ['ISINSCOPE'],
    rows: [CATEGORY, f('Product', 'Product')],
    contexts: [[], [CATEGORY], [CATEGORY, f('Product', 'Product')]],
    explanation: 'ISINSCOPE is how you make a measure behave differently on subtotal rows, for example to show a percentage only at product level.',
  }),
  columnEx({
    id: 'col-lookupvalue',
    title: 'Look up the list price',
    level: 'Intermediate',
    lesson:
      '`LOOKUPVALUE(result column, search column, search value)` finds a value in another table, like XLOOKUP in Excel. It works even without a relationship. When there is one, RELATED is simpler and faster.',
    task: 'In the **Sales** table, create `List Price` = the `Product[List Price]` where `Product[ProductID]` equals `Sales[ProductID]`.',
    column: { table: 'Sales', name: 'List Price', expression: 'LOOKUPVALUE(Product[List Price], Product[ProductID], Sales[ProductID])' },
    show: [f('Sales', 'OrderID')],
    explanation: 'Compare List Price with Unit Price to spot discounts. RELATED(Product[List Price]) gives the same result here.',
  }),
  columnEx({
    id: 'col-eomonth',
    title: 'End of month date',
    level: 'Beginner',
    lesson: '`EOMONTH(date, months)` returns the last day of the month, after moving the given number of months. With 0 you get the end of the same month.',
    task: 'In the **Sales** table, create `Month End` = the last day of the month of `Sales[Order Date]`.',
    column: { table: 'Sales', name: 'Month End', expression: 'EOMONTH(Sales[Order Date], 0)' },
    show: [f('Sales', 'OrderID'), f('Sales', 'Order Date')],
    explanation: 'Month-end dates are handy for joining to monthly tables such as budgets or stock snapshots.',
  }),
];
