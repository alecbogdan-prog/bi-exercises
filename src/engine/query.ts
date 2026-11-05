// Power Query style transformation engine: a query is a source table plus a list of applied steps.
import type { Scalar } from './model';

export type QType = 'any' | 'text' | 'int' | 'decimal' | 'date';

export interface QColumn {
  name: string;
  type: QType;
}

export interface QTable {
  columns: QColumn[];
  rows: Scalar[][];
}

export type FilterCond = 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'notBlank';
export type TextFn = 'trim' | 'upper' | 'lower' | 'proper';
export type GroupOp = 'sum' | 'count' | 'avg' | 'min' | 'max';

export type Step =
  | { op: 'promoteHeaders' }
  | { op: 'removeColumns'; columns: string[] }
  | { op: 'rename'; from: string; to: string }
  | { op: 'changeType'; columns: string[]; type: QType }
  | { op: 'filterRows'; column: string; cond: FilterCond; value?: Scalar }
  | { op: 'replaceValues'; columns: string[]; find: string; replace: string }
  | { op: 'transformText'; columns: string[]; fn: TextFn }
  | { op: 'split'; column: string; delimiter: string }
  | { op: 'removeDuplicates' }
  | { op: 'removeBlankRows' }
  | { op: 'unpivotOther'; keep: string[] }
  | { op: 'groupBy'; by: string[]; aggs: { name: string; op: GroupOp; column?: string }[] }
  | { op: 'merge'; with: string; leftKey: string; rightKey: string; expand: string[]; kind?: JoinKind }
  | { op: 'append'; with: string }
  | { op: 'customColumn'; name: string; formula: string }
  | { op: 'fillDown'; columns: string[] }
  | { op: 'conditionalColumn'; name: string; column: string; cond: 'equals' | 'greaterThan' | 'lessThan' | 'contains'; value: Scalar; then: Scalar; else: Scalar }
  | { op: 'addIndex'; start: 0 | 1 }
  | { op: 'datePart'; column: string; part: DatePart }
  | { op: 'pivot'; column: string; values: string; agg: 'sum' | 'count' }
  | { op: 'sort'; column: string; desc: boolean }
  | { op: 'keepTop'; n: number }
  | { op: 'extractText'; column: string; mode: 'before' | 'after'; delimiter: string }
  | { op: 'keepColumns'; columns: string[] };

export type JoinKind = 'left' | 'inner' | 'leftAnti';
export type DatePart = 'year' | 'month' | 'monthName' | 'quarter' | 'day';
export const DATE_PART_NAME: Record<DatePart, string> = { year: 'Year', month: 'Month', monthName: 'Month Name', quarter: 'Quarter', day: 'Day' };
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export class QueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueryError';
  }
}

export const TYPE_LABEL: Record<QType, string> = { any: 'Any', text: 'Text', int: 'Whole Number', decimal: 'Decimal Number', date: 'Date' };
const M_TYPE: Record<QType, string> = { any: 'type any', text: 'type text', int: 'Int64.Type', decimal: 'type number', date: 'type date' };

function colIndex(t: QTable, name: string): number {
  const i = t.columns.findIndex((c) => c.name === name);
  if (i === -1) throw new QueryError(`The column '${name}' of the table wasn't found.`);
  return i;
}

const isBlank = (v: Scalar) => v === null || (typeof v === 'string' && v.trim() === '');

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function convert(v: Scalar, type: QType): Scalar {
  if (v === null) return null;
  switch (type) {
    case 'any':
      return v;
    case 'text':
      return typeof v === 'string' ? v : String(v);
    case 'int':
    case 'decimal': {
      if (typeof v === 'string' && v.trim() === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,\s]/g, ''));
      if (Number.isNaN(n)) return null; // DataFormat.Error in Power Query
      return type === 'int' ? Math.round(n) : n;
    }
    case 'date': {
      const s = String(v).trim();
      let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
      if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
      m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
      if (m) return `${m[3]}-${pad(+m[1])}-${pad(+m[2])}`;
      return null;
    }
  }
}

function properCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-/])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
}

