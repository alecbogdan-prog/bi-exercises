import { EXERCISES } from '../exercises/exercises';
import type { Exercise } from '../exercises/types';

export type DaxCategory =
  | 'Aggregation'
  | 'Iterators'
  | 'Filter'
  | 'Time intelligence'
  | 'Logical'
  | 'Information'
  | 'Relationships'
  | 'Math'
  | 'Text'
  | 'Date';

export interface DaxFunction {
  name: string;
  category: DaxCategory;
  syntax: string;
  description: string;
  example: string;
}

export const DAX_CATEGORIES: { id: DaxCategory; title: string; blurb: string }[] = [
  { id: 'Aggregation', title: 'Aggregation functions', blurb: 'Summarize a whole column into one number: totals, averages, counts, highest and lowest.' },
  { id: 'Iterators', title: 'Iterator (X) functions', blurb: 'Go row by row through a table, calculate an expression for each row, then aggregate the results.' },
  { id: 'Filter', title: 'Filter and CALCULATE functions', blurb: 'Change the filter context: add filters, remove them, or keep the ones already there.' },
  { id: 'Time intelligence', title: 'Time intelligence functions', blurb: 'Year-to-date, last year, previous month and other period comparisons. They need a proper Date table.' },
  { id: 'Logical', title: 'Logical functions', blurb: 'Make decisions inside a formula: IF this, SWITCH between cases, combine conditions.' },
  { id: 'Information', title: 'Information functions', blurb: 'Ask questions about the current context: is it blank, is there exactly one value, which value is selected.' },
  { id: 'Relationships', title: 'Relationship functions', blurb: 'Reach across relationships to read values from a related table.' },
  { id: 'Math', title: 'Math functions', blurb: 'Safe division, rounding and other arithmetic.' },
  { id: 'Text', title: 'Text functions', blurb: 'Join and build text values.' },
  { id: 'Date', title: 'Date functions', blurb: 'Build dates and pull out their year, month or day.' },
];

const f = (name: string, category: DaxCategory, syntax: string, description: string, example: string): DaxFunction => ({ name, category, syntax, description, example });

