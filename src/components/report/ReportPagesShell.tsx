import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Engine } from '../../engine/engine';
import type { Measure, Scalar } from '../../engine/model';
import type { FieldFilter, FieldRef } from '../../engine/visual';
import { computeVisual, effectiveSpec, emptySpec, formatKey } from '../../engine/visual';
import type { DragItem } from '../../lib/workspace';
import { DRAG_MIME } from '../../lib/workspace';
import {
  addPage,
  applyBookmark,
  captureBookmark,
  deletePage,
  drillTargets,
  effectiveVisualSpec,
  fieldKey,
  findVisual,
  interactionOf,
  isSyncedOn,
  newId,
  pageById,
  setInteraction,
  setSlicerSyncedOn,
  setSlicerValues,
  setSlicerVisibleOn,
  updatePage,
  updateVisual,
} from '../../report/report';
import type { CrossSelection, Interaction, ReportPage, ReportState, ReportVisual } from '../../report/report';
import { Chart } from '../Chart';
import { Menu, Pane, Switch, readDrag, useToast } from '../desktop/common';
import type { MenuItem } from '../desktop/common';
import { DataPane } from '../desktop/DataPane';
import { Ico } from '../desktop/icons';
import { StatusBar } from '../desktop/ReportView';
import { Ribbon, TitleBar } from '../desktop/Ribbon';
import type { RibbonAction } from '../desktop/Ribbon';

interface Props {
  base: Engine;
  title: string;
  report: ReportState;
  given: Measure[];
  onChange: (r: ReportState) => void;
}

interface DrillState {
  fromPageId: string;
  pageId: string;
  filters: FieldFilter[];
}

const noop = () => {};

