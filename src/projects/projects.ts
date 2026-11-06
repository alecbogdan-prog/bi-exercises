// End-to-end projects: each one is a chain of steps that ends in a finished dashboard. Original content.
import { sampleModel } from '../engine/dataset';
import type { DatasetId } from '../engine/datasets';
import type { Measure, Relationship } from '../engine/model';
import type { Step } from '../engine/query';
import type { FieldRef, ValueField, VisualSpec, VisualType } from '../engine/visual';
import { emptySpec } from '../engine/visual';
import type { Person } from '../exercises/scenarios';
import { DANA, MARCUS, NINA, OSKAR, PRIYA, RAY, SAM } from '../exercises/scenarios';
import type { Exercise, ModuleId } from '../exercises/types';

const f = (table: string, column: string): FieldRef => ({ table, column });
const meas = (name: string): ValueField => ({ kind: 'measure', name });
const spec = (s: Partial<VisualSpec>): VisualSpec => ({ ...emptySpec(), ...s });
const m = (name: string, expression: string, format?: Measure['format']): Measure => ({ name, table: 'Sales', expression, format });

export interface Project {
  id: string;
  title: string;
  /** One line for cards. */
  tagline: string;
  free: boolean;
  /** The kickoff message that frames the whole project. */
  brief: { from: Person; message: string };
  /** What the learner practices, shown as chips. */
  skills: string[];
  /** The sample dataset the project runs on (the bike shop when unset). */
  dataset?: DatasetId;
  steps: Exercise[];
}

interface StepDef {
  title: string;
  level: Exercise['level'];
  module: ModuleId;
  lesson: string;
  task: string[];
  hints: string[];
  from: Person;
  message: string;
  deliver: string;
  explanation: string;
  /** A measure the learner writes in this step (it becomes "given" in later steps). */
  measure?: Measure;
  /** For report steps: the finished visual. For measure steps: the visual that shows the new measure. */
  visual: VisualSpec;
  /** Report steps: allowed visual types. */
  types?: VisualType[];
  contexts?: FieldRef[][];
  required?: string[];
  conditional?: { valueIndex: number; background?: boolean; dataBars?: boolean };
  query?: { source: string; steps: Step[] };
  relationships?: { starter: Relationship[]; required: Relationship[] };
  /** Shown as a tile on the project dashboard (not for Power Query and model steps). */
  tile?: string;
}

const TIMES = ['Mon 9:00 AM', 'Mon 10:30 AM', 'Mon 1:15 PM', 'Mon 3:40 PM', 'Tue 9:10 AM', 'Tue 11:20 AM', 'Tue 2:05 PM', 'Tue 4:30 PM', 'Wed 9:45 AM', 'Wed 1:00 PM'];

function buildProject(p: Omit<Project, 'steps'> & { base?: Measure[]; defs: StepDef[] }): Project {
  const given: Measure[] = [...(p.base ?? [])];
  const steps = p.defs.map((d, i): Exercise => {
    const id = `${p.id}-${i + 1}`;
    const givenNow = [...given];
    if (d.measure) given.push(d.measure);
    const common = {
      id,
      project: p.id,
      dataset: p.dataset,
      module: d.module,
      title: d.title,
      level: d.level,
      free: p.free,
      lesson: d.lesson,
      task: d.task,
      hints: d.hints,
      givenMeasures: givenNow,
      explanation: d.explanation,
      scenario: { from: d.from, time: TIMES[i % TIMES.length], message: d.message, deliver: d.deliver },
    };
    if (d.query) {
      return {
        ...common,
        starter: emptySpec('table'),
        solution: { spec: emptySpec('table'), steps: d.query.steps },
        check: { kind: 'query' },
        query: { source: d.query.source },
      };
    }
    if (d.relationships) {
      return {
        ...common,
        starterRelationships: d.relationships.starter,
        starter: d.visual,
        solution: { spec: d.visual, relationships: sampleModel().relationships },
        check: { kind: 'model', required: d.relationships.required, report: { kind: 'report', allowedTypes: [d.visual.type] } },
      };
    }
    if (d.measure) {
      return {
        ...common,
        starter: d.visual,
        solution: { spec: d.visual, measures: [d.measure] },
        check: { kind: 'dax', measureName: d.measure.name, requiredFunctions: d.required, contexts: d.contexts ?? [[]] },
      };
    }
    return {
      ...common,
      starter: spec({ type: 'column' }),
      solution: { spec: d.visual },
      check: { kind: 'report', allowedTypes: d.types ?? [d.visual.type], requireConditional: d.conditional },
    };
  });
  return { ...p, steps };
}

/** Tiles of the finished dashboard, in step order. */
export function dashboardTiles(p: Project): { step: Exercise; title: string; spec: VisualSpec }[] {
  const defs = DEFS[p.id];
  return p.steps.flatMap((s, i) => (defs[i].tile ? [{ step: s, title: defs[i].tile!, spec: s.solution.spec }] : []));
}

/** Every measure the project builds, for rendering its dashboard. */
export function projectMeasures(p: Project): Measure[] {
  const all = [...(BASES[p.id] ?? []), ...p.steps.flatMap((s) => s.solution.measures ?? [])];
  return all.filter((x, i) => all.findIndex((y) => y.name === x.name) === i);
}

