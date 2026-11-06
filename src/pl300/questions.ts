// Original practice questions in the style of the PL-300 (Microsoft Power BI Data Analyst) exam.
// They are written for this site; they are not real exam questions.

import { q } from './model';
import type { Domain, Question } from './model';
import { PREPARE_MORE } from './questionsPrepare';
import { MODEL_MORE } from './questionsModel';
import { VISUALIZE_MORE } from './questionsVisualize';
import { MANAGE_MORE } from './questionsManage';
import { CASES, CASE_QUESTIONS } from './cases';

export { DOMAINS } from './model';
export { CASES } from './cases';
export type { CaseStudy, Domain, Question } from './model';

const BASE: Question[] = [
  // ---------------- Prepare the data ----------------
  q(
    'p1',
    'prepare',
    'You open a supplier file in Power Query and want to see, for every column, the percentage of valid, error and empty values. Which feature should you turn on?',
    ['Column distribution', 'Column quality', 'Column profile', 'Query dependencies'],
    [1],
    'Column quality (View tab) shows the Valid, Error and Empty percentages under each column header. Column distribution shows distinct and unique counts; Column profile shows detailed statistics for one selected column.',
  ),
  q(
    'p2',
    'prepare',
    'The column statistics in Power Query only reflect a sample of a large table. What should you change so that profiling uses all rows?',
    ['Disable "Enable load" on the query', 'Switch the status bar setting to "Column profiling based on entire data set"', 'Turn on "Allow data preview to download in the background"', 'Change the storage mode to DirectQuery'],
    [1],
    'By default, profiling is based on the top 1,000 rows. The setting in the status bar of the Power Query Editor switches it to the entire data set.',
  ),
  q(
    'p3',
    'prepare',
    'You receive one sales file per region. All files have the same columns. You need one table with every row. Which operation should you use?',
    ['Merge Queries', 'Append Queries', 'Group By', 'Pivot Column'],
    [1],
    'Append stacks rows from tables with the same columns. Merge adds columns from another table by matching a key, like a lookup.',
  ),
  q(
    'p4',
    'prepare',
    'A budget sheet has a Store column and one column per month (Jan to Dec). You need one row per store and month. Which transformation should you apply after selecting the Store column?',
    ['Pivot Column', 'Transpose', 'Unpivot Other Columns', 'Split Column by Delimiter'],
    [2],
    'Unpivot Other Columns keeps the selected column and turns every other column into Attribute/Value pairs: one row per store and month.',
  ),
  q(
    'p5',
    'prepare',
    'Customer names in two tables are spelled slightly differently ("Velo Parts Inc" and "Velo Parts Inc."). You need to merge the tables on the name. What should you use?',
    ['An inner join', 'Fuzzy matching in Merge Queries', 'Remove Duplicates', 'Replace Errors'],
    [1],
    'Fuzzy matching in Merge Queries matches values that are similar but not identical, with a configurable similarity threshold.',
  ),
  q(
    'p6',
    'prepare',
    'You need to switch the SQL Server name of every query between a test server and a production server without editing each query. What should you create?',
    ['A calculated table', 'A Power Query parameter used in the Source step', 'A bookmark', 'A new workspace'],
    [1],
    'A parameter can be referenced in the Source step of every query. Changing the parameter value updates all of them; parameters can also be changed in the Power BI service settings.',
  ),
  q(
    'p7',
    'prepare',
    'A staging query is only used as input for two other queries and should not appear as a table in the model. What should you do?',
    ['Hide the table in Report view', 'Clear "Enable load" for the staging query', 'Delete the query after refresh', 'Set its data type to Any'],
    [1],
    'Clearing "Enable load" keeps the query available to other queries but does not load it into the model.',
  ),
  q(
    'p8',
    'prepare',
    'A source must show data that is at most a few minutes old, and the table is too large to import. Which storage mode should you choose?',
    ['Import', 'DirectQuery', 'Dual, with no source connection', 'Import with a daily scheduled refresh'],
    [1],
    'DirectQuery sends queries to the source when the report is used, so data is current and nothing large is copied into the model. Import needs a refresh to show new data.',
  ),
  q(
    'p9',
    'prepare',
    'In Power BI Desktop, how can you check whether a Power Query step on a SQL Server source is still folded into a single native query?',
    ['Right-click the step and see if "View Native Query" is available', 'Open Performance analyzer in Report view', 'Look at the Column quality bar', 'Check the Query dependencies view'],
    [0],
    'If "View Native Query" is available for a step, that step (and the ones before it) fold to the source. Performance analyzer measures visuals, not Power Query.',
  ),
  q(
    'p10',
    'prepare',
    'You want a copy of a query that automatically includes any future changes to the original query\'s steps. Which option should you use?',
    ['Duplicate', 'Reference', 'Append as new', 'Copy and paste the query'],
    [1],
    'Reference creates a new query whose source is the original query, so changes upstream flow through. Duplicate makes an independent copy of all the steps.',
  ),

  // ---------------- Model the data ----------------
  q(
    'm1',
    'model',
    'In a star schema with a Sales fact table and a Product dimension table, how should the relationship between them be configured?',
    ['One-to-one, both directions', 'Many-to-one from Sales to Product, single direction', 'Many-to-many from Product to Sales', 'One-to-many from Sales to Product'],
    [1],
    'Each product appears once in Product and many times in Sales. The relationship is many-to-one (Sales to Product), and filters flow from Product to Sales.',
  ),
  q(
    'm2',
    'model',
    'Sales has an Order Date and a Ship Date, both related to the same Date table. Only one relationship can be active. How can a measure use the Ship Date relationship?',
    ['Use RELATED in the measure', 'Use CALCULATE with USERELATIONSHIP', 'Set both relationships to bidirectional', 'Create a calculated column with LOOKUPVALUE'],
    [1],
    'USERELATIONSHIP inside CALCULATE activates an inactive relationship for that calculation only.',
  ),
  q(
    'm3',
    'model',
    'You want to mark a table as the date table. Which TWO requirements must its date column meet? Choose all that apply.',
    ['It contains unique values', 'It has no blank values', 'It is formatted as text', 'It only contains dates that have sales'],
    [0, 1],
    'The date column must have unique values, no blanks, and contain whole days without gaps. It can (and usually should) include dates without sales.',
  ),
  q(
    'm4',
    'model',
    'You need a margin percentage that is correct at every level of a report (product, category and total). What should you create?',
    ['A calculated column that divides profit by sales on each row, summed in the visual', 'A measure that divides total profit by total sales', 'A calculated table', 'A Power Query custom column'],
    [1],
    'Ratios must be calculated after aggregation. A measure such as DIVIDE([Profit], [Total Sales]) is evaluated in each filter context; summing row-level percentages gives wrong totals.',
  ),
  q(
    'm5',
    'model',
    'A model has a column with date and time down to the second, and the file size is large. What is the most effective way to reduce the size without losing information?',
    ['Change the column to text', 'Split it into a Date column and a Time column', 'Turn off Auto date/time and keep the column', 'Make the column hidden'],
    [1],
    'Splitting into date and time greatly reduces the number of distinct values (cardinality), which is what drives compression in the model.',
  ),
  q(
    'm6',
    'model',
    'A Year column is numeric, and visuals keep showing the sum of the years. What should you change?',
    ['Set the column\'s Summarization to "Don\'t summarize"', 'Change the data type to Decimal number', 'Mark the table as a date table', 'Hide the column'],
    [0],
    'The default summarization of a numeric column is Sum. Setting it to "Don\'t summarize" makes Year behave like a category.',
  ),
  q(
    'm7',
    'model',
    'Which DAX function creates a date table that automatically covers all the dates used in the model?',
    ['DATESYTD', 'CALENDARAUTO', 'SAMEPERIODLASTYEAR', 'TODAY'],
    [1],
    'CALENDARAUTO() returns a one-column table of dates covering the years found in the model. CALENDAR(start, end) does the same for a fixed range.',
  ),
  q(
    'm8',
    'model',
    'What is the main risk of setting many relationships to bidirectional cross-filtering?',
    ['Measures cannot use CALCULATE', 'Ambiguous filter paths and slower, less predictable results', 'Tables can no longer be hidden', 'Row-level security is disabled'],
    [1],
    'Bidirectional filters can create several paths between tables. This makes results harder to predict and can hurt performance, so single direction is the default best practice.',
  ),
  q(
    'm9',
    'model',
    'You need a measure that returns each product\'s share of total sales across all products, regardless of the product filter in the visual. Which expression is correct?',
    ['DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Product)))', 'DIVIDE([Total Sales], SUM(Sales[Sales Amount]))', 'DIVIDE([Total Sales], CALCULATE([Total Sales], VALUES(Product)))', 'DIVIDE(ALL(Product), [Total Sales])'],
    [0],
    'ALL(Product) removes the product filter in the denominator, so it always returns the total of all products.',
  ),
  q(
    'm10',
    'model',
    'Which TWO actions reduce the size of an imported model? Choose all that apply.',
    ['Remove columns that no report uses', 'Add more calculated columns', 'Reduce the number of distinct values in large columns', 'Set every relationship to bidirectional'],
    [0, 2],
    'Fewer columns and lower cardinality both shrink an import model. Calculated columns are stored and add size.',
  ),

  // ---------------- Visualize and analyze ----------------
  q(
    'v1',
    'visualize',
    'You need to show how monthly revenue changed over the last two years. Which visual is the best fit?',
    ['Pie chart', 'Line chart', 'Card', 'Treemap'],
    [1],
    'Line charts are designed for trends over a continuous axis such as time.',
  ),
  q(
    'v2',
    'visualize',
    'Managers want to click a product in a summary page and jump to a page with details about only that product. What should you configure?',
    ['A bookmark on the summary page', 'A drillthrough page with Product in the drillthrough field', 'A report page tooltip', 'Sync slicers'],
    [1],
    'A drillthrough page receives the filter of the item you right-click (or click via a button) and shows details for it.',
  ),
  q(
    'v3',
    'visualize',
    'A Year slicer on page 1 should also filter pages 2 and 3, with the same selection everywhere. What should you use?',
    ['Edit interactions', 'Sync slicers', 'Report-level bookmarks', 'Drill down'],
    [1],
    'The Sync slicers pane lets one slicer appear and stay in sync across several pages.',
  ),
  q(
    'v4',
    'visualize',
    'Selecting a bar in a chart filters every other visual on the page, but one KPI card should never change. What should you do?',
    ['Lock the card', 'Use Edit interactions and set the card to "None" for that chart', 'Put the card in a group', 'Turn off the card\'s title'],
    [1],
    'Format → Edit interactions controls how each visual reacts to selections in another visual: filter, highlight or none.',
  ),
  q(
    'v5',
    'visualize',
    'Which visual helps you find which factors (such as segment, region or discount) most increase the chance of a customer churning?',
    ['Decomposition tree', 'Key influencers', 'Q&A', 'Waterfall chart'],
    [1],
    'The Key influencers visual ranks factors by how much they change the likelihood of an outcome.',
  ),
  q(
    'v6',
    'visualize',
    'Users want to explore a total by any dimension they choose, in any order, with AI suggestions for the next split. Which visual should you add?',
    ['Matrix', 'Decomposition tree', 'Scatter chart', 'Funnel'],
    [1],
    'The decomposition tree lets users break a measure down by dimensions in any order, including "High value" and "Low value" AI splits.',
  ),
  q(
    'v7',
    'visualize',
    'You want a button that toggles between a chart and a table in the same spot on a page. Which TWO features do you combine? Choose all that apply.',
    ['Bookmarks', 'The Selection pane', 'Drillthrough', 'Row-level security'],
    [0, 1],
    'Use the Selection pane to show or hide visuals, capture each state in a bookmark, then assign the bookmarks to buttons.',
  ),
  q(
    'v8',
    'visualize',
    'A report page is slow. You need to find out which visual takes the longest to load and how long its DAX query takes. What should you use?',
    ['Performance analyzer', 'Column quality', 'Query dependencies', 'The Analytics pane'],
    [0],
    'Performance analyzer records the time each visual spends on the DAX query, visual display and other tasks.',
  ),
  q(
    'v9',
    'visualize',
    'Screen-reader users must understand what each chart shows. What should you add to every visual?',
    ['A tooltip page', 'Alt text', 'A data label', 'A bookmark'],
    [1],
    'Alt text (General → Alt text in the Format pane) is read aloud by screen readers.',
  ),
  q(
    'v10',
    'visualize',
    'When users hover over a column in a chart, they should see a small chart with the monthly trend for that column. What should you create?',
    ['A drillthrough page', 'A report page tooltip', 'A dashboard tile', 'A paginated report'],
    [1],
    'A page set as a tooltip (Page information → Allow use as tooltip) can be assigned to a visual and appears on hover, filtered to the hovered item.',
  ),

  // ---------------- Manage and secure ----------------
  q(
    's1',
    'manage',
    'A colleague must be able to publish and update content in a workspace, but must not be able to add or remove people. Which workspace role should you give?',
    ['Viewer', 'Contributor', 'Member', 'Admin'],
    [1],
    'Contributors can create, edit and publish content. Members can also add people with the same or lower permissions; Admins manage everything.',
  ),
  q(
    's2',
    'manage',
    'A semantic model imports data from a SQL Server inside the company network. What is required for scheduled refresh in the Power BI service?',
    ['A Premium capacity', 'An on-premises data gateway', 'DirectQuery mode', 'A dashboard pinned from the report'],
    [1],
    'The Power BI service is in the cloud and needs an on-premises data gateway to reach data sources inside a private network.',
  ),
  q(
    's3',
    'manage',
    'Sales managers must only see rows for their own region. Where do you define the roles and their DAX filters?',
    ['In the Power BI service, in the workspace settings', 'In Power BI Desktop, with Manage roles', 'In Power Query, with a filter step', 'In the report theme'],
    [1],
    'Row-level security roles and their DAX filter expressions are defined in Power BI Desktop (Modeling → Manage roles). Users are assigned to roles in the service.',
  ),
  q(
    's4',
    'manage',
    'You want one RLS role that filters each user to their own rows, based on a table of user emails. Which DAX function returns the signed-in user\'s email?',
    ['USERELATIONSHIP()', 'USERPRINCIPALNAME()', 'SELECTEDVALUE()', 'LOOKUPVALUE()'],
    [1],
    'USERPRINCIPALNAME() returns the user principal name (usually the email) of the signed-in user, which makes dynamic row-level security possible.',
  ),
  q(
    's5',
    'manage',
    'You need to share a set of reports and dashboards with 300 employees who should only view them, as one packaged experience. What should you use?',
    ['Share each report individually', 'Publish a Power BI app from the workspace', 'Add everyone as workspace Members', 'Export the reports to PDF'],
    [1],
    'An app packages content from a workspace for a large audience of viewers, without giving them access to the workspace itself.',
  ),
  q(
    's6',
    'manage',
    'A large sales table only gets new rows for recent days. Refreshing it fully every night takes too long. What should you configure?',
    ['Incremental refresh with RangeStart and RangeEnd parameters', 'A bigger data gateway', 'Row-level security', 'A dashboard alert'],
    [0],
    'Incremental refresh uses the RangeStart and RangeEnd date/time parameters to refresh only recent partitions and keep older data.',
  ),
  q(
    's7',
    'manage',
    'Before publishing, you want to check what a user in the "West" role will see. What should you do in Power BI Desktop?',
    ['Use "View as" and select the West role', 'Open Performance analyzer', 'Turn on Sync slicers', 'Duplicate the report page'],
    [0],
    '"View as" (Modeling tab) lets you test a report as one or more roles before you publish.',
  ),
  q(
    's8',
    'manage',
    'Your organization wants users to recognize trusted, reviewed semantic models. Which endorsement should an authorized reviewer apply?',
    ['Promoted', 'Certified', 'Featured', 'Pinned'],
    [1],
    'Content owners can promote their own items; Certified requires an authorized reviewer and signals that the content meets the organization\'s quality standards.',
  ),
  q(
    's9',
    'manage',
    'A manager wants an email whenever the value on a dashboard card goes above $50,000. What should you set up?',
    ['A subscription', 'A data alert on the dashboard tile', 'Row-level security', 'A scheduled refresh'],
    [1],
    'Data alerts can be set on dashboard tiles such as cards, KPIs and gauges, and notify when a value crosses a threshold. Subscriptions send snapshots on a schedule.',
  ),
  q(
    's10',
    'manage',
    'Which TWO statements about scheduled refresh for an imported semantic model are true? Choose all that apply.',
    [
      'In shared capacity (Pro), you can schedule up to 8 refreshes a day',
      'In Premium capacity, you can schedule up to 48 refreshes a day',
      'Scheduled refresh is only available in DirectQuery mode',
      'A gateway is always required, even for cloud sources',
    ],
    [0, 1],
    'Shared capacity allows 8 scheduled refreshes a day and Premium allows 48. Cloud sources usually do not need a gateway; DirectQuery does not need scheduled data refresh.',
  ),
];