export const DAX_FUNCTIONS: DaxFunction[] = [
  // Aggregation
  f('SUM', 'Aggregation', 'SUM(<column>)', 'Adds up all the numbers in a column, for whatever rows are visible in the current filter context.', 'Total Sales = SUM(Sales[Sales Amount])'),
  f('AVERAGE', 'Aggregation', 'AVERAGE(<column>)', 'Returns the arithmetic mean of the numbers in a column. Blank values are ignored.', 'Avg Line Amount = AVERAGE(Sales[Sales Amount])'),
  f('MIN', 'Aggregation', 'MIN(<column>)', 'Returns the smallest value in a column, or the smaller of two values.', 'Lowest Price = MIN(Product[List Price])'),
  f('MAX', 'Aggregation', 'MAX(<column>)', 'Returns the largest value in a column, or the larger of two values.', 'Last Order Date = MAX(Sales[Order Date])'),
  f('COUNT', 'Aggregation', 'COUNT(<column>)', 'Counts the non-blank numbers or dates in a column.', 'Lines With Qty = COUNT(Sales[Quantity])'),
  f('COUNTA', 'Aggregation', 'COUNTA(<column>)', 'Counts the non-blank values in a column of any type, including text.', 'Named Customers = COUNTA(Customer[Customer])'),
  f('COUNTROWS', 'Aggregation', 'COUNTROWS([<table>])', 'Counts the rows of a table. The usual way to count orders or transactions.', 'Orders = COUNTROWS(Sales)'),
  f('DISTINCTCOUNT', 'Aggregation', 'DISTINCTCOUNT(<column>)', 'Counts how many different values a column has, such as unique customers.', 'Customers Buying = DISTINCTCOUNT(Sales[CustomerKey])'),

  // Iterators
  f('SUMX', 'Iterators', 'SUMX(<table>, <expression>)', 'Calculates an expression on every row of a table and adds the results. Use it when the number you need is not stored in one column.', 'Revenue = SUMX(Sales, Sales[Quantity] * Sales[Unit Price])'),
  f('AVERAGEX', 'Iterators', 'AVERAGEX(<table>, <expression>)', 'Calculates an expression for each row of a table and averages the results.', 'Avg Sales per Customer = AVERAGEX(VALUES(Customer[Customer]), [Total Sales])'),
  f('MINX', 'Iterators', 'MINX(<table>, <expression>)', 'Returns the smallest result of an expression evaluated row by row.', 'Smallest Line = MINX(Sales, Sales[Quantity] * Sales[Unit Price])'),
  f('MAXX', 'Iterators', 'MAXX(<table>, <expression>)', 'Returns the largest result of an expression evaluated row by row.', 'Biggest Line = MAXX(Sales, Sales[Sales Amount])'),
  f('COUNTX', 'Iterators', 'COUNTX(<table>, <expression>)', 'Counts the rows where an expression returns a non-blank value.', 'Priced Lines = COUNTX(Sales, Sales[Unit Price])'),
  f('RANKX', 'Iterators', 'RANKX(<table>, <expression>[, <value>[, <order>]])', 'Ranks each item by an expression, for example products by revenue. Ties share the same rank.', 'Product Rank = RANKX(ALL(Product[Product]), [Total Sales])'),

  // Filter
  f('CALCULATE', 'Filter', 'CALCULATE(<expression>[, <filter1>, ...])', 'Evaluates an expression in a modified filter context. The most important function in DAX.', 'Bike Sales = CALCULATE([Total Sales], Product[Category] = "Bikes")'),
  f('CALCULATETABLE', 'Filter', 'CALCULATETABLE(<table>[, <filter1>, ...])', 'Like CALCULATE, but returns a table instead of a single value.', 'CALCULATETABLE(Sales, Customer[Segment] = "Corporate")'),
  f('FILTER', 'Filter', 'FILTER(<table>, <condition>)', 'Returns only the rows of a table that meet a condition. Often used inside CALCULATE or an iterator.', 'Big Orders = COUNTROWS(FILTER(Sales, Sales[Sales Amount] > 1000))'),
  f('ALL', 'Filter', 'ALL([<table> | <column>, ...])', 'Removes filters from a table or columns. Used for grand totals and percent-of-total.', '% of Total = DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Product)))'),
  f('ALLEXCEPT', 'Filter', 'ALLEXCEPT(<table>, <column>[, ...])', 'Removes every filter on a table except the ones on the columns you list.', '% of Category = DIVIDE([Total Sales], CALCULATE([Total Sales], ALLEXCEPT(Product, Product[Category])))'),
  f('ALLNOBLANKROW', 'Filter', 'ALLNOBLANKROW(<table> | <column>)', 'Like ALL, but skips the blank row added for unmatched keys.', 'CALCULATE([Total Sales], ALLNOBLANKROW(Product))'),
  f('REMOVEFILTERS', 'Filter', 'REMOVEFILTERS([<table> | <column>, ...])', 'Clears filters inside CALCULATE. A more readable alternative to ALL.', 'All Years = CALCULATE([Total Sales], REMOVEFILTERS(\'Date\'))'),
  f('KEEPFILTERS', 'Filter', 'KEEPFILTERS(<filter>)', 'Adds a filter on top of the existing ones instead of replacing them.', 'CALCULATE([Total Sales], KEEPFILTERS(Product[Color] = "Red"))'),
  f('VALUES', 'Filter', 'VALUES(<column> | <table>)', 'Returns the distinct values of a column that are visible in the current filter context.', 'COUNTROWS(VALUES(Customer[City]))'),
  f('TOPN', 'Filter', 'TOPN(<n>, <table>, <orderBy>[, <order>])', 'Returns the top n rows of a table by an expression, for example the 3 best-selling products. Ties are included.', 'SUMX(TOPN(3, VALUES(Product[Product]), [Total Sales]), [Total Sales])'),
  f('DISTINCT', 'Filter', 'DISTINCT(<column>)', 'Returns a one-column table of the distinct values in a column.', 'COUNTROWS(DISTINCT(Sales[CustomerKey]))'),

  // Time intelligence
  f('TOTALYTD', 'Time intelligence', 'TOTALYTD(<expression>, <dates>)', 'Running total from the start of the year up to the current date in the visual.', "Sales YTD = TOTALYTD([Total Sales], 'Date'[Date])"),
  f('TOTALQTD', 'Time intelligence', 'TOTALQTD(<expression>, <dates>)', 'Running total from the start of the quarter.', "Sales QTD = TOTALQTD([Total Sales], 'Date'[Date])"),
  f('TOTALMTD', 'Time intelligence', 'TOTALMTD(<expression>, <dates>)', 'Running total from the start of the month.', "Sales MTD = TOTALMTD([Total Sales], 'Date'[Date])"),
  f('DATESYTD', 'Time intelligence', 'DATESYTD(<dates>)', 'Returns the dates from the start of the year to the last visible date. Use it as a CALCULATE filter.', "CALCULATE([Total Sales], DATESYTD('Date'[Date]))"),
  f('DATESQTD', 'Time intelligence', 'DATESQTD(<dates>)', 'Returns the dates from the start of the quarter to the last visible date.', "CALCULATE([Total Sales], DATESQTD('Date'[Date]))"),
  f('DATESMTD', 'Time intelligence', 'DATESMTD(<dates>)', 'Returns the dates from the start of the month to the last visible date.', "CALCULATE([Total Sales], DATESMTD('Date'[Date]))"),
  f('SAMEPERIODLASTYEAR', 'Time intelligence', 'SAMEPERIODLASTYEAR(<dates>)', 'Shifts the visible dates back exactly one year, for year-over-year comparisons.', "Sales LY = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))"),
  f('DATEADD', 'Time intelligence', 'DATEADD(<dates>, <number>, <interval>)', 'Shifts the visible dates by a number of days, months, quarters or years.', "Sales PM = CALCULATE([Total Sales], DATEADD('Date'[Date], -1, MONTH))"),
  f('PREVIOUSMONTH', 'Time intelligence', 'PREVIOUSMONTH(<dates>)', 'Returns all dates of the month before the current one.', "Sales PM = CALCULATE([Total Sales], PREVIOUSMONTH('Date'[Date]))"),
  f('PREVIOUSYEAR', 'Time intelligence', 'PREVIOUSYEAR(<dates>)', 'Returns all dates of the year before the current one.', "Sales PY = CALCULATE([Total Sales], PREVIOUSYEAR('Date'[Date]))"),
  f('DATESINPERIOD', 'Time intelligence', 'DATESINPERIOD(<dates>, <start>, <number>, <interval>)', 'Returns a window of dates, such as the last 3 months up to a date. The base of rolling totals and moving averages.', "Sales Last 3M = CALCULATE([Total Sales], DATESINPERIOD('Date'[Date], MAX('Date'[Date]), -3, MONTH))"),
  f('PARALLELPERIOD', 'Time intelligence', 'PARALLELPERIOD(<dates>, <number>, <interval>)', 'Shifts the dates in context by whole months, quarters or years and always returns complete periods.', "Sales PQ = CALCULATE([Total Sales], PARALLELPERIOD('Date'[Date], -1, QUARTER))"),
  f('DATESBETWEEN', 'Time intelligence', 'DATESBETWEEN(<dates>, <start>, <end>)', 'Returns the dates between two dates, inclusive.', "CALCULATE([Total Sales], DATESBETWEEN('Date'[Date], DATE(2025,1,1), DATE(2025,6,30)))"),

  // Logical
  f('IF', 'Logical', 'IF(<condition>, <then>[, <else>])', 'Returns one value when a condition is true and another when it is false.', 'Price Band = IF(Product[List Price] >= 1000, "Premium", "Standard")'),
  f('SWITCH', 'Logical', 'SWITCH(<expression>, <value1>, <result1>, ...[, <else>])', 'Picks a result from a list of cases. SWITCH(TRUE(), ...) works like a chain of IFs.', 'Region = SWITCH(Customer[State], "CA", "West", "WA", "West", "East")'),
  f('AND', 'Logical', 'AND(<condition1>, <condition2>)', 'True only when both conditions are true. The && operator does the same.', 'AND(Sales[Quantity] > 1, Sales[Sales Amount] > 500)'),
  f('OR', 'Logical', 'OR(<condition1>, <condition2>)', 'True when at least one condition is true. The || operator does the same.', 'OR(Customer[State] = "CA", Customer[State] = "WA")'),
  f('NOT', 'Logical', 'NOT(<condition>)', 'Turns true into false and false into true.', 'NOT(ISBLANK([Total Sales]))'),
  f('TRUE', 'Logical', 'TRUE()', 'Returns the logical value true. Common as the first argument of SWITCH.', 'SWITCH(TRUE(), [Total Sales] > 10000, "High", "Low")'),
  f('FALSE', 'Logical', 'FALSE()', 'Returns the logical value false.', 'IF([Total Sales] > 0, TRUE(), FALSE())'),

  // Information
  f('ISBLANK', 'Information', 'ISBLANK(<value>)', 'Checks whether a value is blank, for example a measure with no sales.', 'IF(ISBLANK([Total Sales]), 0, [Total Sales])'),
  f('HASONEVALUE', 'Information', 'HASONEVALUE(<column>)', 'True when the filter context leaves exactly one value in a column. Useful to hide totals.', 'IF(HASONEVALUE(Product[Category]), [Total Sales])'),
  f('SELECTEDVALUE', 'Information', 'SELECTEDVALUE(<column>[, <alternate>])', 'Returns the single selected value of a column, or an alternate result when there are several.', 'Selected Category = SELECTEDVALUE(Product[Category], "All categories")'),
  f('ISINSCOPE', 'Information', 'ISINSCOPE(<column>)', 'True when the current cell is at the level of this column in a matrix hierarchy. Used to change a measure on subtotal rows.', 'IF(ISINSCOPE(Product[Product]), [Total Sales], BLANK())'),
  f('BLANK', 'Information', 'BLANK()', 'Returns a blank. Visuals hide rows where every measure is blank.', 'IF([Total Sales] = 0, BLANK(), [Total Sales])'),

  // Relationships
  f('RELATED', 'Relationships', 'RELATED(<column>)', 'Reads a value from the "one" side of a relationship, inside a calculated column or an iterator.', 'Margin = Sales[Sales Amount] - Sales[Quantity] * RELATED(Product[Unit Cost])'),

  // Math
  f('LOOKUPVALUE', 'Relationships', 'LOOKUPVALUE(<result column>, <search column>, <search value>[, ...][, <alternate>])', 'Finds a value in another table by matching one or more columns, like XLOOKUP in Excel. Works without a relationship.', 'LOOKUPVALUE(Product[List Price], Product[ProductID], Sales[ProductID])'),
  f('DIVIDE', 'Math', 'DIVIDE(<numerator>, <denominator>[, <alternate>])', 'Divides safely: returns blank (or your alternate value) instead of an error when dividing by zero.', 'Margin % = DIVIDE([Profit], [Total Sales])'),
  f('ROUND', 'Math', 'ROUND(<number>, <digits>)', 'Rounds a number to the given number of decimal places.', 'ROUND([Margin %], 2)'),
  f('ABS', 'Math', 'ABS(<number>)', 'Returns the absolute value of a number, without its sign.', 'ABS([Sales] - [Target])'),
  f('INT', 'Math', 'INT(<number>)', 'Rounds a number down to the nearest whole number.', 'INT(Sales[Sales Amount] / 100)'),

  // Text
  f('CONCATENATE', 'Text', 'CONCATENATE(<text1>, <text2>)', 'Joins two text values. The & operator joins as many as you like.', 'Location = CONCATENATE(Customer[City], ", " & Customer[State])'),

  f('CONCATENATEX', 'Text', 'CONCATENATEX(<table>, <expression>[, <delimiter>[, <orderBy>, <order>]])', 'Joins text from every row of a table into one string, with a delimiter and an optional sort order.', 'CONCATENATEX(VALUES(Product[Product]), Product[Product], ", ", Product[Product], ASC)'),

  // Date
  f('DATE', 'Date', 'DATE(<year>, <month>, <day>)', 'Builds a date from a year, month and day.', 'DATE(2025, 12, 31)'),
  f('YEAR', 'Date', 'YEAR(<date>)', 'Returns the year of a date.', "Year = YEAR('Date'[Date])"),
  f('MONTH', 'Date', 'MONTH(<date>)', 'Returns the month number (1–12) of a date.', "Half = IF(MONTH('Date'[Date]) <= 6, \"H1\", \"H2\")"),
  f('DATEDIFF', 'Date', 'DATEDIFF(<start>, <end>, <interval>)', 'Counts the days, weeks, months, quarters or years between two dates.', 'DATEDIFF(MIN(Sales[Order Date]), MAX(Sales[Order Date]), DAY)'),
  f('EOMONTH', 'Date', 'EOMONTH(<date>, <months>)', 'Returns the last day of the month, after moving a number of months. 0 means the same month.', 'Month End = EOMONTH(Sales[Order Date], 0)'),
  f('DAY', 'Date', 'DAY(<date>)', 'Returns the day of the month (1–31) of a date.', "Day = DAY('Date'[Date])"),
];

