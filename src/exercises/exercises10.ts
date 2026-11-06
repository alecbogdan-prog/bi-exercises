// Filters & Slicers, part 2: themed exercises on the fictional Pinewave Festival dataset (src/engine/festival.ts).
import type { FieldRef, ValueField, VisualSpec } from '../engine/visual';
import { emptySpec } from '../engine/visual';
import type { Exercise } from './types';

const f = (table: string, column: string): FieldRef => ({ table, column });
const sum = (table: string, column: string): ValueField => ({ kind: 'column', table, column, agg: 'SUM' });
const spec = (s: Partial<VisualSpec>): VisualSpec => ({ ...emptySpec(), ...s });

const ATTENDANCE = sum('Performances', 'Attendance');
const MERCH = sum('Performances', 'Merch Sales');

export const EXERCISES_10: Exercise[] = [
  {
    id: 'fest-exclude-tent',
    dataset: 'festival',
    module: 'filters',
    title: 'Everything except The Tent',
    level: 'Beginner',
    free: false,
    lesson:
      'New dataset! These exercises use the **Pinewave Festival**: three days, four stages and thirty acts. `Performances` has one row per show, with its **Attendance** and **Merch Sales**; `Artist` and `Stage` describe who played where.\n\n**Basic filtering** has no "not equal to". To leave one value out, tick every value you want to keep. The values you leave unticked are filtered out.',
    task: [
      'Create a **Stacked column chart** of `Performances[Attendance]` by `Stage[Stage]`.',
      'In **Filters on this visual**, open **Stage** and tick every stage except **The Tent**.',
    ],
    hints: ['Stage is already in "Filters on this visual" because it is on the axis: open its card.', 'Tick Main Stage, Lakeside and Forest Stage, and leave The Tent unticked.'],
    starter: spec({ type: 'column' }),
    solution: {
      spec: spec({
        type: 'column',
        category: [f('Stage', 'Stage')],
        values: [ATTENDANCE],
        filters: [{ table: 'Stage', column: 'Stage', values: ['Main Stage', 'Lakeside', 'Forest Stage'] }],
      }),
    },
    check: { kind: 'report', allowedTypes: ['column'] },
    explanation: 'The Tent disappears from the chart, and so do its fans: the other three columns keep exactly their own attendance.',
  },
  {
    id: 'fest-genres-or',
    dataset: 'festival',
    module: 'filters',
    title: 'Rock or indie',
    level: 'Beginner',
    free: false,
    lesson: 'Inside **one** filter, the values you tick are combined with **OR**: a show is kept if its genre is the first one *or* the second one.',
    task: ['Create a **Table** with `Artist[Artist]` and the **Sum of Attendance**.', 'Add `Artist[Genre]` to **Filters on this visual** (from **+ Add a field…**) and tick **Rock** and **Indie**.'],
    hints: ['Genre is not in the table, so add it to the Filters pane yourself.'],
    starter: spec({ type: 'table' }),
    solution: {
      spec: spec({
        type: 'table',
        category: [f('Artist', 'Artist')],
        values: [ATTENDANCE],
        filters: [{ table: 'Artist', column: 'Genre', values: ['Rock', 'Indie'] }],
      }),
    },
    check: { kind: 'report', allowedTypes: ['table'] },
    explanation: 'Twelve acts are left: the six rock bands and the six indie bands. A filter on a field that is not in the visual still filters it.',
  },
  {
    id: 'fest-page-main-stage',
    dataset: 'festival',
    module: 'filters',
    title: 'A page just for the Main Stage',
    level: 'Intermediate',
    free: false,
    lesson:
      'The Filters pane has three levels: **on this visual**, **on this page** (every visual on the page) and **on all pages** (the whole report). Put a filter at the level its readers expect: a "Main Stage" page should filter the whole page, not one chart.',
    task: ['Create a **Stacked bar chart** of `Performances[Attendance]` by `Artist[Genre]`.', 'In **Filters on this page**, add `Stage[Stage]` and keep only **Main Stage**.'],
    hints: ['Use "+ Add a field…" in the "Filters on this page" section, not the one on the visual.'],
    starter: spec({ type: 'bar' }),
    solution: {
      spec: spec({
        type: 'bar',
        category: [f('Artist', 'Genre')],
        values: [ATTENDANCE],
        filters: [{ table: 'Stage', column: 'Stage', values: ['Main Stage'], scope: 'page' }],
      }),
    },
    check: { kind: 'report', allowedTypes: ['bar'] },
    explanation: 'A page filter applies to every visual on the page, including the ones you add later. That is why report pages are often built per stage, region or product line.',
  },
  {
    id: 'fest-bottom-artists',
    dataset: 'festival',
    module: 'filters',
    title: 'The three quietest acts',
    level: 'Intermediate',
    free: false,
    lesson: '**Top N** also works the other way round. Switch **Top** to **Bottom** to keep the N items with the *lowest* value, which is handy for finding what needs attention.',
    task: [
      'Create a **Stacked bar chart** of `Performances[Attendance]` by `Artist[Artist]`.',
      'In **Filters on this visual**, open **Artist**, set **Filter type: Top N**, choose **Bottom 3** by **Sum of Attendance** and apply.',
    ],
    hints: ['The Artist card is already in "Filters on this visual" because Artist is on the axis.', 'Change "Top" to "Bottom" in the Show items row, then click Apply filter.'],
    starter: spec({ type: 'bar' }),
    solution: {
      spec: spec({
        type: 'bar',
        category: [f('Artist', 'Artist')],
        values: [ATTENDANCE],
        filters: [{ table: 'Artist', column: 'Artist', values: [], scope: 'visual', topN: { n: 3, valueIndex: 0, bottom: true } }],
      }),
    },
    check: { kind: 'report', allowedTypes: ['bar'] },
    explanation: 'All three played The Tent once and had early slots, between 14:00 and 18:00. A later slot or a bigger stage could change that.',
  },
  {
    id: 'fest-top-merch-saturday',
    dataset: 'festival',
    module: 'filters',
    title: 'Saturday’s merch champions',
    level: 'Intermediate',
    free: false,
    lesson: 'A **Top N** filter is worked out **inside the other filters**. Add a Day filter and the Top 3 is the top 3 *of that day*, not of the whole festival.',
    task: [
      'Create a **Stacked column chart** of `Performances[Merch Sales]` by `Artist[Artist]`.',
      'Set the **Artist** filter to **Top 3** by **Sum of Merch Sales**.',
      'Add `Performances[Day]` to **Filters on this visual** and keep only **Saturday**.',
    ],
    hints: ['Two filters on the same visual: one Top N on Artist, one basic filter on Day.'],
    starter: spec({ type: 'column' }),
    solution: {
      spec: spec({
        type: 'column',
        category: [f('Artist', 'Artist')],
        values: [MERCH],
        filters: [
          { table: 'Artist', column: 'Artist', values: [], scope: 'visual', topN: { n: 3, valueIndex: 0 } },
          { table: 'Performances', column: 'Day', values: ['Saturday'] },
        ],
      }),
    },
    check: { kind: 'report', allowedTypes: ['column'] },
    explanation: 'Untick Saturday and the top 3 changes: the ranking is always recalculated within the other filters on the visual.',
  },
  {
    id: 'fest-slicer-weekend',
    dataset: 'festival',
    module: 'filters',
    title: 'Friday and Saturday only',
    level: 'Beginner',
    free: false,
    lesson: 'A slicer can keep **several values** at once: tick each one you want. In Power BI Desktop you can also hold **Ctrl** and click.',
    task: [
      'Create a **Stacked column chart** of `Performances[Attendance]` by `Stage[Stage]`.',
      'Add a **Slicer** on `Performances[Day]` and select **Friday** and **Saturday**.',
    ],
    hints: ['Click the Slicer icon in Visualizations, then tick Day in the Data pane while the slicer is selected.', 'Tick both days in the slicer.'],
    starter: spec({ type: 'column' }),
    solution: {
      spec: spec({
        type: 'column',
        category: [f('Stage', 'Stage')],
        values: [ATTENDANCE],
        slicers: [{ table: 'Performances', column: 'Day', values: ['Friday', 'Saturday'] }],
      }),
    },
    check: { kind: 'report', allowedTypes: ['column'], requireSlicer: f('Performances', 'Day') },
    explanation: 'Like the values inside one filter, the values selected in one slicer are combined with OR: a show on Friday or on Saturday counts.',
  },
  {
    id: 'fest-two-slicers',
    dataset: 'festival',
    module: 'filters',
    title: 'Sunday pop merch',
    level: 'Intermediate',
    free: false,
    lesson: 'Several slicers on a page are combined with **AND**: a show has to match the selection in *every* slicer.',
    task: [
      'Create a **Table** with `Artist[Artist]` and the **Sum of Merch Sales**.',
      'Add a slicer on `Performances[Day]` and select **Sunday**.',
      'Click the **table** (so the first slicer is no longer selected), then add a second slicer on `Artist[Genre]` and select **Pop**.',
    ],
    hints: [
      'While a slicer is selected, the Slicer icon only shows it as a slicer. Click the table first, then click the Slicer icon again to add a new one.',
      'With a slicer selected, ticking a field in the Data pane changes that slicer’s field, so check which visual is selected.',
    ],
    starter: spec({ type: 'table' }),
    solution: {
      spec: spec({
        type: 'table',
        category: [f('Artist', 'Artist')],
        values: [MERCH],
        slicers: [
          { table: 'Performances', column: 'Day', values: ['Sunday'] },
          { table: 'Artist', column: 'Genre', values: ['Pop'] },
        ],
      }),
    },
    check: { kind: 'report', allowedTypes: ['table'], requireSlicer: f('Artist', 'Genre') },
    explanation: 'Only pop acts that played on Sunday are left. Two slicers narrow the data down; one slicer with two values widens it.',
  },
];
