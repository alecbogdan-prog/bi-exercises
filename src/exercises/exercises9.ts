// Ninth batch: more visual types. Original content.
import type { Measure } from '../engine/model';
import type { FieldRef, ValueField, VisualSpec } from '../engine/visual';
import { emptySpec } from '../engine/visual';
import type { Exercise } from './types';

const f = (table: string, column: string): FieldRef => ({ table, column });
const sum = (table: string, column: string): ValueField => ({ kind: 'column', table, column, agg: 'SUM' });
const meas = (name: string): ValueField => ({ kind: 'measure', name });
const spec = (s: Partial<VisualSpec>): VisualSpec => ({ ...emptySpec(), ...s });
const m = (name: string, expression: string, format?: Measure['format']): Measure => ({ name, table: 'Sales', expression, format });
const TOTAL_SALES = m('Total Sales', 'SUM(Sales[Sales Amount])', 'currency');
const TARGET = m('Target', 'SUM(Targets[Target])', 'currency');

const visual = (e: Omit<Exercise, 'module' | 'free' | 'starter' | 'solution' | 'check'> & { solution: VisualSpec }): Exercise => ({
  ...e,
  module: 'reports',
  free: false,
  starter: spec({ type: 'column' }),
  solution: { spec: e.solution },
  check: { kind: 'report', allowedTypes: [e.solution.type] },
});

export const EXERCISES_9: Exercise[] = [
  visual({
    id: 'v-line-column',
    title: 'Sales as columns, target as a line',
    level: 'Intermediate',
    lesson:
      'A **Line and stacked column chart** (combo chart) shows two kinds of numbers on one axis: amounts as columns and a reference, such as a target, as a line. Put the column values in **Column y-axis** and the line in **Line y-axis**.',
    task: ['Select **Line and stacked column chart**.', 'X-axis: `Date[Year Month]`.', 'Column y-axis: **Total Sales**. Line y-axis: **Target**.'],
    hints: ['Both measures are in the Sales table of the Data pane.', 'Drag Target onto the Line y-axis well.'],
    givenMeasures: [TOTAL_SALES, TARGET],
    solution: spec({ type: 'lineColumn', category: [f('Date', 'Year Month')], values: [meas('Total Sales')], lineValues: [meas('Target')] }),
    explanation: 'Columns above the line are months that beat the target. The combo chart says it without a single number.',
  }),
  visual({
    id: 'v-waterfall',
    title: 'Waterfall by category',
    level: 'Intermediate',
    lesson: 'A **waterfall chart** shows how each part adds up to a total: every bar starts where the previous one ended, and a Total bar closes the chart. Increases are green, decreases red.',
    task: ['Select **Waterfall chart**.', 'Category: `Product[Category]`.', 'Y-axis: `Sales[Sales Amount]`.'],
    hints: ['The waterfall icon is in the second row of the gallery.'],
    solution: spec({ type: 'waterfall', category: [f('Product', 'Category')], values: [sum('Sales', 'Sales Amount')] }),
    explanation: 'Waterfalls shine with values that can be negative, such as profit by month or the bridge from last year to this year.',
  }),
  visual({
    id: 'v-funnel',
    title: 'Units sold funnel',
    level: 'Beginner',
    lesson: 'A **funnel** sorts stages from largest to smallest. It is made for sales pipelines and conversion steps, and it also works for any ranked list with a few items.',
    task: ['Select **Funnel**.', 'Category: `Product[Category]`.', 'Values: `Sales[Quantity]`.'],
    hints: ['Hover a stage to see its share of the first one.'],
    solution: spec({ type: 'funnel', category: [f('Product', 'Category')], values: [sum('Sales', 'Quantity')] }),
    explanation: 'Bikes, the biggest earner, sell the fewest units: units and money tell different stories.',
  }),
  visual({
    id: 'v-gauge',
    title: 'Revenue gauge',
    level: 'Beginner',
    lesson: 'A **gauge** shows one value on an arc, like a speedometer. In Power BI you can also add a minimum, a maximum and a target value.',
    task: ['Select **Gauge**.', 'Value: **Total Sales**.'],
    hints: ['The gauge icon is next to the card.'],
    givenMeasures: [TOTAL_SALES],
    solution: spec({ type: 'gauge', values: [meas('Total Sales')] }),
    explanation: 'Without a maximum, the gauge picks twice the value as the end of the arc. Add a target to make it meaningful.',
  }),
  visual({
    id: 'v-kpi',
    title: 'KPI with a monthly trend',
    level: 'Intermediate',
    lesson: 'A **KPI** visual shows the latest value of a measure, how it changed from the previous period, and a small trend behind it. The **Trend axis** decides the periods.',
    task: ['Select **KPI**.', 'Value: **Total Sales**.', 'Trend axis: `Date[Year Month]`.'],
    hints: ['Trend axis takes one date or period column.'],
    givenMeasures: [TOTAL_SALES],
    solution: spec({ type: 'kpi', category: [f('Date', 'Year Month')], values: [meas('Total Sales')] }),
    explanation: 'The KPI shows the last month and its change from the month before, which is ideal for the top of a dashboard.',
  }),
];
