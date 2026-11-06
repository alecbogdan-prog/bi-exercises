// Themed exercises for the four smallest chapters, each on its own fictional dataset (src/engine/themes):
// Data Modeling on Slice & Co. (pizza), CALCULATE on the Northfield League (football),
// Report Pages on Lumen Cinemas, Advanced DAX on Copperbean Coffee.
import type { Measure, Relationship } from '../engine/model';
import type { FieldRef, ValueField, VisualSpec } from '../engine/visual';
import { emptySpec } from '../engine/visual';
import type { PagesRequirement, ReportPage, ReportState, ReportVisual } from '../report/report';
import { setInteraction } from '../report/report';
import type { Exercise } from './types';

const f = (table: string, column: string): FieldRef => ({ table, column });
const sum = (table: string, column: string): ValueField => ({ kind: 'column', table, column, agg: 'SUM' });
const meas = (name: string): ValueField => ({ kind: 'measure', name });
const spec = (s: Partial<VisualSpec>): VisualSpec => ({ ...emptySpec(), ...s });
const rel = (fromTable: string, fromColumn: string, toTable: string, toColumn: string): Relationship => ({ fromTable, fromColumn, toTable, toColumn });

// ---------------------------------------------------------------------------
// Data Modeling: Slice & Co.
// ---------------------------------------------------------------------------
const PIZZA_REVENUE: Measure = { name: 'Revenue', table: 'Orders', expression: 'SUM(Orders[Amount])', format: 'currency' };
const O_PIZZA = rel('Orders', 'PizzaID', 'Pizza', 'PizzaID');
const O_STORE = rel('Orders', 'StoreID', 'Store', 'StoreID');
const O_DRIVER = rel('Orders', 'DriverID', 'Driver', 'DriverID');
const O_DATE = rel('Orders', 'Order Date', 'Calendar', 'Date');
const PIZZA_RELS = [O_PIZZA, O_STORE, O_DRIVER, O_DATE];
const pizzaWithout = (...drop: Relationship[]) => PIZZA_RELS.filter((r) => !drop.includes(r));

function modelEx(e: {
  id: string;
  title: string;
  level: Exercise['level'];
  lesson: string;
  task: string[];
  hints: string[];
  starterRelationships: Relationship[];
  required: Relationship[];
  forbidden?: Relationship[];
  visual: VisualSpec;
  explanation: string;
}): Exercise {
  return {
    id: e.id,
    dataset: 'pizza',
    module: 'modeling',
    title: e.title,
    level: e.level,
    free: false,
    lesson: e.lesson,
    task: e.task,
    hints: e.hints,
    givenMeasures: [PIZZA_REVENUE],
    starterRelationships: e.starterRelationships,
    starter: e.visual,
    solution: { spec: e.visual, relationships: PIZZA_RELS },
    check: { kind: 'model', required: e.required, forbidden: e.forbidden, report: { kind: 'report', allowedTypes: [e.visual.type] } },
    explanation: e.explanation,
  };
}