function compareForFilter(v: Scalar, cond: FilterCond, value: Scalar | undefined): boolean {
  switch (cond) {
    case 'notBlank':
      return !isBlank(v);
    case 'equals':
      return v !== null && String(v) === String(value ?? '');
    case 'notEquals':
      return v === null || String(v) !== String(value ?? '');
    case 'contains':
      return v !== null && String(v).toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'greaterThan':
    case 'lessThan': {
      if (v === null) return false;
      const a = typeof v === 'number' ? v : Number(v);
      const b = Number(value);
      if (Number.isNaN(a) || Number.isNaN(b)) return cond === 'greaterThan' ? String(v) > String(value) : String(v) < String(value);
      return cond === 'greaterThan' ? a > b : a < b;
    }
  }
}

// ---------- tiny formula language for custom columns: [Col], numbers, "text", + - * / &, parentheses ----------

type FTok = { t: 'num' | 'str' | 'col' | 'op'; v: string };
function ftokens(src: string): FTok[] {
  const out: FTok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if (c === '[') {
      const e = src.indexOf(']', i);
      if (e === -1) throw new QueryError('Expression.SyntaxError: missing ] after a column name.');
      out.push({ t: 'col', v: src.slice(i + 1, e) });
      i = e + 1;
    } else if (c === '"') {
      const e = src.indexOf('"', i + 1);
      if (e === -1) throw new QueryError('Expression.SyntaxError: missing closing quote.');
      out.push({ t: 'str', v: src.slice(i + 1, e) });
      i = e + 1;
    } else if (/[0-9.]/.test(c)) {
      const m = /^[0-9]*\.?[0-9]+/.exec(src.slice(i))!;
      out.push({ t: 'num', v: m[0] });
      i += m[0].length;
    } else if ('+-*/&()'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
    } else {
      throw new QueryError(`Expression.SyntaxError: unexpected "${c}". Use [Column] references, numbers, "text" and + - * / &.`);
    }
  }
  return out;
}

export function evalFormula(src: string, row: (name: string) => Scalar): Scalar {
  const toks = ftokens(src.replace(/^\s*=/, ''));
  let p = 0;
  const peek = () => toks[p];
  const num = (v: Scalar) => (v === null ? null : typeof v === 'number' ? v : Number(v));
  const expr = (): Scalar => {
    let l = term();
    while (peek()?.t === 'op' && '+-&'.includes(peek().v)) {
      const op = toks[p++].v;
      const r = term();
      if (op === '&') l = l === null || r === null ? null : `${l}${r}`;
      else {
        const a = num(l);
        const b = num(r);
        l = a === null || b === null ? null : op === '+' ? a + b : a - b;
      }
    }
    return l;
  };
  const term = (): Scalar => {
    let l = factor();
    while (peek()?.t === 'op' && '*/'.includes(peek().v)) {
      const op = toks[p++].v;
      const a = num(l);
      const b = num(factor());
      l = a === null || b === null ? null : op === '*' ? a * b : b === 0 ? null : a / b;
    }
    return l;
  };
  const factor = (): Scalar => {
    const t = toks[p++];
    if (!t) throw new QueryError('Expression.SyntaxError: the formula ended unexpectedly.');
    if (t.t === 'num') return Number(t.v);
    if (t.t === 'str') return t.v;
    if (t.t === 'col') return row(t.v);
    if (t.v === '(') {
      const v = expr();
      if (toks[p++]?.v !== ')') throw new QueryError('Expression.SyntaxError: missing ).');
      return v;
    }
    if (t.v === '-') {
      const v = num(factor());
      return v === null ? null : -v;
    }
    throw new QueryError(`Expression.SyntaxError: unexpected "${t.v}".`);
  };
  const v = expr();
  if (p < toks.length) throw new QueryError(`Expression.SyntaxError: unexpected "${toks[p].v}".`);
  return typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v;
}

// ---------- step application ----------