// ---------------------------------------------------------------------------
// Project 1: Sales Overview Dashboard
// ---------------------------------------------------------------------------

const TOTAL_SALES = m('Total Sales', 'SUM(Sales[Sales Amount])', 'currency');
const ORDERS = m('Orders', 'DISTINCTCOUNT(Sales[OrderID])', 'integer');
const AOV = m('Avg Order Value', 'DIVIDE([Total Sales], [Orders])', 'currency');
const SALES_YTD = m('Sales YTD', "TOTALYTD([Total Sales], 'Date'[Date])", 'currency');
const SALES_LY = m('Sales LY', "CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))", 'currency');
const YOY = m('YoY %', 'DIVIDE([Total Sales] - [Sales LY], [Sales LY])', 'percent');

const YM = f('Date', 'Year Month');
const YEAR = f('Date', 'Year');

const SALES_DEFS: StepDef[] = [
  {
    title: 'The headline number',
    level: 'Beginner',
    module: 'dax-basics',
    from: SAM,
    message: "Let's start with the number everyone asks about: total revenue. Make it a proper measure so we can reuse it everywhere.",
    deliver: 'A measure named Total Sales, shown on a card.',
    lesson: 'Dashboards are built on **explicit measures**. Write `Total Sales` once and every visual, card and later measure can reuse it.',
    task: ['Create the measure `Total Sales = SUM(Sales[Sales Amount])`.', 'The card on the page already uses it.'],
    hints: ['Home → New measure, then type the formula and press Enter.'],
    measure: TOTAL_SALES,
    required: ['SUM'],
    visual: spec({ type: 'card', values: [meas('Total Sales')] }),
    contexts: [[], [YEAR]],
    explanation: 'Every other number on this dashboard will build on this measure.',
    tile: 'Total Sales',
  },
  {
    title: 'How many orders?',
    level: 'Beginner',
    module: 'dax-basics',
    from: SAM,
    message: 'Next to revenue I want the number of orders. An order can have several lines, so count orders, not rows.',
    deliver: 'A measure named Orders, shown on a card.',
    lesson: '`DISTINCTCOUNT(Sales[OrderID])` counts each order once, even when it has several product lines.',
    task: ['Create `Orders = DISTINCTCOUNT(Sales[OrderID])`.'],
    hints: ['COUNTROWS(Sales) would count lines, not orders.'],
    measure: ORDERS,
    required: ['DISTINCTCOUNT'],
    visual: spec({ type: 'card', values: [meas('Orders')] }),
    contexts: [[], [YEAR]],
    explanation: 'Orders and lines are different numbers. Always check which one your manager means.',
    tile: 'Orders',
  },
  {
    title: 'Average order value',
    level: 'Beginner',
    module: 'dax-basics',
    from: SAM,
    message: 'And the average order value, please. That tells me if people buy bikes or just bottles.',
    deliver: 'A measure named Avg Order Value, shown on a card.',
    lesson: 'Build measures from measures: `DIVIDE([Total Sales], [Orders])`. DIVIDE returns blank instead of an error when there are no orders.',
    task: ['Create `Avg Order Value = DIVIDE([Total Sales], [Orders])`.'],
    hints: ['Measure names go in square brackets.'],
    measure: AOV,
    required: ['DIVIDE'],
    visual: spec({ type: 'card', values: [meas('Avg Order Value')] }),
    contexts: [[], [YEAR], [f('Product', 'Category')]],
    explanation: 'Three KPI cards: the top row of most sales dashboards.',
    tile: 'Avg Order Value',
  },
  {
    title: 'Revenue by category',
    level: 'Beginner',
    module: 'reports',
    from: DANA,
    message: 'Under the KPIs I want to see which product categories bring in the money.',
    deliver: 'A stacked column chart of Total Sales by Product Category.',
    lesson: 'Use your measure in visuals instead of the raw column: the chart stays consistent with the cards.',
    task: ['Create a **Stacked column chart**.', 'X-axis: `Product[Category]`. Y-axis: the **Total Sales** measure.'],
    hints: ['Your measures appear in the Sales table of the Data pane.'],
    types: ['column'],
    visual: spec({ type: 'column', category: [f('Product', 'Category')], values: [meas('Total Sales')] }),
    explanation: 'Bikes dominate revenue, even though accessories sell more units.',
    tile: 'Total Sales by Category',
  },
  {
    title: 'The monthly trend',
    level: 'Beginner',
    module: 'reports',
    from: DANA,
    message: 'Can you add the monthly trend? I want to see the seasons.',
    deliver: 'A line chart of Total Sales by Year Month.',
    lesson: 'Line charts show trends over time. Use the **Year Month** column so both years appear in order.',
    task: ['Create a **Line chart**.', 'X-axis: `Date[Year Month]`. Y-axis: **Total Sales**.'],
    hints: ['Year Month sorts chronologically.'],
    types: ['line'],
    visual: spec({ type: 'line', category: [YM], values: [meas('Total Sales')] }),
    explanation: 'Spring and summer peaks repeat in both years: a strongly seasonal business.',
    tile: 'Total Sales by Month',
  },
  {
    title: 'Year-to-date',
    level: 'Intermediate',
    module: 'time',
    from: MARCUS,
    message: 'For the board I always report year-to-date. Can you add it next to the monthly numbers?',
    deliver: 'A measure named Sales YTD.',
    lesson: '`TOTALYTD([Total Sales], \'Date\'[Date])` accumulates from 1 January to the current date in context and restarts every year.',
    task: ["Create `Sales YTD = TOTALYTD([Total Sales], 'Date'[Date])`."],
    hints: ['The table on the page shows Total Sales and Sales YTD by month.'],
    measure: SALES_YTD,
    required: ['TOTALYTD'],
    visual: spec({ type: 'line', category: [YM], values: [meas('Total Sales'), meas('Sales YTD')] }),
    contexts: [[YM]],
    explanation: 'The YTD line climbs all year and drops back in January.',
    tile: 'Sales YTD',
  },
  {
    title: 'Last year, same period',
    level: 'Intermediate',
    module: 'time',
    from: MARCUS,
    message: "Now give me last year's number for the same months, so we can compare like for like.",
    deliver: 'A measure named Sales LY.',
    lesson: '`SAMEPERIODLASTYEAR` shifts the dates in context back exactly one year. Use it inside CALCULATE.',
    task: ["Create `Sales LY = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))`."],
    hints: ['2024 has no previous year, so Sales LY is blank there.'],
    measure: SALES_LY,
    required: ['SAMEPERIODLASTYEAR', 'CALCULATE'],
    visual: spec({ type: 'table', category: [YM], values: [meas('Total Sales'), meas('Sales LY')] }),
    contexts: [[YM], [YEAR]],
    explanation: 'Each 2025 month now has its 2024 twin next to it.',
  },
  {
    title: 'Growth versus last year',
    level: 'Intermediate',
    module: 'time',
    from: SAM,
    message: 'Last thing: growth in percent versus last year, by year. That is the number I will say out loud on Monday.',
    deliver: 'A measure named YoY % in a table by Year.',
    lesson: 'Growth % = (this year − last year) / last year. With DIVIDE, years without a previous year stay blank instead of showing an error.',
    task: ['Create `YoY % = DIVIDE([Total Sales] - [Sales LY], [Sales LY])`.'],
    hints: ['Format it as a percentage.'],
    measure: YOY,
    required: ['DIVIDE'],
    visual: spec({ type: 'table', category: [YEAR], values: [meas('Total Sales'), meas('Sales LY'), meas('YoY %')] }),
    contexts: [[YEAR], [YM]],
    explanation: 'Your dashboard is done: KPIs, mix, trend, YTD and growth. That is a complete sales overview.',
    tile: 'Growth by Year',
  },
];