export const QUESTIONS: Question[] = [...BASE, ...PREPARE_MORE, ...MODEL_MORE, ...VISUALIZE_MORE, ...MANAGE_MORE, ...CASE_QUESTIONS];

export interface PracticeTest {
  id: string;
  title: string;
  free: boolean;
  questionIds: string[];
  /** The case study at the end of the test. */
  caseId: string;
}

const DOMAIN_ORDER: Domain[] = ['prepare', 'model', 'visualize', 'manage'];
export const TEST_COUNT = 4;

/** Every fourth standalone question of each domain, so the four tests cover the whole outline without repeats. */
const share = (domain: Domain, part: number) =>
  QUESTIONS.filter((x) => x.domain === domain && !x.caseId)
    .filter((_, i) => i % TEST_COUNT === part)
    .map((x) => x.id);

/** 35 standalone questions (weighted like the exam) followed by a five-question case study: 40 in all. */
export const TESTS: PracticeTest[] = CASES.slice(0, TEST_COUNT).map((c, part) => ({
  id: `test-${part + 1}`,
  title: `Practice test ${part + 1}`,
  free: part === 0,
  caseId: c.id,
  questionIds: [...DOMAIN_ORDER.flatMap((d) => share(d, part)), ...CASE_QUESTIONS.filter((x) => x.caseId === c.id).map((x) => x.id)],
}));

/** Exam mode: time allowed, like the real exam. */
export const EXAM_MINUTES = 100;

export const caseById = (id: string) => CASES.find((c) => c.id === id);

/** An estimate on the exam's 100–1,000 scale, where 70% correct is 700 (the pass score). Microsoft's real scaling is not public. */
export const scaledScore = (fraction: number) => Math.max(100, Math.round(fraction * 1000));

/** PL-300 is scored from 100 to 1,000 and you need 700 to pass. We use 70% as the practice pass mark. */
export const PASS_MARK = 0.7;

export const questionById = (id: string) => QUESTIONS.find((x) => x.id === id)!;

export function isCorrect(question: Question, picked: number[]): boolean {
  return picked.length === question.correct.length && question.correct.every((c) => picked.includes(c));
}