export function applyStep(t: QTable, s: Step, sources: Record<string, QTable>): QTable {
  switch (s.op) {
    case 'promoteHeaders': {
      if (!t.rows.length) throw new QueryError('There is no row to use as headers.');
      const names: string[] = [];
      t.rows[0].forEach((v, i) => {
        let n = v === null || v === '' ? `Column${i + 1}` : String(v).trim();
        while (names.includes(n)) n = `${n}_1`;
        names.push(n);
      });
      return { columns: names.map((name) => ({ name, type: 'any' })), rows: t.rows.slice(1) };
    }
    case 'removeColumns': {
      const idx = s.columns.map((c) => colIndex(t, c));
      return { columns: t.columns.filter((_, i) => !idx.includes(i)), rows: t.rows.map((r) => r.filter((_, i) => !idx.includes(i))) };
    }
    case 'rename': {
      const i = colIndex(t, s.from);
      if (t.columns.some((c, j) => j !== i && c.name === s.to)) throw new QueryError(`The column '${s.to}' already exists.`);
      return { columns: t.columns.map((c, j) => (j === i ? { ...c, name: s.to } : c)), rows: t.rows };
    }
    case 'changeType': {
      const idx = s.columns.map((c) => colIndex(t, c));
      return {
        columns: t.columns.map((c, i) => (idx.includes(i) ? { ...c, type: s.type } : c)),
        rows: t.rows.map((r) => r.map((v, i) => (idx.includes(i) ? convert(v, s.type) : v))),
      };
    }
    case 'filterRows': {
      const i = colIndex(t, s.column);
      return { columns: t.columns, rows: t.rows.filter((r) => compareForFilter(r[i], s.cond, s.value)) };
    }
    case 'replaceValues': {
      const idx = s.columns.map((c) => colIndex(t, c));
      return {
        columns: t.columns,
        rows: t.rows.map((r) =>
          r.map((v, i) => {
            if (!idx.includes(i)) return v;
            if (typeof v === 'string') return s.find ? v.split(s.find).join(s.replace) : v;
            if (v !== null && String(v) === s.find) return t.columns[i].type === 'int' || t.columns[i].type === 'decimal' ? Number(s.replace) : s.replace;
            if (v === null && (s.find === '' || s.find.toLowerCase() === 'null')) return s.replace;
            return v;
          }),
        ),
      };
    }
    case 'transformText': {
      const idx = s.columns.map((c) => colIndex(t, c));
      const f = (x: string) => (s.fn === 'trim' ? x.trim() : s.fn === 'upper' ? x.toUpperCase() : s.fn === 'lower' ? x.toLowerCase() : properCase(x));
      return { columns: t.columns, rows: t.rows.map((r) => r.map((v, i) => (idx.includes(i) && typeof v === 'string' ? f(v) : v))) };
    }
    case 'split': {
      const i = colIndex(t, s.column);
      if (!s.delimiter) throw new QueryError('Enter a delimiter.');
      const parts = t.rows.map((r) => (r[i] === null ? [null] : String(r[i]).split(s.delimiter)));
      const n = Math.max(1, ...parts.map((p) => p.length));
      const newCols: QColumn[] = Array.from({ length: n }, (_, k) => ({ name: `${s.column}.${k + 1}`, type: 'text' }));
      return {
        columns: [...t.columns.slice(0, i), ...newCols, ...t.columns.slice(i + 1)],
        rows: t.rows.map((r, ri) => [...r.slice(0, i), ...Array.from({ length: n }, (_, k) => parts[ri][k] ?? null), ...r.slice(i + 1)]),
      };
    }
    case 'removeDuplicates': {
      const seen = new Set<string>();
      return {
        columns: t.columns,
        rows: t.rows.filter((r) => {
          const k = JSON.stringify(r);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }),
      };
    }
    case 'removeBlankRows':
      return { columns: t.columns, rows: t.rows.filter((r) => !r.every(isBlank)) };
    case 'unpivotOther': {
      const keep = s.keep.map((c) => colIndex(t, c));
      const other = t.columns.map((_, i) => i).filter((i) => !keep.includes(i));
      const valType = other.every((i) => t.columns[i].type === 'int') ? 'int' : other.every((i) => ['int', 'decimal'].includes(t.columns[i].type)) ? 'decimal' : 'any';
      return {
        columns: [...keep.map((i) => t.columns[i]), { name: 'Attribute', type: 'text' }, { name: 'Value', type: valType }],
        rows: t.rows.flatMap((r) => other.filter((i) => r[i] !== null).map((i) => [...keep.map((k) => r[k]), t.columns[i].name, r[i]])),
      };
    }
    case 'groupBy': {
      const by = s.by.map((c) => colIndex(t, c));
      const groups = new Map<string, Scalar[][]>();
      for (const r of t.rows) {
        const k = JSON.stringify(by.map((i) => r[i]));
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(r);
      }
      const aggCols = s.aggs.map((a) => (a.op === 'count' ? -1 : colIndex(t, a.column ?? '')));
      return {
        columns: [
          ...by.map((i) => t.columns[i]),
          ...s.aggs.map((a, j): QColumn => ({ name: a.name, type: a.op === 'count' ? 'int' : a.op === 'avg' ? 'decimal' : t.columns[aggCols[j]].type === 'int' ? 'int' : 'decimal' })),
        ],
        rows: [...groups.values()].map((rows) => [
          ...by.map((i) => rows[0][i]),
          ...s.aggs.map((a, j) => {
            if (a.op === 'count') return rows.length;
            const vals = rows.map((r) => r[aggCols[j]]).filter((v): v is number => typeof v === 'number');
            if (!vals.length) return null;
            if (a.op === 'sum') return Math.round(vals.reduce((x, y) => x + y, 0) * 1e9) / 1e9;
            if (a.op === 'avg') return vals.reduce((x, y) => x + y, 0) / vals.length;
            return a.op === 'min' ? Math.min(...vals) : Math.max(...vals);
          }),
        ]),
      };
    }
    case 'merge': {
      const other = sources[s.with];
      if (!other) throw new QueryError(`The query '${s.with}' wasn't found.`);
      const li = colIndex(t, s.leftKey);
      const ri = colIndex(other, s.rightKey);
      const ex = s.expand.map((c) => colIndex(other, c));
      const index = new Map<string, Scalar[]>();
      for (const r of other.rows) if (!index.has(String(r[ri]))) index.set(String(r[ri]), r);
      const kind = s.kind ?? 'left';
      const match = (r: Scalar[]) => (r[li] === null ? undefined : index.get(String(r[li])));
      if (kind === 'leftAnti') return { columns: t.columns, rows: t.rows.filter((r) => !match(r)) };
      const rows = kind === 'inner' ? t.rows.filter((r) => match(r)) : t.rows;
      return {
        columns: [...t.columns, ...ex.map((i) => ({ ...other.columns[i], name: t.columns.some((c) => c.name === other.columns[i].name) ? `${s.with}.${other.columns[i].name}` : other.columns[i].name }))],
        rows: rows.map((r) => {
          const m = match(r);
          return [...r, ...ex.map((i) => (m ? m[i] : null))];
        }),
      };
    }
    case 'append': {
      const other = sources[s.with];
      if (!other) throw new QueryError(`The query '${s.with}' wasn't found.`);
      const names = [...t.columns.map((c) => c.name), ...other.columns.map((c) => c.name).filter((n) => !t.columns.some((c) => c.name === n))];
      const pick = (tbl: QTable, r: Scalar[]) => names.map((n) => {
        const i = tbl.columns.findIndex((c) => c.name === n);
        return i === -1 ? null : r[i];
      });
      return {
        columns: names.map((n) => {
          const a = t.columns.find((c) => c.name === n);
          const b = other.columns.find((c) => c.name === n);
          return { name: n, type: a && b && a.type === b.type ? a.type : (a ?? b)!.type };
        }),
        rows: [...t.rows.map((r) => pick(t, r)), ...other.rows.map((r) => pick(other, r))],
      };
    }
    case 'customColumn': {
      if (!s.name.trim()) throw new QueryError('Enter a name for the new column.');
      if (t.columns.some((c) => c.name === s.name)) throw new QueryError(`The column '${s.name}' already exists.`);
      const vals = t.rows.map((r) =>
        evalFormula(s.formula, (n) => {
          const i = t.columns.findIndex((c) => c.name === n);
          if (i === -1) throw new QueryError(`Expression.Error: The field '${n}' of the record wasn't found.`);
          return r[i];
        }),
      );
      // Like Power Query, a custom column without an explicit type is of type Any.
      return { columns: [...t.columns, { name: s.name, type: 'any' }], rows: t.rows.map((r, i) => [...r, vals[i]]) };
    }
    case 'fillDown': {
      const idx = s.columns.map((c) => colIndex(t, c));
      const last: Record<number, Scalar> = {};
      return {
        columns: t.columns,
        rows: t.rows.map((r) =>
          r.map((v, i) => {
            if (!idx.includes(i)) return v;
            if (isBlank(v)) return last[i] ?? v;
            last[i] = v;
            return v;
          }),
        ),
      };
    }
    case 'conditionalColumn': {
      if (!s.name.trim()) throw new QueryError('Enter a name for the new column.');
      if (t.columns.some((c) => c.name === s.name)) throw new QueryError(`The column '${s.name}' already exists.`);
      const i = colIndex(t, s.column);
      const test = (v: Scalar) => {
        if (s.cond === 'contains') return v !== null && String(v).includes(String(s.value ?? ''));
        if (s.cond === 'equals') return v !== null && String(v) === String(s.value ?? '');
        if (v === null) return false;
        const a = typeof v === 'number' ? v : Number(v);
        const b = Number(s.value);
        return s.cond === 'greaterThan' ? a > b : a < b;
      };
      const typeOf = (x: Scalar): QType => (typeof x === 'number' ? (Number.isInteger(x) ? 'int' : 'decimal') : 'text');
      const type = typeOf(s.then) === typeOf(s.else) ? typeOf(s.then) : 'any';
      return { columns: [...t.columns, { name: s.name, type }], rows: t.rows.map((r) => [...r, test(r[i]) ? s.then : s.else]) };
    }
    case 'addIndex':
      if (t.columns.some((c) => c.name === 'Index')) throw new QueryError("The column 'Index' already exists.");
      return { columns: [...t.columns, { name: 'Index', type: 'int' }], rows: t.rows.map((r, i) => [...r, i + s.start]) };
    case 'datePart': {
      const i = colIndex(t, s.column);
      const name = DATE_PART_NAME[s.part];
      if (t.columns.some((c) => c.name === name)) throw new QueryError(`The column '${name}' already exists.`);
      if (t.columns[i].type !== 'date') throw new QueryError(`'${s.column}' must be a Date column first (Change Type → Date).`);
      const part = (v: Scalar): Scalar => {
        if (typeof v !== 'string') return null;
        const [y, m, d] = v.split('-').map(Number);
        return s.part === 'year' ? y : s.part === 'month' ? m : s.part === 'day' ? d : s.part === 'quarter' ? Math.floor((m - 1) / 3) + 1 : MONTH_NAMES[m - 1];
      };
      return { columns: [...t.columns, { name, type: s.part === 'monthName' ? 'text' : 'int' }], rows: t.rows.map((r) => [...r, part(r[i])]) };
    }
    case 'pivot': {
      const pi = colIndex(t, s.column);
      const vi = colIndex(t, s.values);
      const keys = t.columns.map((_, i) => i).filter((i) => i !== pi && i !== vi);
      const newCols: string[] = [];
      for (const r of t.rows) if (r[pi] !== null && !newCols.includes(String(r[pi]))) newCols.push(String(r[pi]));
      const groups = new Map<string, { key: Scalar[]; cells: Map<string, Scalar[]> }>();
      for (const r of t.rows) {
        const k = JSON.stringify(keys.map((i) => r[i]));
        if (!groups.has(k)) groups.set(k, { key: keys.map((i) => r[i]), cells: new Map() });
        const g = groups.get(k)!;
        const c = String(r[pi]);
        if (!g.cells.has(c)) g.cells.set(c, []);
        g.cells.get(c)!.push(r[vi]);
      }
      const agg = (vals: Scalar[] | undefined): Scalar => {
        if (!vals) return null;
        if (s.agg === 'count') return vals.length;
        const nums = vals.filter((v): v is number => typeof v === 'number');
        return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) * 1e9) / 1e9 : null;
      };
      return {
        columns: [...keys.map((i) => t.columns[i]), ...newCols.map((n): QColumn => ({ name: n, type: s.agg === 'count' ? 'int' : t.columns[vi].type }))],
        rows: [...groups.values()].map((g) => [...g.key, ...newCols.map((n) => agg(g.cells.get(n)))]),
      };
    }
    case 'sort': {
      const i = colIndex(t, s.column);
      const rows = [...t.rows].sort((a, b) => {
        const x = a[i];
        const y = b[i];
        if (x === y) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return s.desc ? -c : c;
      });
      return { columns: t.columns, rows };
    }
    case 'keepTop':
      if (!(s.n > 0)) throw new QueryError('Enter the number of rows to keep.');
      return { columns: t.columns, rows: t.rows.slice(0, s.n) };
    case 'extractText': {
      const i = colIndex(t, s.column);
      if (!s.delimiter) throw new QueryError('Enter a delimiter.');
      const f = (v: Scalar): Scalar => {
        if (typeof v !== 'string') return v;
        const at = v.indexOf(s.delimiter);
        if (at === -1) return s.mode === 'before' ? v : '';
        return s.mode === 'before' ? v.slice(0, at) : v.slice(at + s.delimiter.length);
      };
      return { columns: t.columns.map((c, j) => (j === i ? { ...c, type: 'text' } : c)), rows: t.rows.map((r) => r.map((v, j) => (j === i ? f(v) : v))) };
    }
    case 'keepColumns': {
      const idx = s.columns.map((c) => colIndex(t, c));
      const keep = t.columns.map((_, i) => i).filter((i) => idx.includes(i));
      return { columns: keep.map((i) => t.columns[i]), rows: t.rows.map((r) => keep.map((i) => r[i])) };
    }
  }
}