const PIZZA_EXERCISES: Exercise[] = [
  modelEx({
    id: 'pizza-connect-pizza',
    title: 'Which pizzas pay the bills?',
    level: 'Intermediate',
    lesson:
      'New dataset! **Slice & Co.** is a four-store pizza chain: `Orders` has one row per order line, and `Pizza`, `Store`, `Driver` and `Calendar` describe it. One relationship is missing, so the table on the page shows the same revenue for every pizza style.',
    task: ['In the Model view, connect **Orders[PizzaID]** to **Pizza[PizzaID]**.', 'Check that the table now shows a different revenue per style.'],
    hints: ['Orders is the "many" side: one pizza appears in many orders.'],
    starterRelationships: pizzaWithout(O_PIZZA),
    required: [O_PIZZA],
    visual: spec({ type: 'table', category: [f('Pizza', 'Style')], values: [meas('Revenue')] }),
    explanation: 'Without the relationship, the Style filter never reached Orders. Every row showed the grand total: the classic sign of a missing relationship.',
  }),
  modelEx({
    id: 'pizza-connect-calendar',
    title: 'Busy days of the week',
    level: 'Intermediate',
    lesson:
      'Dates need their own table. Relate `Orders[Order Date]` to `Calendar[Date]` and every column of the calendar (Month, Day of Week) can slice the orders.',
    task: ['Connect **Orders[Order Date]** to **Calendar[Date]**.', 'The column chart then shows revenue per day of the week.'],
    hints: ['Calendar has one row per date, so it is the "one" side.'],
    starterRelationships: pizzaWithout(O_DATE),
    required: [O_DATE],
    visual: spec({ type: 'column', category: [f('Calendar', 'Day of Week')], values: [meas('Revenue')] }),
    explanation: 'Fridays and Saturdays stand out. That only shows once the calendar filters the orders.',
  }),
  modelEx({
    id: 'pizza-fix-backwards',
    title: 'A relationship pointing the wrong way',
    level: 'Intermediate',
    lesson:
      'A relationship goes from the **many** side (the fact table) to the **one** side (the lookup table). This model has Store → Orders, the wrong way round, so a store filter cannot reach the orders.',
    task: ['Delete the relationship from **Store** to **Orders**.', 'Create it the right way: **Orders[StoreID]** to **Store[StoreID]**.'],
    hints: ['Click the line between Store and Orders, then Delete relationship.'],
    starterRelationships: [...pizzaWithout(O_STORE), rel('Store', 'StoreID', 'Orders', 'StoreID')],
    required: [O_STORE],
    forbidden: [rel('Store', 'StoreID', 'Orders', 'StoreID')],
    visual: spec({ type: 'bar', category: [f('Store', 'City')], values: [meas('Revenue')] }),
    explanation: 'With the arrow pointing from Store to Orders, each city now shows its own revenue.',
  }),
  modelEx({
    id: 'pizza-wrong-columns',
    title: 'Drivers matched to the wrong key',
    level: 'Advanced',
    lesson:
      'A relationship on the **wrong columns** is worse than none: the numbers look plausible but are wrong. Here Orders[StoreID] was linked to Driver[DriverID]. Both are small whole numbers, so Power BI did not complain.',
    task: ['Delete the relationship **Orders[StoreID] → Driver[DriverID]**.', 'Connect **Orders[DriverID]** to **Driver[DriverID]**.'],
    hints: ['Look at the column names on both ends of each line, not just the tables.'],
    starterRelationships: [...pizzaWithout(O_DRIVER), rel('Orders', 'StoreID', 'Driver', 'DriverID')],
    required: [O_DRIVER],
    forbidden: [rel('Orders', 'StoreID', 'Driver', 'DriverID')],
    visual: spec({ type: 'table', category: [f('Driver', 'Vehicle')], values: [meas('Revenue')] }),
    explanation: 'The wrong key gave revenue to only four drivers, the ones whose IDs happen to match store IDs. Always check the column names on both sides.',
  }),
  modelEx({
    id: 'pizza-build-star',
    title: 'Build the whole star',
    level: 'Advanced',
    lesson:
      'A **star schema** has one fact table in the middle (`Orders`) and a lookup table on each side. Every lookup table needs one relationship to the fact table, from the fact table’s key to the lookup’s key.',
    task: ['Create the four relationships: **Orders** to **Pizza**, **Store**, **Driver** (on their IDs) and **Calendar** (on Order Date → Date).'],
    hints: ['Start from Orders each time: its keys are PizzaID, StoreID, DriverID and Order Date.'],
    starterRelationships: [],
    required: PIZZA_RELS,
    visual: spec({ type: 'matrix', category: [f('Store', 'City')], series: [f('Pizza', 'Style')], values: [meas('Revenue')] }),
    explanation: 'Four lines, all pointing into Orders: any lookup can now filter any visual. That is the shape Power BI works best with.',
  }),
];