// ---------------------------------------------------------------------------
// Project 2: Targets vs Actual
// ---------------------------------------------------------------------------

const BASE_RELS = sampleModel().relationships;
const rel = (fromTable: string, fromColumn: string, toTable: string, toColumn: string): Relationship => ({ fromTable, fromColumn, toTable, toColumn });
const TARGETS_DATE = rel('Targets', 'Month Start', 'Date', 'Date');
const TARGETS_STORE = rel('Targets', 'StoreID', 'Store', 'StoreID');
const withoutTargets = BASE_RELS.filter((r) => r.fromTable !== 'Targets');

const TARGET = m('Target', 'SUM(Targets[Target])', 'currency');
const VARIANCE = m('Variance', '[Total Sales] - [Target]', 'currency');
const VARIANCE_PCT = m('Variance %', 'DIVIDE([Variance], [Target])', 'percent');
const TARGET_YTD = m('Target YTD', "TOTALYTD([Target], 'Date'[Date])", 'currency');
const STORE = f('Store', 'Store');

const TARGET_DEFS: StepDef[] = [
  {
    title: 'Reshape the targets file',
    level: 'Intermediate',
    module: 'powerquery',
    from: MARCUS,
    message: 'Finance sends targets as a spreadsheet with one column per month. Before anything else, turn it into a proper table: one row per store and month.',
    deliver: 'Store Targets with Store, Month and Target columns.',
    lesson: 'Models need long tables. **Unpivot Other Columns** with Store selected turns the month columns into rows.',
    task: ['Select **Store**, then **Unpivot Other Columns**.', 'Rename **Attribute** to **Month** and **Value** to **Target**.'],
    hints: ['Unpivot Columns is in the Any Column group of the Transform tab.'],
    query: {
      source: 'Store Targets',
      steps: [
        { op: 'unpivotOther', keep: ['Store'] },
        { op: 'rename', from: 'Attribute', to: 'Month' },
        { op: 'rename', from: 'Value', to: 'Target' },
      ],
    },
    visual: emptySpec('table'),
    explanation: 'In the model, the cleaned targets live in the Targets table with a Month Start date, ready to relate.',
  },
  {
    title: 'Connect targets to the model',
    level: 'Intermediate',
    module: 'modeling',
    from: MARCUS,
    message: 'The Targets table is in the model but floating on its own. Hook it up to the calendar and the stores.',
    deliver: 'Targets related to Date and Store.',
    lesson: 'Targets is a second fact table. Relate it to the same dimensions as Sales, so one Year or Store filter reaches both.',
    task: ['Drag **Targets[Month Start]** onto **Date[Date]**.', 'Drag **Targets[StoreID]** onto **Store[StoreID]**.'],
    hints: ['Always drag from the fact table to the dimension.'],
    relationships: { starter: withoutTargets, required: [TARGETS_DATE, TARGETS_STORE] },
    visual: spec({ type: 'table', category: [STORE], values: [meas('Total Sales')] }),
    explanation: 'Now both Sales and Targets respond to Store and Date filters: the basis of any actual-vs-target report.',
  },
  {
    title: 'The target measure',
    level: 'Beginner',
    module: 'dax-basics',
    from: MARCUS,
    message: 'Add the target next to sales for every store.',
    deliver: 'A measure named Target.',
    lesson: 'A simple SUM over the Targets table. Because of the relationships you just built, it splits correctly by store and by date.',
    task: ['Create `Target = SUM(Targets[Target])`.'],
    hints: ['The table on the page shows sales and target by store.'],
    measure: TARGET,
    required: ['SUM'],
    visual: spec({ type: 'table', category: [STORE], values: [meas('Total Sales'), meas('Target')] }),
    contexts: [[STORE], [YEAR]],
    explanation: 'Sales and target side by side. Next: how far apart are they?',
  },
  {
    title: 'Variance in dollars',
    level: 'Beginner',
    module: 'dax-basics',
    from: MARCUS,
    message: 'How far above or below target is each store, in dollars?',
    deliver: 'A measure named Variance.',
    lesson: 'Variance = actual − target. Positive means above target, negative means below.',
    task: ['Create `Variance = [Total Sales] - [Target]`.'],
    hints: ['Use the two existing measures.'],
    measure: VARIANCE,
    visual: spec({ type: 'table', category: [STORE], values: [meas('Total Sales'), meas('Target'), meas('Variance')] }),
    contexts: [[STORE], [YEAR], [YM]],
    explanation: 'A negative variance is not always bad news: targets can be too ambitious. That is why finance also looks at percentages.',
  },
  {
    title: 'Variance in percent',
    level: 'Intermediate',
    module: 'dax-basics',
    from: MARCUS,
    message: 'Dollars favor the big stores. Give me the variance in percent of target as well.',
    deliver: 'A measure named Variance %.',
    lesson: 'Divide the variance by the target with DIVIDE, so months without a target stay blank instead of breaking.',
    task: ['Create `Variance % = DIVIDE([Variance], [Target])`.'],
    hints: ['Format it as a percentage.'],
    measure: VARIANCE_PCT,
    required: ['DIVIDE'],
    visual: spec({ type: 'table', category: [STORE], values: [meas('Total Sales'), meas('Target'), meas('Variance'), meas('Variance %')] }),
    contexts: [[STORE], [YEAR]],
    explanation: 'Now a small store and a big store can be compared fairly.',
    tile: 'Scorecard by Store',
  },
  {
    title: 'Make the gaps jump out',
    level: 'Intermediate',
    module: 'reports',
    from: SAM,
    message: "The table is useful but I can't see at a glance who is behind. Can you color it?",
    deliver: 'A table by Store with data bars on Variance.',
    lesson: 'Conditional formatting turns numbers into a picture. **Data bars** show the size and sign of each value inside the cell.',
    task: ['Create a **Table** with `Store[Store]`, **Total Sales**, **Target** and **Variance**.', 'Format visual → Cell elements → turn on **Data bars** for **Variance**.'],
    hints: ['Variance is the third value in the table (index 3 in the Values list counts from the first value).'],
    types: ['table'],
    visual: spec({ type: 'table', category: [STORE], values: [meas('Total Sales'), meas('Target'), meas('Variance')], format: { conditional: [{ valueIndex: 2, dataBars: true }] } }),
    conditional: { valueIndex: 2, dataBars: true },
    explanation: 'Data bars make the stores below target visible in a second, without reading a single number.',
    tile: 'Variance by Store',
  },
  {
    title: 'Actual vs target, store by store',
    level: 'Beginner',
    module: 'reports',
    from: DANA,
    message: 'For the store managers I want a simple picture: sales and target next to each other for every store.',
    deliver: 'A clustered bar chart of Total Sales and Target by Store.',
    lesson: 'A **clustered** chart puts two values side by side for each category, which is perfect for actual vs target.',
    task: ['Create a **Clustered bar chart**.', 'Y-axis: `Store[Store]`. X-axis: **Total Sales** and **Target**.'],
    hints: ['Add both measures to the same well.'],
    types: ['clusteredBar'],
    visual: spec({ type: 'clusteredBar', category: [STORE], values: [meas('Total Sales'), meas('Target')] }),
    explanation: 'Every store manager can find their own pair of bars instantly.',
    tile: 'Actual vs Target',
  },
  {
    title: 'Target year-to-date',
    level: 'Intermediate',
    module: 'time',
    from: MARCUS,
    message: 'Last piece: the cumulative target for the year, so I can compare it with YTD sales every month.',
    deliver: 'A measure named Target YTD.',
    lesson: 'Time intelligence works on any measure, not just sales. TOTALYTD over [Target] accumulates the monthly targets.',
    task: ["Create `Target YTD = TOTALYTD([Target], 'Date'[Date])`."],
    hints: ['The line chart on the page shows it by month.'],
    measure: TARGET_YTD,
    required: ['TOTALYTD'],
    visual: spec({ type: 'line', category: [YM], values: [meas('Target YTD')] }),
    contexts: [[YM], [YM, STORE]],
    explanation: 'Finance now has a full actual-vs-target pack: scorecard, variance, comparison and year-to-date.',
    tile: 'Target YTD',
  },
];

