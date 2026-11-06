import { useMemo, useState } from 'react';
import type { MouseEvent as RMouseEvent, ReactNode } from 'react';
import type { Scalar } from '../../engine/model';
import { DATE_PART_NAME, QueryError, TYPE_LABEL, runQuery, stepM, stepNames } from '../../engine/query';
import type { DatePart, FilterCond, GroupOp, JoinKind, QTable, QType, Step, TextFn } from '../../engine/query';
import { RAW_SOURCES, rawSource, sourceTables } from '../../engine/rawSources';
import { Menu } from './common';
import type { MenuItem } from './common';
import { Ico, RibbonGlyph } from './icons';

interface Props {
  source: string;
  steps: Step[];
  onSteps: (steps: Step[]) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

type Dialog =
  | { kind: 'rename'; column: string }
  | { kind: 'replace'; columns: string[] }
  | { kind: 'split'; column: string }
  | { kind: 'groupBy' }
  | { kind: 'merge' }
  | { kind: 'append' }
  | { kind: 'custom' }
  | { kind: 'filter'; column: string; cond: FilterCond }
  | { kind: 'conditional' }
  | { kind: 'pivot'; column: string }
  | { kind: 'keepTop' }
  | { kind: 'extract'; column: string; mode: 'before' | 'after' };

const TYPE_ICON: Record<QType, string> = { any: 'ABC\n123', text: 'ABC', int: '123', decimal: '1.2', date: '📅' };

function fmt(v: Scalar, type: QType): ReactNode {
  if (v === null) return <span className="text-d-faint italic">null</span>;
  if (type === 'decimal' && typeof v === 'number') return String(v);
  return String(v);
}

export function PowerQueryEditor({ source, steps, onSteps, onClose, onToast }: Props) {
  const sources = useMemo(() => sourceTables(), []);
  const raw = rawSource(source);
  const [selStep, setSelStep] = useState(steps.length); // 0 = Source, i = after step i
  const [selCols, setSelCols] = useState<string[]>([]);
  const [tab, setTab] = useState<'Home' | 'Transform' | 'Add Column'>('Home');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const names = stepNames(steps);
  const at = Math.min(selStep, steps.length);

  const { table, error } = useMemo((): { table: QTable | null; error: string | null } => {
    try {
      return { table: runQuery(raw.table, steps, sources, at), error: null };
    } catch (e) {
      if (e instanceof QueryError) return { table: null, error: e.message };
      throw e;
    }
  }, [raw.table, steps, sources, at]);

  const add = (s: Step) => {
    // Like Power Query, a new step is inserted after the selected step.
    const next = [...steps.slice(0, at), s, ...steps.slice(at)];
    onSteps(next);
    setSelStep(at + 1);
    setSelCols([]);
  };
  const need = (n: 'one' | 'some', fn: (cols: string[]) => void) => () => {
    if (!table) return onToast('Fix or delete the step with the error first.');
    if (!selCols.length) return onToast(n === 'one' ? 'Select a column first (click its header).' : 'Select one or more columns first (Ctrl+click for several).');
    if (n === 'one' && selCols.length > 1) return onToast('Select a single column for this command.');
    fn(selCols);
  };
  const typeMenu = (cols: string[], x: number, y: number) =>
    setMenu({
      x,
      y,
      items: (['decimal', 'int', 'date', 'text'] as QType[]).map((t) => ({ label: TYPE_LABEL[t], onClick: () => add({ op: 'changeType', columns: cols, type: t }) })),
    });
  const formatMenu = (cols: string[], x: number, y: number) =>
    setMenu({
      x,
      y,
      items: (
        [
          ['lower', 'lowercase'],
          ['upper', 'UPPERCASE'],
          ['proper', 'Capitalize Each Word'],
          ['trim', 'Trim'],
        ] as [TextFn, string][]
      ).map(([fn, label]) => ({ label, onClick: () => add({ op: 'transformText', columns: cols, fn }) })),
    });

  const pickMenu = (e: RMouseEvent, items: MenuItem[]) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ x: r.left, y: r.bottom + 2, items });
  };
  const dateMenu = (e: RMouseEvent) =>
    need('one', (c) =>
      pickMenu(
        e,
        (['year', 'month', 'monthName', 'quarter', 'day'] as DatePart[]).map((part) => ({
          label: part === 'monthName' ? 'Name of Month' : DATE_PART_NAME[part],
          onClick: () => add({ op: 'datePart', column: c[0], part }),
        })),
      ),
    )();

  const btnPos = (e: RMouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: r.left, y: r.bottom + 2 };
  };

  type B = { label: string; icon: string; onClick: (e: RMouseEvent) => void; dropdown?: boolean };
  const groups: { label: string; buttons: B[] }[] =
    tab === 'Home'
      ? [
          { label: 'Close', buttons: [{ label: 'Close & Apply', icon: 'publish', onClick: onClose }] },
          {
            label: 'Manage Columns',
            buttons: [
              { label: 'Remove Columns', icon: 'newcolumn', onClick: need('some', (c) => add({ op: 'removeColumns', columns: c })) },
              { label: 'Remove Other Columns', icon: 'newcolumn', onClick: need('some', (c) => add({ op: 'keepColumns', columns: c })) },
            ],
          },
          {
            label: 'Reduce Rows',
            buttons: [
              {
                label: 'Remove Rows',
                icon: 'newtable',
                dropdown: true,
                onClick: (e) => {
                  const p = btnPos(e);
                  setMenu({
                    ...p,
                    items: [
                      { label: 'Remove Duplicates', onClick: () => add({ op: 'removeDuplicates' }) },
                      { label: 'Remove Blank Rows', onClick: () => add({ op: 'removeBlankRows' }) },
                    ],
                  });
                },
              },
              { label: 'Keep Rows', icon: 'newtable', dropdown: true, onClick: (e) => pickMenu(e, [{ label: 'Keep Top Rows...', onClick: () => setDialog({ kind: 'keepTop' }) }]) },
            ],
          },
          {
            label: 'Sort',
            buttons: [
              { label: 'Sort Ascending', icon: 'transform', onClick: need('one', (c) => add({ op: 'sort', column: c[0], desc: false })) },
              { label: 'Sort Descending', icon: 'transform', onClick: need('one', (c) => add({ op: 'sort', column: c[0], desc: true })) },
            ],
          },
          {
            label: 'Transform',
            buttons: [
              { label: 'Split Column', icon: 'transform', dropdown: true, onClick: need('one', (c) => setDialog({ kind: 'split', column: c[0] })) },
              { label: 'Group By', icon: 'theme', onClick: () => setDialog({ kind: 'groupBy' }) },
              {
                label: 'Data Type',
                icon: 'enterdata',
                dropdown: true,
                onClick: (e) => {
                  const p = btnPos(e);
                  need('some', (c) => typeMenu(c, p.x, p.y))();
                },
              },
              { label: 'Use First Row as Headers', icon: 'excel', onClick: () => add({ op: 'promoteHeaders' }) },
              { label: 'Replace Values', icon: 'refresh', onClick: need('some', (c) => setDialog({ kind: 'replace', columns: c })) },
            ],
          },
          {
            label: 'Combine',
            buttons: [
              { label: 'Merge Queries', icon: 'relationships', onClick: () => setDialog({ kind: 'merge' }) },
              { label: 'Append Queries', icon: 'newtable', onClick: () => setDialog({ kind: 'append' }) },
            ],
          },
        ]
      : tab === 'Transform'
        ? [
            {
              label: 'Table',
              buttons: [
                { label: 'Group By', icon: 'theme', onClick: () => setDialog({ kind: 'groupBy' }) },
                { label: 'Use First Row as Headers', icon: 'excel', onClick: () => add({ op: 'promoteHeaders' }) },
              ],
            },
            {
              label: 'Any Column',
              buttons: [
                {
                  label: 'Data Type',
                  icon: 'enterdata',
                  dropdown: true,
                  onClick: (e) => {
                    const p = btnPos(e);
                    need('some', (c) => typeMenu(c, p.x, p.y))();
                  },
                },
                { label: 'Rename', icon: 'textbox', onClick: need('one', (c) => setDialog({ kind: 'rename', column: c[0] })) },
                { label: 'Replace Values', icon: 'refresh', onClick: need('some', (c) => setDialog({ kind: 'replace', columns: c })) },
                {
                  label: 'Unpivot Columns',
                  icon: 'transform',
                  dropdown: true,
                  onClick: (e) => {
                    const p = btnPos(e);
                    need('some', (c) => setMenu({ ...p, items: [{ label: 'Unpivot Other Columns', onClick: () => add({ op: 'unpivotOther', keep: c }) }] }))();
                  },
                },
                { label: 'Pivot Column', icon: 'transform', onClick: need('one', (c) => setDialog({ kind: 'pivot', column: c[0] })) },
                { label: 'Fill', icon: 'refresh', dropdown: true, onClick: (e) => need('some', (c) => pickMenu(e, [{ label: 'Down', onClick: () => add({ op: 'fillDown', columns: c }) }]))() },
              ],
            },
            {
              label: 'Text Column',
              buttons: [
                { label: 'Split Column', icon: 'transform', dropdown: true, onClick: need('one', (c) => setDialog({ kind: 'split', column: c[0] })) },
                {
                  label: 'Format',
                  icon: 'textbox',
                  dropdown: true,
                  onClick: (e) => {
                    const p = btnPos(e);
                    need('some', (c) => formatMenu(c, p.x, p.y))();
                  },
                },
                {
                  label: 'Extract',
                  icon: 'textbox',
                  dropdown: true,
                  onClick: (e) =>
                    need('one', (c) =>
                      pickMenu(e, [
                        { label: 'Text Before Delimiter...', onClick: () => setDialog({ kind: 'extract', column: c[0], mode: 'before' }) },
                        { label: 'Text After Delimiter...', onClick: () => setDialog({ kind: 'extract', column: c[0], mode: 'after' }) },
                      ]),
                    )(),
                },
              ],
            },
          ]
        : [
            {
              label: 'General',
              buttons: [
                { label: 'Custom Column', icon: 'newcolumn', onClick: () => setDialog({ kind: 'custom' }) },
                { label: 'Conditional Column', icon: 'newcolumn', onClick: () => setDialog({ kind: 'conditional' }) },
                {
                  label: 'Index Column',
                  icon: 'newcolumn',
                  dropdown: true,
                  onClick: (e) =>
                    pickMenu(e, [
                      { label: 'From 1', onClick: () => add({ op: 'addIndex', start: 1 }) },
                      { label: 'From 0', onClick: () => add({ op: 'addIndex', start: 0 }) },
                    ]),
                },
              ],
            },
            { label: 'From Date & Time', buttons: [{ label: 'Date', icon: 'enterdata', dropdown: true, onClick: dateMenu }] },
          ];

  const headerMenu = (col: string, x: number, y: number) =>
    setMenu({
      x,
      y,
      items: [
        { label: 'Sort Ascending', onClick: () => add({ op: 'sort', column: col, desc: false }) },
        { label: 'Sort Descending', onClick: () => add({ op: 'sort', column: col, desc: true }) },
        { separator: true, label: '' },
        { label: 'Remove', onClick: () => add({ op: 'removeColumns', columns: [col] }) },
        { label: 'Remove Other Columns', onClick: () => add({ op: 'keepColumns', columns: [col] }) },
        { label: 'Fill Down', onClick: () => add({ op: 'fillDown', columns: [col] }) },
        { label: 'Rename...', onClick: () => setDialog({ kind: 'rename', column: col }) },
        { separator: true, label: '' },
        ...(['decimal', 'int', 'date', 'text'] as QType[]).map((t) => ({ label: `Change Type: ${TYPE_LABEL[t]}`, onClick: () => add({ op: 'changeType', columns: [col], type: t }) })),
        { separator: true, label: '' },
        { label: 'Replace Values...', onClick: () => setDialog({ kind: 'replace', columns: [col] }) },
        { label: 'Remove Empty', onClick: () => add({ op: 'filterRows', column: col, cond: 'notBlank' }) },
        { label: 'Filter: Equals...', onClick: () => setDialog({ kind: 'filter', column: col, cond: 'equals' }) },
        { label: 'Filter: Does Not Equal...', onClick: () => setDialog({ kind: 'filter', column: col, cond: 'notEquals' }) },
        { label: 'Filter: Greater Than...', onClick: () => setDialog({ kind: 'filter', column: col, cond: 'greaterThan' }) },
        { label: 'Filter: Contains...', onClick: () => setDialog({ kind: 'filter', column: col, cond: 'contains' }) },
      ],
    });

  return (
    <div className="desktop absolute inset-0 z-30 flex flex-col bg-white" data-testid="pq-editor">
      <div className="flex h-9 shrink-0 items-center bg-d-ribbon px-3 text-[12px]">
        <span className="font-semibold">Power Query Editor</span>
        <span className="ml-2 text-d-sub">· {source}</span>
        <div className="flex-1" />
        <button onClick={onClose} className="flex h-9 w-10 items-center justify-center hover:bg-[#c42b1c] hover:text-white" title="Close (applies the query)">
          <Ico.close className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="shrink-0 border-b border-d-border bg-d-ribbon">
        <div className="flex h-8 items-end gap-0.5 px-2">
          <span className="mb-1 px-3 py-1 text-[12.5px]">File</span>
          {(['Home', 'Transform', 'Add Column'] as const).map((t) => (
            <button key={t} data-pq-tab={t} onClick={() => setTab(t)} className={`relative px-3 pt-1 pb-2 text-[12.5px] hover:bg-d-hover ${t === tab ? 'font-semibold' : ''}`}>
              {t}
              {t === tab && <span className="absolute right-3 bottom-0.5 left-3 h-[3px] rounded-full bg-d-accent" />}
            </button>
          ))}
        </div>
        <div className="mx-2 mb-2 flex h-[96px] items-stretch overflow-x-auto rounded-[4px] bg-white px-1 shadow-[0_0_2px_rgba(0,0,0,.12),0_1px_2px_rgba(0,0,0,.08)]">
          {groups.map((g) => (
            <div key={g.label} className="flex shrink-0 flex-col border-r border-d-border px-1 last:border-r-0">
              <div className="flex flex-1 items-start gap-0.5 pt-1">
                {g.buttons.map((b) => (
                  <button key={b.label} onClick={b.onClick} className="flex h-[74px] w-[64px] flex-col items-center rounded-[3px] px-1 pt-1.5 text-center hover:bg-d-hover" aria-label={b.label}>
                    <RibbonGlyph name={b.icon} />
                    <span className="mt-1 text-[11.5px] leading-[13px]">
                      {b.label}
                      {b.dropdown && <span className="ml-0.5 text-[8px]">▾</span>}
                    </span>
                  </button>
                ))}
              </div>
              <div className="pb-1 text-center text-[11px] text-d-sub">{g.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="w-48 shrink-0 border-r border-d-border bg-white">
          <div className="px-3 py-2 text-[12px] font-semibold">Queries [{RAW_SOURCES.length}]</div>
          {RAW_SOURCES.map((s) => (
            <button
              key={s.name}
              onClick={() => s.name !== source && onToast(`This exercise edits the "${source}" query. Other queries can be used with Merge or Append.`)}
              className={`flex w-full items-center gap-2 px-3 py-1 text-left text-[12px] ${s.name === source ? 'bg-d-pressed font-semibold' : 'hover:bg-d-hover'}`}
            >
              <Ico.table className="h-3.5 w-3.5 shrink-0 text-d-sub" />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-d-border px-2 font-mono text-[12px]" data-testid="pq-formula">
            <span className="font-serif text-d-sub italic">fx</span>
            <span className="truncate">{stepM(steps, at - 1, raw.file)}</span>
          </div>
          {error ? (
            <div className="m-4 rounded-[2px] border border-[#a4262c] bg-[#fde7e9] p-3 text-[12px] text-[#a4262c]" data-testid="pq-error">
              <div className="font-semibold">Expression.Error</div>
              {error}
              <div className="mt-1 text-d-sub">Select an earlier step or delete this one in Applied Steps.</div>
            </div>
          ) : (
            table && (
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="border-collapse text-[12px]" data-testid="pq-grid">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr>
                      <th className="w-8 border-r border-b border-d-border bg-d-ribbon" />
                      {table.columns.map((c) => {
                        const sel = selCols.includes(c.name);
                        return (
                          <th
                            key={c.name}
                            data-col={c.name}
                            data-selected={sel || undefined}
                            onClick={(e) => setSelCols(e.ctrlKey || e.metaKey ? (sel ? selCols.filter((x) => x !== c.name) : [...selCols, c.name]) : [c.name])}
                            onDoubleClick={() => setDialog({ kind: 'rename', column: c.name })}
                            className={`h-8 min-w-[120px] cursor-pointer border-r border-b border-d-border px-1.5 text-left font-semibold whitespace-nowrap ${sel ? 'bg-[#c7e0f4]' : 'hover:bg-d-hover'}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <button
                                title={`Data type: ${TYPE_LABEL[c.type]}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  typeMenu([c.name], r.left, r.bottom + 2);
                                }}
                                className="rounded px-0.5 font-mono text-[9px] leading-[9px] whitespace-pre text-d-sub hover:bg-d-pressed"
                              >
                                {TYPE_ICON[c.type]}
                              </button>
                              <span className="flex-1">{c.name}</span>
                              <button
                                aria-label={`${c.name} menu`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  headerMenu(c.name, r.left, r.bottom + 2);
                                }}
                                className="rounded p-0.5 text-d-sub hover:bg-d-pressed"
                              >
                                <Ico.chevronDown className="h-3 w-3" />
                              </button>
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.slice(0, 200).map((r, i) => (
                      <tr key={i}>
                        <td className="border-r border-b border-d-border bg-d-ribbon px-1.5 text-right text-d-sub">{i + 1}</td>
                        {r.map((v, j) => (
                          <td
                            key={j}
                            className={`h-[22px] border-r border-b border-[#f3f2f1] px-1.5 whitespace-pre ${['int', 'decimal'].includes(table.columns[j].type) ? 'text-right' : ''} ${selCols.includes(table.columns[j].name) ? 'bg-[#eff6fc]' : ''}`}
                          >
                            {fmt(v, table.columns[j].type)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          <div className="flex h-6 shrink-0 items-center gap-4 border-t border-d-border bg-d-ribbon px-3 text-[11px] text-d-sub" data-testid="pq-status">
            {table ? `${table.columns.length} COLUMNS, ${table.rows.length} ROWS` : 'ERROR'}
            <span>Column profiling based on top 1000 rows</span>
          </div>
        </main>
        <aside className="w-60 shrink-0 border-l border-d-border bg-white">
          <div className="px-3 pt-2 text-[14px] font-semibold">Query Settings</div>
          <div className="px-3 pt-2 text-[11px] font-semibold text-d-sub uppercase">Properties</div>
          <div className="px-3 pt-1 text-[11px] text-d-sub">Name</div>
          <div className="mx-3 mt-0.5 rounded-[2px] border border-d-strong px-2 py-1 text-[12px]">{source}</div>
          <div className="px-3 pt-3 text-[11px] font-semibold text-d-sub uppercase">Applied Steps</div>
          <ul className="mt-1" data-testid="pq-steps">
            {['Source', ...names].map((n, i) => (
              <li
                key={n + i}
                data-pq-step={i}
                onClick={() => setSelStep(i)}
                className={`group flex cursor-pointer items-center gap-1.5 px-3 py-1 text-[12px] ${i === at ? 'bg-d-pressed font-semibold' : 'hover:bg-d-hover'}`}
              >
                {i > 0 && (
                  <button
                    title="Delete step"
                    aria-label={`Delete ${n}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSteps(steps.filter((_, j) => j !== i - 1));
                      setSelStep(Math.min(i - 1, steps.length - 1));
                    }}
                    className="text-d-sub hover:text-[#a4262c]"
                  >
                    <Ico.close className="h-3 w-3" />
                  </button>
                )}
                <span className={i === 0 ? 'pl-[18px]' : ''}>{n}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      {menu && <Menu {...menu} onClose={() => setMenu(null)} />}
      {dialog && table && (
        <StepDialog
          dialog={dialog}
          table={table}
          source={source}
          onCancel={() => setDialog(null)}
          onOk={(s) => {
            add(s);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------- dialogs ----------------

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-[12px]">
      <span className="mb-1 block text-d-sub">{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'h-8 w-full rounded-[2px] border border-d-strong px-2 text-[12px] outline-none focus:border-d-accent bg-white';

function StepDialog({ dialog, table, source, onOk, onCancel }: { dialog: Dialog; table: QTable; source: string; onOk: (s: Step) => void; onCancel: () => void }) {
  const cols = table.columns.map((c) => c.name);
  const others = RAW_SOURCES.filter((s) => s.name !== source);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [d, setD] = useState('');
  const [op, setOp] = useState<GroupOp>('sum');
  const [join, setJoin] = useState<JoinKind>('left');
  const [cond, setCond] = useState<'equals' | 'greaterThan' | 'lessThan' | 'contains'>('equals');
  const [e1, setE1] = useState('');
  const [e2, setE2] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  let title = '';
  let body: ReactNode = null;
  let make: () => Step | string = () => 'Not supported';
  switch (dialog.kind) {
    case 'rename':
      title = 'Rename column';
      body = (
        <Field label={`New name for "${dialog.column}"`}>
          <input autoFocus aria-label="New name" className={inputCls} value={a} placeholder={dialog.column} onChange={(e) => setA(e.target.value)} />
        </Field>
      );
      make = () => (a.trim() ? { op: 'rename', from: dialog.column, to: a.trim() } : 'Enter a name.');
      break;
    case 'replace':
      title = 'Replace Values';
      body = (
        <>
          <p className="text-[12px] text-d-sub">Replace one value with another in the selected columns.</p>
          <Field label="Value To Find">
            <input autoFocus aria-label="Value To Find" className={inputCls} value={a} onChange={(e) => setA(e.target.value)} />
          </Field>
          <Field label="Replace With">
            <input aria-label="Replace With" className={inputCls} value={b} onChange={(e) => setB(e.target.value)} />
          </Field>
        </>
      );
      make = () => (a ? { op: 'replaceValues', columns: dialog.columns, find: a, replace: b } : 'Enter the value to find.');
      break;
    case 'split':
      title = 'Split Column by Delimiter';
      body = (
        <>
          <p className="text-[12px] text-d-sub">Specify the delimiter used to split the text column "{dialog.column}".</p>
          <Field label="Custom delimiter">
            <input autoFocus aria-label="Delimiter" className={inputCls} value={a} onChange={(e) => setA(e.target.value)} placeholder="e.g. -" />
          </Field>
          <p className="text-[12px] text-d-sub">Split at: Each occurrence of the delimiter</p>
        </>
      );
      make = () => (a ? { op: 'split', column: dialog.column, delimiter: a } : 'Enter a delimiter.');
      break;
    case 'filter':
      title = 'Filter Rows';
      body = (
        <>
          <p className="text-[12px] text-d-sub">
            Keep rows where '{dialog.column}' {dialog.cond === 'equals' ? 'equals' : dialog.cond === 'notEquals' ? 'does not equal' : dialog.cond === 'greaterThan' ? 'is greater than' : 'contains'}
          </p>
          <Field label="Value">
            <input autoFocus aria-label="Filter value" className={inputCls} value={a} onChange={(e) => setA(e.target.value)} />
          </Field>
        </>
      );
      make = () => {
        const t = table.columns.find((x) => x.name === dialog.column)?.type;
        const value: Scalar = t === 'int' || t === 'decimal' ? Number(a) : a;
        return { op: 'filterRows', column: dialog.column, cond: dialog.cond, value };
      };
      break;
    case 'groupBy':
      title = 'Group By';
      body = (
        <>
          <p className="text-[12px] text-d-sub">Specify the column to group by and the desired output.</p>
          <Field label="Group by">
            <select aria-label="Group by column" className={inputCls} value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">Select a column</option>
              {cols.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="New column name">
              <input aria-label="New column name" className={inputCls} value={b} onChange={(e) => setB(e.target.value)} placeholder="Count" />
            </Field>
            <Field label="Operation">
              <select aria-label="Operation" className={inputCls} value={op} onChange={(e) => setOp(e.target.value as GroupOp)}>
                <option value="sum">Sum</option>
                <option value="count">Count Rows</option>
                <option value="avg">Average</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
              </select>
            </Field>
            <Field label="Column">
              <select aria-label="Aggregate column" className={inputCls} value={c} disabled={op === 'count'} onChange={(e) => setC(e.target.value)}>
                <option value="">—</option>
                {cols.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="2nd column name (optional)">
              <input aria-label="Second column name" className={inputCls} value={d} onChange={(e) => setD(e.target.value)} placeholder="Count" />
            </Field>
            <Field label="Operation">
              <div className="flex h-8 items-center text-[12px] text-d-sub">Count Rows</div>
            </Field>
          </div>
        </>
      );
      make = () => {
        if (!a) return 'Select the column to group by.';
        if (op !== 'count' && !c) return 'Select the column to aggregate.';
        const aggs = [{ name: b.trim() || (op === 'count' ? 'Count' : op[0].toUpperCase() + op.slice(1)), op, column: op === 'count' ? undefined : c }];
        if (d.trim()) aggs.push({ name: d.trim(), op: 'count' as GroupOp, column: undefined });
        return { op: 'groupBy', by: [a], aggs };
      };
      break;
    case 'merge': {
      title = 'Merge';
      const other = others.find((x) => x.name === b);
      body = (
        <>
          <p className="text-[12px] text-d-sub">Select a table and matching columns to create a merged table.</p>
          <Field label={`${source}: matching column`}>
            <select aria-label="Left key" className={inputCls} value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">Select a column</option>
              {cols.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Merge with">
            <select
              aria-label="Merge with"
              className={inputCls}
              value={b}
              onChange={(e) => {
                setB(e.target.value);
                setC('');
                setPicked([]);
              }}
            >
              <option value="">Select a query</option>
              {others.map((x) => (
                <option key={x.name}>{x.name}</option>
              ))}
            </select>
          </Field>
          {other && (
            <>
              <Field label={`${other.name}: matching column`}>
                <select aria-label="Right key" className={inputCls} value={c} onChange={(e) => setC(e.target.value)}>
                  <option value="">Select a column</option>
                  {other.table.columns.map((x) => (
                    <option key={x.name}>{x.name}</option>
                  ))}
                </select>
              </Field>
              <div className="text-[12px]">
                <div className="mb-1 text-d-sub">Expand columns</div>
                {other.table.columns
                  .filter((x) => x.name !== c)
                  .map((x) => (
                    <label key={x.name} className="mr-3 inline-flex items-center gap-1.5">
                      <input type="checkbox" checked={picked.includes(x.name)} onChange={() => setPicked(picked.includes(x.name) ? picked.filter((p) => p !== x.name) : [...picked, x.name])} />
                      {x.name}
                    </label>
                  ))}
              </div>
            </>
          )}
          <Field label="Join Kind">
            <select aria-label="Join Kind" className={inputCls} value={join} onChange={(e) => setJoin(e.target.value as JoinKind)}>
              <option value="left">Left Outer (all from first, matching from second)</option>
              <option value="inner">Inner (only matching rows)</option>
              <option value="leftAnti">Left Anti (rows only in first)</option>
            </select>
          </Field>
        </>
      );
      make = () =>
        a && b && c && (picked.length || join === 'leftAnti')
          ? { op: 'merge', with: b, leftKey: a, rightKey: c, expand: join === 'leftAnti' ? [] : picked, kind: join }
          : 'Choose both matching columns, the second query and at least one column to expand.';
      break;
    }
    case 'append':
      title = 'Append';
      body = (
        <>
          <p className="text-[12px] text-d-sub">Concatenate rows from another table into the current table.</p>
          <Field label="Table to append">
            <select aria-label="Table to append" className={inputCls} value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">Select a query</option>
              {others.map((x) => (
                <option key={x.name}>{x.name}</option>
              ))}
            </select>
          </Field>
        </>
      );
      make = () => (a ? { op: 'append', with: a } : 'Select the table to append.');
      break;
    case 'conditional': {
      title = 'Add Conditional Column';
      const typed = (v: string): Scalar => (v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : v);
      body = (
        <>
          <Field label="New column name">
            <input autoFocus aria-label="Conditional column name" className={inputCls} value={a} onChange={(e) => setA(e.target.value)} placeholder="Custom" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="If column">
              <select aria-label="If column" className={inputCls} value={b} onChange={(e) => setB(e.target.value)}>
                <option value="">Select</option>
                {cols.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Operator">
              <select aria-label="Operator" className={inputCls} value={cond} onChange={(e) => setCond(e.target.value as typeof cond)}>
                <option value="equals">equals</option>
                <option value="greaterThan">is greater than</option>
                <option value="lessThan">is less than</option>
                <option value="contains">contains</option>
              </select>
            </Field>
            <Field label="Value">
              <input aria-label="Condition value" className={inputCls} value={c} onChange={(e) => setC(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Then (output)">
              <input aria-label="Then output" className={inputCls} value={e1} onChange={(e) => setE1(e.target.value)} />
            </Field>
            <Field label="Else">
              <input aria-label="Else output" className={inputCls} value={e2} onChange={(e) => setE2(e.target.value)} />
            </Field>
          </div>
        </>
      );
      make = () => (b && c !== '' ? { op: 'conditionalColumn', name: a.trim() || 'Custom', column: b, cond, value: cond === 'contains' || cond === 'equals' ? typed(c) : Number(c), then: typed(e1), else: typed(e2) } : 'Choose a column and a value.');
      break;
    }
    case 'pivot':
      title = 'Pivot Column';
      body = (
        <>
          <p className="text-[12px] text-d-sub">Use the names in column "{dialog.column}" to create new columns.</p>
          <Field label="Values Column">
            <select aria-label="Values Column" className={inputCls} value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">Select a column</option>
              {cols
                .filter((x) => x !== dialog.column)
                .map((x) => (
                  <option key={x}>{x}</option>
                ))}
            </select>
          </Field>
          <Field label="Aggregate Value Function">
            <select aria-label="Aggregate Value Function" className={inputCls} value={b || 'sum'} onChange={(e) => setB(e.target.value)}>
              <option value="sum">Sum</option>
              <option value="count">Count (All)</option>
            </select>
          </Field>
        </>
      );
      make = () => (a ? { op: 'pivot', column: dialog.column, values: a, agg: b === 'count' ? 'count' : 'sum' } : 'Select the values column.');
      break;
    case 'keepTop':
      title = 'Keep Top Rows';
      body = (
        <Field label="Number of rows">
          <input autoFocus type="number" min={1} aria-label="Number of rows" className={inputCls} value={a} onChange={(e) => setA(e.target.value)} />
        </Field>
      );
      make = () => (Number(a) > 0 ? { op: 'keepTop', n: Math.floor(Number(a)) } : 'Enter the number of rows to keep.');
      break;
    case 'extract':
      title = dialog.mode === 'before' ? 'Text Before Delimiter' : 'Text After Delimiter';
      body = (
        <>
          <p className="text-[12px] text-d-sub">Keep the text {dialog.mode} the delimiter in "{dialog.column}".</p>
          <Field label="Delimiter">
            <input autoFocus aria-label="Extract delimiter" className={inputCls} value={a} onChange={(e) => setA(e.target.value)} />
          </Field>
        </>
      );
      make = () => (a ? { op: 'extractText', column: dialog.column, mode: dialog.mode, delimiter: a } : 'Enter a delimiter.');
      break;
    case 'custom':
      title = 'Custom Column';
      body = (
        <>
          <Field label="New column name">
            <input autoFocus aria-label="Custom column name" className={inputCls} value={a} onChange={(e) => setA(e.target.value)} placeholder="Custom" />
          </Field>
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <Field label="Custom column formula">
              <textarea aria-label="Custom column formula" className={`${inputCls} h-24 py-1 font-mono`} value={b} onChange={(e) => setB(e.target.value)} placeholder="= [Qty] * [Unit Cost]" />
            </Field>
            <div className="text-[12px]">
              <div className="mb-1 text-d-sub">Available columns</div>
              <div className="max-h-24 overflow-y-auto rounded-[2px] border border-d-border">
                {cols.map((x) => (
                  <button key={x} type="button" onClick={() => setB(`${b}[${x}]`)} className="block w-full px-2 py-0.5 text-left hover:bg-d-hover">
                    {x}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      );
      make = () => (b.trim() ? { op: 'customColumn', name: a.trim() || 'Custom', formula: b } : 'Enter a formula.');
      break;
  }
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/20" onMouseDown={onCancel}>
      <div role="dialog" aria-label={title} className="w-[460px] rounded-[4px] bg-white p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-[16px] font-semibold">{title}</h3>
        <div className="space-y-3">{body}</div>
        {err && <div className="mt-3 text-[12px] text-[#a4262c]">{err}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => {
              const r = make();
              if (typeof r === 'string') setErr(r);
              else onOk(r);
            }}
            className="h-8 rounded-[2px] bg-d-accent px-5 text-[12px] font-semibold text-white hover:bg-[#115ea3]"
          >
            OK
          </button>
          <button onClick={onCancel} className="h-8 rounded-[2px] border border-d-strong px-5 text-[12px] hover:bg-d-hover">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