// ---------------------------------------------------------------------------
// CALCULATE: Northfield League
// ---------------------------------------------------------------------------
const fm = (name: string, expression: string, format?: Measure['format']): Measure => ({ name, table: 'Results', expression, format });
const GOALS = fm('Goals', 'SUM(Results[Goals For])', 'integer');
const POINTS = fm('Total Points', 'SUM(Results[Points])', 'integer');
const TEAM = f('Team', 'Team');
const SEASON = f('Results', 'Season');
const VENUE = f('Results', 'Venue');

function calcEx(e: {
  id: string;
  title: string;
  level: Exercise['level'];
  lesson: string;
  task: string[];
  hints: string[];
  measure: Measure;
  required: string[];
  visual: VisualSpec;
  contexts: FieldRef[][];
  explanation: string;
}): Exercise {
  return {
    id: e.id,
    dataset: 'football',
    module: 'calculate',
    title: e.title,
    level: e.level,
    free: false,
    lesson: e.lesson,
    task: e.task,
    hints: e.hints,
    givenMeasures: [GOALS, POINTS],
    starter: e.visual,
    solution: { spec: e.visual, measures: [e.measure] },
    check: { kind: 'dax', measureName: e.measure.name, requiredFunctions: e.required, contexts: e.contexts },
    explanation: e.explanation,
  };
}

const FOOTBALL_EXERCISES: Exercise[] = [
  calcEx({
    id: 'calc-home-goals',
    title: 'Goals at home',
    level: 'Intermediate',
    lesson:
      'New dataset! The **Northfield League** has ten teams and two seasons. `Results` has one row per team per match, with **Venue** (Home or Away), goals and points. `CALCULATE` evaluates a measure with an extra filter: here, only the home games.',
    task: ['Create `Home Goals = CALCULATE([Goals], Results[Venue] = "Home")`.', 'The table shows it next to all goals, per team.'],
    hints: ['The filter goes after the comma: column = "value", in double quotes.'],
    measure: fm('Home Goals', 'CALCULATE([Goals], Results[Venue] = "Home")', 'integer'),
    required: ['CALCULATE'],
    visual: spec({ type: 'table', category: [TEAM], values: [meas('Goals'), meas('Home Goals')] }),
    contexts: [[TEAM], [SEASON], []],
    explanation: 'Nine of the ten teams score more than half their goals at home. Only Jarrow Park does better away: home advantage, in one measure.',
  }),
  calcEx({
    id: 'calc-league-goals',
    title: 'The league total on every row',
    level: 'Intermediate',
    lesson: '`ALL(table)` removes every filter on that table. Inside CALCULATE, `ALL(Team)` ignores the team on the row, so the measure returns the whole league’s goals on every row.',
    task: ['Create `League Goals = CALCULATE([Goals], ALL(Team))`.'],
    hints: ['ALL takes the table name, without square brackets.'],
    measure: fm('League Goals', 'CALCULATE([Goals], ALL(Team))', 'integer'),
    required: ['CALCULATE', 'ALL'],
    visual: spec({ type: 'table', category: [TEAM], values: [meas('Goals'), meas('League Goals')] }),
    contexts: [[TEAM], [TEAM, SEASON]],
    explanation: 'The same number on every row looks odd on its own, but it is the denominator for shares, which comes next.',
  }),
  calcEx({
    id: 'calc-goal-share',
    title: 'Share of the league’s goals',
    level: 'Intermediate',
    lesson: 'A share is “this row ÷ all rows”. Combine `DIVIDE` with the ALL pattern: the team’s goals divided by the goals of every team.',
    task: ['Create `Goal Share = DIVIDE([Goals], CALCULATE([Goals], ALL(Team)))` and format it as a percentage.'],
    hints: ['Reuse the CALCULATE(..., ALL(Team)) part from the previous exercise.'],
    measure: fm('Goal Share', 'DIVIDE([Goals], CALCULATE([Goals], ALL(Team)))', 'percent'),
    required: ['CALCULATE', 'ALL', 'DIVIDE'],
    visual: spec({ type: 'bar', category: [TEAM], values: [meas('Goal Share')] }),
    contexts: [[TEAM], [TEAM, SEASON], [TEAM, VENUE]],
    explanation: 'Add a Season filter and the shares still add up to 100%: ALL(Team) only removes the team filter, not the season.',
  }),
  calcEx({
    id: 'calc-all-seasons',
    title: 'Points across both seasons',
    level: 'Advanced',
    lesson:
      '`REMOVEFILTERS(column)` removes the filter on one column only. With Season on the rows, `CALCULATE([Total Points], REMOVEFILTERS(Results[Season]))` shows each team’s points over both seasons on every season’s row.',
    task: ['Create `Points All Seasons = CALCULATE([Total Points], REMOVEFILTERS(Results[Season]))`.'],
    hints: ['REMOVEFILTERS takes a column here: Results[Season].'],
    measure: fm('Points All Seasons', 'CALCULATE([Total Points], REMOVEFILTERS(Results[Season]))', 'integer'),
    required: ['CALCULATE', 'REMOVEFILTERS'],
    visual: spec({ type: 'matrix', category: [TEAM], series: [SEASON], values: [meas('Total Points'), meas('Points All Seasons')] }),
    contexts: [[TEAM, SEASON], [SEASON], [TEAM]],
    explanation: 'The team filter stays, the season filter goes: each team’s two-season total sits next to its points in each season.',
  }),
  calcEx({
    id: 'calc-keepfilters-home',
    title: 'Home points that respect the rows',
    level: 'Advanced',
    lesson:
      'A filter inside CALCULATE normally **replaces** the existing filter on that column. With Venue on the rows, `CALCULATE([Total Points], Results[Venue] = "Home")` would show home points on the Away row too. `KEEPFILTERS` **intersects** instead: the Away row becomes blank.',
    task: ['Create `Home Points = CALCULATE([Total Points], KEEPFILTERS(Results[Venue] = "Home"))`.', 'In the table by Venue, only the Home row has a value.'],
    hints: ['Wrap just the filter in KEEPFILTERS( ... ).'],
    measure: fm('Home Points', 'CALCULATE([Total Points], KEEPFILTERS(Results[Venue] = "Home"))', 'integer'),
    required: ['CALCULATE', 'KEEPFILTERS'],
    visual: spec({ type: 'table', category: [VENUE], values: [meas('Total Points'), meas('Home Points')] }),
    contexts: [[VENUE], [TEAM, VENUE], []],
    explanation: 'Without KEEPFILTERS the Away row would repeat the home points, a classic CALCULATE surprise.',
  }),
];

