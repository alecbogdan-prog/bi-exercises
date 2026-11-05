// Core data model types for the in-browser BI engine.

export type Scalar = number | string | boolean | null;
export type Row = Record<string, Scalar>;

export type ColumnType = 'number' | 'text' | 'date' | 'boolean';
export type ValueFormat = 'currency' | 'integer' | 'decimal' | 'percent' | 'text';

export interface Column {
  name: string;
  type: ColumnType;
  format?: ValueFormat;
  /** Column used to sort this column's values (e.g. Month sorted by MonthNum). */
  sortBy?: string;
  hidden?: boolean;
  /** Set for calculated columns created by the learner. */
  calculated?: boolean;
  expression?: string;
}

export interface CalcColumn {
  table: string;
  name: string;
  expression: string;
}

export interface Table {
  name: string;
  columns: Column[];
  rows: Row[];
  /** Marked as date table: filters on its date column replace all filters on the table. */
  dateColumn?: string;
}

/** Many-to-one relationship, filters flow from the one side (to) to the many side (from). */
export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface Measure {
  name: string;
  table: string;
  expression: string;
  format?: ValueFormat;
}

export interface Model {
  tables: Table[];
  relationships: Relationship[];
  measures: Measure[];
}

export interface Filter {
  table: string;
  columns: string[];
  test: (row: Row) => boolean;
  /** Human readable description, used in debugging and UI. */
  label?: string;
}

export type FilterContext = Filter[];

export class DaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DaxError';
  }
}
