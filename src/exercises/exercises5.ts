// Fifth batch: more Power Query and data modeling practice. Original content.
import { sampleModel } from '../engine/dataset';
import type { Measure, Relationship } from '../engine/model';
import type { Step } from '../engine/query';
import type { FieldRef, ValueField, VisualSpec } from '../engine/visual';
import { emptySpec } from '../engine/visual';
import type { Exercise } from './types';

const f = (table: string, column: string): FieldRef => ({ table, column });
const meas = (name: string): ValueField => ({ kind: 'measure', name });
const spec = (s: Partial<VisualSpec>): VisualSpec => ({ ...emptySpec(), ...s });
const m = (name: string, expression: string, format?: Measure['format']): Measure => ({ name, table: 'Sales', expression, format });

const TOTAL_SALES = m('Total Sales', 'SUM(Sales[Sales Amount])', 'currency');
const TARGET = m('Target', 'SUM(Targets[Target])', 'currency');

// ---------------- Power Query ----------------

const PROMOTE: Step = { op: 'promoteHeaders' };
const NO_BLANKS: Step = { op: 'removeBlankRows' };

export function query(e: {
  id: string;
  title: string;
  level: Exercise['level'];
  source: string;
  starterSteps?: Step[];
  steps: Step[];
  lesson: string;
  task: string[];
  hints: string[];
  explanation: string;
}): Exercise {
  const starterSteps = e.starterSteps ?? [];
  return {
    id: e.id,
    module: 'powerquery',
    title: e.title,
    level: e.level,
    free: false,
    lesson: e.lesson,
    task: e.task,
    hints: e.hints,
    starter: emptySpec('table'),
    solution: { spec: emptySpec('table'), steps: [...starterSteps, ...e.steps] },
    check: { kind: 'query' },
    query: { source: e.source, starterSteps },
    explanation: e.explanation,
  };
}