// ---------------------------------------------------------------------------
// Report Pages: Lumen Cinemas
// ---------------------------------------------------------------------------
const GENRE = f('Film', 'Genre');
const TICKETS = sum('Screenings', 'Tickets');
const REVENUE = sum('Screenings', 'Revenue');
const vis = (id: string, title: string, x: number, y: number, w: number, h: number, s: VisualSpec): ReportVisual => ({ id, title, kind: 'visual', x, y, w, h, spec: s });
const slicer = (id: string, field: FieldRef, x: number, y: number, w: number, h: number): ReportVisual => ({ id, title: field.column, kind: 'slicer', field, values: [], x, y, w, h });
const button = (id: string, label: string, action: ReportVisual['action'], x = 2, y = 84): ReportVisual => ({ id, title: label, kind: 'button', label, action, x, y, w: 15, h: 9 });

const C_OVERVIEW: ReportPage = {
  id: 'overview',
  name: 'Overview',
  visuals: [
    slicer('s-genre', GENRE, 2, 4, 17, 40),
    vis('v-tickets', 'Tickets', 21, 4, 25, 26, spec({ type: 'card', values: [TICKETS] })),
    vis('v-cinema', 'Revenue by Cinema', 21, 34, 39, 62, spec({ type: 'column', category: [f('Cinema', 'Cinema')], values: [REVENUE] })),
    vis('v-films', 'Tickets by Film', 62, 4, 36, 50, spec({ type: 'bar', category: [f('Film', 'Film')], values: [TICKETS] })),
    vis('v-month', 'Tickets by Month', 62, 58, 36, 38, spec({ type: 'line', category: [f('Screenings', 'Month')], values: [TICKETS] })),
  ],
};
const C_FILMS: ReportPage = {
  id: 'films',
  name: 'Films',
  visuals: [
    vis('v-film-table', 'Films', 4, 13, 56, 83, spec({ type: 'table', category: [f('Film', 'Film'), GENRE], values: [TICKETS, REVENUE] })),
    vis('v-rating', 'Tickets by Rating', 63, 13, 34, 83, spec({ type: 'column', category: [f('Film', 'Rating')], values: [TICKETS] })),
  ],
};
const C_CINEMAS: ReportPage = {
  id: 'cinemas',
  name: 'Cinemas',
  visuals: [
    vis('v-cinema-table', 'Cinemas', 4, 13, 56, 70, spec({ type: 'table', category: [f('Cinema', 'Cinema'), f('Cinema', 'City')], values: [TICKETS, REVENUE] })),
    vis('v-daytype', 'Revenue by Day Type', 63, 13, 34, 70, spec({ type: 'column', category: [f('Screenings', 'Day Type')], values: [REVENUE] })),
  ],
};
const cReport = (pages: ReportPage[], extra: Partial<ReportState> = {}): ReportState => ({ pages, interactions: {}, syncGroups: [], bookmarks: [], hidden: [], ...extra });
const C_BASE = cReport([C_OVERVIEW, C_FILMS, C_CINEMAS]);
const onPage = (r: ReportState, id: string, fn: (p: ReportPage) => ReportPage): ReportState => ({ ...r, pages: r.pages.map((p) => (p.id === id ? fn(p) : p)) });