/** DAX the learner writes in an exercise (measures already given in the model don't count). */
function expressionsOf(e: Exercise): string[] {
  return [...(e.solution.measures ?? []), ...(e.solution.columns ?? [])].map((m) => m.expression);
}

/** Exercises where writing DAX is the task come first. */
const rank = (e: Exercise) => (e.check.kind === 'dax' || e.check.kind === 'column' ? 0 : 1);

/** Function names (upper-case) called in an expression. */
export function functionsIn(expr: string): string[] {
  const noStrings = expr.replace(/"[^"]*"/g, '""');
  return [...new Set([...noStrings.matchAll(/\b([A-Z][A-Z0-9.]*)\s*\(/gi)].map((m) => m[1].toUpperCase()))];
}

/** Exercises whose solution uses each function, keyed by function name. */
export function exercisesByFunction(): Map<string, Exercise[]> {
  const map = new Map<string, Exercise[]>();
  for (const e of EXERCISES) {
    for (const name of new Set(expressionsOf(e).flatMap(functionsIn))) {
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(e);
    }
  }
  for (const list of map.values()) list.sort((a, b) => rank(a) - rank(b));
  return map;
}

export interface DaxArgument {
  name: string;
  optional: boolean;
  description: string;
}

const ARG_DOCS: Record<string, string> = {
  column: 'The column to work on, written as Table[Column].',
  table: 'A table, or a table expression such as FILTER(...) or VALUES(...).',
  'table | column': 'A table, or one or more columns, whose filters are removed.',
  'column | table': 'A column (returns its distinct values) or a table (returns its rows).',
  expression: 'The value to calculate, usually a measure such as [Total Sales] or a formula on the current row.',
  dates: "The date column of your Date table, for example 'Date'[Date].",
  number: 'A number, or an expression that returns a number.',
  date: 'A date value or a date column.',
  condition: 'An expression that returns TRUE or FALSE.',
  condition1: 'The first condition, which returns TRUE or FALSE.',
  condition2: 'The second condition, which returns TRUE or FALSE.',
  value: 'The value to test.',
  filter: 'A filter condition, such as Product[Color] = "Red".',
  filter1: 'One or more filters, separated by commas: a condition such as Product[Category] = "Bikes", or a table function such as ALL(...) or DATESYTD(...).',
  then: 'The result when the condition is TRUE.',
  else: 'The result when the condition is FALSE. If you leave it out, BLANK is returned.',
  value1: 'A value to compare with the expression. Add as many value/result pairs as you need.',
  result1: 'The result returned when the expression equals the value before it.',
  alternate: 'The result to return instead of BLANK. If you leave it out, BLANK is returned.',
  numerator: 'The number to divide.',
  denominator: 'The number to divide by. When it is 0 or blank, DIVIDE returns the alternate result instead of an error.',
  digits: 'How many decimal places to keep. 0 rounds to a whole number; a negative number rounds to tens, hundreds and so on.',
  text1: 'The first piece of text.',
  text2: 'The second piece of text. Join more than two with the & operator.',
  year: 'The year, for example 2025.',
  month: 'The month number, 1 to 12.',
  day: 'The day of the month, 1 to 31.',
  start: 'The first date of the range, for example DATE(2025, 1, 1).',
  end: 'The last date of the range, included in the result.',
  interval: 'The unit to shift by: DAY, MONTH, QUARTER or YEAR.',
  order: 'ASC or DESC. DESC (the default) gives rank 1 to the highest value.',
  n: 'How many rows to return.',
  orderBy: 'The expression to sort by, usually a measure such as [Total Sales].',
  'result column': 'The column whose value you want back.',
  'search column': 'The column to search in.',
  'search value': 'The value to look for in the search column.',
  delimiter: 'The text placed between values, such as ", ".',
  months: 'How many months to move before taking the end of the month. 0 is the same month, -1 the previous one.',
};

const ARG_OVERRIDES: Record<string, Record<string, string>> = {
  DATESINPERIOD: { start: 'The date the window starts from, usually MAX(\'Date\'[Date]).', number: 'How many intervals the window covers. Negative numbers go back in time.' },
  PARALLELPERIOD: { number: 'How many periods to shift. -1 is the previous period.' },
  DATEDIFF: { start: 'The first date.', end: 'The second date.', interval: 'DAY, WEEK, MONTH, QUARTER or YEAR.' },
  TOPN: { table: 'The rows to choose from, for example VALUES(Product[Product]).' },
  CONCATENATEX: { expression: 'The text to take from each row.', orderBy: 'Optional: the expression to sort by.', order: 'ASC or DESC.' },
  LOOKUPVALUE: { alternate: 'Optional: the result when nothing is found.' },
  RANKX: {
    table: 'The items to rank, usually ALL(Table[Column]) so every item is compared.',
    expression: 'The value to rank by, such as [Total Sales].',
    value: 'Leave it empty (two commas) to rank the current item, as most reports do.',
  },
  MIN: { column: 'The column to search. You can also pass two values and get the smaller one.' },
  MAX: { column: 'The column to search. You can also pass two values and get the larger one.' },
  DATEADD: { number: 'How many intervals to shift. Negative numbers go back in time.' },
  SWITCH: { expression: 'The value to compare, or TRUE() to test a list of conditions in order.', else: 'The result when no value matches.' },
  FILTER: { condition: 'A condition evaluated for each row. Only rows where it is TRUE are kept.' },
  KEEPFILTERS: { filter: 'The filter to add on top of the existing filters instead of replacing them.' },
};

/** The arguments of a function, read from its syntax line. */
export function argumentsOf(fn: DaxFunction): DaxArgument[] {
  const inner = fn.syntax.slice(fn.syntax.indexOf('(') + 1, fn.syntax.lastIndexOf(')'));
  const out: DaxArgument[] = [];
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    else if (ch === '<') {
      const m = /^<([^>]+)>(\s*\|\s*<([^>]+)>)?/.exec(inner.slice(i));
      if (!m) continue;
      const name = m[3] ? `${m[1]} | ${m[3]}` : m[1];
      const description = ARG_OVERRIDES[fn.name]?.[name] ?? ARG_DOCS[name] ?? '';
      out.push({ name: name.replace(' | ', ' or '), optional: depth > 0, description });
      i += m[0].length - 1;
    }
  }
  return out;
}

export function functionBySlug(slug: string): DaxFunction | undefined {
  return DAX_FUNCTIONS.find((f) => f.name.toLowerCase() === slug.toLowerCase());
}
