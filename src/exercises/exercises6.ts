// Sixth batch: multi-page reports and interactivity (PL-300 "Visualize and analyze"). Original content.
import type { FieldRef, ValueField, VisualSpec } from '../engine/visual';
import { emptySpec } from '../engine/visual';
import type { Bookmark, PagesRequirement, ReportPage, ReportState, ReportVisual } from '../report/report';
import { setInteraction } from '../report/report';
import type { Exercise } from './types';

const f = (table: string, column: string): FieldRef => ({ table, column });
const sum = (table: string, column: string): ValueField => ({ kind: 'column', table, column, agg: 'SUM' });
const spec = (s: Partial<VisualSpec>): VisualSpec => ({ ...emptySpec(), ...s });
const SALES = sum('Sales', 'Sales Amount');
const YEAR = f('Date', 'Year');
const CATEGORY = f('Product', 'Category');
const STATE = f('Customer', 'State');

const vis = (id: string, title: string, x: number, y: number, w: number, h: number, s: VisualSpec): ReportVisual => ({ id, title, kind: 'visual', x, y, w, h, spec: s });
const slicer = (id: string, field: FieldRef, x: number, y: number, w: number, h: number): ReportVisual => ({ id, title: field.column, kind: 'slicer', field, values: [], x, y, w, h });

const OVERVIEW: ReportPage = {
  id: 'overview',
  name: 'Overview',
  visuals: [
    slicer('s-year', YEAR, 2, 4, 17, 30),
    vis('v-total', 'Total Sales', 21, 4, 25, 26, spec({ type: 'card', values: [SALES] })),
    vis('v-cat', 'Sales by Category', 21, 34, 39, 62, spec({ type: 'column', category: [CATEGORY], values: [SALES] })),
    vis('v-trend', 'Sales by Month', 62, 4, 36, 44, spec({ type: 'line', category: [f('Date', 'Year Month')], values: [SALES] })),
    vis('v-state', 'Sales by State', 62, 52, 36, 44, spec({ type: 'bar', category: [STATE], values: [SALES] })),
  ],
};

const PRODUCTS: ReportPage = {
  id: 'products',
  name: 'Products',
  visuals: [
    vis('v-products', 'Sales by Product', 4, 13, 56, 83, spec({ type: 'table', category: [f('Product', 'Product')], values: [SALES, sum('Sales', 'Quantity')] })),
    vis('v-color', 'Sales by Color', 63, 13, 34, 83, spec({ type: 'column', category: [f('Product', 'Color')], values: [SALES] })),
  ],
};

const CUSTOMERS: ReportPage = {
  id: 'customers',
  name: 'Customers',
  visuals: [
    vis('v-customers', 'Sales by Customer', 4, 13, 56, 83, spec({ type: 'table', category: [f('Customer', 'Customer'), f('Customer', 'City')], values: [SALES] })),
    vis('v-segment', 'Sales by Segment', 63, 13, 34, 83, spec({ type: 'donut', category: [f('Customer', 'Segment')], values: [SALES] })),
  ],
};

const report = (pages: ReportPage[], extra: Partial<ReportState> = {}): ReportState => ({ pages, interactions: {}, syncGroups: [], bookmarks: [], hidden: [], ...extra });
const BASE = report([OVERVIEW, PRODUCTS, CUSTOMERS]);

const page = (r: ReportState, id: string, fn: (p: ReportPage) => ReportPage): ReportState => ({ ...r, pages: r.pages.map((p) => (p.id === id ? fn(p) : p)) });
const withVisual = (r: ReportState, pageId: string, v: ReportVisual) => page(r, pageId, (p) => ({ ...p, visuals: [...p.visuals, v] }));
const button = (id: string, label: string, action: ReportVisual['action']): ReportVisual => ({ id, title: label, kind: 'button', label, action, x: 2, y: 84, w: 15, h: 9 });