/** The report editor for multi-page exercises: pages, interactions, drillthrough, bookmarks, buttons and synced slicers. */
export function ReportPagesShell({ base, title, report, given, onChange }: Props) {
  const engine = useMemo(() => base.withMeasures(given), [base, given]);
  const [pageId, setPageId] = useState(report.pages[0].id);
  const page = pageById(report, pageId) ?? report.pages[0];
  const [selected, setSelected] = useState<string | null>(null);
  const [cross, setCross] = useState<CrossSelection | null>(null);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [editInteractions, setEditInteractions] = useState(false);
  const [panes, setPanes] = useState({ viz: true, data: true, bookmarks: false, selection: false, sync: false });
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [renamingPage, setRenamingPage] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const sel = selected ? findVisual(report, selected) : null;
  const selVisual = sel && sel.page.id === page.id ? sel.visual : null;

  const goTo = (id: string, keepDrill = false) => {
    setPageId(id);
    setSelected(null);
    setCross(null);
    if (!keepDrill) setDrill(null);
  };

  const onRibbon = (a: RibbonAction, label: string) => {
    switch (a) {
      case 'new-page': {
        const { report: next, page: p } = addPage(report);
        onChange(next);
        goTo(p.id);
        return;
      }
      case 'toggle-viz':
        return setPanes({ ...panes, viz: !panes.viz });
      case 'toggle-data':
        return setPanes({ ...panes, data: !panes.data });
      case 'toggle-bookmarks':
        return setPanes({ ...panes, bookmarks: !panes.bookmarks, data: panes.bookmarks ? panes.data : false, viz: !panes.bookmarks && (panes.selection || panes.sync) ? false : panes.viz });
      case 'toggle-selection':
        return setPanes({ ...panes, selection: !panes.selection, data: panes.selection ? panes.data : false, viz: !panes.selection && (panes.bookmarks || panes.sync) ? false : panes.viz });
      case 'toggle-sync':
        return setPanes({ ...panes, sync: !panes.sync, data: panes.sync ? panes.data : false, viz: !panes.sync && (panes.bookmarks || panes.selection) ? false : panes.viz });
      case 'edit-interactions':
        if (!selVisual) return showToast('Select a visual first, then turn on Edit interactions.');
        return setEditInteractions(!editInteractions);
      case 'insert-button':
      case 'insert-back-button': {
        const back = a === 'insert-back-button';
        const b: ReportVisual = { id: newId('button'), title: back ? 'Back button' : 'Button', kind: 'button', x: 4, y: 84, w: 16, h: 9, label: back ? 'Back' : 'Button', action: back ? { type: 'back' } : undefined };
        onChange(updatePage(report, page.id, (p) => ({ ...p, visuals: [...p.visuals, b] })));
        setSelected(b.id);
        return showToast(back ? 'Back button added. Ctrl + click it to go back.' : 'Button added. Set its action in Format → Action.');
      }
      default:
        return showToast(`"${label}" is not available in this exercise.`);
    }
  };

  const runButton = (v: ReportVisual) => {
    const a = v.action;
    if (!a) return showToast('This button has no action yet. Set one in Format → Action.');
    if (a.type === 'back') {
      if (drill && drill.pageId === page.id) return goTo(drill.fromPageId);
      return showToast('Back works after you drill through to this page.');
    }
    if (a.type === 'page') return pageById(report, a.pageId) ? goTo(a.pageId) : showToast('That page no longer exists.');
    const b = report.bookmarks.find((x) => x.id === a.bookmarkId);
    if (!b) return showToast('That bookmark no longer exists.');
    onChange(applyBookmark(report, b));
    goTo(b.pageId);
  };

  const pageDrill = drill && drill.pageId === page.id ? drill.filters : [];
  const visible = page.visuals.filter((v) => !report.hidden.includes(v.id));

  return (
    <div className="relative flex h-full min-w-[1100px] flex-col bg-d-canvas font-[Segoe_UI,system-ui,sans-serif] text-d-text" data-testid="pages-shell">
      <TitleBar title={title} canUndo={false} canRedo={false} onUndo={noop} onRedo={noop} onSave={() => showToast('Your work is saved automatically.')} />
      <Ribbon
        onAction={onRibbon}
        panes={{ filters: false, viz: panes.viz, data: panes.data }}
        onFile={() => showToast('The File menu is not available in the exercises.')}
        pagesMode={{ editInteractions, bookmarks: panes.bookmarks, selection: panes.selection, sync: panes.sync }}
      />
      <div className="flex min-h-0 flex-1">
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-d-border bg-white pt-2">
          <span className="flex h-9 w-9 items-center justify-center rounded border-l-2 border-d-accent text-d-text" title="Report view">
            <Ico.report className="h-4 w-4" />
          </span>
        </div>

        {/* Canvas */}
        <div
          className="relative flex min-w-0 flex-1 flex-col"
          onClick={() => {
            setSelected(null);
            setEditInteractions(false);
          }}
        >
          {editInteractions && selVisual && (
            <div className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded bg-[#323130] px-3 py-1.5 text-[12px] text-white shadow" onClick={(e) => e.stopPropagation()}>
              Edit interactions: choose how each visual reacts when you select data in "{selVisual.title}".{' '}
              <button className="ml-2 underline" onClick={() => setEditInteractions(false)}>
                Done
              </button>
            </div>
          )}
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-6">
            <div className="relative aspect-[16/9] w-full max-w-[980px] min-w-[560px] bg-white shadow-[0_1px_4px_rgba(0,0,0,.15)]" data-testid="report-page">
              {pageDrill.length > 0 && (
                <div className="absolute top-1 right-2 z-10 rounded bg-[#ebf3fc] px-2 py-0.5 text-[11px] text-[#0f6cbd]">
                  Drilled through: {pageDrill.map((f) => `${f.column} = ${formatKey(f.values[0] ?? null)}`).join(', ')}
                </div>
              )}
              {visible.map((v) => (
                <VisualFrame
                  key={v.id}
                  v={v}
                  selected={selected === v.id}
                  onSelect={() => {
                    setSelected(v.id);
                    if (editInteractions && selected !== v.id) setEditInteractions(false);
                  }}
                  interactionBar={
                    editInteractions && selVisual && selVisual.id !== v.id && v.kind !== 'button' ? (
                      <InteractionBar
                        value={interactionOf(report, selVisual.id, v.id)}
                        allowHighlight={v.kind === 'visual' && !!v.spec && !['card', 'multiCard', 'table', 'matrix'].includes(v.spec.type)}
                        onChange={(mode) => onChange(setInteraction(report, selVisual.id, v.id, mode))}
                      />
                    ) : null
                  }
                >
                  {v.kind === 'slicer' && v.field ? (
                    <SlicerList engine={engine} field={v.field} values={v.values ?? []} onChange={(vals) => onChange(setSlicerValues(report, v.id, vals))} />
                  ) : v.kind === 'button' ? (
                    <button
                      className="h-full w-full rounded-md border border-[#c8c6c4] bg-[#f3f2f1] text-[13px] font-semibold hover:bg-[#edebe9]"
                      title="Ctrl + click to use the button"
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          e.stopPropagation();
                          runButton(v);
                        }
                      }}
                      data-testid={`button-${v.id}`}
                    >
                      {v.action?.type === 'back' ? '← ' : ''}
                      {v.label}
                    </button>
                  ) : (
                    <VisualBody
                      engine={engine}
                      page={page}
                      v={v}
                      report={report}
                      cross={cross}
                      drill={pageDrill}
                      onCross={(c) => setCross(c && cross && cross.sourceId === c.sourceId && cross.value === c.value ? null : c)}
                      onContext={(field, value, x, y) => {
                        const targets = drillTargets(report, field, page.id);
                        setMenu({
                          x,
                          y,
                          items: targets.length
                            ? targets.map((t) => ({
                                label: `Drill through → ${t.name}`,
                                onClick: () => {
                                  setDrill({ fromPageId: page.id, pageId: t.id, filters: [{ ...field, values: [value] }] });
                                  goTo(t.id, true);
                                },
                              }))
                            : [{ label: 'Drill through (no page uses this field)', disabled: true }],
                        });
                      }}
                    />
                  )}
                </VisualFrame>
              ))}
              {visible.length === 0 && <div className="flex h-full items-center justify-center text-[13px] text-d-faint">This page is empty.</div>}
            </div>
          </div>
          <PageTabs
            report={report}
            current={page.id}
            renaming={renamingPage}
            onSelect={(id) => goTo(id)}
            onAdd={() => onRibbon('new-page', 'New page')}
            onRename={(id, name) => {
              setRenamingPage(null);
              if (name.trim()) onChange(updatePage(report, id, (p) => ({ ...p, name: name.trim() })));
            }}
            onStartRename={setRenamingPage}
            onMenu={(id, x, y) => {
              const p = pageById(report, id)!;
              setMenu({
                x,
                y,
                items: [
                  { label: 'Rename page', onClick: () => setRenamingPage(id) },
                  { label: p.hidden ? 'Show page' : 'Hide page', onClick: () => onChange(updatePage(report, id, (x) => ({ ...x, hidden: !x.hidden }))) },
                  {
                    label: 'Delete page',
                    disabled: report.pages.length <= 1,
                    onClick: () => {
                      onChange(deletePage(report, id));
                      if (id === page.id) goTo(report.pages.find((x) => x.id !== id)!.id);
                    },
                  },
                ],
              });
            }}
          />
          <StatusBar left={`Page ${report.pages.findIndex((p) => p.id === page.id) + 1} of ${report.pages.length}`} />
        </div>

        {panes.bookmarks && (
          <SidePane title="Bookmarks" onClose={() => setPanes({ ...panes, bookmarks: false })} testId="pane-bookmarks">
            <BookmarksPane
              report={report}
              onAdd={() => {
                const b = captureBookmark(report, page.id, `Bookmark ${report.bookmarks.length + 1}`);
                onChange({ ...report, bookmarks: [...report.bookmarks, b] });
              }}
              onApply={(id) => {
                const b = report.bookmarks.find((x) => x.id === id)!;
                onChange(applyBookmark(report, b));
                goTo(b.pageId);
              }}
              onRename={(id, name) => onChange({ ...report, bookmarks: report.bookmarks.map((b) => (b.id === id ? { ...b, name } : b)) })}
              onUpdate={(id) => {
                const old = report.bookmarks.find((b) => b.id === id)!;
                const fresh = captureBookmark(report, page.id, old.name);
                onChange({ ...report, bookmarks: report.bookmarks.map((b) => (b.id === id ? { ...fresh, id } : b)) });
                showToast(`Bookmark "${old.name}" updated.`);
              }}
              onDelete={(id) => onChange({ ...report, bookmarks: report.bookmarks.filter((b) => b.id !== id) })}
            />
          </SidePane>
        )}
        {panes.selection && (
          <SidePane title="Selection" onClose={() => setPanes({ ...panes, selection: false })} testId="pane-selection">
            <ul className="space-y-0.5 px-2 text-[12px]">
              {[...page.visuals].reverse().map((v) => {
                const hidden = report.hidden.includes(v.id);
                return (
                  <li key={v.id} className={`flex items-center gap-2 rounded px-2 py-1 ${selected === v.id ? 'bg-d-pressed' : 'hover:bg-d-hover'}`}>
                    <button className="min-w-0 flex-1 truncate text-left" onClick={() => setSelected(v.id)}>
                      {v.title}
                    </button>
                    <button
                      onClick={() => onChange({ ...report, hidden: hidden ? report.hidden.filter((x) => x !== v.id) : [...report.hidden, v.id] })}
                      title={hidden ? 'Show this visual' : 'Hide this visual'}
                      aria-label={`${hidden ? 'Show' : 'Hide'} ${v.title}`}
                      className={`rounded p-0.5 hover:bg-white ${hidden ? 'text-d-faint' : 'text-d-text'}`}
                    >
                      <Ico.eye className="h-3.5 w-3.5" />
                      {hidden && <span className="sr-only">hidden</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </SidePane>
        )}
        {panes.sync && (
          <SidePane title="Sync slicers" onClose={() => setPanes({ ...panes, sync: false })} testId="pane-sync">
            {selVisual?.kind === 'slicer' && selVisual.field ? (
              <div className="px-3 text-[12px]">
                <div className="mb-2 font-semibold">{selVisual.field.column}</div>
                <table className="w-full">
                  <thead>
                    <tr className="text-d-sub">
                      <th className="py-1 text-left font-normal">Page</th>
                      <th className="w-12 font-normal">Sync</th>
                      <th className="w-12 font-normal">Visible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.pages.map((p) => {
                      const visibleOn = p.visuals.some((v) => v.kind === 'slicer' && v.field && fieldKey(v.field) === fieldKey(selVisual.field!));
                      return (
                        <tr key={p.id}>
                          <td className="py-1">{p.name}</td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              aria-label={`Sync on ${p.name}`}
                              checked={isSyncedOn(report, selVisual.field, p.id)}
                              onChange={(e) => onChange(setSlicerSyncedOn(report, selVisual.id, p.id, e.target.checked))}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              aria-label={`Visible on ${p.name}`}
                              checked={visibleOn}
                              disabled={p.id === page.id}
                              onChange={(e) => onChange(setSlicerVisibleOn(report, selVisual.id, p.id, e.target.checked))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-3 text-[12px] text-d-sub">Select a slicer on the page to see where it is synced and visible.</p>
            )}
          </SidePane>
        )}

        <Pane title="Visualizations" open={panes.viz} onToggle={() => setPanes({ ...panes, viz: !panes.viz })} width={236} testId="pane-viz">
          <VizPane
            report={report}
            page={page}
            visual={selVisual}
            onPage={(fn) => onChange(updatePage(report, page.id, fn))}
            onVisual={(fn) => selVisual && onChange(updateVisual(report, selVisual.id, fn))}
            onDrillField={(f) => {
              let next = updatePage(report, page.id, (p) => ({ ...p, drillthrough: [...(p.drillthrough ?? []).filter((d) => fieldKey(d) !== fieldKey(f)), f] }));
              // Power BI adds a Back button when a page becomes a drillthrough page.
              if (!page.visuals.some((v) => v.kind === 'button' && v.action?.type === 'back')) {
                const back: ReportVisual = { id: newId('button'), title: 'Back button', kind: 'button', x: 1.5, y: 1.5, w: 10, h: 9, label: 'Back', action: { type: 'back' } };
                next = updatePage(next, page.id, (p) => ({ ...p, visuals: [...p.visuals, back] }));
              }
              onChange(next);
            }}
          />
        </Pane>
        <Pane title="Data" open={panes.data} onToggle={() => setPanes({ ...panes, data: !panes.data })} width={220} testId="pane-data">
          <DataPane
            engine={engine}
            spec={emptySpec()}
            given={given}
            measures={[]}
            onToggle={() => showToast('Drag a field onto a well in the Visualizations pane.')}
            onOpenMeasure={noop}
            onNewMeasure={noop}
            onNewColumn={noop}
            onDeleteMeasure={noop}
            onOpenColumn={noop}
            onDeleteColumn={noop}
          />
        </Pane>
      </div>
      {menu && <Menu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {toast && (
        <div role="status" className="pointer-events-none absolute bottom-10 left-1/2 z-40 -translate-x-1/2 rounded-[4px] bg-[#323130] px-4 py-2 text-[12px] text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function VisualFrame({ v, selected, onSelect, interactionBar, children }: { v: ReportVisual; selected: boolean; onSelect: () => void; interactionBar: ReactNode; children: ReactNode }) {
  return (
    <div
      className={`absolute flex flex-col bg-white p-1.5 ${selected ? 'outline outline-1 outline-[#605e5c]' : 'hover:outline hover:outline-1 hover:outline-[#c8c6c4]'}`}
      style={{ left: `${v.x}%`, top: `${v.y}%`, width: `${v.w}%`, height: `${v.h}%` }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={(e) => e.preventDefault()}
      data-testid={`visual-${v.id}`}
      aria-label={v.title}
    >
      {interactionBar}
      {v.kind !== 'button' && <div className="truncate text-[12px] font-semibold text-[#252423]">{v.title}</div>}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

const MODES: { mode: Interaction; label: string; icon: string }[] = [
  { mode: 'filter', label: 'Filter', icon: '⧩' },
  { mode: 'highlight', label: 'Highlight', icon: '▥' },
  { mode: 'none', label: 'None', icon: '⊘' },
];

function InteractionBar({ value, allowHighlight, onChange }: { value: Interaction; allowHighlight: boolean; onChange: (m: Interaction) => void }) {
  return (
    <div className="absolute -top-3 right-1 z-10 flex gap-0.5 rounded border border-d-border bg-white p-0.5 shadow" onClick={(e) => e.stopPropagation()} data-testid="interaction-bar">
      {MODES.filter((m) => allowHighlight || m.mode !== 'highlight').map((m) => (
        <button
          key={m.mode}
          title={m.label}
          aria-label={m.label}
          aria-pressed={value === m.mode}
          onClick={() => onChange(m.mode)}
          className={`flex h-5 w-6 items-center justify-center rounded text-[12px] ${value === m.mode ? 'bg-d-accent text-white' : 'text-d-sub hover:bg-d-hover'}`}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
}

function VisualBody({
  engine,
  page,
  v,
  report,
  cross,
  drill,
  onCross,
  onContext,
}: {
  engine: Engine;
  page: ReportPage;
  v: ReportVisual;
  report: ReportState;
  cross: CrossSelection | null;
  drill: FieldFilter[];
  onCross: (c: CrossSelection | null) => void;
  onContext: (field: FieldRef, value: Scalar, x: number, y: number) => void;
}) {
  const spec = effectiveVisualSpec(page, v, report, cross, drill);
  const result = useMemo(() => {
    if (!spec) return null;
    try {
      return computeVisual(engine, spec);
    } catch {
      return null;
    }
  }, [engine, spec]);
  if (!spec || !result) return <div className="flex h-full items-center justify-center text-[11px] text-d-faint">Can't display the visual.</div>;
  const field = effectiveSpec(spec).category[0];
  return (
    <Chart
      result={result}
      type={spec.type}
      format={{ ...spec.format, xTitle: false, yTitle: false }}
      compact
      onCategoryClick={field ? (keys) => onCross({ sourceId: v.id, field, value: keys[0] }) : undefined}
      onCategoryContext={field ? (keys, x, y) => onContext(field, keys[0], x, y) : undefined}
    />
  );
}

function SlicerList({ engine, field, values, onChange }: { engine: Engine; field: FieldRef; values: Scalar[]; onChange: (v: Scalar[]) => void }) {
  const all = useMemo(() => engine.distinct(field.table, field.column, engine.table(field.table).rows), [engine, field]);
  return (
    <ul className="h-full overflow-auto text-[12px]" onClick={(e) => e.stopPropagation()}>
      {all.map((x) => {
        const on = values.some((y) => y === x);
        return (
          <li key={String(x)}>
            <label className="flex cursor-pointer items-center gap-2 py-0.5">
              <input type="checkbox" checked={on} onChange={() => onChange(on ? values.filter((y) => y !== x) : [...values, x])} />
              {formatKey(x)}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function PageTabs({
  report,
  current,
  renaming,
  onSelect,
  onAdd,
  onRename,
  onStartRename,
  onMenu,
}: {
  report: ReportState;
  current: string;
  renaming: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onStartRename: (id: string) => void;
  onMenu: (id: string, x: number, y: number) => void;
}) {
  return (
    <div className="flex h-8 shrink-0 items-end gap-1 overflow-x-auto border-t border-d-border bg-d-ribbon px-2" data-testid="page-tabs" onClick={(e) => e.stopPropagation()}>
      {report.pages.map((p) =>
        renaming === p.id ? (
          <input
            key={p.id}
            autoFocus
            defaultValue={p.name}
            aria-label="Page name"
            className="mb-0.5 w-32 rounded-t-[4px] border border-d-accent bg-white px-2 py-0.5 text-[12px]"
            onBlur={(e) => onRename(p.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRename(p.id, (e.target as HTMLInputElement).value);
              if (e.key === 'Escape') onRename(p.id, p.name);
            }}
          />
        ) : (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            onDoubleClick={() => onStartRename(p.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              onMenu(p.id, e.clientX, e.clientY);
            }}
            className={`relative flex items-center gap-1 rounded-t-[4px] border border-b-0 px-4 py-1 text-[12px] ${p.id === current ? 'border-d-border bg-white font-semibold' : 'border-transparent text-d-sub hover:bg-d-hover'}`}
            title={p.hidden ? `${p.name} (hidden page)` : p.name}
          >
            {p.hidden && <span className="text-[10px] text-d-faint">⊘</span>}
            {p.tooltip && <span className="text-[10px] text-d-faint" title="Tooltip page">💬</span>}
            {p.name}
            {p.id === current && <span className="absolute right-2 bottom-0 left-2 h-[2px] rounded bg-d-accent" />}
          </button>
        ),
      )}
      <button onClick={onAdd} className="mb-1 rounded p-1 text-d-sub hover:bg-d-hover" title="New page" aria-label="New page">
        <Ico.plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SidePane({ title, onClose, testId, children }: { title: string; onClose: () => void; testId: string; children: ReactNode }) {
  return (
    <div className="flex w-[210px] shrink-0 flex-col border-l border-d-border bg-white" data-testid={testId}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
        <span className="text-[14px] font-semibold">{title}</span>
        <button onClick={onClose} className="rounded p-0.5 text-d-sub hover:bg-d-hover" aria-label={`Close ${title}`}>
          <Ico.close className="h-3 w-3" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-3">{children}</div>
    </div>
  );
}

function BookmarksPane({
  report,
  onAdd,
  onApply,
  onRename,
  onUpdate,
  onDelete,
}: {
  report: ReportState;
  onAdd: () => void;
  onApply: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onUpdate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  return (
    <div className="px-2 text-[12px]">
      <button onClick={onAdd} className="mb-2 flex items-center gap-1 rounded px-2 py-1 hover:bg-d-hover">
        <Ico.plus className="h-3 w-3" /> Add
      </button>
      {report.bookmarks.length === 0 && <p className="px-2 text-d-sub">No bookmarks yet. Set up the page, then click Add.</p>}
      <ul className="space-y-0.5">
        {report.bookmarks.map((b) => (
          <li key={b.id} className="group flex items-center gap-1 rounded px-2 py-1 hover:bg-d-hover">
            {renaming === b.id ? (
              <input
                autoFocus
                defaultValue={b.name}
                aria-label="Bookmark name"
                className="min-w-0 flex-1 rounded border border-d-accent px-1"
                onBlur={(e) => {
                  setRenaming(null);
                  if (e.target.value.trim()) onRename(b.id, e.target.value.trim());
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            ) : (
              <button className="min-w-0 flex-1 truncate text-left" onClick={() => onApply(b.id)} onDoubleClick={() => setRenaming(b.id)} title="Click to show, double-click to rename">
                {b.name}
              </button>
            )}
            <button onClick={(e) => setMenu({ x: e.clientX, y: e.clientY, id: b.id })} className="rounded px-1 text-d-sub hover:bg-white" aria-label={`More options for ${b.name}`}>
              ⋯
            </button>
          </li>
        ))}
      </ul>
      {menu && (
        <Menu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Update', onClick: () => onUpdate(menu.id) },
            { label: 'Rename', onClick: () => setRenaming(menu.id) },
            { label: 'Delete', onClick: () => onDelete(menu.id) },
          ]}
        />
      )}
    </div>
  );
}

function VizPane({
  report,
  page,
  visual,
  onPage,
  onVisual,
  onDrillField,
}: {
  report: ReportState;
  page: ReportPage;
  visual: ReportVisual | null;
  onPage: (fn: (p: ReportPage) => ReportPage) => void;
  onVisual: (fn: (v: ReportVisual) => ReportVisual) => void;
  onDrillField: (f: FieldRef) => void;
}) {
  const [tab, setTab] = useState<'build' | 'format'>('build');
  const [over, setOver] = useState(false);
  const tooltipPages = report.pages.filter((p) => p.tooltip && p.id !== page.id);
  const label = 'text-[12px] font-semibold';
  const select = 'mt-0.5 h-7 w-full rounded-[2px] border border-d-strong bg-white px-1 text-[12px]';
  return (
    <div className="px-3 pb-4 text-[12px]">
      <div className="mb-3 flex gap-1 border-b border-d-border">
        {(['build', 'format'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-2 pb-1.5 ${tab === t ? 'border-b-2 border-d-accent font-semibold' : 'text-d-sub'}`}>
            {t === 'build' ? 'Build' : 'Format'} {visual ? 'visual' : 'page'}
          </button>
        ))}
      </div>

      {tab === 'build' && !visual && (
        <div data-well="Drill through">
          <div className={label}>Drill through</div>
          <p className="mb-1 text-[11px] text-d-sub">Fields that other pages can drill through to this page with.</p>
          <div
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(DRAG_MIME)) {
                e.preventDefault();
                setOver(true);
              }
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              const item: DragItem | null = readDrag(e);
              if (item?.kind === 'column') onDrillField({ table: item.table, column: item.column });
            }}
            className={`space-y-1 rounded-[2px] ${over ? 'bg-[#deecf9] outline outline-1 outline-d-accent' : ''}`}
          >
            {(page.drillthrough ?? []).map((d) => (
              <div key={fieldKey(d)} className="flex h-[26px] items-center justify-between rounded-[2px] border border-d-strong bg-white px-2">
                <span className="truncate">{d.column}</span>
                <button onClick={() => onPage((p) => ({ ...p, drillthrough: (p.drillthrough ?? []).filter((x) => fieldKey(x) !== fieldKey(d)) }))} aria-label={`Remove ${d.column}`} className="text-d-sub">
                  ×
                </button>
              </div>
            ))}
            <div className="flex h-[26px] items-center rounded-[2px] border border-dashed border-d-strong px-2 text-d-faint">Add drill-through fields here</div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span>Keep all filters</span>
            <Switch checked onChange={noop} label="Keep all filters" />
          </div>
        </div>
      )}
      {tab === 'build' && visual && (
        <p className="text-d-sub">
          The fields of <b className="text-d-text">{visual.title}</b> are already set. In this chapter you work with pages, interactions and navigation.
        </p>
      )}

      {tab === 'format' && !visual && (
        <div className="space-y-3">
          <div className={label}>Page information</div>
          <label className="block">
            Name
            <input value={page.name} onChange={(e) => onPage((p) => ({ ...p, name: e.target.value }))} className={select} aria-label="Page name field" />
          </label>
          <div className="flex items-center justify-between">
            <span>Allow use as tooltip</span>
            <Switch checked={!!page.tooltip} onChange={(v) => onPage((p) => ({ ...p, tooltip: v }))} label="Allow use as tooltip" />
          </div>
        </div>
      )}
      {tab === 'format' && visual?.kind === 'visual' && (
        <div className="space-y-2">
          <div className={label}>Tooltips</div>
          <label className="block">
            Type
            <select
              className={select}
              aria-label="Tooltip type"
              value={visual.tooltipPage ? 'page' : 'default'}
              onChange={(e) => onVisual((v) => ({ ...v, tooltipPage: e.target.value === 'page' ? tooltipPages[0]?.id : undefined }))}
            >
              <option value="default">Default</option>
              <option value="page">Report page</option>
            </select>
          </label>
          {visual.tooltipPage !== undefined || tooltipPages.length === 0 ? (
            <label className="block">
              Page
              <select className={select} aria-label="Tooltip page" value={visual.tooltipPage ?? ''} onChange={(e) => onVisual((v) => ({ ...v, tooltipPage: e.target.value || undefined }))}>
                <option value="">{tooltipPages.length ? 'Auto' : 'No tooltip pages yet'}</option>
                {tooltipPages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {tooltipPages.length === 0 && <p className="text-[11px] text-d-sub">Turn on "Allow use as tooltip" on a page first.</p>}
        </div>
      )}
      {tab === 'format' && visual?.kind === 'button' && (
        <div className="space-y-2">
          <div className={label}>Button</div>
          <label className="block">
            Text
            <input value={visual.label ?? ''} onChange={(e) => onVisual((v) => ({ ...v, label: e.target.value, title: e.target.value || 'Button' }))} className={select} aria-label="Button text" />
          </label>
          <div className={`${label} pt-2`}>Action</div>
          <label className="block">
            Type
            <select
              className={select}
              aria-label="Action type"
              value={visual.action?.type ?? ''}
              onChange={(e) =>
                onVisual((v) => {
                  const t = e.target.value;
                  if (t === 'back') return { ...v, action: { type: 'back' } };
                  if (t === 'page') return { ...v, action: { type: 'page', pageId: report.pages.find((p) => p.id !== page.id)?.id ?? page.id } };
                  if (t === 'bookmark') return { ...v, action: report.bookmarks[0] ? { type: 'bookmark', bookmarkId: report.bookmarks[0].id } : undefined };
                  return { ...v, action: undefined };
                })
              }
            >
              <option value="">None</option>
              <option value="back">Back</option>
              <option value="bookmark" disabled={!report.bookmarks.length}>
                Bookmark
              </option>
              <option value="page">Page navigation</option>
            </select>
          </label>
          {visual.action?.type === 'page' && (
            <label className="block">
              Destination
              <select className={select} aria-label="Destination" value={visual.action.pageId} onChange={(e) => onVisual((v) => ({ ...v, action: { type: 'page', pageId: e.target.value } }))}>
                {report.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {visual.action?.type === 'bookmark' && (
            <label className="block">
              Bookmark
              <select className={select} aria-label="Bookmark" value={visual.action.bookmarkId} onChange={(e) => onVisual((v) => ({ ...v, action: { type: 'bookmark', bookmarkId: e.target.value } }))}>
                {report.bookmarks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-[11px] text-d-sub">In Power BI Desktop, Ctrl + click a button to use it.</p>
        </div>
      )}
      {tab === 'format' && visual?.kind === 'slicer' && <p className="text-d-sub">Slicer formatting is not part of this exercise. Use View → Sync slicers to share it across pages.</p>}
    </div>
  );
}