// ---------------------------------------------------------------------------
// Project 3: Customer Insights
// ---------------------------------------------------------------------------

const CUSTOMERS = m('Customers', 'DISTINCTCOUNT(Sales[CustomerID])', 'integer');
const PER_CUSTOMER = m('Sales per Customer', 'DIVIDE([Total Sales], [Customers])', 'currency');
const CUSTOMER_RANK = m('Customer Rank', 'RANKX(ALL(Customer[Customer]), [Total Sales])', 'integer');
const PCT_TOTAL = m('% of Total', 'DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Customer)))', 'percent');
const SEGMENT = f('Customer', 'Segment');
const STATE = f('Customer', 'State');
const CUSTOMER = f('Customer', 'Customer');

const CUSTOMER_DEFS: StepDef[] = [
  {
    title: 'How many customers buy?',
    level: 'Beginner',
    module: 'dax-basics',
    from: PRIYA,
    message: "For the loyalty program I need to understand our customers. First: how many different customers actually bought something?",
    deliver: 'A measure named Customers, shown on a card.',
    lesson: 'Count customers in the **Sales** table with DISTINCTCOUNT, so only customers who bought in the current context are counted.',
    task: ['Create `Customers = DISTINCTCOUNT(Sales[CustomerID])`.'],
    hints: ['CustomerID is hidden, but you can still use it in DAX.'],
    measure: CUSTOMERS,
    required: ['DISTINCTCOUNT'],
    visual: spec({ type: 'card', values: [meas('Customers')] }),
    contexts: [[], [YEAR], [SEGMENT]],
    explanation: 'Counting in Sales instead of Customer means a customer who never bought is not counted.',
    tile: 'Customers',
  },
  {
    title: 'Revenue per customer',
    level: 'Beginner',
    module: 'dax-basics',
    from: PRIYA,
    message: 'Which segment is worth the most per customer?',
    deliver: 'A measure named Sales per Customer, by Segment.',
    lesson: 'Divide total sales by the number of customers, in each segment.',
    task: ['Create `Sales per Customer = DIVIDE([Total Sales], [Customers])`.'],
    hints: ['The table already groups by Segment.'],
    measure: PER_CUSTOMER,
    required: ['DIVIDE'],
    visual: spec({ type: 'table', category: [SEGMENT], values: [meas('Total Sales'), meas('Customers'), meas('Sales per Customer')] }),
    contexts: [[], [SEGMENT], [YEAR]],
    explanation: 'Value per customer, not just total revenue, decides where marketing money goes.',
    tile: 'Value by Segment',
  },
  {
    title: 'The segment mix',
    level: 'Beginner',
    module: 'reports',
    from: PRIYA,
    message: 'A simple picture of how revenue splits across segments would be great for the slides.',
    deliver: 'A donut chart of Total Sales by Segment.',
    lesson: 'Donut and pie charts work for a few parts of a whole. Three segments is a good fit.',
    task: ['Create a **Donut chart**.', 'Legend: `Customer[Segment]`. Values: **Total Sales**.'],
    hints: ['The donut icon is next to the pie chart.'],
    types: ['donut'],
    visual: spec({ type: 'donut', category: [SEGMENT], values: [meas('Total Sales')] }),
    explanation: 'Keep donuts to a handful of slices. With ten slices, use a bar chart instead.',
    tile: 'Sales by Segment',
  },
  {
    title: 'Rank every customer',
    level: 'Intermediate',
    module: 'dax-advanced',
    from: DANA,
    message: 'I want to know where each customer ranks by revenue. Number one is our best customer.',
    deliver: 'A measure named Customer Rank.',
    lesson: '`RANKX(ALL(Customer[Customer]), [Total Sales])` compares each customer with all customers, even though each table row filters one customer.',
    task: ['Create `Customer Rank = RANKX(ALL(Customer[Customer]), [Total Sales])`.'],
    hints: ['Without ALL, every customer would rank 1.'],
    measure: CUSTOMER_RANK,
    required: ['RANKX', 'ALL'],
    visual: spec({ type: 'table', category: [CUSTOMER], values: [meas('Total Sales'), meas('Customer Rank')] }),
    contexts: [[CUSTOMER]],
    explanation: 'Ranks update automatically when you filter by year or segment.',
  },
  {
    title: 'Top 10 customers',
    level: 'Intermediate',
    module: 'filters',
    from: DANA,
    message: 'For the account managers: just the top 10 customers by revenue, please.',
    deliver: 'A bar chart of the 10 customers with the highest Total Sales.',
    lesson: 'A **Top N** filter on the visual keeps the N customers with the highest value and recalculates when other filters change.',
    task: ['Create a **Stacked bar chart**: Y-axis `Customer[Customer]`, X-axis **Total Sales**.', 'In Filters on this visual, set **Customer** to **Top N**: Top **10** by **Total Sales**.'],
    hints: ['Click Apply filter after choosing the value.'],
    types: ['bar'],
    visual: spec({ type: 'bar', category: [CUSTOMER], values: [meas('Total Sales')], filters: [{ table: 'Customer', column: 'Customer', values: [], scope: 'visual', topN: { n: 10, valueIndex: 0 } }] }),
    explanation: 'The top 10 customers bring in a large share of revenue: a classic 80/20 pattern.',
    tile: 'Top 10 Customers',
  },
  {
    title: 'Share of total by state',
    level: 'Intermediate',
    module: 'calculate',
    from: PRIYA,
    message: 'Which states matter most? Show each state as a percentage of all revenue.',
    deliver: 'A measure named % of Total, by State.',
    lesson: 'In the denominator, `CALCULATE([Total Sales], ALL(Customer))` removes every customer filter, so it always returns the grand total.',
    task: ['Create `% of Total = DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Customer)))`.'],
    hints: ['State is a column of the Customer table, so ALL(Customer) removes the state filter.'],
    measure: PCT_TOTAL,
    required: ['CALCULATE', 'ALL'],
    visual: spec({ type: 'table', category: [STATE], values: [meas('Total Sales'), meas('% of Total')] }),
    contexts: [[STATE], [SEGMENT]],
    explanation: 'The percentages add up to 100%, so the table reads like a pie chart, but more precisely.',
    tile: 'Share by State',
  },
  {
    title: 'Segments in every state',
    level: 'Beginner',
    module: 'reports',
    from: PRIYA,
    message: 'Last one: for each state, show how revenue splits across segments.',
    deliver: 'A stacked bar chart of Total Sales by State, with Segment in the legend.',
    lesson: 'Adding a field to **Legend** splits every bar into colored parts, one per segment.',
    task: ['Create a **Stacked bar chart**.', 'Y-axis: `Customer[State]`. X-axis: **Total Sales**. Legend: `Customer[Segment]`.'],
    hints: ['The Legend well is under the axes.'],
    types: ['bar'],
    visual: spec({ type: 'bar', category: [STATE], series: [SEGMENT], values: [meas('Total Sales')] }),
    explanation: 'Your customer insights page is complete: who buys, how much, where and in which segment.',
    tile: 'Segments by State',
  },
];