function pagesEx(e: {
  id: string;
  title: string;
  level: Exercise['level'];
  lesson: string;
  task: string[];
  hints: string[];
  starter: ReportState;
  solution: ReportState;
  require: PagesRequirement[];
  explanation: string;
}): Exercise {
  return {
    id: e.id,
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

// ---------- solutions built from the base report ----------

const withDetails = { ...BASE, pages: [...BASE.pages, { id: 'details', name: 'Details', visuals: [] }] };
const withNotes = report([OVERVIEW, PRODUCTS, { id: 'notes', name: 'Notes', visuals: [] }]);
const drillProducts = page(BASE, 'products', (p) => ({ ...p, drillthrough: [CATEGORY], visuals: [...p.visuals, button('b-back', 'Back', { type: 'back' })] }));
const drillCustomers = page(BASE, 'customers', (p) => ({ ...p, drillthrough: [STATE], visuals: [...p.visuals, button('b-back', 'Back', { type: 'back' })] }));
const synced: ReportState = {
  ...withVisual(withVisual(BASE, 'products', { ...OVERVIEW.visuals[0], id: 's-year-2' }), 'customers', { ...OVERVIEW.visuals[0], id: 's-year-3' }),
  syncGroups: [{ field: YEAR, pages: ['overview', 'products', 'customers'] }],
};

// Bookmarks: a chart and a table share one spot; the table starts hidden.
const TOGGLE_PAGE: ReportPage = {
  ...OVERVIEW,
  visuals: [...OVERVIEW.visuals, vis('v-cat-table', 'Category Table', 21, 34, 39, 62, spec({ type: 'table', category: [CATEGORY], values: [SALES, sum('Sales', 'Quantity')] }))],
};
const TOGGLE = report([TOGGLE_PAGE, PRODUCTS, CUSTOMERS], { hidden: ['v-cat-table'] });
const CHART_VIEW: Bookmark = { id: 'bm-chart', name: 'Chart view', pageId: 'overview', hidden: ['v-cat-table'], slicers: { 's-year': [] } };
const TABLE_VIEW: Bookmark = { id: 'bm-table', name: 'Table view', pageId: 'overview', hidden: ['v-cat'], slicers: { 's-year': [] } };
const WITH_BOOKMARKS: ReportState = { ...TOGGLE, bookmarks: [CHART_VIEW, TABLE_VIEW] };

const TIP_PAGE: ReportPage = {
  id: 'month-tip',
  name: 'Month tip',
  visuals: [
    vis('v-tip-card', 'Orders', 4, 6, 40, 40, spec({ type: 'card', values: [{ kind: 'column', table: 'Sales', column: 'OrderID', agg: 'DISTINCTCOUNT' }] })),
    vis('v-tip-cat', 'Sales by Category', 4, 50, 92, 46, spec({ type: 'bar', category: [CATEGORY], values: [SALES] })),
  ],
};
const WITH_TIP = report([OVERVIEW, PRODUCTS, TIP_PAGE]);
const TIP_DONE: ReportState = {
  ...page(WITH_TIP, 'month-tip', (p) => ({ ...p, tooltip: true })),
};
TIP_DONE.pages = TIP_DONE.pages.map((p) => (p.id === 'overview' ? { ...p, visuals: p.visuals.map((v) => (v.id === 'v-trend' ? { ...v, tooltipPage: 'month-tip' } : v)) } : p));

export const EXERCISES_6: Exercise[] = [
  pagesEx({
    id: 'pages-add-page',
    title: 'Add a report page',
    level: 'Beginner',
    lesson:
      'Reports usually have several pages: an overview first, details after. Click **+** next to the page tabs at the bottom to add a page, then **double-click** the tab to rename it. You can also use **Insert → New page**.',
    task: ['Add a new page.', 'Rename it **Details**.'],
    hints: ['The + button is right of the last page tab.', 'Double-click the new tab, type Details and press Enter.'],
    starter: BASE,
    solution: withDetails,
    require: [{ type: 'page', name: 'Details' }],
    explanation: 'Give pages short, clear names: they become the navigation of your report in the Power BI service.',
  }),
  pagesEx({
    id: 'pages-hide-page',
    title: 'Hide a working page',
    level: 'Beginner',
    lesson: 'Some pages are only for you: notes, tests, or pages reached by drillthrough. **Right-click the tab → Hide page** keeps the page in the file but hides it from readers in the Power BI service.',
    task: ['Hide the **Notes** page.'],
    hints: ['Right-click the Notes tab at the bottom.'],
    starter: withNotes,
    solution: page(withNotes, 'notes', (p) => ({ ...p, hidden: true })),
    require: [{ type: 'hiddenPage', page: 'Notes' }],
    explanation: 'Hidden pages still work as drillthrough and tooltip pages. They just do not appear in the page list.',
  }),
  pagesEx({
    id: 'pages-interaction-card',
    title: 'Keep the total steady',
    level: 'Intermediate',
    lesson:
      'By default, selecting a data point in one visual filters the other visuals on the page. **Edit interactions** changes that per visual: select the source visual, turn on **Format → Edit interactions**, then pick **Filter**, **Highlight** or **None** on each target visual.',
    task: ['Select **Sales by Category**.', 'Turn on **Format → Edit interactions**.', 'On the **Total Sales** card, choose **None**.'],
    hints: ['Try it first: click a bar and watch the card change.', 'The interaction icons appear at the top-right of the other visuals.'],
    starter: BASE,
    solution: setInteraction(BASE, 'v-cat', 'v-total', 'none'),
    require: [{ type: 'interaction', from: 'v-cat', to: 'v-total', mode: 'none' }],
    explanation: 'Now the card always shows the grand total, while the other charts still react to the category you click.',
  }),
  pagesEx({
    id: 'pages-interaction-slicer',
    title: 'A trend that ignores the year slicer',
    level: 'Intermediate',
    lesson: 'Slicers are visuals too, so Edit interactions works for them. Select the slicer, turn on Edit interactions and set **None** on any visual it should not filter.',
    task: ['Select the **Year** slicer.', 'Turn on **Format → Edit interactions**.', 'Set **Sales by Month** to **None**.'],
    hints: ['Click the slicer frame (not a checkbox) to select it.'],
    starter: BASE,
    solution: setInteraction(BASE, 's-year', 'v-trend', 'none'),
    require: [{ type: 'interaction', from: 's-year', to: 'v-trend', mode: 'none' }],
    explanation: 'The monthly trend keeps both years for context, while the other visuals follow the slicer.',
  }),
  pagesEx({
    id: 'pages-drillthrough-category',
    title: 'Drill through to product details',
    level: 'Intermediate',
    lesson:
      'A **drillthrough page** shows details for one item. On the target page, with no visual selected, drag a field into **Drill through** in the Visualizations pane. Then, on any page, right-click a data point of that field → **Drill through**. Power BI adds a **Back** button automatically.',
    task: ['Go to the **Products** page and click an empty part of the page.', 'Drag `Product[Category]` into the **Drill through** well.', 'Test it: on Overview, right-click a bar in Sales by Category → Drill through → Products.'],
    hints: ['Category is in the Product table of the Data pane.', 'The Drill through well appears in the Build tab when no visual is selected.'],
    starter: BASE,
    solution: drillProducts,
    require: [{ type: 'drillthrough', page: 'Products', field: CATEGORY }],
    explanation: 'Drillthrough keeps the overview page clean: details live on their own page and are one right-click away.',
  }),
  pagesEx({
    id: 'pages-drillthrough-state',
    title: 'From a state to its customers',
    level: 'Advanced',
    lesson: 'Any field can drive drillthrough. Here the Customers page should open filtered to the state you right-click in Sales by State.',
    task: ['On the **Customers** page, add `Customer[State]` to **Drill through**.', 'Test it from the Sales by State chart on Overview, then use the Back button (Ctrl + click).'],
    hints: ['State is in the Customer table.'],
    starter: BASE,
    solution: drillCustomers,
    require: [{ type: 'drillthrough', page: 'Customers', field: STATE }],
    explanation: 'Right-click → Drill through passes the state as a filter, and the Back button returns to where you came from.',
  }),
  pagesEx({
    id: 'pages-sync-slicers',
    title: 'One year slicer for every page',
    level: 'Intermediate',
    lesson:
      'With **View → Sync slicers**, one slicer can appear on several pages and keep the same selection everywhere. Select the slicer, then tick **Sync** (share the selection) and **Visible** (show the slicer) for each page.',
    task: ['Select the **Year** slicer on Overview.', 'Open **View → Sync slicers**.', 'Tick **Sync** and **Visible** for **Products** and **Customers**.'],
    hints: ['The Sync slicers pane opens next to the Visualizations pane.'],
    starter: BASE,
    solution: synced,
    require: [{ type: 'synced', field: YEAR, pages: ['Overview', 'Products', 'Customers'] }],
    explanation: 'Pick 2025 on any page and every page follows. Readers no longer need to set the same filter three times.',
  }),
  pagesEx({
    id: 'pages-bookmarks',
    title: 'Chart view and table view',
    level: 'Advanced',
    lesson:
      'A **bookmark** saves the current state of a page, including which visuals are visible. Use the **Selection pane** (View → Selection) to show or hide visuals, then **View → Bookmarks → Add**. Double-click a bookmark to rename it.',
    task: [
      'Open **View → Selection** and **View → Bookmarks**.',
      'With the table hidden and the chart visible, add a bookmark named **Chart view**.',
      'Hide **Sales by Category**, show **Category Table**, and add a bookmark named **Table view**.',
    ],
    hints: ['The eye icon in the Selection pane shows or hides a visual.', 'If you change the page after adding a bookmark, use ⋯ → Update.'],
    starter: TOGGLE,
    solution: WITH_BOOKMARKS,
    require: [
      { type: 'bookmark', name: 'Chart view', hidden: ['v-cat-table'], visible: ['v-cat'] },
      { type: 'bookmark', name: 'Table view', hidden: ['v-cat'], visible: ['v-cat-table'] },
    ],
    explanation: 'Two bookmarks, one spot on the page: the classic chart/table toggle. Next you connect them to buttons.',
  }),
  pagesEx({
    id: 'pages-bookmark-button',
    title: 'A button that shows the table',
    level: 'Advanced',
    lesson: 'Buttons make bookmarks easy to use. **Insert → Blank button**, then in **Format → Action** choose **Bookmark** and pick the bookmark. In Power BI Desktop, Ctrl + click a button to try it.',
    task: ['On **Overview**, insert a **Blank button**.', 'Set its text to **Show table**.', 'Set its action to **Bookmark → Table view**.'],
    hints: ['Select the button, then open the Format tab of the Visualizations pane.'],
    starter: WITH_BOOKMARKS,
    solution: withVisual(WITH_BOOKMARKS, 'overview', button('b-table', 'Show table', { type: 'bookmark', bookmarkId: 'bm-table' })),
    require: [{ type: 'button', page: 'Overview', action: { type: 'bookmark', name: 'Table view' } }],
    explanation: 'Add a second button for "Chart view" and readers can switch views without knowing bookmarks exist.',
  }),
  pagesEx({
    id: 'pages-nav-button',
    title: 'Navigation button',
    level: 'Beginner',
    lesson: 'A **Page navigation** button takes readers to another page, which feels like an app menu. Insert a button and set **Action → Page navigation** with the destination page.',
    task: ['On **Overview**, insert a **Blank button**.', 'Set its action to **Page navigation → Products**.'],
    hints: ['After choosing Page navigation, pick Products in Destination.'],
    starter: BASE,
    solution: withVisual(BASE, 'overview', button('b-nav', 'Products', { type: 'page', pageId: 'products' })),
    require: [{ type: 'button', page: 'Overview', action: { type: 'page', page: 'Products' } }],
    explanation: 'Many reports hide the page tabs in the service and use navigation buttons instead.',
  }),
  pagesEx({
    id: 'pages-back-button',
    title: 'Add the way back',
    level: 'Beginner',
    lesson: 'Drillthrough pages need a way back. Power BI adds a Back button when you create a drillthrough page, but if someone deleted it, use **Insert → Back button**.',
    task: ['Go to the **Products** page.', 'Insert a **Back button**.'],
    hints: ['Back button is in Insert → Elements.'],
    starter: page(BASE, 'products', (p) => ({ ...p, drillthrough: [CATEGORY] })),
    solution: drillProducts,
    require: [{ type: 'button', page: 'Products', action: { type: 'back' } }],
    explanation: 'Readers can now return to the page they drilled from, with their filters intact.',
  }),
  pagesEx({
    id: 'pages-tooltip-page',
    title: 'A custom tooltip page',
    level: 'Advanced',
    lesson:
      'A **report page tooltip** shows a small page when users hover over a data point. On the tooltip page, turn on **Format → Page information → Allow use as tooltip**. Then select the visual and set **Format → Tooltips → Type: Report page** and the page.',
    task: ['Go to **Month tip**, click an empty part of the page, and turn on **Allow use as tooltip** (Format page).', 'Back on **Overview**, select **Sales by Month**.', 'Set **Tooltips → Type: Report page**, **Page: Month tip**.'],
    hints: ['With no visual selected, the Format tab shows the page settings.'],
    starter: WITH_TIP,
    solution: TIP_DONE,
    require: [{ type: 'tooltipPage', page: 'Month tip', visual: 'v-trend' }],
    explanation: 'Tooltip pages are usually hidden too, so readers only see them on hover.',
  }),
];