const C_TIP: ReportPage = {
  id: 'film-tip',
  name: 'Film tip',
  visuals: [
    vis('v-tip-revenue', 'Revenue', 4, 6, 40, 40, spec({ type: 'card', values: [REVENUE] })),
    vis('v-tip-cinema', 'Tickets by Cinema', 4, 50, 92, 46, spec({ type: 'bar', category: [f('Cinema', 'Cinema')], values: [TICKETS] })),
  ],
};
const C_WITH_TIP = cReport([C_OVERVIEW, C_FILMS, C_CINEMAS, C_TIP]);
const C_TIP_DONE: ReportState = {
  ...onPage(
    onPage(onPage(C_WITH_TIP, 'film-tip', (p) => ({ ...p, tooltip: true })), 'overview', (p) => ({ ...p, visuals: p.visuals.map((v) => (v.id === 'v-films' ? { ...v, tooltipPage: 'film-tip' } : v)) })),
    'films',
    (p) => ({ ...p, visuals: [...p.visuals, { ...C_OVERVIEW.visuals[0], id: 's-genre-2' }] }),
  ),
  syncGroups: [{ field: GENRE, pages: ['overview', 'films'] }],
};

function pagesEx(e: { id: string; title: string; level: Exercise['level']; lesson: string; task: string[]; hints: string[]; starter: ReportState; solution: ReportState; require: PagesRequirement[]; explanation: string }): Exercise {
  return {
    id: e.id,
    dataset: 'cinema',
    module: 'pages',
    title: e.title,
    level: e.level,
    free: false,
    lesson: e.lesson,
    task: e.task,
    hints: e.hints,
    starter: emptySpec(),
    report: e.starter,
    solution: { spec: emptySpec(), report: e.solution },
    check: { kind: 'pages', require: e.require },
    explanation: e.explanation,
  };
}