export function runQuery(source: QTable, steps: Step[], sources: Record<string, QTable>, upto = steps.length): QTable {
  let t = source;
  for (let i = 0; i < upto; i++) t = applyStep(t, steps[i], sources);
  return t;
}

// ---------- step names and M code (for the Applied Steps list and the formula bar) ----------

const BASE_NAME: Record<Step['op'], string> = {
  promoteHeaders: 'Promoted Headers',
  removeColumns: 'Removed Columns',
  rename: 'Renamed Columns',
  changeType: 'Changed Type',
  filterRows: 'Filtered Rows',
  replaceValues: 'Replaced Value',
  transformText: 'Transformed Text',
  split: 'Split Column by Delimiter',
  removeDuplicates: 'Removed Duplicates',
  removeBlankRows: 'Removed Blank Rows',
  unpivotOther: 'Unpivoted Other Columns',
  groupBy: 'Grouped Rows',
  merge: 'Merged Queries',
  append: 'Appended Query',
  customColumn: 'Added Custom',
  fillDown: 'Filled Down',
  conditionalColumn: 'Added Conditional Column',
  addIndex: 'Added Index',
  datePart: 'Inserted Date Part',
  pivot: 'Pivoted Column',
  sort: 'Sorted Rows',
  keepTop: 'Kept First Rows',
  extractText: 'Extracted Text',
  keepColumns: 'Removed Other Columns',
};