const PQ: Exercise[] = [
  query({
    id: 'pq-filter-damaged',
    title: 'Only damaged returns',
    level: 'Beginner',
    source: 'Returns',
    steps: [{ op: 'filterRows', column: 'Reason', cond: 'equals', value: 'Damaged' }],
    lesson: 'Text filters work like number filters: open the ▾ menu on a column header and choose **Text Filters → Equals**. Only matching rows stay in the query.',
    task: ['Filter **Reason** to keep only rows that equal **Damaged**.'],
    hints: ['Column ▾ menu on Reason → Equals… → Damaged.'],
    explanation: 'Three returns were damaged. Operations can now check those products with the warehouse.',
  }),
  query({
    id: 'pq-filter-not-na',
    title: 'Drop returns without a reason',
    level: 'Beginner',
    source: 'Returns',
    steps: [{ op: 'filterRows', column: 'Reason', cond: 'notEquals', value: 'N/A' }],
    lesson: '**Does Not Equal** removes the rows with one value and keeps everything else. It is the quickest way to drop placeholder rows.',
    task: ['Filter **Reason** to remove the rows that equal **N/A**.'],
    hints: ['Column ▾ menu on Reason → Does Not Equal… → N/A.'],
    explanation: 'Seven returns have a real reason. Removing rows is permanent for the model, so only do it when nobody needs them later.',
  }),
  query({
    id: 'pq-filter-brakes',
    title: 'Every brake job',
    level: 'Beginner',
    source: 'Service Jobs',
    starterSteps: [PROMOTE, NO_BLANKS],
    steps: [{ op: 'filterRows', column: 'Service', cond: 'contains', value: 'Brake' }],
    lesson: '**Contains** keeps rows where the text appears anywhere in the cell, so "Brake" matches both "Brake fix" and "Brake upgrade".',
    task: ['Filter **Service** to keep rows that **contain** the text **Brake**.'],
    hints: ['Column ▾ menu on Service → Contains… → Brake.'],
    explanation: 'Contains is case-sensitive in Power Query: "brake" in lower case would not match these rows.',
  }),
  query({
    id: 'pq-upper-bike-ids',
    title: 'Consistent bike IDs',
    level: 'Beginner',
    source: 'Service Jobs',
    starterSteps: [PROMOTE, NO_BLANKS],
    steps: [{ op: 'transformText', columns: ['Bike ID'], fn: 'upper' }],
    lesson: 'The same bike appears as "rc-102" and "RC-102". Power Query compares text case-sensitively, so these look like two different bikes. **Format → UPPERCASE** fixes it.',
    task: ['Select **Bike ID** and apply **Format → UPPERCASE**.'],
    hints: ['Format is in the Text Column group of the Transform tab.'],
    explanation: 'Now RC-102, RC-087 and RC-140 each appear twice, as they should: those bikes came back for a second job.',
  }),
  query({
    id: 'pq-service-clean',
    title: 'Clean the service log',
    level: 'Advanced',
    source: 'Service Jobs',
    steps: [
      PROMOTE,
      NO_BLANKS,
      { op: 'transformText', columns: ['Technician'], fn: 'trim' },
      { op: 'transformText', columns: ['Technician'], fn: 'proper' },
      { op: 'changeType', columns: ['Minutes'], type: 'int' },
      { op: 'changeType', columns: ['Price'], type: 'decimal' },
    ],
    lesson: 'Real cleaning jobs chain several steps. The order matters: promote the headers first, so the steps after it can refer to real column names.',
    task: [
      'Use **First Row as Headers**.',
      'Remove the blank rows.',
      'Trim **Technician**, then **Capitalize Each Word**.',
      'Set **Minutes** to **Whole Number** and **Price** to **Decimal Number**.',
    ],
    hints: ['Check Applied Steps: you should end up with six steps after Source.'],
    explanation: 'Three technicians instead of eight different spellings, and numbers you can sum. This query will clean every future export the same way.',
  }),
  query({
    id: 'pq-group-reasons',
    title: 'Units returned per reason',
    level: 'Intermediate',
    source: 'Returns',
    steps: [{ op: 'groupBy', by: ['Reason'], aggs: [{ name: 'Units Returned', op: 'sum', column: 'Qty' }] }],
    lesson: 'Group By with **Sum** adds up a column for each group. Use it to turn a long list into a short summary before loading.',
    task: ['Group by **Reason**.', 'New column **Units Returned** = Sum of **Qty**.'],
    hints: ['Group By is on the Home and Transform tabs.'],
    explanation: 'Returns without a reason (N/A) add up to the most units, so the next step is finding out why they came back. Wrong size and Damaged come next.',
  }),
  query({
    id: 'pq-group-store-stats',
    title: 'Average and biggest order per store',
    level: 'Intermediate',
    source: 'Store Sales',
    steps: [
      {
        op: 'groupBy',
        by: ['Store'],
        aggs: [
          { name: 'Avg Order', op: 'avg', column: 'Amount' },
          { name: 'Biggest Order', op: 'max', column: 'Amount' },
        ],
      },
    ],
    lesson: 'One Group By step can create several summary columns at once: averages, minimums, maximums, sums and counts.',
    task: ['Group by **Store**.', 'Column **Avg Order** = Average of **Amount**.', 'Column **Biggest Order** = Max of **Amount**.'],
    hints: ['Use the Advanced option of Group By to add a second aggregation.'],
    explanation: 'Online has the biggest average order. Airport sells small items, which matches its location.',
  }),
  query({
    id: 'pq-merge-group',
    title: 'Returns per category',
    level: 'Advanced',
    source: 'Returns',
    steps: [
      { op: 'merge', with: 'Product Lookup', leftKey: 'Product Code', rightKey: 'Product Code', expand: ['Category'] },
      { op: 'groupBy', by: ['Category'], aggs: [{ name: 'Units Returned', op: 'sum', column: 'Qty' }] },
    ],
    lesson: 'Merge and Group By together answer questions the raw file cannot: the returns file has no category, but the lookup table does.',
    task: ['Merge with **Product Lookup** on **Product Code** and expand only **Category**.', 'Group by **Category** with **Units Returned** = Sum of **Qty**.'],
    hints: ['Do the merge first, otherwise there is no Category column to group by.'],
    explanation: 'Clothing has by far the most returned units: more than bikes, accessories and components together.',
  }),
  query({
    id: 'pq-append-unit-price',
    title: 'All orders with a unit price',
    level: 'Intermediate',
    source: 'Web Orders 2025',
    steps: [
      { op: 'append', with: 'Store Orders 2025' },
      { op: 'customColumn', name: 'Unit Price', formula: '[Amount] / [Quantity]' },
    ],
    lesson: 'Steps after an append work on all the combined rows, so a custom column added after Append Queries is calculated for web and store orders alike.',
    task: ['Append **Store Orders 2025**.', 'Add a custom column **Unit Price** = `[Amount] / [Quantity]`.'],
    hints: ['Order matters: append first, then add the column.'],
    explanation: 'If you add the column before the append, the store rows get null, because the column did not exist in their table.',
  }),
  query({
    id: 'pq-custom-label',
    title: 'A readable job label',
    level: 'Intermediate',
    source: 'Service Jobs',
    starterSteps: [PROMOTE, NO_BLANKS],
    steps: [{ op: 'customColumn', name: 'Job Label', formula: '[JobID] & " - " & [Service]' }],
    lesson: 'The **&** operator joins text in a custom column. Put fixed text in double quotes: `[JobID] & " - " & [Service]`.',
    task: ['Add a custom column **Job Label** = `[JobID] & " - " & [Service]`.'],
    hints: ['Spaces inside the quotes become part of the label.'],
    explanation: 'Labels like "J-301 - Tune-up" make tables and tooltips much easier to read.',
  }),
];