const CINEMA_EXERCISES: Exercise[] = [
  pagesEx({
    id: 'cine-hidden-drafts',
    title: 'A hidden page for drafts',
    level: 'Intermediate',
    lesson:
      'New dataset! **Lumen Cinemas** runs four cinemas: `Screenings` has tickets and revenue by film, cinema, month and day type. Report authors often keep a **hidden page** for work in progress: readers of the published report never see it.',
    task: ['Add a new page and rename it **Drafts**.', 'Hide it: right-click its tab → **Hide page**.'],
    hints: ['Click + next to the tabs, double-click the new tab to rename it.'],
    starter: C_BASE,
    solution: cReport([...C_BASE.pages, { id: 'drafts', name: 'Drafts', visuals: [], hidden: true }]),
    require: [
      { type: 'page', name: 'Drafts' },
      { type: 'hiddenPage', page: 'Drafts' },
    ],
    explanation: 'A hidden page still works for you while editing. It only disappears from the tabs in the published report.',
  }),
  pagesEx({
    id: 'cine-highlight',
    title: 'Highlight instead of filter',
    level: 'Intermediate',
    lesson:
      'When you click a column, the other visuals react: by default they **filter**. **Highlight** keeps every bar and shades the part that belongs to your selection, so readers keep the full picture.',
    task: ['Select **Revenue by Cinema**.', 'Turn on **Edit interactions** and set **Tickets by Film** to **Highlight**.'],
    hints: ['The interaction buttons appear above the other visuals once Edit interactions is on.'],
    starter: C_BASE,
    solution: setInteraction(C_BASE, 'v-cinema', 'v-films', 'highlight'),
    require: [{ type: 'interaction', from: 'v-cinema', to: 'v-films', mode: 'highlight' }],
    explanation: 'Click a cinema now and every film bar stays, with that cinema’s share highlighted.',
  }),
  pagesEx({
    id: 'cine-drill-genre',
    title: 'Drill through to a genre',
    level: 'Intermediate',
    lesson: 'A **drillthrough** page shows the details of whatever the reader right-clicks. Put `Film[Genre]` in the Films page’s **Drill through** well, and any visual with Genre can jump there, filtered.',
    task: ['Go to the **Films** page.', 'With no visual selected, add **Genre** to **Drill through**.'],
    hints: ['Power BI adds a Back button for you on a drillthrough page.'],
    starter: C_BASE,
    solution: onPage(C_BASE, 'films', (p) => ({ ...p, drillthrough: [GENRE], visuals: [...p.visuals, button('b-back', 'Back', { type: 'back' }, 1.5, 1.5)] })),
    require: [{ type: 'drillthrough', page: 'Films', field: GENRE }],
    explanation: 'Right-click a genre anywhere in the report and choose Drill through → Films: the page opens already filtered.',
  }),
  pagesEx({
    id: 'cine-nav-buttons',
    title: 'Navigation buttons both ways',
    level: 'Intermediate',
    lesson: 'Buttons turn a report into an app. A **Page navigation** button jumps to a page; one on each page lets readers move between them without the tabs.',
    task: ['On **Overview**, add a button that goes to **Cinemas**.', 'On **Cinemas**, add a button that goes back to **Overview**.'],
    hints: ['Add a button, then Format → Action: type Page navigation and choose the destination.'],
    starter: C_BASE,
    solution: onPage(
      onPage(C_BASE, 'overview', (p) => ({ ...p, visuals: [...p.visuals, button('b-to-cinemas', 'Cinemas', { type: 'page', pageId: 'cinemas' })] })),
      'cinemas',
      (p) => ({ ...p, visuals: [...p.visuals, button('b-to-overview', 'Overview', { type: 'page', pageId: 'overview' })] }),
    ),
    require: [
      { type: 'button', page: 'Overview', action: { type: 'page', page: 'Cinemas' } },
      { type: 'button', page: 'Cinemas', action: { type: 'page', page: 'Overview' } },
    ],
    explanation: 'Ctrl + click a button in Power BI Desktop to try it. In the published report a normal click is enough.',
  }),
  pagesEx({
    id: 'cine-tooltip-sync',
    title: 'Tooltip page and a synced slicer',
    level: 'Advanced',
    lesson:
      'Two finishing touches. A **tooltip page** shows a small page when the reader hovers a data point. A **synced slicer** keeps the same Genre selection on several pages, so switching pages never resets it.',
    task: [
      'Make **Film tip** a tooltip page (Format → Allow use as tooltip) and use it as the tooltip of **Tickets by Film**.',
      'Sync the **Genre** slicer onto the **Films** page (Sync slicers: Sync and Visible).',
    ],
    hints: ['Tooltip page: select the visual, then Format → Tooltips → Report page.', 'Sync slicers works on the selected slicer.'],
    starter: C_WITH_TIP,
    solution: C_TIP_DONE,
    require: [
      { type: 'tooltipPage', page: 'Film tip', visual: 'v-films' },
      { type: 'synced', field: GENRE, pages: ['Overview', 'Films'] },
    ],
    explanation: 'Hover a film for its revenue and cinemas, and pick a genre once for both pages: the report feels like one piece.',
  }),
];