function textFnName(fn: TextFn) {
  return fn === 'trim' ? 'Trimmed Text' : fn === 'upper' ? 'Uppercased Text' : fn === 'lower' ? 'Lowercased Text' : 'Capitalized Each Word';
}

export function stepNames(steps: Step[]): string[] {
  const used = new Map<string, number>();
  return steps.map((s) => {
    const base = s.op === 'transformText' ? textFnName(s.fn) : s.op === 'datePart' ? `Inserted ${DATE_PART_NAME[s.part]}` : BASE_NAME[s.op];
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n ? `${base}${n}` : base;
  });
}

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const list = (xs: string[]) => `{${xs.map(q).join(', ')}}`;

export function stepM(steps: Step[], index: number, sourceName: string): string {
  if (index < 0) return `= Csv.Document(File.Contents("C:\\Data\\${sourceName}"))`;
  const names = stepNames(steps);
  const prev = index === 0 ? 'Source' : `#"${names[index - 1]}"`;
  const s = steps[index];
  switch (s.op) {
    case 'promoteHeaders':
      return `= Table.PromoteHeaders(${prev}, [PromoteAllScalars=true])`;
    case 'removeColumns':
      return `= Table.RemoveColumns(${prev},${list(s.columns)})`;
    case 'rename':
      return `= Table.RenameColumns(${prev},{{${q(s.from)}, ${q(s.to)}}})`;
    case 'changeType':
      return `= Table.TransformColumnTypes(${prev},{${s.columns.map((c) => `{${q(c)}, ${M_TYPE[s.type]}}`).join(', ')}})`;
    case 'filterRows': {
      const col = `[${s.column}]`;
      const v = typeof s.value === 'number' ? String(s.value) : q(String(s.value ?? ''));
      const cond =
        s.cond === 'notBlank'
          ? `${col} <> null and ${col} <> ""`
          : s.cond === 'equals'
            ? `${col} = ${v}`
            : s.cond === 'notEquals'
              ? `${col} <> ${v}`
              : s.cond === 'contains'
                ? `Text.Contains(${col}, ${v})`
                : `${col} ${s.cond === 'greaterThan' ? '>' : '<'} ${v}`;
      return `= Table.SelectRows(${prev}, each ${cond})`;
    }
    case 'replaceValues':
      return `= Table.ReplaceValue(${prev},${q(s.find)},${q(s.replace)},Replacer.ReplaceText,${list(s.columns)})`;
    case 'transformText': {
      const fn = s.fn === 'trim' ? 'Text.Trim' : s.fn === 'upper' ? 'Text.Upper' : s.fn === 'lower' ? 'Text.Lower' : 'Text.Proper';
      return `= Table.TransformColumns(${prev},{${s.columns.map((c) => `{${q(c)}, ${fn}, type text}`).join(', ')}})`;
    }
    case 'split':
      return `= Table.SplitColumn(${prev}, ${q(s.column)}, Splitter.SplitTextByDelimiter(${q(s.delimiter)}, QuoteStyle.Csv), {${q(s.column + '.1')}, ${q(s.column + '.2')}})`;
    case 'removeDuplicates':
      return `= Table.Distinct(${prev})`;
    case 'removeBlankRows':
      return `= Table.SelectRows(${prev}, each not List.IsEmpty(List.RemoveMatchingItems(Record.FieldValues(_), {"", null})))`;
    case 'unpivotOther':
      return `= Table.UnpivotOtherColumns(${prev}, ${list(s.keep)}, "Attribute", "Value")`;
    case 'groupBy':
      return `= Table.Group(${prev}, ${list(s.by)}, {${s.aggs
        .map((a) => `{${q(a.name)}, each ${a.op === 'count' ? 'Table.RowCount(_)' : `List.${a.op === 'avg' ? 'Average' : a.op[0].toUpperCase() + a.op.slice(1)}([${a.column}])`}, type nullable number}`)
        .join(', ')}})`;
    case 'merge':
      return `= Table.ExpandTableColumn(Table.NestedJoin(${prev}, {${q(s.leftKey)}}, #${q(s.with)}, {${q(s.rightKey)}}, ${q(s.with)}, JoinKind.${s.kind === 'inner' ? 'Inner' : s.kind === 'leftAnti' ? 'LeftAnti' : 'LeftOuter'}), ${q(s.with)}, ${list(s.expand)})`;
    case 'append':
      return `= Table.Combine({${prev}, #${q(s.with)}})`;
    case 'customColumn':
      return `= Table.AddColumn(${prev}, ${q(s.name)}, each ${s.formula.replace(/^\s*=\s*/, '')})`;
    case 'fillDown':
      return `= Table.FillDown(${prev},${list(s.columns)})`;
    case 'conditionalColumn': {
      const lit = (v: Scalar) => (typeof v === 'number' ? String(v) : q(String(v ?? '')));
      const op = s.cond === 'equals' ? '=' : s.cond === 'greaterThan' ? '>' : '<';
      const test = s.cond === 'contains' ? `Text.Contains([${s.column}], ${lit(s.value)})` : `[${s.column}] ${op} ${lit(s.value)}`;
      return `= Table.AddColumn(${prev}, ${q(s.name)}, each if ${test} then ${lit(s.then)} else ${lit(s.else)})`;
    }
    case 'addIndex':
      return `= Table.AddIndexColumn(${prev}, "Index", ${s.start}, 1, Int64.Type)`;
    case 'datePart': {
      const fn = { year: 'Date.Year', month: 'Date.Month', monthName: 'Date.MonthName', quarter: 'Date.QuarterOfYear', day: 'Date.Day' }[s.part];
      return `= Table.AddColumn(${prev}, ${q(DATE_PART_NAME[s.part])}, each ${fn}([${s.column}]))`;
    }
    case 'pivot':
      return `= Table.Pivot(${prev}, List.Distinct(${prev}[${s.column}]), ${q(s.column)}, ${q(s.values)}, ${s.agg === 'sum' ? 'List.Sum' : 'List.Count'})`;
    case 'sort':
      return `= Table.Sort(${prev},{{${q(s.column)}, Order.${s.desc ? 'Descending' : 'Ascending'}}})`;
    case 'keepTop':
      return `= Table.FirstN(${prev},${s.n})`;
    case 'extractText':
      return `= Table.TransformColumns(${prev}, {{${q(s.column)}, each Text.${s.mode === 'before' ? 'BeforeDelimiter' : 'AfterDelimiter'}(_, ${q(s.delimiter)}), type text}})`;
    case 'keepColumns':
      return `= Table.SelectColumns(${prev},${list(s.columns)})`;
  }
}

// ---------- comparison used by the checker ----------

export function normalizeRow(r: Scalar[]): string {
  return JSON.stringify(r.map((v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)));
}