// ---------------------------------------------------------------------------
// Project 4: Pinewave Festival Dashboard (festival dataset, src/engine/festival.ts)
// ---------------------------------------------------------------------------

const fm = (name: string, expression: string, format?: Measure['format']): Measure => ({ name, table: 'Performances', expression, format });
const TOTAL_ATT = fm('Total Attendance', 'SUM(Performances[Attendance])', 'integer');
const SHOWS = fm('Shows', 'COUNTROWS(Performances)', 'integer');
const MERCH_PER_FAN = fm('Merch per Fan', 'DIVIDE(SUM(Performances[Merch Sales]), [Total Attendance])', 'currency');
const FILL_RATE = fm('Fill Rate', 'DIVIDE([Total Attendance], SUMX(Performances, RELATED(Stage[Capacity])))', 'percent');
const ATT_SHARE = fm('Share of Attendance', 'DIVIDE([Total Attendance], CALCULATE([Total Attendance], ALL(Stage)))', 'percent');
const STAGE = f('Stage', 'Stage');
const DAY = f('Performances', 'Day');
const GENRE = f('Artist', 'Genre');

const FESTIVAL_DEFS: StepDef[] = [
  {
    title: 'How many fans came?',
    level: 'Beginner',
    module: 'dax-basics',
    from: RAY,
    message: 'The sponsors ask me one thing first: how many people did we get? Make it a measure so every chart uses the same number.',
    deliver: 'A measure named Total Attendance, shown on a card.',
    lesson: 'Every dashboard starts with its headline measure. `Performances` has one row per show, so the festival attendance is the sum of the Attendance column.',
    task: ['Create the measure `Total Attendance = SUM(Performances[Attendance])`.', 'The card on the page already uses it.'],
    hints: ['Use "New measure", type the formula and press Enter.'],
    measure: TOTAL_ATT,
    required: ['SUM'],
    visual: spec({ type: 'card', values: [meas('Total Attendance')] }),
    contexts: [[], [STAGE], [DAY]],
    explanation: 'This counts visits to shows, not unique people: a fan who saw four shows counts four times. Say "attendance", not "visitors".',
    tile: 'Total Attendance',
  },
  {
    title: 'How many shows?',
    level: 'Beginner',
    module: 'dax-basics',
    from: RAY,
    message: 'Next to the crowd, show how many shows we put on.',
    deliver: 'A measure named Shows, shown on a card.',
    lesson: '`COUNTROWS(table)` counts the rows of a table in the current filter context. One row in Performances is one show.',
    task: ['Create `Shows = COUNTROWS(Performances)`.'],
    hints: ['COUNTROWS takes a table, not a column.'],
    measure: SHOWS,
    required: ['COUNTROWS'],
    visual: spec({ type: 'card', values: [meas('Shows')] }),
    contexts: [[], [DAY], [STAGE]],
    explanation: 'Three days, four stages, five slots each: 60 shows.',
    tile: 'Shows',
  },
  {
    title: 'Merch per fan',
    level: 'Intermediate',
    module: 'dax-basics',
    from: OSKAR,
    message: 'I care about how much each fan spends at the merch stands, not the total. Can you give me merch per fan?',
    deliver: 'A measure named Merch per Fan, shown on a card.',
    lesson: 'Build measures from measures. Divide the merch total by your `[Total Attendance]` measure, and use `DIVIDE` so an empty selection shows blank instead of an error.',
    task: ['Create `Merch per Fan = DIVIDE(SUM(Performances[Merch Sales]), [Total Attendance])`.'],
    hints: ['Measure names go in square brackets: [Total Attendance].'],
    measure: MERCH_PER_FAN,
    required: ['DIVIDE'],
    visual: spec({ type: 'card', values: [meas('Merch per Fan')] }),
    contexts: [[], [GENRE], [DAY]],
    explanation: 'A ratio like this answers "is it good?" better than a total: it stays comparable between a big stage and a small one.',
    tile: 'Merch per Fan',
  },
  {
    title: 'Crowds by stage',
    level: 'Beginner',
    module: 'reports',
    from: RAY,
    message: 'Under the numbers, show me how the crowd split across the four stages.',
    deliver: 'A stacked column chart of Total Attendance by Stage.',
    lesson: 'Put your measure in the chart instead of the raw column, so the chart and the cards always agree.',
    task: ['Create a **Stacked column chart**.', 'X-axis: `Stage[Stage]`. Y-axis: the **Total Attendance** measure.'],
    hints: ['Your measures are listed in the Performances table of the Data pane.'],
    types: ['column'],
    visual: spec({ type: 'column', category: [STAGE], values: [meas('Total Attendance')] }),
    explanation: 'The Main Stage takes the biggest share, simply because it is the biggest: the Fill Rate step will check whether it was also the fullest.',
    tile: 'Attendance by Stage',
  },
  {
    title: 'The five biggest crowds',
    level: 'Intermediate',
    module: 'filters',
    from: NINA,
    message: 'For next year’s booking I want the five acts that drew the biggest crowds over the weekend.',
    deliver: 'A bar chart of the top 5 artists by Total Attendance.',
    lesson: 'A **Top N** filter on the axis field keeps only the N best items by a value. Here: Top 5 artists by Total Attendance.',
    task: [
      'Create a **Stacked bar chart** of **Total Attendance** by `Artist[Artist]`.',
      'In **Filters on this visual**, set **Artist** to **Top N**: **Top 5** by **Total Attendance**, and apply.',
    ],
    hints: ['The Artist card is already in "Filters on this visual" because Artist is on the axis.'],
    types: ['bar'],
    visual: spec({
      type: 'bar',
      category: [f('Artist', 'Artist')],
      values: [meas('Total Attendance')],
      filters: [{ table: 'Artist', column: 'Artist', values: [], scope: 'visual', topN: { n: 5, valueIndex: 0 } }],
    }),
    explanation: 'Top N works on the measure, so it would update by itself if you added a Day slicer to the page.',
    tile: 'Top 5 Acts',
  },
  {
    title: 'Which day, which genre?',
    level: 'Intermediate',
    module: 'reports',
    from: NINA,
    message: 'Was Saturday really our big day, and which genres carried each day? One chart, please.',
    deliver: 'A stacked column chart of Total Attendance by Day, split by Genre.',
    lesson: 'A **Legend** splits every column by a second field. Day on the X-axis, Genre in the Legend: each column becomes a stack of genres.',
    task: ['Create a **Stacked column chart**.', 'X-axis: `Performances[Day]`. Y-axis: **Total Attendance**.', 'Legend: choose `Artist[Genre]` from **+ Add a field…** in the **Legend** box.'],
    hints: ['Ticking a second text field adds it to the X-axis, not the Legend. Use the list in the Legend box instead.'],
    types: ['column'],
    visual: spec({ type: 'column', category: [DAY], series: [GENRE], values: [meas('Total Attendance')] }),
    explanation: 'Day and Genre come from two different tables, and both filter Performances through their relationships.',
    tile: 'Attendance by Day and Genre',
  },
  {
    title: 'How full was each stage?',
    level: 'Advanced',
    module: 'dax-advanced',
    from: RAY,
    message: 'Big stages always win on raw numbers. I want to know how full each stage was compared with its capacity.',
    deliver: 'A measure named Fill Rate, in a table by Stage.',
    lesson:
      'Capacity lives in the `Stage` table, but it applies to every show. `SUMX(Performances, RELATED(Stage[Capacity]))` adds up the capacity of every show in context. Divide the attendance by it to get the fill rate.',
    task: ['Create `Fill Rate = DIVIDE([Total Attendance], SUMX(Performances, RELATED(Stage[Capacity])))` and format it as a percentage.'],
    hints: ['SUMX goes row by row through Performances; RELATED reads the capacity of that row’s stage.', 'SUM(Stage[Capacity]) alone would count each stage once, not once per show.'],
    measure: FILL_RATE,
    required: ['SUMX', 'RELATED', 'DIVIDE'],
    visual: spec({ type: 'table', category: [STAGE], values: [meas('Total Attendance'), meas('Fill Rate')] }),
    contexts: [[STAGE], [DAY], []],
    explanation: 'Now the stages are comparable. All four were between 66% and 69% full: the Forest Stage was as full as the Main Stage, with less than a third of its crowd.',
  },
  {
    title: 'Each stage’s share of the crowd',
    level: 'Advanced',
    module: 'calculate',
    from: RAY,
    message: 'Last one for the sponsor deck: what share of all fans did each stage get? Put it next to the fill rate.',
    deliver: 'A measure named Share of Attendance, in a table by Stage with Fill Rate.',
    lesson:
      'A share is "this row ÷ all rows". `CALCULATE([Total Attendance], ALL(Stage))` removes the stage filter, so it returns the festival total on every row of the table.',
    task: ['Create `Share of Attendance = DIVIDE([Total Attendance], CALCULATE([Total Attendance], ALL(Stage)))` and format it as a percentage.'],
    hints: ['ALL(Stage) ignores the stage on the row, but keeps any other filter, like a Day slicer.'],
    measure: ATT_SHARE,
    required: ['CALCULATE', 'ALL'],
    visual: spec({ type: 'table', category: [STAGE], values: [meas('Total Attendance'), meas('Fill Rate'), meas('Share of Attendance')] }),
    contexts: [[STAGE], [STAGE, DAY]],
    explanation: 'Your festival dashboard is done: headline numbers, crowds by stage, top acts, the day-by-genre mix, and how full and how important each stage was.',
    tile: 'Stages at a glance',
  },
];