// ---------------------------------------------------------------------------
// Advanced DAX: Copperbean Coffee
// ---------------------------------------------------------------------------
const cm = (name: string, expression: string, format?: Measure['format']): Measure => ({ name, table: 'Orders', expression, format });
const COFFEE_REVENUE = cm('Total Revenue', 'SUM(Orders[Revenue])', 'currency');
const CUPS = cm('Total Cups', 'SUM(Orders[Cups])', 'integer');
const DRINK = f('Drink', 'Drink');
const CATEGORY = f('Drink', 'Category');
const STORE = f('Store', 'Store');

function coffeeEx(e: {
  id: string;
  title: string;
  level: Exercise['level'];
  lesson: string;
  task: string[];
  hints: string[];
  measure: Measure;
  required: string[];
  visual: VisualSpec;
  contexts: FieldRef[][];
  explanation: string;
}): Exercise {
  return {
    id: e.id,
    dataset: 'coffee',
    module: 'dax-advanced',
    title: e.title,
    level: e.level,
    free: false,
    lesson: e.lesson,
    task: e.task,
    hints: e.hints,
    givenMeasures: [COFFEE_REVENUE, CUPS],
    starter: e.visual,
    solution: { spec: e.visual, measures: [e.measure] },
    check: { kind: 'dax', measureName: e.measure.name, requiredFunctions: e.required, contexts: e.contexts },
    explanation: e.explanation,
  };
}

