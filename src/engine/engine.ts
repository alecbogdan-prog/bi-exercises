import { DaxError } from './model';
import type { CalcColumn, Column, Filter, FilterContext, Measure, Model, Relationship, Row, Scalar, Table } from './model';
import { parseDax } from './parser';
import type { Node } from './parser';

interface RowCtx {
  table: string;
  row: Row;
  /** Projected rows come from column tables (VALUES, ALL(col), date functions). */
  projected: boolean;
  columns: string[];
}

interface Env {
  ctx: FilterContext;
  rows: RowCtx[];
  stack: string[];
  /** VAR values in scope (lower-case names). Measures start a fresh scope. */
  vars?: Map<string, Value>;
}

export interface TableValue {
  kind: 'table';
  table: string;
  columns: string[];
  rows: Row[];
  projected: boolean;
}

type Value = Scalar | TableValue;

const TABLE_FUNCS = new Set([
  'FILTER',
  'ALL',
  'ALLNOBLANKROW',
  'REMOVEFILTERS',
  'VALUES',
  'DISTINCT',
  'CALCULATETABLE',
  'DATESYTD',
  'DATESMTD',
  'DATESQTD',
  'DATEADD',
  'SAMEPERIODLASTYEAR',
  'PREVIOUSYEAR',
  'PREVIOUSMONTH',
  'DATESBETWEEN',
  'DATESINPERIOD',
  'PARALLELPERIOD',
  'TOPN',
  'ALLEXCEPT',
]);

export const SUPPORTED_FUNCTIONS = [
  'ABS', 'ALL', 'ALLEXCEPT', 'AND', 'AVERAGE', 'AVERAGEX', 'BLANK', 'CALCULATE', 'CALCULATETABLE',
  'CONCATENATE', 'CONCATENATEX', 'COUNT', 'COUNTA', 'COUNTROWS', 'COUNTX', 'DATE', 'DATEADD', 'DATEDIFF', 'DATESBETWEEN', 'DATESINPERIOD', 'DATESMTD',
  'DATESQTD', 'DATESYTD', 'DAY', 'DISTINCT', 'DISTINCTCOUNT', 'DIVIDE', 'FALSE', 'FILTER', 'HASONEVALUE',
  'EOMONTH', 'IF', 'INT', 'ISBLANK', 'ISINSCOPE', 'KEEPFILTERS', 'LOOKUPVALUE', 'MAX', 'MAXX', 'MIN', 'MINX', 'MONTH', 'NOT', 'OR',
  'PARALLELPERIOD', 'PREVIOUSMONTH', 'PREVIOUSYEAR', 'RANKX', 'RELATED', 'REMOVEFILTERS', 'ROUND', 'SAMEPERIODLASTYEAR',
  'SELECTEDVALUE', 'SUM', 'SUMX', 'SWITCH', 'TOPN', 'TOTALMTD', 'TOTALQTD', 'TOTALYTD', 'TRUE', 'VALUES', 'YEAR',
];

function isTable(v: Value): v is TableValue {
  return typeof v === 'object' && v !== null && (v as TableValue).kind === 'table';
}