// ---------------- Data modeling ----------------

const BASE_RELS = sampleModel().relationships;
const rel = (fromTable: string, fromColumn: string, toTable: string, toColumn: string): Relationship => ({ fromTable, fromColumn, toTable, toColumn });
const without = (...rs: Relationship[]) =>
  BASE_RELS.filter((r) => !rs.some((x) => x.fromTable === r.fromTable && x.fromColumn === r.fromColumn && x.toTable === r.toTable && x.toColumn === r.toColumn));

const SALES_PRODUCT = rel('Sales', 'ProductID', 'Product', 'ProductID');
const SALES_CUSTOMER = rel('Sales', 'CustomerID', 'Customer', 'CustomerID');
const SALES_DATE = rel('Sales', 'Order Date', 'Date', 'Date');
const SALES_STORE = rel('Sales', 'StoreID', 'Store', 'StoreID');
const TARGETS_DATE = rel('Targets', 'Month Start', 'Date', 'Date');
const TARGETS_STORE = rel('Targets', 'StoreID', 'Store', 'StoreID');

function model(e: {
  id: string;
  title: string;
  level: Exercise['level'];
  lesson: string;
  task: string[];
  hints: string[];
  starterRelationships: Relationship[];
  required: Relationship[];
  forbidden?: Relationship[];
  rows: FieldRef[];
  given?: Measure[];
  explanation: string;
}): Exercise {
  const given = e.given ?? [TOTAL_SALES];
  const table = spec({ type: 'table', category: e.rows, values: given.map((g) => meas(g.name)) });
  return {
    id: e.id,
    module: 'modeling',
    title: e.title,
    level: e.level,
    free: false,
    lesson: e.lesson,
    task: e.task,
    hints: e.hints,
    givenMeasures: given,
    starterRelationships: e.starterRelationships,
    starter: table,
    solution: { spec: table, relationships: BASE_RELS },
    check: { kind: 'model', required: e.required, forbidden: e.forbidden, report: { kind: 'report', allowedTypes: ['table'] } },
    explanation: e.explanation,
  };
}

