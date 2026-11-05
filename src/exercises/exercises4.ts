// Fourth batch: one hands-on exercise for every DAX function in the DAX Functions List that had none yet.
import type { CalcColumn, Measure } from '../engine/model';
import type { FieldRef, ValueField, VisualSpec } from '../engine/visual';
import { emptySpec } from '../engine/visual';
import type { Exercise } from './types';

const f = (table: string, column: string): FieldRef => ({ table, column });
const meas = (name: string): ValueField => ({ kind: 'measure', name });
const spec = (s: Partial<VisualSpec>): VisualSpec => ({ ...emptySpec(), ...s });
const m = (name: string, expression: string, format?: Measure['format']): Measure => ({ name, table: 'Sales', expression, format });
const col = (table: string, name: string, expression: string): CalcColumn => ({ table, name, expression });

const TOTAL_SALES = m('Total Sales', 'SUM(Sales[Sales Amount])', 'currency');
const TOTAL_COST = m('Total Cost', 'SUMX(Sales, Sales[Quantity] * RELATED(Product[Unit Cost]))', 'currency');

const YM = f('Date', 'Year Month');
const YEAR = f('Date', 'Year');
const CATEGORY = f('Product', 'Category');
const SEGMENT = f('Customer', 'Segment');

/** A measure exercise: a table grouped by `rows` with the given measures plus the new one. */
export function measureEx(e: {
  id: string;
  module: Exercise['module'];
  title: string;
  level: Exercise['level'];
  lesson: string;
  task: string;
  measure: Measure;
  required: string[];
  rows: FieldRef[];
  contexts: FieldRef[][];
  given?: Measure[];
  explanation: string;
}): Exercise {
  const given = e.given ?? [TOTAL_SALES];
  const table = spec({ type: 'table', category: e.rows, values: [...given.slice(0, 1).map((g) => meas(g.name)), meas(e.measure.name)] });
  return {
    id: e.id,
    module: e.module,
    title: e.title,
    level: e.level,
    free: false,
    lesson: e.lesson,
    task: [e.task],
    hints: [`${e.measure.name} = ${e.measure.expression}`],
    givenMeasures: given,
    starter: table,
    solution: { spec: table, measures: [e.measure] },
    check: { kind: 'dax', measureName: e.measure.name, requiredFunctions: e.required, contexts: e.contexts },
    explanation: e.explanation,
  };
}

