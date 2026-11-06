import type { ModuleId } from '../exercises/types';

/** Content for the /power-bi-assessment-test page (shared with the sitemap's static HTML). */

export const ASSESSMENT_PATH = '/power-bi-assessment-test';

export const ASSESSMENT_FORMATS = [
  {
    title: 'Online multiple-choice test',
    text: 'A timed quiz sent before or after the first call. Expect questions on DAX, relationships, Power Query and choosing the right visual, often with a short formula or a model diagram to read.',
  },
  {
    title: 'Take-home case study',
    text: 'You get a dataset and a request from a "manager": clean the data, build the model and a one- or two-page dashboard, then present what you found. This is where hands-on skill shows the most.',
  },
  {
    title: 'Live technical interview',
    text: 'Someone asks you to explain or write a measure, sketch a star schema or fix a report on a shared screen. They want to hear how you think, so practice saying your steps out loud.',
  },
];

export const ASSESSMENT_SKILLS: { module: ModuleId; skill: string }[] = [
  { module: 'reports', skill: 'Pick and build the right visual: cards, tables, matrices, bar and line charts' },
  { module: 'filters', skill: 'Filter exactly what was asked: visual filters, Top N and slicers' },
  { module: 'powerquery', skill: 'Clean messy files in Power Query: types, blanks, duplicates, unpivot, merge' },
  { module: 'modeling', skill: 'Build a star schema with one-to-many relationships that filter the right way' },
  { module: 'dax-basics', skill: 'Write basic measures: SUM, COUNTROWS, DIVIDE and iterators like SUMX' },
  { module: 'calculate', skill: 'Explain filter context and use CALCULATE, ALL and KEEPFILTERS' },
  { module: 'time', skill: 'Year-to-date, same period last year and month-over-month growth' },
  { module: 'pages', skill: 'Make a report people can use: drillthrough, bookmarks, tooltips, sync slicers' },
];

export interface SampleQuestion {
  q: string;
  code?: string;
  options: string[];
  answer: number;
  why: string;
}

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    q: 'You need a "Total Sales" number that changes when the user clicks a slicer. What should you create?',
    options: ['A calculated column', 'A measure', 'A calculated table', 'A Power Query custom column'],
    answer: 1,
    why: 'Measures are evaluated when the visual is drawn, in the current filter context, so they respond to slicers. Calculated columns are computed once at refresh and stored row by row.',
  },
  {
    q: 'A matrix shows Product[Color] on rows. Which value appears in the "Blue" row for this measure?',
    code: 'Red Sales = CALCULATE ( [Total Sales], Product[Color] = "Red" )',
    options: ['The sales of blue products', 'Blank', 'The sales of red products', 'The sales of all products'],
    answer: 2,
    why: 'A filter argument on a column replaces the existing filter on that same column. The row says Blue, CALCULATE overrides it with Red. Wrap the filter in KEEPFILTERS to get blank instead.',
  },
  {
    q: 'Which measure returns each category\'s share of total sales, so the categories add up to 100%?',
    options: [
      'DIVIDE ( [Total Sales], SUM ( Sales[Amount] ) )',
      'DIVIDE ( [Total Sales], CALCULATE ( [Total Sales], ALL ( Product[Category] ) ) )',
      'DIVIDE ( [Total Sales], CALCULATE ( [Total Sales], Product[Category] ) )',
      '[Total Sales] / COUNTROWS ( Product )',
    ],
    answer: 1,
    why: 'ALL removes the category filter in the denominator, so it returns the total for every category while the numerator keeps the current one.',
  },
  {
    q: 'Why use DIVIDE ( [Profit], [Sales] ) instead of [Profit] / [Sales]?',
    options: ['It is the only way to divide two measures', 'It returns blank (or an alternate value) instead of an error when Sales is zero', 'It rounds the result to two decimals', 'It ignores filters on the visual'],
    answer: 1,
    why: 'DIVIDE handles division by zero safely. You can pass a third argument, such as 0, to show instead of blank.',
  },
  {
    q: 'What is the difference between SUM ( Sales[Amount] ) and SUMX ( Sales, Sales[Quantity] * Sales[Price] )?',
    options: [
      'There is none, SUMX is just the older syntax',
      'SUMX evaluates an expression row by row and then adds the results; SUM adds one column',
      'SUM ignores filters; SUMX respects them',
      'SUMX only works in calculated columns',
    ],
    answer: 1,
    why: 'SUMX is an iterator: it walks the table, computes the expression for each row, then sums. SUM can only add the values of a single column.',
  },
  {
    q: 'In a star schema, what sits in the middle?',
    options: ['A date table', 'A fact table with numbers to aggregate, like Sales', 'A bridge table for every dimension', 'The table with the most columns'],
    answer: 1,
    why: 'The fact table (sales, orders, transactions) is in the center. Dimension tables like Product, Customer and Date surround it with one-to-many relationships.',
  },
  {
    q: 'Product[ProductKey] 1 → * Sales[ProductKey], with single cross-filter direction. Which statement is true?',
    options: [
      'A slicer on Product[Category] filters the Sales rows',
      'A slicer on Sales[Channel] filters the list of products',
      'Both tables always filter each other',
      'Neither table filters the other until you add a measure',
    ],
    answer: 0,
    why: 'Filters flow from the one side to the many side. Product filters Sales, but Sales does not filter Product unless you change the direction or use CROSSFILTER in a measure.',
  },
  {
    q: 'TOTALYTD ( [Total Sales], \'Date\'[Date] ) returns wrong totals. What is the most likely cause?',
    options: [
      'The measure needs to be a calculated column',
      'The date column is not from a proper date table with one row for every day',
      'TOTALYTD only works on line charts',
      'The report has more than one page',
    ],
    answer: 1,
    why: 'Time intelligence functions need a date table with continuous dates (no gaps) related to the fact table, ideally marked as a date table.',
  },
  {
    q: 'A CSV has duplicate rows and a "Name, City" column that should be two columns. Where should you fix this?',
    options: ['In Power Query, before loading', 'With a DAX measure', 'With a visual-level filter', 'In the report theme'],
    answer: 0,
    why: 'Shape data as early as possible: Remove Duplicates and Split Column in Power Query. The model stays clean and every report benefits.',
  },
  {
    q: 'Each sales manager should only see the rows for their own region in the published report. What do you use?',
    options: ['A page-level filter', 'Row-level security (RLS) roles with a DAX filter', 'A hidden slicer', 'A separate report for each manager'],
    answer: 1,
    why: 'RLS filters the data itself for each user, for example with USERPRINCIPALNAME() matched to a region table. Filters and slicers can be changed by the viewer.',
  },
];