const MODEL: Exercise[] = [
  model({
    id: 'model-sales-customer',
    title: 'Connect the customers',
    level: 'Beginner',
    lesson: 'Every segment shows the same grand total: a sign that a filter cannot travel from the dimension table to the fact table. The Customer relationship is missing.',
    task: ['In the Model view, drag **Sales[CustomerID]** onto **Customer[CustomerID]**.'],
    hints: ['CustomerID is a hidden key column. Hidden columns still show in the Model view.'],
    starterRelationships: without(SALES_CUSTOMER),
    required: [SALES_CUSTOMER],
    rows: [f('Customer', 'Segment')],
    explanation: 'The report now shows a different total per segment. Repeated grand totals are the classic symptom of a missing relationship.',
  }),
  model({
    id: 'model-sales-date',
    title: 'Connect the calendar',
    level: 'Beginner',
    lesson: 'Time intelligence and every Year or Month filter depend on a relationship between the fact table and the Date table. Here it was never created.',
    task: ['Drag **Sales[Order Date]** onto **Date[Date]**.'],
    hints: ['The Date table has one row per day, so it is the "one" side.'],
    starterRelationships: without(SALES_DATE),
    required: [SALES_DATE],
    rows: [f('Date', 'Year')],
    explanation: 'Without this relationship, functions like TOTALYTD and SAMEPERIODLASTYEAR return the wrong numbers or blanks.',
  }),
  model({
    id: 'model-fix-wrong-columns',
    title: 'Wrong columns, wrong numbers',
    level: 'Intermediate',
    lesson:
      'A relationship between the wrong columns is worse than none: the numbers look plausible but are wrong. Someone related **Sales[StoreID]** to **Product[ProductID]**. Both are small numbers, so Power BI accepted it.',
    task: ['Delete the relationship between **Sales[StoreID]** and **Product[ProductID]**.', 'Create **Sales[ProductID] → Product[ProductID]**.'],
    hints: ['Click the line between Sales and Product to see which columns it uses.'],
    starterRelationships: [...without(SALES_PRODUCT), rel('Sales', 'StoreID', 'Product', 'ProductID')],
    required: [SALES_PRODUCT],
    forbidden: [rel('Sales', 'StoreID', 'Product', 'ProductID')],
    rows: [f('Product', 'Category')],
    explanation: 'Always check the column names on a relationship. Matching data types alone do not mean the keys mean the same thing.',
  }),
  model({
    id: 'model-fix-targets-backwards',
    title: 'Targets pointing the wrong way',
    level: 'Intermediate',
    lesson: 'The Date table must filter Targets, not the other way round. The relationship was created from Date to Targets, so Date ended up on the "many" side.',
    task: ['Delete the relationship between **Date** and **Targets**.', 'Create **Targets[Month Start] → Date[Date]**.'],
    hints: ['The "1" marker belongs next to the Date table.'],
    starterRelationships: [...without(TARGETS_DATE), rel('Date', 'Date', 'Targets', 'Month Start')],
    required: [TARGETS_DATE],
    forbidden: [rel('Date', 'Date', 'Targets', 'Month Start')],
    rows: [f('Date', 'Year')],
    given: [TOTAL_SALES, TARGET],
    explanation: 'Now the yearly targets add up correctly next to sales.',
  }),
  model({
    id: 'model-remove-extra',
    title: 'Remove a misleading relationship',
    level: 'Advanced',
    lesson:
      'There is an extra relationship from **Sales[CustomerID]** to **Store[StoreID]**. Customer numbers and store numbers are different things, so this path sends the wrong filter to Sales whenever you slice by store.',
    task: ['Delete the relationship **Sales[CustomerID] → Store[StoreID]**.', 'Keep **Sales[StoreID] → Store[StoreID]**.'],
    hints: ['Click each line between Sales and Store to see its columns before deleting.'],
    starterRelationships: [...without(SALES_STORE), rel('Sales', 'CustomerID', 'Store', 'StoreID')],
    required: [SALES_STORE],
    forbidden: [rel('Sales', 'CustomerID', 'Store', 'StoreID')],
    rows: [f('Store', 'Store')],
    explanation: 'Each store now shows its own sales. One clear path per dimension keeps a model predictable.',
  }),
  model({
    id: 'model-build-star',
    title: 'Build the whole star schema',
    level: 'Advanced',
    lesson:
      'A new model arrived with no relationships at all. Build the full star: **Sales** in the middle, related to **Product**, **Customer**, **Date** and **Store**; and **Targets** related to **Date** and **Store**.',
    task: [
      'Sales[ProductID] → Product[ProductID]',
      'Sales[CustomerID] → Customer[CustomerID]',
      'Sales[Order Date] → Date[Date]',
      'Sales[StoreID] → Store[StoreID]',
      'Targets[Month Start] → Date[Date]',
      'Targets[StoreID] → Store[StoreID]',
    ],
    hints: ['Always drag from the fact table (Sales, Targets) to the dimension table.'],
    starterRelationships: [],
    required: [SALES_PRODUCT, SALES_CUSTOMER, SALES_DATE, SALES_STORE, TARGETS_DATE, TARGETS_STORE],
    rows: [f('Store', 'Store'), f('Date', 'Year')],
    given: [TOTAL_SALES, TARGET],
    explanation: 'Six relationships, two fact tables, four dimensions. This is the model shape Power BI is designed for.',
  }),
];

export const EXERCISES_5: Exercise[] = [...PQ, ...MODEL];