function toNum(v: Scalar): number {
  if (v === null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  if (Number.isNaN(n)) throw new DaxError(`Cannot convert the text "${v}" to a number.`);
  return n;
}

export function truthy(v: Scalar): boolean {
  if (v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return v.length > 0;
}

export function scalarEquals(a: Scalar, b: Scalar): boolean {
  if (a === null && b === null) return true;
  if (a === null) return b === 0 || b === '' || b === false;
  if (b === null) return a === 0 || a === '' || a === false;
  if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase();
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  return String(a) === String(b);
}

function compare(a: Scalar, b: Scalar): number {
  if (a === null) a = typeof b === 'string' ? '' : 0;
  if (b === null) b = typeof a === 'string' ? '' : 0;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' || typeof b === 'boolean') return toNum(a) - toNum(b);
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function shiftDate(d: string, n: number, unit: string): string | null {
  const [y, m, day] = d.split('-').map(Number);
  if (unit === 'DAY') {
    const dt = new Date(Date.UTC(y, m - 1, day + n));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }
  const months = unit === 'YEAR' ? n * 12 : unit === 'QUARTER' ? n * 3 : n;
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${pad(nm)}-${pad(Math.min(day, last))}`;
}

function tupleKey(row: Row, cols: string[]): string {
  return cols.map((c) => JSON.stringify(row[c] ?? null)).join('|');
}

export class Engine {
  readonly model: Model;
  private tables = new Map<string, Table>();
  private measureNodes = new Map<string, Node>();
  private pathCache = new Map<string, Relationship[] | null>();
  private indexCache = new Map<string, Map<Scalar, Row>>();
  private rowsCache = new WeakMap<FilterContext, Map<string, Row[]>>();

  constructor(model: Model) {
    this.model = model;
    for (const t of model.tables) this.tables.set(t.name.toLowerCase(), t);
  }

  /** Returns a new engine with the same tables but a different set of relationships. */
  withRelationships(relationships: Relationship[]): Engine {
    return new Engine({ ...this.model, relationships });
  }

  /** Returns a new engine with the same data but a different set of measures. */
  withMeasures(measures: Measure[]): Engine {
    return new Engine({ ...this.model, measures });
  }

  /**
   * Returns a new engine whose tables include the given calculated columns.
   * Each column is evaluated row by row with a row context on its table (like Power BI calculated columns).
   */
  withColumns(defs: CalcColumn[]): Engine {
    if (!defs.length) return this;
    let eng: Engine = this;
    for (const d of defs) {
      const t = eng.table(d.table);
      if (t.columns.some((c) => c.name.toLowerCase() === d.name.toLowerCase())) {
        throw new DaxError(`The table '${t.name}' already has a column named "${d.name}".`);
      }
      const node = parseDax(d.expression);
      const cols = t.columns.map((c) => c.name);
      const values = t.rows.map((row) => eng.scalar(node, { ctx: [], rows: [{ table: t.name, row, projected: false, columns: cols }], stack: [] }));
      const nonNull = values.filter((v) => v !== null);
      const type: Column['type'] = nonNull.length && nonNull.every((v) => typeof v === 'number') ? 'number' : 'text';
      const newTable: Table = {
        ...t,
        columns: [...t.columns, { name: d.name, type, calculated: true, expression: d.expression, format: type === 'number' && nonNull.some((v) => !Number.isInteger(v)) ? 'decimal' : undefined }],
        rows: t.rows.map((r, i) => ({ ...r, [d.name]: typeof values[i] === 'boolean' ? (values[i] ? 'True' : 'False') : values[i] })),
      };
      eng = new Engine({ ...eng.model, tables: eng.model.tables.map((x) => (x.name === t.name ? newTable : x)) });
    }
    return eng;
  }

  table(name: string): Table {
    const t = this.tables.get(name.toLowerCase());
    if (!t) throw new DaxError(`Cannot find table '${name}'.`);
    return t;
  }

  hasTable(name: string): boolean {
    return this.tables.has(name.toLowerCase());
  }

  column(table: string, col: string): Column | undefined {
    return this.table(table).columns.find((c) => c.name.toLowerCase() === col.toLowerCase());
  }

  measure(name: string): Measure | undefined {
    return this.model.measures.find((m) => m.name.toLowerCase() === name.toLowerCase());
  }

  private measureNode(m: Measure): Node {
    const key = m.name.toLowerCase();
    let n = this.measureNodes.get(key);
    if (!n) {
      n = parseDax(m.expression);
      this.measureNodes.set(key, n);
    }
    return n;
  }

  /** Relationship path from a many-side table to a one-side table. */
  pathTo(from: string, to: string): Relationship[] | null {
    if (from === to) return [];
    const key = `${from}->${to}`;
    if (this.pathCache.has(key)) return this.pathCache.get(key)!;
    const queue: { t: string; path: Relationship[] }[] = [{ t: from, path: [] }];
    const seen = new Set([from]);
    let result: Relationship[] | null = null;
    while (queue.length) {
      const { t, path } = queue.shift()!;
      for (const r of this.model.relationships) {
        if (r.fromTable !== t || seen.has(r.toTable)) continue;
        const p = [...path, r];
        if (r.toTable === to) {
          result = p;
          queue.length = 0;
          break;
        }
        seen.add(r.toTable);
        queue.push({ t: r.toTable, path: p });
      }
    }
    this.pathCache.set(key, result);
    return result;
  }

  private index(table: string, col: string): Map<Scalar, Row> {
    const key = `${table}.${col}`;
    let idx = this.indexCache.get(key);
    if (!idx) {
      idx = new Map();
      for (const r of this.table(table).rows) idx.set(r[col], r);
      this.indexCache.set(key, idx);
    }
    return idx;
  }

  related(row: Row, from: string, to: string): Row | null {
    const path = this.pathTo(from, to);
    if (!path) return null;
    let cur: Row | undefined = row;
    for (const r of path) {
      cur = this.index(r.toTable, r.toColumn).get(cur[r.fromColumn]);
      if (!cur) return null;
    }
    return cur;
  }

  /** Tables reachable from `table` following many-to-one relationships (DAX "expanded table"). */
  expanded(table: string): string[] {
    return this.model.tables.map((t) => t.name).filter((t) => this.pathTo(table, t) !== null);
  }

  rowsOf(tableName: string, ctx: FilterContext): Row[] {
    const t = this.table(tableName);
    let cache = this.rowsCache.get(ctx);
    if (!cache) {
      cache = new Map();
      this.rowsCache.set(ctx, cache);
    }
    const hit = cache.get(t.name);
    if (hit) return hit;
    const fs = ctx.filter((f) => f.table === t.name || this.pathTo(t.name, f.table) !== null);
    const rows = !fs.length
      ? t.rows
      : t.rows.filter((r) =>
          fs.every((f) => {
            if (f.table === t.name) return f.test(r);
            const rr = this.related(r, t.name, f.table);
            return rr ? f.test(rr) : false;
          }),
        );
    cache.set(t.name, rows);
    return rows;
  }

  distinct(table: string, col: string, rows: Row[]): Scalar[] {
    const seen = new Map<string, Scalar>();
    for (const r of rows) {
      const v = r[col] ?? null;
      const k = JSON.stringify(v);
      if (!seen.has(k)) seen.set(k, v);
    }
    const column = this.column(table, col);
    const vals = [...seen.values()];
    if (column?.sortBy) {
      const order = new Map<string, number>();
      for (const r of this.table(table).rows) {
        const k = JSON.stringify(r[col] ?? null);
        if (!order.has(k)) order.set(k, toNum(r[column.sortBy]));
      }
      return vals.sort((a, b) => (order.get(JSON.stringify(a)) ?? 0) - (order.get(JSON.stringify(b)) ?? 0));
    }
    return vals.sort(compare);
  }

  // ---------- filter context manipulation ----------

  applyFilter(ctx: FilterContext, f: Filter, keep = false): FilterContext {
    if (keep) return [...ctx, f];
    const t = this.table(f.table);
    const dateRule = !!t.dateColumn && f.columns.includes(t.dateColumn);
    return [
      ...ctx.filter((g) => g.table !== f.table || (!dateRule && !g.columns.some((c) => f.columns.includes(c)))),
      f,
    ];
  }

  removeFilters(ctx: FilterContext, table: string, cols?: string[]): FilterContext {
    if (!cols) {
      const exp = new Set(this.expanded(table));
      return ctx.filter((g) => !exp.has(g.table));
    }
    return ctx.filter((g) => g.table !== table || !g.columns.some((c) => cols.includes(c)));
  }

  /** Builds a filter that keeps only rows whose columns equal the given values. */
  equalityFilter(table: string, column: string, values: Scalar[]): Filter {
    const keys = new Set(values.map((v) => JSON.stringify(v ?? null)));
    return {
      table,
      columns: [column],
      test: (r) => keys.has(JSON.stringify(r[column] ?? null)),
      label: `${table}[${column}] in (${values.join(', ')})`,
    };
  }

  private transition(env: Env): FilterContext {
    let ctx = env.ctx;
    for (const rc of env.rows) {
      const row = rc.row;
      const f: Filter = rc.projected
        ? { table: rc.table, columns: rc.columns, test: (r) => rc.columns.every((c) => scalarEquals(r[c], row[c])) }
        : { table: rc.table, columns: rc.columns, test: (r) => r === row };
      ctx = this.applyFilter(ctx, f);
    }
    return ctx;
  }

  // ---------- public evaluation API ----------

  evaluate(expr: string | Node, ctx: FilterContext = []): Scalar {
    const node = typeof expr === 'string' ? parseDax(expr) : expr;
    return this.scalar(node, { ctx, rows: [], stack: [] });
  }

  evaluateTable(expr: string | Node, ctx: FilterContext = []): TableValue {
    const node = typeof expr === 'string' ? parseDax(expr) : expr;
    return this.tableOf(node, { ctx, rows: [], stack: [] });
  }

  evaluateMeasure(name: string, ctx: FilterContext = []): Scalar {
    const m = this.measure(name);
    if (!m) throw new DaxError(`Cannot find measure [${name}].`);
    return this.evalMeasure(m, { ctx, rows: [], stack: [] });
  }

  private evalMeasure(m: Measure, env: Env): Scalar {
    if (env.stack.includes(m.name)) {
      throw new DaxError(`A circular dependency was detected: ${[...env.stack, m.name].join(' → ')}.`);
    }
    const ctx = env.rows.length ? this.transition(env) : env.ctx;
    return this.scalar(this.measureNode(m), { ctx, rows: [], stack: [...env.stack, m.name] });
  }

  // ---------- evaluator ----------

  private scalar(n: Node, env: Env): Scalar {
    const v = this.eval(n, env);
    if (!isTable(v)) return v;
    if (v.rows.length === 0) return null;
    if (v.rows.length === 1 && v.columns.length === 1) return v.rows[0][v.columns[0]] ?? null;
    throw new DaxError('A table of multiple values was supplied where a single value was expected.');
  }

  private tableOf(n: Node, env: Env): TableValue {
    const v = this.eval(n, env);
    if (!isTable(v)) throw new DaxError('A table was expected here, but a single value was found.');
    return v;
  }

  private colArg(n: Node | undefined, fn: string): { table: string; col: string } {
    if (!n || n.k !== 'col') throw new DaxError(`${fn} expects a column reference like Table[Column].`);
    const t = this.table(n.table);
    const c = this.column(t.name, n.col);
    if (!c) throw new DaxError(`Column [${n.col}] cannot be found in table '${t.name}'.`);
    return { table: t.name, col: c.name };
  }

  private columnTable(table: string, cols: string[], rows: Row[]): TableValue {
    const seen = new Map<string, Row>();
    for (const r of rows) {
      const k = tupleKey(r, cols);
      if (!seen.has(k)) seen.set(k, Object.fromEntries(cols.map((c) => [c, r[c] ?? null])));
    }
    return { kind: 'table', table, columns: cols, rows: [...seen.values()], projected: true };
  }

  private iterate(tv: TableValue, env: Env, body: Node): Scalar[] {
    return tv.rows.map((row) =>
      this.scalar(body, {
        ctx: env.ctx,
        rows: [...env.rows, { table: tv.table, row, projected: tv.projected, columns: tv.columns }],
        stack: env.stack,
        vars: env.vars,
      }),
    );
  }

  private eval(n: Node, env: Env): Value {
    switch (n.k) {
      case 'num':
        return n.v;
      case 'str':
        return n.v;
      case 'list':
        return {
          kind: 'table',
          table: '',
          columns: ['Value'],
          rows: n.items.map((i) => ({ Value: this.scalar(i, env) })),
          projected: true,
        };
      case 'var': {
        const vars = new Map(env.vars ?? []);
        for (const d of n.defs) vars.set(d.name.toLowerCase(), this.eval(d.value, { ...env, vars }));
        return this.eval(n.body, { ...env, vars });
      }
      case 'table': {
        const v = env.vars?.get(n.name.toLowerCase());
        if (v !== undefined) return v;
        const t = this.table(n.name);
        return { kind: 'table', table: t.name, columns: t.columns.map((c) => c.name), rows: this.rowsOf(t.name, env.ctx), projected: false };
      }
      case 'col':
        return this.columnRef(n.table, n.col, env);
      case 'bracket': {
        const m = this.measure(n.name);
        if (m) return this.evalMeasure(m, env);
        for (let i = env.rows.length - 1; i >= 0; i--) {
          const rc = env.rows[i];
          const c = rc.columns.find((x) => x.toLowerCase() === n.name.toLowerCase());
          if (c) return rc.row[c] ?? null;
        }
        throw new DaxError(`Cannot find a measure or column named [${n.name}].`);
      }
      case 'neg': {
        const v = this.scalar(n.e, env);
        return v === null ? null : -toNum(v);
      }
      case 'bin':
        return this.binary(n.op, n.l, n.r, env);
      case 'call':
        return this.call(n.name, n.args, env);
    }
  }

  private columnRef(tableName: string, colName: string, env: Env): Scalar {
    const t = this.table(tableName);
    const c = this.column(t.name, colName);
    if (!c) {
      const m = this.measure(colName);
      if (m && m.table.toLowerCase() === t.name.toLowerCase()) return this.evalMeasure(m, env);
      throw new DaxError(`Column [${colName}] cannot be found in table '${t.name}'.`);
    }
    for (let i = env.rows.length - 1; i >= 0; i--) {
      const rc = env.rows[i];
      if (rc.table === t.name && rc.columns.includes(c.name)) return rc.row[c.name] ?? null;
    }
    throw new DaxError(
      `A single value for column '${t.name}'[${c.name}] cannot be determined. ` +
        `Use an aggregation such as SUM('${t.name}'[${c.name}]), or use the column inside an iterator like SUMX or FILTER.` +
        (env.rows.length ? ` If the column is in a related table, wrap it in RELATED().` : ''),
    );
  }

  private binary(op: string, l: Node, r: Node, env: Env): Scalar {
    if (op === '&&') return truthy(this.scalar(l, env)) && truthy(this.scalar(r, env));
    if (op === '||') return truthy(this.scalar(l, env)) || truthy(this.scalar(r, env));
    if (op === 'IN') {
      const a = this.scalar(l, env);
      const tv = this.tableOf(r, env);
      return tv.rows.some((row) => scalarEquals(a, row[tv.columns[0]] ?? null));
    }
    const a = this.scalar(l, env);
    const b = this.scalar(r, env);
    switch (op) {
      case '+':
        return a === null && b === null ? null : toNum(a) + toNum(b);
      case '-':
        return a === null && b === null ? null : toNum(a) - toNum(b);
      case '*':
        return a === null || b === null ? null : toNum(a) * toNum(b);
      case '/':
        if (a === null) return null;
        return toNum(b) === 0 ? (toNum(a) === 0 ? NaN : Infinity) : toNum(a) / toNum(b);
      case '^':
        return a === null ? null : Math.pow(toNum(a), toNum(b));
      case '&':
        return `${a ?? ''}${b ?? ''}`;
      case '=':
        return scalarEquals(a, b);
      case '<>':
        return !scalarEquals(a, b);
      case '<':
        return compare(a, b) < 0;
      case '>':
        return compare(a, b) > 0;
      case '<=':
        return compare(a, b) <= 0;
      case '>=':
        return compare(a, b) >= 0;
    }
    throw new DaxError(`Unknown operator ${op}.`);
  }

  private arity(name: string, args: Node[], min: number, max = min): void {
    if (args.length < min || args.length > max) {
      const exp = min === max ? `${min}` : max === Infinity ? `at least ${min}` : `${min} to ${max}`;
      throw new DaxError(`${name} expects ${exp} argument${max === 1 ? '' : 's'}, but ${args.length} were given.`);
    }
  }

  private columnValues(args: Node[], env: Env, fn: string): Scalar[] {
    this.arity(fn, args, 1);
    const { table, col } = this.colArg(args[0], fn);
    return this.rowsOf(table, env.ctx).map((r) => r[col] ?? null);
  }

  private visibleDates(n: Node | undefined, env: Env, fn: string): { table: string; col: string; dates: string[] } {
    const { table, col } = this.colArg(n, fn);
    const dates = this.rowsOf(table, env.ctx)
      .map((r) => r[col])
      .filter((v): v is string => typeof v === 'string')
      .sort();
    return { table, col, dates: [...new Set(dates)] };
  }

  private allDates(table: string, col: string): string[] {
    return [...new Set(this.table(table).rows.map((r) => r[col]).filter((v): v is string => typeof v === 'string'))].sort();
  }

  private dateTable(table: string, col: string, dates: string[]): TableValue {
    return { kind: 'table', table, columns: [col], rows: dates.map((d) => ({ [col]: d })), projected: true };
  }

  private periodToDate(n: Node | undefined, env: Env, fn: string, period: 'Y' | 'Q' | 'M'): TableValue {
    const { table, col, dates } = this.visibleDates(n, env, fn);
    if (!dates.length) return this.dateTable(table, col, []);
    const max = dates[dates.length - 1];
    const [y, m] = max.split('-').map(Number);
    const startMonth = period === 'Y' ? 1 : period === 'Q' ? Math.floor((m - 1) / 3) * 3 + 1 : m;
    const start = `${y}-${pad(startMonth)}-01`;
    return this.dateTable(table, col, this.allDates(table, col).filter((d) => d >= start && d <= max));
  }

  private interval(n: Node | undefined): string {
    const name = n && (n.k === 'table' ? n.name : n.k === 'str' ? n.v : '');
    const up = (name || '').toUpperCase();
    if (!['YEAR', 'QUARTER', 'MONTH', 'DAY'].includes(up)) {
      throw new DaxError('The interval must be one of YEAR, QUARTER, MONTH or DAY.');
    }
    return up;
  }

  /** Converts a CALCULATE filter argument into context modifications. */
  private calculateArgs(args: Node[], env: Env, ctx: FilterContext): FilterContext {
    const removals: ((c: FilterContext) => FilterContext)[] = [];
    const adds: { f: Filter; keep: boolean }[] = [];

    const addFilterArg = (arg: Node, keep: boolean) => {
      const isTableArg = arg.k === 'table' || (arg.k === 'call' && TABLE_FUNCS.has(arg.name));
      if (isTableArg) {
        const tv = this.tableOf(arg, env);
        if (!tv.table) throw new DaxError('A list of values cannot be used directly as a CALCULATE filter.');
        if (tv.projected) {
          const keys = new Set(tv.rows.map((r) => tupleKey(r, tv.columns)));
          adds.push({ f: { table: tv.table, columns: tv.columns, test: (r) => keys.has(tupleKey(r, tv.columns)) }, keep });
        } else {
          const set = new Set(tv.rows);
          const cols = this.table(tv.table).columns.map((c) => c.name);
          adds.push({ f: { table: tv.table, columns: cols, test: (r) => set.has(r) }, keep });
        }
        return;
      }
      // Boolean predicate, e.g. Product[Color] = "Red"
      const refs = new Map<string, Set<string>>();
      const collect = (x: Node) => {
        if (x.k === 'col') {
          const t = this.table(x.table);
          const c = this.column(t.name, x.col);
          if (!c) throw new DaxError(`Column [${x.col}] cannot be found in table '${t.name}'.`);
          if (!refs.has(t.name)) refs.set(t.name, new Set());
          refs.get(t.name)!.add(c.name);
        } else if (x.k === 'bin') {
          collect(x.l);
          collect(x.r);
        } else if (x.k === 'neg') collect(x.e);
        else if (x.k === 'call') x.args.forEach(collect);
        else if (x.k === 'list') x.items.forEach(collect);
        else if (x.k === 'bracket' && this.measure(x.name)) {
          throw new DaxError(
            `A measure ([${x.name}]) cannot be used in a True/False filter expression of CALCULATE. Use FILTER() instead.`,
          );
        }
      };
      collect(arg);
      if (refs.size === 0) throw new DaxError('A CALCULATE filter condition must reference a column, e.g. Product[Color] = "Red".');
      if (refs.size > 1) {
        throw new DaxError('A True/False filter expression in CALCULATE can only reference columns from one table. Use FILTER() instead.');
      }
      const [table, colSet] = [...refs.entries()][0];
      const columns = [...colSet];
      adds.push({
        f: {
          table,
          columns,
          test: (r) => truthy(this.scalar(arg, { ctx: [], rows: [{ table, row: r, projected: false, columns }], stack: env.stack, vars: env.vars })),
        },
        keep,
      });
    };

    for (const arg of args) {
      if (arg.k === 'call' && (arg.name === 'ALL' || arg.name === 'REMOVEFILTERS' || arg.name === 'ALLNOBLANKROW')) {
        if (arg.args.length === 0) {
          removals.push(() => []);
        } else if (arg.args[0].k === 'table') {
          const t = this.table(arg.args[0].name).name;
          removals.push((c) => this.removeFilters(c, t));
        } else {
          const cols = arg.args.map((a) => this.colArg(a, arg.name));
          removals.push((c) => {
            let out = c;
            for (const cc of cols) out = this.removeFilters(out, cc.table, [cc.col]);
            return out;
          });
        }
      } else if (arg.k === 'call' && arg.name === 'ALLEXCEPT') {
        if (arg.args[0]?.k !== 'table') throw new DaxError('ALLEXCEPT expects a table as its first argument.');
        const t = this.table(arg.args[0].name).name;
        const keepCols = arg.args.slice(1).map((a) => this.colArg(a, 'ALLEXCEPT'));
        const exp = new Set(this.expanded(t));
        removals.push((c) =>
          c.filter((g) => !exp.has(g.table) || keepCols.some((k) => k.table === g.table && g.columns.includes(k.col))),
        );
      } else if (arg.k === 'call' && arg.name === 'KEEPFILTERS') {
        this.arity('KEEPFILTERS', arg.args, 1);
        addFilterArg(arg.args[0], true);
      } else if (arg.k === 'call' && arg.name === 'USERELATIONSHIP') {
        throw new DaxError('USERELATIONSHIP is not supported in this exercise environment yet.');
      } else {
        addFilterArg(arg, false);
      }
    }
    let out = ctx;
    for (const r of removals) out = r(out);
    for (const a of adds) out = this.applyFilter(out, a.f, a.keep);
    return out;
  }

  private call(name: string, args: Node[], env: Env): Value {
    switch (name) {
      case 'TRUE':
        return true;
      case 'FALSE':
        return false;
      case 'BLANK':
      case '__EMPTY':
        return null;

      // ----- aggregations -----
      case 'SUM': {
        const vals = this.columnValues(args, env, name).filter((v) => v !== null);
        return vals.length ? vals.reduce<number>((s, v) => s + toNum(v), 0) : null;
      }
      case 'AVERAGE': {
        const vals = this.columnValues(args, env, name).filter((v) => typeof v === 'number') as number[];
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      }
      case 'MIN':
      case 'MAX': {
        if (args.length === 2) {
          const a = this.scalar(args[0], env);
          const b = this.scalar(args[1], env);
          if (a === null) return b;
          if (b === null) return a;
          return (name === 'MIN' ? compare(a, b) <= 0 : compare(a, b) >= 0) ? a : b;
        }
        const vals = this.columnValues(args, env, name).filter((v) => v !== null);
        if (!vals.length) return null;
        return vals.reduce((m, v) => ((name === 'MIN' ? compare(v, m) < 0 : compare(v, m) > 0) ? v : m));
      }
      case 'COUNT': {
        const vals = this.columnValues(args, env, name).filter((v) => v !== null);
        return vals.length || null;
      }
      case 'COUNTA': {
        const vals = this.columnValues(args, env, name).filter((v) => v !== null && v !== '');
        return vals.length || null;
      }
      case 'DISTINCTCOUNT': {
        const vals = this.columnValues(args, env, name).filter((v) => v !== null);
        return new Set(vals.map((v) => JSON.stringify(v))).size || null;
      }
      case 'COUNTROWS': {
        this.arity(name, args, 1);
        return this.tableOf(args[0], env).rows.length || null;
      }

      // ----- iterators -----
      case 'SUMX':
      case 'AVERAGEX':
      case 'MINX':
      case 'MAXX':
      case 'COUNTX': {
        this.arity(name, args, 2);
        const tv = this.tableOf(args[0], env);
        const vals = this.iterate(tv, env, args[1]).filter((v) => v !== null);
        if (!vals.length) return null;
        if (name === 'COUNTX') return vals.length;
        if (name === 'MINX') return vals.reduce((m, v) => (compare(v, m) < 0 ? v : m));
        if (name === 'MAXX') return vals.reduce((m, v) => (compare(v, m) > 0 ? v : m));
        const sum = vals.reduce<number>((s, v) => s + toNum(v), 0);
        return name === 'SUMX' ? sum : sum / vals.length;
      }
      case 'FILTER': {
        this.arity(name, args, 2);
        const tv = this.tableOf(args[0], env);
        const keep = this.iterate(tv, env, args[1]).map(truthy);
        return { ...tv, rows: tv.rows.filter((_, i) => keep[i]) };
      }
      case 'RANKX': {
        this.arity(name, args, 2, 5);
        const tv = this.tableOf(args[0], env);
        const all = this.iterate(tv, env, args[1]);
        // The value to rank is the expression evaluated in the current context (with context transition).
        const cur: Scalar =
          args[2] && !(args[2].k === 'call' && args[2].name === '__EMPTY') ? this.scalar(args[2], env) : (this.call('CALCULATE', [args[1]], env) as Scalar);
        const orderNode = args[3];
        let asc = false;
        if (orderNode) {
          const o = orderNode.k === 'table' ? orderNode.name.toUpperCase() : String(this.scalar(orderNode, env)).toUpperCase();
          asc = o === 'ASC' || o === '1' || o === 'TRUE';
        }
        const dense = args[4]?.k === 'table' && args[4].name.toUpperCase() === 'DENSE';
        if (cur === null) return null;
        const c = toNum(cur);
        const better = (v: Scalar) => v !== null && (asc ? toNum(v) < c : toNum(v) > c);
        if (dense) return new Set(all.filter(better).map((v) => toNum(v))).size + 1;
        return all.filter(better).length + 1;
      }
      case 'RELATED': {
        this.arity(name, args, 1);
        const { table, col } = this.colArg(args[0], name);
        for (let i = env.rows.length - 1; i >= 0; i--) {
          const rc = env.rows[i];
          if (rc.projected) continue;
          if (rc.table === table) return rc.row[col] ?? null;
          if (this.pathTo(rc.table, table)) {
            const rr = this.related(rc.row, rc.table, table);
            return rr ? (rr[col] ?? null) : null;
          }
        }
        throw new DaxError(
          `RELATED('${table}'[${col}]) needs a row context on a table related to '${table}', e.g. inside SUMX(Sales, ...).`,
        );
      }

      // ----- filter functions -----
      case 'CALCULATE': {
        this.arity(name, args, 1, Infinity);
        const base = env.rows.length ? this.transition(env) : env.ctx;
        const ctx = this.calculateArgs(args.slice(1), { ...env }, base);
        return this.scalar(args[0], { ctx, rows: [], stack: env.stack, vars: env.vars });
      }
      case 'CALCULATETABLE': {
        this.arity(name, args, 1, Infinity);
        const base = env.rows.length ? this.transition(env) : env.ctx;
        const ctx = this.calculateArgs(args.slice(1), { ...env }, base);
        return this.tableOf(args[0], { ctx, rows: [], stack: env.stack, vars: env.vars });
      }
      case 'ALL':
      case 'ALLNOBLANKROW':
      case 'REMOVEFILTERS': {
        this.arity(name, args, 1, Infinity);
        if (args[0].k === 'table') {
          const t = this.table(args[0].name);
          return { kind: 'table', table: t.name, columns: t.columns.map((c) => c.name), rows: t.rows, projected: false };
        }
        const cols = args.map((a) => this.colArg(a, name));
        const table = cols[0].table;
        if (cols.some((c) => c.table !== table)) throw new DaxError(`${name} columns must all come from the same table.`);
        return this.columnTable(table, cols.map((c) => c.col), this.table(table).rows);
      }
      case 'VALUES':
      case 'DISTINCT': {
        this.arity(name, args, 1);
        if (args[0].k === 'table') return this.eval(args[0], env);
        const { table, col } = this.colArg(args[0], name);
        return this.columnTable(table, [col], this.rowsOf(table, env.ctx));
      }
      case 'SELECTEDVALUE': {
        this.arity(name, args, 1, 2);
        const { table, col } = this.colArg(args[0], name);
        const vals = this.distinct(table, col, this.rowsOf(table, env.ctx));
        if (vals.length === 1) return vals[0];
        return args[1] ? this.scalar(args[1], env) : null;
      }
      case 'HASONEVALUE': {
        this.arity(name, args, 1);
        const { table, col } = this.colArg(args[0], name);
        return this.distinct(table, col, this.rowsOf(table, env.ctx)).length === 1;
      }

      // ----- logical -----
      case 'IF': {
        this.arity(name, args, 2, 3);
        return truthy(this.scalar(args[0], env)) ? this.scalar(args[1], env) : args[2] ? this.scalar(args[2], env) : null;
      }
      case 'SWITCH': {
        this.arity(name, args, 3, Infinity);
        const v = this.scalar(args[0], env);
        let i = 1;
        for (; i + 1 < args.length; i += 2) {
          if (scalarEquals(v, this.scalar(args[i], env))) return this.scalar(args[i + 1], env);
        }
        return i < args.length ? this.scalar(args[i], env) : null;
      }
      case 'AND':
        this.arity(name, args, 2);
        return truthy(this.scalar(args[0], env)) && truthy(this.scalar(args[1], env));
      case 'OR':
        this.arity(name, args, 2);
        return truthy(this.scalar(args[0], env)) || truthy(this.scalar(args[1], env));
      case 'NOT':
        this.arity(name, args, 1);
        return !truthy(this.scalar(args[0], env));
      case 'ISBLANK':
        this.arity(name, args, 1);
        return this.scalar(args[0], env) === null;

      // ----- math & text -----
      case 'DIVIDE': {
        this.arity(name, args, 2, 3);
        const a = this.scalar(args[0], env);
        const b = this.scalar(args[1], env);
        if (b === null || toNum(b) === 0) return args[2] ? this.scalar(args[2], env) : null;
        return a === null ? null : toNum(a) / toNum(b);
      }
      case 'ROUND': {
        this.arity(name, args, 2);
        const v = this.scalar(args[0], env);
        const d = toNum(this.scalar(args[1], env));
        if (v === null) return null;
        const f = Math.pow(10, d);
        return Math.round(toNum(v) * f) / f;
      }
      case 'ABS': {
        this.arity(name, args, 1);
        const v = this.scalar(args[0], env);
        return v === null ? null : Math.abs(toNum(v));
      }
      case 'INT': {
        this.arity(name, args, 1);
        const v = this.scalar(args[0], env);
        return v === null ? null : Math.floor(toNum(v));
      }
      case 'CONCATENATE': {
        this.arity(name, args, 2);
        return `${this.scalar(args[0], env) ?? ''}${this.scalar(args[1], env) ?? ''}`;
      }

      // ----- dates -----
      case 'DATE': {
        this.arity(name, args, 3);
        const [y, m, d] = args.map((a) => toNum(this.scalar(a, env)));
        const dt = new Date(Date.UTC(y, m - 1, d));
        return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
      }
      case 'YEAR':
      case 'MONTH':
      case 'DAY': {
        this.arity(name, args, 1);
        const v = this.scalar(args[0], env);
        if (typeof v !== 'string') return null;
        const parts = v.split('-').map(Number);
        return name === 'YEAR' ? parts[0] : name === 'MONTH' ? parts[1] : parts[2];
      }
      case 'DATESYTD':
        this.arity(name, args, 1);
        return this.periodToDate(args[0], env, name, 'Y');
      case 'DATESQTD':
        this.arity(name, args, 1);
        return this.periodToDate(args[0], env, name, 'Q');
      case 'DATESMTD':
        this.arity(name, args, 1);
        return this.periodToDate(args[0], env, name, 'M');
      case 'TOTALYTD':
      case 'TOTALQTD':
      case 'TOTALMTD': {
        this.arity(name, args, 2);
        const period = name === 'TOTALYTD' ? 'Y' : name === 'TOTALQTD' ? 'Q' : 'M';
        const base = env.rows.length ? this.transition(env) : env.ctx;
        const tv = this.periodToDate(args[1], { ...env, ctx: base }, name, period);
        const keys = new Set(tv.rows.map((r) => r[tv.columns[0]]));
        const col = tv.columns[0];
        const ctx = this.applyFilter(base, { table: tv.table, columns: [col], test: (r) => keys.has(r[col]) });
        return this.scalar(args[0], { ctx, rows: [], stack: env.stack, vars: env.vars });
      }
      case 'SAMEPERIODLASTYEAR':
      case 'DATEADD': {
        if (name === 'DATEADD') this.arity(name, args, 3);
        else this.arity(name, args, 1);
        const { table, col, dates } = this.visibleDates(args[0], env, name);
        const n = name === 'DATEADD' ? toNum(this.scalar(args[1], env)) : -1;
        const unit = name === 'DATEADD' ? this.interval(args[2]) : 'YEAR';
        const all = new Set(this.allDates(table, col));
        const out = new Set<string>();
        for (const d of dates) {
          const sd = shiftDate(d, n, unit)!;
          out.add(sd);
          // Like DAX: when a date is the last day of its month, the shifted period runs to the end of the target month.
          if (unit !== 'DAY' && shiftDate(d, 1, 'DAY')!.slice(8) === '01') {
            for (let x = shiftDate(sd, 1, 'DAY')!; x.slice(0, 7) === sd.slice(0, 7); x = shiftDate(x, 1, 'DAY')!) out.add(x);
          }
        }
        const shifted = [...out].filter((d) => all.has(d)).sort();
        return this.dateTable(table, col, shifted);
      }
      case 'PREVIOUSYEAR':
      case 'PREVIOUSMONTH': {
        this.arity(name, args, 1);
        const { table, col, dates } = this.visibleDates(args[0], env, name);
        if (!dates.length) return this.dateTable(table, col, []);
        const [y, m] = dates[0].split('-').map(Number);
        const prefix = name === 'PREVIOUSYEAR' ? `${y - 1}-` : m === 1 ? `${y - 1}-12-` : `${y}-${pad(m - 1)}-`;
        return this.dateTable(table, col, this.allDates(table, col).filter((d) => d.startsWith(prefix)));
      }
      case 'DATESBETWEEN': {
        this.arity(name, args, 3);
        const { table, col } = this.colArg(args[0], name);
        const s = this.scalar(args[1], env);
        const e = this.scalar(args[2], env);
        return this.dateTable(
          table,
          col,
          this.allDates(table, col).filter((d) => (s === null || d >= String(s)) && (e === null || d <= String(e))),
        );
      }
      case 'DATESINPERIOD': {
        this.arity(name, args, 4);
        const { table, col } = this.colArg(args[0], name);
        const start = this.scalar(args[1], env);
        const n = toNum(this.scalar(args[2], env));
        const unit = this.interval(args[3]);
        if (typeof start !== 'string') return this.dateTable(table, col, []);
        // Negative n: the period ends on the start date. Positive n: it starts on it.
        const from = n < 0 ? shiftDate(shiftDate(start, n, unit)!, 1, 'DAY')! : start;
        const to = n < 0 ? start : shiftDate(shiftDate(start, n, unit)!, -1, 'DAY')!;
        return this.dateTable(table, col, this.allDates(table, col).filter((d) => d >= from && d <= to));
      }
      case 'PARALLELPERIOD': {
        this.arity(name, args, 3);
        const { table, col, dates } = this.visibleDates(args[0], env, name);
        if (!dates.length) return this.dateTable(table, col, []);
        const n = toNum(this.scalar(args[1], env));
        const unit = this.interval(args[2]);
        if (unit === 'DAY') throw new DaxError('PARALLELPERIOD works with MONTH, QUARTER or YEAR.');
        // Whole periods: from the start of the first period to the end of the last one, shifted by n periods.
        const startOf = (d: string) => {
          const [y, m] = d.split('-').map(Number);
          const sm = unit === 'YEAR' ? 1 : unit === 'QUARTER' ? Math.floor((m - 1) / 3) * 3 + 1 : m;
          return `${y}-${pad(sm)}-01`;
        };
        const len = unit === 'YEAR' ? 12 : unit === 'QUARTER' ? 3 : 1;
        const from = shiftDate(startOf(dates[0]), n * len, 'MONTH')!;
        const to = shiftDate(shiftDate(startOf(dates[dates.length - 1]), (n + 1) * len, 'MONTH')!, -1, 'DAY')!;
        return this.dateTable(table, col, this.allDates(table, col).filter((d) => d >= from && d <= to));
      }
      case 'EOMONTH': {
        this.arity(name, args, 2);
        const v = this.scalar(args[0], env);
        if (typeof v !== 'string') return null;
        const first = shiftDate(`${v.slice(0, 7)}-01`, toNum(this.scalar(args[1], env)) + 1, 'MONTH')!;
        return shiftDate(first, -1, 'DAY');
      }
      case 'DATEDIFF': {
        this.arity(name, args, 3);
        const a = this.scalar(args[0], env);
        const b = this.scalar(args[1], env);
        if (typeof a !== 'string' || typeof b !== 'string') return null;
        const unitNode = args[2];
        const unit = (unitNode.k === 'table' ? unitNode.name : unitNode.k === 'str' ? unitNode.v : '').toUpperCase();
        const [y1, m1] = a.split('-').map(Number);
        const [y2, m2] = b.split('-').map(Number);
        const days = Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
        switch (unit) {
          case 'DAY':
            return days;
          case 'WEEK':
            return Math.trunc(days / 7);
          case 'MONTH':
            return (y2 - y1) * 12 + (m2 - m1);
          case 'QUARTER':
            return (y2 - y1) * 4 + (Math.floor((m2 - 1) / 3) - Math.floor((m1 - 1) / 3));
          case 'YEAR':
            return y2 - y1;
        }
        throw new DaxError('The interval of DATEDIFF must be DAY, WEEK, MONTH, QUARTER or YEAR.');
      }
      case 'TOPN': {
        this.arity(name, args, 3, 4);
        const n = toNum(this.scalar(args[0], env));
        const tv = this.tableOf(args[1], env);
        const vals = this.iterate(tv, env, args[2]);
        const o = args[3] ? (args[3].k === 'table' ? args[3].name : String(this.scalar(args[3], env))).toUpperCase() : 'DESC';
        const asc = o === 'ASC' || o === '1' || o === 'TRUE';
        const order = vals.map((v, i) => ({ v, i })).filter((x) => x.v !== null).sort((x, y) => (asc ? compare(x.v, y.v) : compare(y.v, x.v)));
        if (n <= 0 || !order.length) return { ...tv, rows: [] };
        // Like DAX, ties with the last kept value are included.
        const cut = order[Math.min(n, order.length) - 1].v;
        const keep = new Set(order.filter((x, k) => k < n || compare(x.v, cut) === 0).map((x) => x.i));
        return { ...tv, rows: tv.rows.filter((_, i) => keep.has(i)) };
      }
      case 'CONCATENATEX': {
        this.arity(name, args, 2, 5);
        const tv = this.tableOf(args[0], env);
        const vals = this.iterate(tv, env, args[1]);
        const delim = args[2] ? String(this.scalar(args[2], env) ?? '') : '';
        let idx = vals.map((_, i) => i);
        if (args[3]) {
          const keys = this.iterate(tv, env, args[3]);
          const o = args[4] ? (args[4].k === 'table' ? args[4].name : String(this.scalar(args[4], env))).toUpperCase() : 'ASC';
          const desc = o === 'DESC' || o === '0' || o === 'FALSE';
          idx = idx.sort((x, y) => (desc ? compare(keys[y], keys[x]) : compare(keys[x], keys[y])));
        }
        return idx.map((i) => (vals[i] === null ? '' : String(vals[i]))).join(delim);
      }
      case 'LOOKUPVALUE': {
        this.arity(name, args, 3, Infinity);
        const result = this.colArg(args[0], name);
        const pairs: { col: string; value: Scalar }[] = [];
        let i = 1;
        for (; i + 1 < args.length; i += 2) {
          const c = this.colArg(args[i], name);
          if (c.table !== result.table) throw new DaxError('In this environment, LOOKUPVALUE search columns must be in the same table as the result column.');
          pairs.push({ col: c.col, value: this.scalar(args[i + 1], env) });
        }
        const found = this.table(result.table).rows.filter((r) => pairs.every((p) => scalarEquals(r[p.col] ?? null, p.value)));
        const values = [...new Set(found.map((r) => JSON.stringify(r[result.col] ?? null)))];
        if (values.length > 1) throw new DaxError('LOOKUPVALUE found several different values. Add more search columns.');
        if (values.length === 1) return JSON.parse(values[0]) as Scalar;
        return i < args.length ? this.scalar(args[i], env) : null;
      }
      case 'ISINSCOPE': {
        // Simplified: true when the column is filtered to a single value, as it is on a matrix row for that level.
        this.arity(name, args, 1);
        const { table, col } = this.colArg(args[0], name);
        return this.distinct(table, col, this.rowsOf(table, env.ctx)).length === 1;
      }
      case 'KEEPFILTERS':
        throw new DaxError('KEEPFILTERS can only be used as a filter argument of CALCULATE.');
      case 'ALLEXCEPT':
        throw new DaxError('ALLEXCEPT can only be used as a filter argument of CALCULATE in this environment.');
    }
    throw new DaxError(`The function ${name}() is not supported here (yet). Supported: ${SUPPORTED_FUNCTIONS.join(', ')}.`);
  }
}