export const PREP_PLAN: { day: string; focus: string; module?: ModuleId; link?: { href: string; text: string } }[] = [
  { day: 'Day 1', focus: 'Visuals and filters: build cards, matrices and charts, then filter them exactly as asked.', module: 'reports' },
  { day: 'Day 2', focus: 'Power Query: clean a messy file from start to finish.', module: 'powerquery' },
  { day: 'Day 3', focus: 'Data modeling: connect tables into a star schema and fix wrong relationships.', module: 'modeling' },
  { day: 'Day 4', focus: 'DAX basics: SUM, COUNTROWS, DIVIDE and SUMX.', module: 'dax-basics' },
  { day: 'Day 5', focus: 'CALCULATE and filter context, the topic interviewers ask about most.', module: 'calculate' },
  { day: 'Day 6', focus: 'Time intelligence: year-to-date, last year and growth.', module: 'time' },
  { day: 'Day 7', focus: 'Do a full project as if it were a take-home task, then take a timed practice test.', link: { href: '/projects', text: 'Practice projects' } },
];

export const ASSESSMENT_FAQ: [string, string][] = [
  [
    'What is a Power BI assessment test?',
    'A test employers use to check Power BI skills before or during interviews for analyst roles. It can be an online quiz, a take-home dashboard task or a live exercise with an interviewer.',
  ],
  [
    'What topics come up most?',
    'DAX measures and CALCULATE, filter context, relationships and star schemas, Power Query cleaning, time intelligence and choosing the right visual. Security (RLS) and import vs DirectQuery come up for more senior roles.',
  ],
  [
    'How long does it take?',
    'It depends on the employer. Online quizzes are usually short and timed, while take-home tasks can give you a few hours or a few days. Ask the recruiter what format to expect.',
  ],
  [
    'Do I need the PL-300 certification?',
    'Usually not, but it helps on a CV, and preparing for it covers most of what assessment tests ask. Our PL-300 practice tests are a good timed warm-up.',
  ],
  [
    'Can I practice without Power BI Desktop?',
    'Yes. Every exercise here runs in your browser, on Windows, Mac or a Chromebook, and checks your answer against the data.',
  ],
];