const DEFS: Record<string, StepDef[]> = { 'sales-dashboard': SALES_DEFS, 'targets-vs-actual': TARGET_DEFS, 'customer-insights': CUSTOMER_DEFS, 'festival-dashboard': FESTIVAL_DEFS };
const BASES: Record<string, Measure[]> = { 'sales-dashboard': [], 'targets-vs-actual': [TOTAL_SALES], 'customer-insights': [TOTAL_SALES], 'festival-dashboard': [] };

export const PROJECTS: Project[] = [
  buildProject({
    id: 'sales-dashboard',
    title: 'Sales Overview Dashboard',
    tagline: 'KPIs, product mix, monthly trend, year-to-date and growth on one page.',
    free: true,
    brief: { from: SAM, message: "I'm presenting to the board on Monday and I want one page that tells the sales story: the headline numbers, what we sell, how the year is going and how we compare with last year. Can you build it?" },
    skills: ['Measures', 'Cards', 'Column & line charts', 'Time intelligence'],
    defs: SALES_DEFS,
  }),
  buildProject({
    id: 'targets-vs-actual',
    title: 'Targets vs Actual',
    tagline: 'Clean a budget file, model it, and build a finance scorecard by store.',
    free: false,
    brief: { from: MARCUS, message: 'Finance needs a monthly actual-vs-target pack per store. The targets come in a messy spreadsheet, so you will have to start from the raw file.' },
    skills: ['Power Query', 'Relationships', 'Variance measures', 'Conditional formatting'],
    base: [TOTAL_SALES],
    defs: TARGET_DEFS,
  }),
  buildProject({
    id: 'customer-insights',
    title: 'Customer Insights',
    tagline: 'Count, rank and segment customers for the loyalty program.',
    free: false,
    brief: { from: PRIYA, message: 'We are launching a loyalty program and I need to understand our customers: how many buy, who the best ones are, and where they are.' },
    skills: ['DISTINCTCOUNT', 'RANKX', 'Top N filters', '% of total'],
    base: [TOTAL_SALES],
    defs: CUSTOMER_DEFS,
  }),
  buildProject({
    id: 'festival-dashboard',
    title: 'Pinewave Festival Dashboard',
    tagline: 'Turn three days of shows into a sponsor-ready festival dashboard.',
    free: false,
    dataset: 'festival',
    brief: {
      from: RAY,
      message:
        'The weekend is over and the sponsors want numbers by Friday. I need one page: how many fans came, where they went, which acts pulled the biggest crowds, and how full each stage really was.',
    },
    skills: ['Measures', 'Top N filters', 'Legend splits', 'SUMX + RELATED', 'CALCULATE + ALL'],
    defs: FESTIVAL_DEFS,
  }),
];

export const PROJECT_STEPS: Exercise[] = PROJECTS.flatMap((p) => p.steps);

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id);
export const projectOf = (ex: Exercise) => (ex.project ? projectById(ex.project) : undefined);