const COFFEE_EXERCISES: Exercise[] = [
  coffeeEx({
    id: 'cof-margin-var',
    title: 'Gross margin with variables',
    level: 'Intermediate',
    lesson:
      'New dataset! **Copperbean Coffee** has five shops: `Orders` has cups and revenue per shop, drink, month and hour; `Drink` has each drink’s price and **Cost per Cup**. **Variables** (`VAR … RETURN`) name the steps of a calculation, so long formulas stay readable and each part is computed once.',
    task: ['Create `Margin % = VAR Cost = SUMX(Orders, Orders[Cups] * RELATED(Drink[Cost per Cup])) RETURN DIVIDE([Total Revenue] - Cost, [Total Revenue])`.'],
    hints: ['SUMX goes line by line; RELATED reads the cost of that line’s drink.', 'Format the measure as a percentage.'],
    measure: cm('Margin %', 'VAR Cost = SUMX(Orders, Orders[Cups] * RELATED(Drink[Cost per Cup])) RETURN DIVIDE([Total Revenue] - Cost, [Total Revenue])', 'percent'),
    required: ['VAR', 'SUMX', 'RELATED', 'DIVIDE'],
    visual: spec({ type: 'table', category: [DRINK], values: [meas('Total Revenue'), meas('Margin %')] }),
    contexts: [[DRINK], [CATEGORY], [STORE], []],
    explanation: 'Earl Grey keeps 87.5% of every sale, Matcha Latte only 64%: a menu decision hiding in one measure.',
  }),
  coffeeEx({
    id: 'cof-rank-drinks',
    title: 'Rank the menu',
    level: 'Intermediate',
    lesson: '`RANKX(ALL(Drink[Drink]), [Total Revenue])` ranks every drink by revenue. `ALL` is essential: without it, each row would only be ranked against itself and get rank 1.',
    task: ['Create `Drink Rank = RANKX(ALL(Drink[Drink]), [Total Revenue])`.'],
    hints: ['Remember ALL(Drink[Drink]) as the first argument.'],
    measure: cm('Drink Rank', 'RANKX(ALL(Drink[Drink]), [Total Revenue])', 'integer'),
    required: ['RANKX', 'ALL'],
    visual: spec({ type: 'table', category: [DRINK], values: [meas('Total Revenue'), meas('Drink Rank')] }),
    contexts: [[DRINK], [DRINK, STORE]],
    explanation: 'Add a store filter and the ranking updates per shop: RANKX always ranks inside the current filters.',
  }),
  coffeeEx({
    id: 'cof-avg-per-shop',
    title: 'Revenue of an average shop',
    level: 'Intermediate',
    lesson: '`AVERAGEX(VALUES(Store[Store]), [Total Revenue])` computes the revenue of each shop, then averages them. That is different from AVERAGE, which would average individual order lines.',
    task: ['Create `Avg Shop Revenue = AVERAGEX(VALUES(Store[Store]), [Total Revenue])`.'],
    hints: ['VALUES(Store[Store]) is the list of shops in the current filter.'],
    measure: cm('Avg Shop Revenue', 'AVERAGEX(VALUES(Store[Store]), [Total Revenue])', 'currency'),
    required: ['AVERAGEX', 'VALUES'],
    visual: spec({ type: 'table', category: [CATEGORY], values: [meas('Total Revenue'), meas('Avg Shop Revenue')] }),
    contexts: [[CATEGORY], [], [f('Orders', 'Month')]],
    explanation: 'Per category, the average shop sells a fifth of the total: an easy target to compare each shop with.',
  }),
  coffeeEx({
    id: 'cof-peak-hour',
    title: 'The busiest hour',
    level: 'Advanced',
    lesson: '`MAXX(VALUES(Orders[Hour]), [Total Cups])` goes through each hour, computes its cups, and keeps the largest: the cups served in the busiest hour, per shop.',
    task: ['Create `Peak Hour Cups = MAXX(VALUES(Orders[Hour]), [Total Cups])`.'],
    hints: ['MAXX works like SUMX, but keeps the maximum instead of adding up.'],
    measure: cm('Peak Hour Cups', 'MAXX(VALUES(Orders[Hour]), [Total Cups])', 'integer'),
    required: ['MAXX', 'VALUES'],
    visual: spec({ type: 'bar', category: [STORE], values: [meas('Peak Hour Cups')] }),
    contexts: [[STORE], [STORE, CATEGORY], []],
    explanation: 'Staff rotas are planned for the peak, not the average. This measure tells each shop how busy its rush really gets.',
  }),
  coffeeEx({
    id: 'cof-dynamic-title',
    title: 'A title that follows the slicer',
    level: 'Advanced',
    lesson:
      'Measures can return text. `SELECTEDVALUE(column, "alternate")` returns the one selected value, or the alternate when there is none or several. Join text with `&` to build a dynamic title for a card or chart.',
    task: ['Create `Revenue Title = "Revenue for " & SELECTEDVALUE(Drink[Category], "all drinks")`.'],
    hints: ['Text goes in double quotes; & joins two pieces of text.'],
    measure: cm('Revenue Title', '"Revenue for " & SELECTEDVALUE(Drink[Category], "all drinks")', 'text'),
    required: ['SELECTEDVALUE'],
    visual: spec({ type: 'table', category: [CATEGORY], values: [meas('Revenue Title')] }),
    contexts: [[CATEGORY], [], [DRINK]],
    explanation: 'Use it as a visual’s title through conditional formatting (fx) and the title follows every slicer change.',
  }),
];

export const EXERCISES_11: Exercise[] = [...PIZZA_EXERCISES, ...FOOTBALL_EXERCISES, ...CINEMA_EXERCISES, ...COFFEE_EXERCISES];
