import type { PagesCheck, ReportState } from '../report/report';
import type { HintTarget } from '../components/HintSpotlight';
import type { CalcColumn, Measure, Relationship } from '../engine/model';
import type { Step } from '../engine/query';
import type { ConditionalFormat, DrillState, FieldRef, SortSpec, VisualFormat, VisualSpec, VisualType } from '../engine/visual';
import type { Scenario } from './scenarios';

export type ModuleId = 'reports' | 'filters' | 'pages' | 'powerquery' | 'modeling' | 'columns' | 'dax-basics' | 'calculate' | 'dax-advanced' | 'time';

export interface ReportCheck {
  kind: 'report';
  allowedTypes: VisualType[];
  /** The exercise is about sorting: the learner must set exactly this sort. */
  requireSort?: SortSpec;
  /** The exercise is about formatting: these Format pane settings must match. */
  requireFormat?: Partial<VisualFormat>;
  /** A slicer on this field must be on the page. */
  requireSlicer?: FieldRef;
  /** The visual must be drilled to exactly this level/path. */
  requireDrill?: DrillState;
  /** This conditional formatting must be applied. */
  requireConditional?: ConditionalFormat;
}

export interface QueryCheck {
  kind: 'query';
}

export interface ModelCheck {
  kind: 'model';
  /** Relationships that must exist (many side = from). */
  required: Relationship[];
  /** Relationships that must not exist (e.g. one with the wrong direction). */
  forbidden?: Relationship[];
  report?: ReportCheck;
}

export interface ColumnCheck {
  kind: 'column';
  table: string;
  name: string;
  /** Optionally also check a visual that uses the new column. */
  report?: ReportCheck;
}

export interface DaxCheck {
  kind: 'dax';
  measureName: string;
  requiredFunctions?: string[];
  /** Each entry is a grouping to compare the learner's measure against the solution (empty = grand total). */
  contexts: FieldRef[][];
}

export interface Exercise {
  id: string;
  /** Set for the steps of an end-to-end project (see src/projects). */
  project?: string;
  /** Which sample dataset the exercise runs on: the bike shop (default) or the themed festival data. */
  dataset?: 'festival';
  module: ModuleId;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  free: boolean;
  /** Short lesson shown above the task. Supports `code` spans and blank-line paragraphs. */
  lesson: string;
  task: string[];
  hints: string[];
  /** Optional on-screen pointers, one per hint (same order); null for a hint that has none. */
  hintTargets?: (HintTarget | null)[];
  /** Measures that already exist in the model for this exercise. */
  givenMeasures?: Measure[];
  starter: VisualSpec;
  solution: { spec: VisualSpec; measures?: Measure[]; columns?: CalcColumn[]; steps?: Step[]; relationships?: Relationship[]; report?: ReportState };
  check: ReportCheck | DaxCheck | ColumnCheck | QueryCheck | ModelCheck | PagesCheck;
  /** Multi-page report exercises: the report at the start. */
  report?: ReportState;
  /** Power Query exercises: the query to edit and the steps it starts with. */
  query?: { source: string; starterSteps?: Step[] };
  /** Modeling exercises: the model's relationships at the start (default: the full model). */
  starterRelationships?: Relationship[];
  /** Shown once the exercise is solved. */
  explanation: string;
  /** Real-world request that frames the exercise (attached from scenarios.ts). */
  scenario?: Scenario;
}

export const MODULES: { id: ModuleId; title: string; blurb: string }[] = [
  { id: 'reports', title: 'Reports & Visuals', blurb: 'Build cards, tables, matrices and charts from a star-schema model.' },
  { id: 'filters', title: 'Filters & Slicers', blurb: 'Visual filters, Top N and slicers: show exactly the data the business asked for.' },
  { id: 'pages', title: 'Report Pages & Interactivity', blurb: 'Multi-page reports: edit interactions, drillthrough, sync slicers, bookmarks, buttons and tooltip pages.' },
  { id: 'powerquery', title: 'Power Query', blurb: 'Clean and shape raw files: headers, types, blanks, duplicates, split, unpivot, group, merge and append.' },
  { id: 'modeling', title: 'Data Modeling', blurb: 'Create and fix relationships in the Model view, and see why they matter.' },
  { id: 'columns', title: 'Calculated Columns', blurb: 'Add new columns with DAX: margins, bands, regions and categories.' },
  { id: 'dax-basics', title: 'DAX Basics', blurb: 'Write your first measures: SUM, COUNTROWS, DIVIDE and iterators.' },
  { id: 'calculate', title: 'CALCULATE & Filter Context', blurb: 'The most important function in DAX, step by step.' },
  { id: 'dax-advanced', title: 'Advanced DAX', blurb: 'Variables, ranking, iterators and dynamic labels.' },
  { id: 'time', title: 'Time Intelligence', blurb: 'Year-to-date, last year, month over month.' },
];