/** A calculated-column exercise: create the column, then show it in a table next to `show`. */
export function columnEx(e: {
  id: string;
  title: string;
  level: Exercise['level'];
  lesson: string;
  task: string;
  column: CalcColumn;
  show: FieldRef[];
  explanation: string;
}): Exercise {
  return {
    id: e.id,
    module: 'columns',
    title: e.title,
    level: e.level,
    free: false,
    lesson: e.lesson,
    task: [e.task, `Show it in a **Table** with ${e.show.map((s) => `\`${s.table}[${s.column}]\``).join(', ')} and the new column.`],
    hints: [`${e.column.name} = ${e.column.expression}`],
    starter: spec({ type: 'table', category: e.show }),
    solution: { spec: spec({ type: 'table', category: [...e.show, f(e.column.table, e.column.name)] }), columns: [e.column] },
    check: { kind: 'column', table: e.column.table, name: e.column.name },
    explanation: e.explanation,
  };
}

export const EXERCISES_4: Exercise[] = [
  // ---------------- DAX basics: aggregations, math, information ----------------
  measureEx({
    id: 'dax-average-line',
    module: 'dax-basics',
    title: 'Average sale line',
    level: 'Beginner',
    lesson: '`AVERAGE(column)` returns the mean of a numeric column in the current filter context. It averages **rows**, so here it gives the average value of one sales line.',
    task: 'Create `Avg Line Amount` = the average of `Sales[Sales Amount]`.',
    measure: m('Avg Line Amount', 'AVERAGE(Sales[Sales Amount])', 'currency'),
    required: ['AVERAGE'],
    rows: [CATEGORY],
    contexts: [[], [CATEGORY], [SEGMENT]],
    explanation: 'Bikes have far fewer lines than accessories but a much higher average line, which is why they dominate revenue.',
  }),
  measureEx({
    id: 'dax-min-max-price',
    module: 'dax-basics',
    title: 'Price spread',
    level: 'Beginner',
    lesson: '`MIN(column)` and `MAX(column)` return the smallest and largest value in the current context. Subtract them to see how wide a range is.',
    task: 'Create `Price Spread` = the highest `Product[List Price]` minus the lowest one.',
    measure: m('Price Spread', 'MAX(Product[List Price]) - MIN(Product[List Price])', 'currency'),
    required: ['MAX', 'MIN'],
    rows: [CATEGORY],
    contexts: [[], [CATEGORY]],
    explanation: 'Bikes span more than a thousand dollars, while accessories sit within a few dozen. That is a hint for separate pricing strategies.',
  }),
  measureEx({
    id: 'dax-count-lines',
    module: 'dax-basics',
    title: 'Count the sales lines',
    level: 'Beginner',
    lesson: '`COUNT(column)` counts the non-blank numbers (or dates) in a column. Every sales line has a quantity, so counting Quantity counts the lines.',
    task: 'Create `Sales Lines` = the number of non-blank values in `Sales[Quantity]`.',
    measure: m('Sales Lines', 'COUNT(Sales[Quantity])', 'integer'),
    required: ['COUNT'],
    rows: [CATEGORY],
    contexts: [[], [CATEGORY], [YEAR]],
    explanation: 'COUNT gives the same result as COUNTROWS(Sales) here because Quantity is never blank. COUNTROWS is usually the clearer choice.',
  }),
  measureEx({
    id: 'dax-counta-customers',
    module: 'dax-basics',
    title: 'Customers on file',
    level: 'Beginner',
    lesson: '`COUNTA(column)` counts the non-blank values of **any** type, including text. COUNT only works with numbers and dates.',
    task: 'Create `Customers on File` = the number of non-blank values in `Customer[Customer]`.',
    measure: m('Customers on File', 'COUNTA(Customer[Customer])', 'integer'),
    required: ['COUNTA'],
    rows: [f('Customer', 'State')],
    contexts: [[], [f('Customer', 'State')], [SEGMENT]],
    explanation: 'This counts customers in the Customer table, including any who never bought. Counting in Sales would only include buyers.',
  }),
  measureEx({
    id: 'dax-distinct-cities',
    module: 'dax-basics',
    title: 'How many cities?',
    level: 'Beginner',
    lesson: '`DISTINCT(column)` returns a one-column table of the different values. Wrap it in `COUNTROWS` to count them.',
    task: 'Create `Cities` = the number of different `Customer[City]` values, using **DISTINCT** and **COUNTROWS**.',
    measure: m('Cities', 'COUNTROWS(DISTINCT(Customer[City]))', 'integer'),
    required: ['DISTINCT', 'COUNTROWS'],
    rows: [f('Customer', 'State')],
    contexts: [[], [f('Customer', 'State')]],
    explanation: 'DISTINCTCOUNT(Customer[City]) gives the same number. DISTINCT is useful when you need the list itself, for example inside an iterator.',
  }),
  measureEx({
    id: 'dax-round-margin',
    module: 'dax-basics',
    title: 'Rounded margin',
    level: 'Intermediate',
    lesson: '`ROUND(number, digits)` rounds to a number of decimals. For a percentage, 2 decimals means a whole percent (0.37 = 37%).',
    task: 'Create `Margin % Rounded` = (Total Sales − Total Cost) / Total Sales, rounded to **2** decimals.',
    measure: m('Margin % Rounded', 'ROUND(DIVIDE([Total Sales] - [Total Cost], [Total Sales]), 2)', 'percent'),
    required: ['ROUND'],
    rows: [CATEGORY],
    given: [TOTAL_SALES, TOTAL_COST],
    contexts: [[], [CATEGORY], [SEGMENT]],
    explanation: 'Rounding inside the measure changes the value itself. If you only want fewer decimals on screen, change the format instead.',
  }),
  measureEx({
    id: 'dax-abs-change',
    module: 'dax-basics',
    title: 'Size of the change',
    level: 'Intermediate',
    lesson: '`ABS(number)` removes the sign: −500 and 500 both become 500. Useful when you care how big a change is, not its direction.',
    task: 'Create `Change Size` = the absolute difference between Total Sales and **Sales LY**.',
    measure: m('Change Size', 'ABS([Total Sales] - [Sales LY])', 'currency'),
    required: ['ABS'],
    rows: [YM],
    given: [TOTAL_SALES, m('Sales LY', "CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))", 'currency')],
    contexts: [[YM], [YEAR]],
    explanation: 'Months with a big swing either way now stand out, which is handy for a "what moved the most" list.',
  }),
  measureEx({
    id: 'dax-isblank-zero',
    module: 'dax-basics',
    title: 'Show zero instead of blank',
    level: 'Intermediate',
    lesson: 'A measure returns BLANK when there is nothing to add up. `ISBLANK(value)` checks for that, so you can return 0 instead.',
    task: 'Create `Sales or Zero` that returns **0** when Total Sales is blank, and Total Sales otherwise.',
    measure: m('Sales or Zero', 'IF(ISBLANK([Total Sales]), 0, [Total Sales])', 'currency'),
    required: ['ISBLANK', 'IF'],
    rows: [f('Product', 'Product'), YEAR],
    contexts: [[f('Product', 'Product')], [f('Product', 'Product'), YEAR]],
    explanation: 'Use this carefully: visuals hide rows where every measure is blank, so returning 0 can make long lists of empty rows appear.',
  }),

  // ---------------- CALCULATE & filter context ----------------
  measureEx({
    id: 'calc-removefilters-year',
    module: 'calculate',
    title: 'Share of all years',
    level: 'Intermediate',
    lesson: '`REMOVEFILTERS(table)` inside CALCULATE clears every filter on that table. It does the same job as ALL, but the name says exactly what it does.',
    task: "Create `% of All Years` = Total Sales divided by Total Sales with all filters on the **Date** table removed.",
    measure: m('% of All Years', "DIVIDE([Total Sales], CALCULATE([Total Sales], REMOVEFILTERS('Date')))", 'percent'),
    required: ['REMOVEFILTERS', 'CALCULATE'],
    rows: [YEAR],
    contexts: [[YEAR], [YM]],
    explanation: 'Each year shows its share of the two-year total. Grouped by month, the shares of all months add up to 100%.',
  }),
  measureEx({
    id: 'calc-allnoblankrow',
    module: 'calculate',
    title: 'Share of all products',
    level: 'Advanced',
    lesson: '`ALLNOBLANKROW(table)` removes filters like ALL, but ignores the hidden blank row Power BI adds when some sales have no matching product.',
    task: 'Create `% of All Products` = Total Sales divided by Total Sales with **ALLNOBLANKROW(Product)**.',
    measure: m('% of All Products', 'DIVIDE([Total Sales], CALCULATE([Total Sales], ALLNOBLANKROW(Product)))', 'percent'),
    required: ['ALLNOBLANKROW'],
    rows: [CATEGORY],
    contexts: [[CATEGORY], [f('Product', 'Product')]],
    explanation: 'Our model has no unmatched products, so ALL(Product) gives the same result. ALLNOBLANKROW matters with messy real-world keys.',
  }),
  measureEx({
    id: 'calc-keepfilters-red',
    module: 'calculate',
    title: 'Red products, respecting the visual',
    level: 'Advanced',
    lesson:
      'A normal CALCULATE filter **replaces** the filter on that column. `KEEPFILTERS(...)` **adds** to it instead, so a row for Black products shows blank rather than the red total.',
    task: 'Create `Red Sales` = Total Sales for `Product[Color] = "Red"`, wrapped in **KEEPFILTERS**.',
    measure: m('Red Sales', 'CALCULATE([Total Sales], KEEPFILTERS(Product[Color] = "Red"))', 'currency'),
    required: ['KEEPFILTERS', 'CALCULATE'],
    rows: [f('Product', 'Color')],
    contexts: [[f('Product', 'Color')], [CATEGORY], []],
    explanation: 'Without KEEPFILTERS, every color row would show the red total. With it, only the Red row has a value.',
  }),
  measureEx({
    id: 'calc-not-bikes',
    module: 'calculate',
    title: 'Everything except bikes',
    level: 'Intermediate',
    lesson: '`NOT(condition)` flips true and false. Inside CALCULATE, `NOT(Product[Category] = "Bikes")` keeps every category except Bikes.',
    task: 'Create `Non-Bike Sales` = Total Sales for every category that is **not** Bikes, using **NOT**.',
    measure: m('Non-Bike Sales', 'CALCULATE([Total Sales], NOT(Product[Category] = "Bikes"))', 'currency'),
    required: ['NOT', 'CALCULATE'],
    rows: [YEAR],
    contexts: [[], [YEAR], [SEGMENT]],
    explanation: 'The operator form `Product[Category] <> "Bikes"` gives the same result. NOT is handy for flipping a longer condition.',
  }),
  measureEx({
    id: 'calc-calculatetable-orders',
    module: 'calculate',
    title: 'Corporate orders',
    level: 'Advanced',
    lesson: '`CALCULATETABLE(table, filters)` is CALCULATE for tables: it returns a table evaluated with extra filters. Count it with COUNTROWS.',
    task: 'Create `Corporate Orders` = the number of distinct `Sales[OrderID]` values for the **Corporate** segment, using **CALCULATETABLE**.',
    measure: m('Corporate Orders', 'COUNTROWS(CALCULATETABLE(VALUES(Sales[OrderID]), Customer[Segment] = "Corporate"))', 'integer'),
    required: ['CALCULATETABLE', 'COUNTROWS'],
    rows: [YEAR],
    contexts: [[], [YEAR], [CATEGORY]],
    explanation: 'VALUES(Sales[OrderID]) lists the orders; CALCULATETABLE keeps only those from Corporate customers.',
  }),

  // ---------------- Advanced DAX: iterators & information ----------------
  measureEx({
    id: 'dax-averagex-order',
    module: 'dax-advanced',
    title: 'Average order value',
    level: 'Intermediate',
    lesson: '`AVERAGEX(table, expression)` evaluates the expression for each row of a table and averages the results. Iterate over the orders to average whole orders, not lines.',
    task: 'Create `Avg Order Value` = the average of Total Sales per `Sales[OrderID]`.',
    measure: m('Avg Order Value', 'AVERAGEX(VALUES(Sales[OrderID]), [Total Sales])', 'currency'),
    required: ['AVERAGEX'],
    rows: [SEGMENT],
    contexts: [[], [SEGMENT], [YEAR]],
    explanation: 'AVERAGE(Sales[Sales Amount]) would average lines. AVERAGEX over OrderID averages complete orders, which is what managers usually mean.',
  }),
  measureEx({
    id: 'dax-minx-order',
    module: 'dax-advanced',
    title: 'Smallest order',
    level: 'Intermediate',
    lesson: '`MINX(table, expression)` returns the smallest result of an expression evaluated row by row. Over the list of orders it finds the smallest order.',
    task: 'Create `Smallest Order` = the lowest Total Sales of a single `Sales[OrderID]`.',
    measure: m('Smallest Order', 'MINX(VALUES(Sales[OrderID]), [Total Sales])', 'currency'),
    required: ['MINX'],
    rows: [SEGMENT],
    contexts: [[], [SEGMENT], [YEAR]],
    explanation: 'The smallest orders are usually a single accessory. Knowing them helps when you set a minimum order value for free shipping.',
  }),
  measureEx({
    id: 'dax-countx-big-lines',
    module: 'dax-advanced',
    title: 'Lines over $1,000',
    level: 'Intermediate',
    lesson: '`COUNTX(table, expression)` counts the rows where the expression is not blank. Combine it with FILTER to count rows that meet a condition.',
    task: 'Create `Lines Over 1K` = the number of Sales rows with a Sales Amount above **1000**, using **COUNTX** and **FILTER**.',
    measure: m('Lines Over 1K', 'COUNTX(FILTER(Sales, Sales[Sales Amount] > 1000), Sales[Sales Amount])', 'integer'),
    required: ['COUNTX', 'FILTER'],
    rows: [CATEGORY],
    contexts: [[], [CATEGORY], [YEAR]],
    explanation: 'Most of these lines are bikes. COUNTROWS(FILTER(...)) would give the same result.',
  }),
  measureEx({
    id: 'dax-hasonevalue-blank',
    module: 'dax-advanced',
    title: 'Hide the total',
    level: 'Intermediate',
    lesson:
      '`HASONEVALUE(column)` is true when exactly one value of the column is filtered. Return `BLANK()` otherwise, and the total row stays empty. Useful for numbers that make no sense when added up.',
    task: 'Create `Category Sales` that returns Total Sales when exactly one category is filtered, and **BLANK()** otherwise.',
    measure: m('Category Sales', 'IF(HASONEVALUE(Product[Category]), [Total Sales], BLANK())', 'currency'),
    required: ['HASONEVALUE', 'BLANK'],
    rows: [CATEGORY],
    contexts: [[], [CATEGORY], [f('Product', 'Product')]],
    explanation: 'The total row has four categories, so it shows blank. Each product row belongs to one category, so it shows a value.',
  }),

  // ---------------- Time intelligence ----------------
  measureEx({
    id: 'time-totalmtd',
    module: 'time',
    title: 'Month-to-date',
    level: 'Beginner',
    lesson: '`TOTALMTD(expression, dates)` adds up from the first day of the month to the last date in context. At month level it equals the month total; at day level it grows day by day.',
    task: "Create `Sales MTD` using **TOTALMTD** and `'Date'[Date]`.",
    measure: m('Sales MTD', "TOTALMTD([Total Sales], 'Date'[Date])", 'currency'),
    required: ['TOTALMTD'],
    rows: [YM],
    contexts: [[YM], [f('Date', 'Date')]],
    explanation: 'On a daily chart, MTD shows how close the month is to its target at any point in time.',
  }),
  measureEx({
    id: 'time-datesytd',
    module: 'time',
    title: 'Year-to-date with CALCULATE',
    level: 'Intermediate',
    lesson: '`DATESYTD(dates)` returns the dates from 1 January up to the last date in context. Used as a CALCULATE filter, it gives the same result as TOTALYTD, but you can add more filters.',
    task: "Create `Sales YTD Calc` = CALCULATE of Total Sales with **DATESYTD('Date'[Date])**.",
    measure: m('Sales YTD Calc', "CALCULATE([Total Sales], DATESYTD('Date'[Date]))", 'currency'),
    required: ['DATESYTD', 'CALCULATE'],
    rows: [YM],
    contexts: [[YM], [YEAR]],
    explanation: 'TOTALYTD is a shortcut for exactly this CALCULATE + DATESYTD pattern.',
  }),
  measureEx({
    id: 'time-datesqtd',
    module: 'time',
    title: 'Quarter-to-date with CALCULATE',
    level: 'Intermediate',
    lesson: '`DATESQTD(dates)` returns the dates from the start of the quarter to the last date in context.',
    task: "Create `Sales QTD Calc` = CALCULATE of Total Sales with **DATESQTD('Date'[Date])**.",
    measure: m('Sales QTD Calc', "CALCULATE([Total Sales], DATESQTD('Date'[Date]))", 'currency'),
    required: ['DATESQTD', 'CALCULATE'],
    rows: [YM],
    contexts: [[YM]],
    explanation: 'The running total restarts in January, April, July and October.',
  }),
  measureEx({
    id: 'time-datesmtd',
    module: 'time',
    title: 'Month-to-date for bikes',
    level: 'Intermediate',
    lesson: 'With `DATESMTD(dates)` inside CALCULATE you can combine month-to-date with other filters, something TOTALMTD alone makes awkward.',
    task: 'Create `Bike Sales MTD` = Total Sales for **Bikes**, month-to-date, using **DATESMTD**.',
    measure: m('Bike Sales MTD', "CALCULATE([Total Sales], DATESMTD('Date'[Date]), Product[Category] = \"Bikes\")", 'currency'),
    required: ['DATESMTD', 'CALCULATE'],
    rows: [YM],
    contexts: [[YM], [f('Date', 'Date')]],
    explanation: 'CALCULATE accepts several filters at once: the dates from DATESMTD and the category filter are both applied.',
  }),
  measureEx({
    id: 'time-dateadd-3m',
    module: 'time',
    title: 'Three months ago',
    level: 'Intermediate',
    lesson: '`DATEADD(dates, number, interval)` shifts the dates in context. A negative number goes back in time; the interval can be DAY, MONTH, QUARTER or YEAR.',
    task: 'Create `Sales 3M Ago` = Total Sales three months earlier, using **DATEADD**.',
    measure: m('Sales 3M Ago', "CALCULATE([Total Sales], DATEADD('Date'[Date], -3, MONTH))", 'currency'),
    required: ['DATEADD', 'CALCULATE'],
    rows: [YM],
    contexts: [[YM]],
    explanation: 'The first three months are blank, because there is no data before January 2024.',
  }),
  measureEx({
    id: 'time-previousyear',
    module: 'time',
    title: 'Previous year',
    level: 'Beginner',
    lesson: '`PREVIOUSYEAR(dates)` returns all the dates of the year before the current one. Unlike SAMEPERIODLASTYEAR, it always returns the **whole** previous year.',
    task: 'Create `Sales PY` = Total Sales of the previous year, using **PREVIOUSYEAR**.',
    measure: m('Sales PY', "CALCULATE([Total Sales], PREVIOUSYEAR('Date'[Date]))", 'currency'),
    required: ['PREVIOUSYEAR', 'CALCULATE'],
    rows: [YEAR],
    contexts: [[YEAR], [YM]],
    explanation: 'Grouped by month, every 2025 month shows the full 2024 total. That is the difference from SAMEPERIODLASTYEAR.',
  }),
  measureEx({
    id: 'time-datesbetween-h1',
    module: 'time',
    title: 'First half of 2025',
    level: 'Intermediate',
    lesson: '`DATESBETWEEN(dates, start, end)` returns the dates in a fixed range. Build the start and end with `DATE(year, month, day)`.',
    task: 'Create `H1 2025 Sales` = Total Sales from **1 January 2025** to **30 June 2025**.',
    measure: m('H1 2025 Sales', "CALCULATE([Total Sales], DATESBETWEEN('Date'[Date], DATE(2025, 1, 1), DATE(2025, 6, 30)))", 'currency'),
    required: ['DATESBETWEEN', 'DATE'],
    rows: [CATEGORY],
    contexts: [[], [CATEGORY]],
    explanation: 'A fixed range ignores the Year filter from the visual, just like CALCULATE with a fixed year.',
  }),

  // ---------------- Calculated columns ----------------
  columnEx({
    id: 'col-and-premium',
    title: 'Premium bikes',
    level: 'Intermediate',
    lesson: '`AND(a, b)` is true only when both conditions are true. It takes exactly two conditions; for more, use the && operator.',
    task: 'In the **Product** table, create `Premium` = **"Yes"** when the category is Bikes **and** the List Price is at least 1000, otherwise **"No"**.',
    column: col('Product', 'Premium', 'IF(AND(Product[Category] = "Bikes", Product[List Price] >= 1000), "Yes", "No")'),
    show: [f('Product', 'Product')],
    explanation: 'Trail Bike and Road Bike are premium. A Wheel Set is not a bike, and a City Bike is under 1000.',
  }),
  columnEx({
    id: 'col-or-west-coast',
    title: 'West Coast customers',
    level: 'Beginner',
    lesson: '`OR(a, b)` is true when at least one of the two conditions is true. The || operator does the same and accepts more conditions.',
    task: 'In the **Customer** table, create `Coast` = **"West Coast"** when the State is CA **or** WA, otherwise **"Other"**.',
    column: col('Customer', 'Coast', 'IF(OR(Customer[State] = "CA", Customer[State] = "WA"), "West Coast", "Other")'),
    show: [f('Customer', 'Customer'), f('Customer', 'State')],
    explanation: 'Tom, who manages the West region, can now filter his customers with a single slicer.',
  }),
  columnEx({
    id: 'col-true-false',
    title: 'True or false flag',
    level: 'Beginner',
    lesson: '`TRUE()` and `FALSE()` return the logical values. A true/false column is a compact flag you can use in filters and in other formulas.',
    task: 'In the **Product** table, create `Is Bike` = **TRUE()** when the category is Bikes, otherwise **FALSE()**.',
    column: col('Product', 'Is Bike', 'IF(Product[Category] = "Bikes", TRUE(), FALSE())'),
    show: [f('Product', 'Product')],
    explanation: 'The shorter `Product[Category] = "Bikes"` returns the same true/false value, because a comparison already is a condition.',
  }),
  columnEx({
    id: 'col-int-price',
    title: 'Whole-dollar price',
    level: 'Beginner',
    lesson: '`INT(number)` rounds down to the nearest whole number: 64.99 becomes 64.',
    task: 'In the **Sales** table, create `Whole Price` = `Sales[Unit Price]` rounded down to a whole number with **INT**.',
    column: col('Sales', 'Whole Price', 'INT(Sales[Unit Price])'),
    show: [f('Sales', 'OrderID')],
    explanation: 'INT always rounds down, while ROUND(x, 0) rounds to the nearest whole number.',
  }),
  columnEx({
    id: 'col-concatenate-location',
    title: 'City and state',
    level: 'Beginner',
    lesson: '`CONCATENATE(text1, text2)` joins two pieces of text. It takes exactly two, so join more with the & operator.',
    task: 'In the **Customer** table, create `Location` = City, a comma and a space, then State (for example **Austin, TX**).',
    column: col('Customer', 'Location', 'CONCATENATE(Customer[City], ", " & Customer[State])'),
    show: [f('Customer', 'Customer')],
    explanation: 'Customer[City] & ", " & Customer[State] gives the same text and is easier to extend.',
  }),
  columnEx({
    id: 'col-year-order',
    title: 'Order year',
    level: 'Beginner',
    lesson: '`YEAR(date)` returns the year of a date as a number.',
    task: 'In the **Sales** table, create `Order Year` = the year of `Sales[Order Date]`.',
    column: col('Sales', 'Order Year', 'YEAR(Sales[Order Date])'),
    show: [f('Sales', 'OrderID')],
    explanation: "In a proper model you would use 'Date'[Year] through the relationship. YEAR is handy for quick checks or tables without a Date table.",
  }),
  columnEx({
    id: 'col-day-late-month',
    title: 'Late-month orders',
    level: 'Intermediate',
    lesson: '`DAY(date)` returns the day of the month, from 1 to 31.',
    task: 'In the **Sales** table, create `Month Part` = **"Late"** when the day of `Sales[Order Date]` is 25 or more, otherwise **"Early"**.',
    column: col('Sales', 'Month Part', 'IF(DAY(Sales[Order Date]) >= 25, "Late", "Early")'),
    show: [f('Sales', 'OrderID')],
    explanation: 'Elena can now check whether orders pile up at the end of the month, when sales reps chase their targets.',
  }),
];
