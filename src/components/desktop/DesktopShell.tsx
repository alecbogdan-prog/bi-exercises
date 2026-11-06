import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Engine } from '../../engine/engine';
import type { CalcColumn, Measure, Relationship } from '../../engine/model';
import type { Step } from '../../engine/query';
import type { VisualSpec } from '../../engine/visual';
import {
  addFilter,
  addSlicer,
  addToWell,
  autoAdd,
  commitColumn,
  commitMeasure,
  fieldUsed,
  removeColumnEverywhere,
  removeField,
  removeSlicer,
  renameColumnInSpec,
  renameMeasureInSpec,
  setSlicerField,
} from '../../lib/workspace';
import type { DragItem, WellId } from '../../lib/workspace';
import { useToast, Pane } from './common';
import { DataPane } from './DataPane';
import { FiltersPane } from './FiltersPane';
import { FormulaBar } from './FormulaBar';
import { Ico } from './icons';
import { ModelView } from './ModelView';
import { PowerQueryEditor } from './PowerQueryEditor';
import { PageTabs, ReportView, StatusBar } from './ReportView';
import type { Selection } from './ReportView';
import { Ribbon, TitleBar } from './Ribbon';
import type { RibbonAction } from './Ribbon';
import { TableView } from './TableView';
import { VisualizationsPane } from './VisualizationsPane';
import { BRAND } from '../../lib/base';
import type { ReportState } from '../../report/report';
import { ReportPagesShell } from '../report/ReportPagesShell';

export interface Work {
  spec: VisualSpec;
  measures: Measure[];
  columns: CalcColumn[];
  steps?: Step[];
  relationships?: Relationship[];
  report?: ReportState;
}

export interface DesktopProps {
  base: Engine;
  title: string;
  work: Work;
  given: Measure[];
  /** Single entry point for every change, so undo/redo can track everything together. */
  onChange: (work: Work) => void;
  focus: 'report' | 'measure' | 'column' | 'query' | 'model' | 'pages';
  columnTable?: string;
  filtersOpenInitially: boolean;
  /** Power Query exercises: the query that "Transform data" opens. */
  querySource?: string;
  starterSteps?: Step[];
  starterRelationships?: Relationship[];
  /**
   * Only the parts of Power BI a simple visual exercise needs: the report canvas, Visualizations and Data.
   * No title bar, ribbon, view switcher, Filters pane, page tabs or status bar (like a lesson that shows just the spreadsheet).
   */
  minimal?: boolean;
  /** Simple view: also show the Filters pane (filter exercises). */
  showFilters?: boolean;
}

type View = 'report' | 'table' | 'model';
type Snapshot = Work;
type Editor = { mode: 'measure' | 'column'; table: string; text: string; editing: string | null; readOnly?: boolean };

/** Multi-page report exercises get their own editor; everything else uses the single-visual editor. */
export function DesktopShell(props: DesktopProps) {
  if (props.focus === 'pages' && props.work.report) {
    const { work, onChange } = props;
    return <ReportPagesShell base={props.base} title={props.title} report={work.report!} given={props.given} onChange={(report) => onChange({ ...work, report })} />;
  }
  return <SingleVisualShell {...props} />;
}

function SingleVisualShell({ base, title, work, given, onChange: onWork, focus, columnTable, filtersOpenInitially, querySource, starterSteps, starterRelationships, minimal = false, showFilters = false }: DesktopProps) {
  const { spec, measures, columns } = work;
  const steps = work.steps ?? starterSteps ?? [];
  const rels = work.relationships ?? starterRelationships ?? base.model.relationships;
  const onChange = useCallback((s: VisualSpec, m: Measure[], c: CalcColumn[], extra: Partial<Work> = {}) => onWork({ ...work, spec: s, measures: m, columns: c, ...extra }), [onWork, work]);
  const [view, setView] = useState<View>(focus === 'model' ? 'model' : 'report');
  const [pqOpen, setPqOpen] = useState(focus === 'query');
  /** The fact table: where measures live (Sales in the bike data, Performances in the festival data). */
  const factTable = base.model.tables[0]?.name ?? 'Sales';
  const [homeTable, setHomeTable] = useState(columnTable ?? factTable);
  const [editor, setEditor] = useState<Editor | null>(() => {
    if (focus === 'measure' && measures.length === 0) return { mode: 'measure', table: factTable, text: '', editing: null };
    if (focus === 'column' && columns.length === 0) return { mode: 'column', table: columnTable ?? factTable, text: '', editing: null };
    return null;
  });
  const [panes, setPanes] = useState({ filters: filtersOpenInitially, viz: true, data: true });
  const [tableSel, setTableSel] = useState(factTable);
  const [selection, setSelection] = useState<Selection>({ kind: 'visual' });
  const [toast, showToast] = useToast();
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [, force] = useState(0);

  const allMeasures = useMemo(() => [...given, ...measures], [given, measures]);
  const relBase = useMemo(() => base.withRelationships(rels), [base, rels]);
  const modelBase = useMemo(() => {
    try {
      return relBase.withColumns(columns);
    } catch {
      return relBase;
    }
  }, [relBase, columns]);
  const engine = useMemo(() => modelBase.withMeasures(allMeasures), [modelBase, allMeasures]);

  const commit = useCallback(
    (nextSpec: VisualSpec, nextMeasures: Measure[] = measures, nextColumns: CalcColumn[] = columns, extra: Partial<Work> = {}) => {
      past.current = [...past.current.slice(-60), work];
      future.current = [];
      onChange(nextSpec, nextMeasures, nextColumns, extra);
      force((n) => n + 1);
    },
    [work, measures, columns, onChange],
  );
  const apply = (r: { spec: VisualSpec; error?: string }) => {
    if (r.error) showToast(r.error);
    if (r.spec !== spec) commit(r.spec);
  };
  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current = [work, ...future.current];
    onWork(prev);
    force((n) => n + 1);
  }, [work, onWork]);
  const redo = useCallback(() => {
    const next = future.current.shift();
    if (!next) return;
    past.current = [...past.current, work];
    onWork(next);
    force((n) => n + 1);
  }, [work, onWork]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        showToast('Your work is saved automatically.');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, showToast]);

  // Keep the selection valid when slicers disappear (undo, reset...).
  const slicerCount = spec.slicers?.length ?? 0;
  const sel: Selection = selection.kind === 'slicer' && selection.index >= slicerCount ? { kind: 'visual' } : selection;

  const newMeasure = (name?: string) => {
    if (view === 'model') setView('report');
    setEditor({ mode: 'measure', table: factTable, text: name ? `${name} = ` : '', editing: null });
  };
  const newColumn = (table = view === 'table' ? tableSel : homeTable) => {
    if (view === 'model') setView('report');
    setEditor({ mode: 'column', table, text: '', editing: null });
  };

  const onRibbon = (a: RibbonAction, label: string) => {
    switch (a) {
      case 'new-measure':
        return newMeasure();
      case 'new-column':
        return newColumn();
      case 'refresh':
        return showToast('Data refreshed.');
      case 'transform':
        return querySource ? setPqOpen(true) : showToast('This exercise does not use Power Query. Power Query exercises have their own module.');
      case 'relationships':
        return setView('model');
      case 'toggle-filters':
        return setPanes({ ...panes, filters: !panes.filters });
      case 'toggle-viz':
        return setPanes({ ...panes, viz: !panes.viz });
      case 'toggle-data':
        return setPanes({ ...panes, data: !panes.data });
      case 'new-page':
        return showToast('This exercise uses a single report page.');
      default:
        return showToast(`${label} is not available in this exercise.`);
    }
  };

  const onDataToggle = (item: DragItem) => {
    if (sel.kind === 'slicer') return apply(setSlicerField(spec, sel.index, item));
    return fieldUsed(spec, item) ? commit(removeField(spec, item)) : apply(autoAdd(engine, spec, item));
  };

  const status = view === 'report' ? 'Page 1 of 1' : view === 'table' ? `Table view` : `Model view · ${modelBase.model.tables.length} tables · ${rels.length} relationships`;

  return (
    <div
      className={`desktop relative flex flex-col overflow-hidden bg-white ${minimal ? 'h-full min-w-[700px] rounded-md border border-d-border' : 'h-full min-h-[640px] min-w-[1100px]'}`}
      data-testid="desktop"
    >
      {!minimal && (
        <TitleBar
          title={`${title} - ${BRAND}`}
          canUndo={past.current.length > 0}
          canRedo={future.current.length > 0}
          onUndo={undo}
          onRedo={redo}
          onSave={() => showToast('Your work is saved automatically.')}
        />
      )}
      {!minimal && <Ribbon onAction={onRibbon} panes={panes} onFile={() => showToast('The File menu is not available in the exercises.')} />}
      {minimal && focus !== 'report' && (
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-d-border bg-d-ribbon px-2 text-[12px]" data-testid="mini-toolbar">
          {(focus === 'column' || focus === 'model') &&
            (
              [
                ['report', 'Report view', Ico.report],
                ...(focus === 'column' ? ([['table', 'Table view', Ico.grid]] as const) : ([['model', 'Model view', Ico.model]] as const)),
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`flex h-8 items-center gap-1.5 rounded-[4px] px-2.5 ${view === v ? 'bg-white font-semibold text-d-text shadow-sm' : 'text-d-sub hover:bg-d-hover'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          {(focus === 'measure' || focus === 'column') && (
            <button onClick={() => (focus === 'measure' ? newMeasure() : newColumn())} className="flex h-8 items-center gap-1.5 rounded-[4px] px-2.5 text-d-text hover:bg-d-hover" data-testid="mini-new">
              <Ico.calculator className="h-4 w-4 text-d-sub" />
              {focus === 'measure' ? 'New measure' : 'New column'}
            </button>
          )}
          {focus === 'query' && (
            <button onClick={() => setPqOpen(true)} className="flex h-8 items-center gap-1.5 rounded-[4px] px-2.5 text-d-text hover:bg-d-hover">
              <Ico.table className="h-4 w-4 text-d-sub" />
              Transform data
            </button>
          )}
        </div>
      )}
      {editor && view !== 'model' && (
        <FormulaBar
          key={`${editor.mode}|${editor.table}|${editor.editing ?? 'new'}|${editor.text}`}
          initial={editor.text}
          readOnly={editor.readOnly}
          context={editor.mode === 'column' ? `New column in table: ${editor.table}` : undefined}
          placeholder={editor.mode === 'column' ? 'Column = <DAX expression for each row>' : undefined}
          onCancel={() => setEditor(null)}
          onCommit={(text) => {
            if (editor.mode === 'column') {
              const r = commitColumn(base, text, editor.table, columns, editor.editing);
              commit(renameColumnInSpec(spec, editor.table, editor.editing, r.name), measures, r.columns);
              setHomeTable(editor.table);
              showToast(editor.editing ? `Column "${r.name}" updated.` : `Column "${r.name}" added to table ${editor.table}.`);
            } else {
              const r = commitMeasure(modelBase, text, given, measures, editor.editing);
              commit(renameMeasureInSpec(spec, editor.editing, r.name), r.measures);
              showToast(editor.editing ? `Measure "${r.name}" updated.` : `Measure "${r.name}" created in table ${factTable}.`);
            }
            setEditor(null);
          }}
        />
      )}
      <div className="flex min-h-0 flex-1">
        <nav className={`${minimal ? 'hidden' : 'flex'} w-12 shrink-0 flex-col items-center gap-1 border-r border-d-border bg-d-ribbon pt-2`}>
          {(
            [
              ['report', 'Report view', Ico.report],
              ['table', 'Table view', Ico.grid],
              ['model', 'Model view', Ico.model],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={label}
              aria-label={label}
              className={`relative flex h-10 w-10 items-center justify-center rounded-[4px] ${view === v ? 'bg-white text-d-text shadow-sm' : 'text-d-sub hover:bg-d-hover'}`}
            >
              {view === v && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded bg-d-accent" />}
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </nav>

        <main className="flex min-w-0 flex-1 flex-col">
          {view === 'report' && (
            <>
              <ReportView
                engine={engine}
                spec={spec}
                allMeasures={allMeasures}
                selection={sel}
                onSelect={setSelection}
                onSpec={(s) => commit(s)}
                onRemoveSlicer={(i) => {
                  commit(removeSlicer(spec, i));
                  setSelection({ kind: 'visual' });
                }}
                onFiltersClick={() => setPanes({ ...panes, filters: true })}
                onNewMeasure={newMeasure}
                fill={minimal}
              />
              {!minimal && <PageTabs onAdd={() => showToast('This exercise uses a single report page.')} />}
            </>
          )}
          {view === 'table' && <TableView base={modelBase} table={tableSel} />}
          {view === 'model' && (
            <ModelView base={modelBase} editable={focus === 'model'} onRelationships={(r) => commit(spec, measures, columns, { relationships: r })} onToast={showToast} />
          )}
        </main>

        {view === 'report' && (
          <>
            {(!minimal || showFilters) && (
              <Pane title="Filters" open={panes.filters} onToggle={() => setPanes({ ...panes, filters: !panes.filters })} width={210} testId="pane-filters">
                <FiltersPane engine={engine} spec={spec} onSpec={(s) => commit(s)} onAdd={(item, scope) => apply(addFilter(spec, item, scope))} pickToAdd={minimal} />
              </Pane>
            )}
            <Pane title="Visualizations" open={panes.viz} onToggle={() => setPanes({ ...panes, viz: !panes.viz })} width={minimal ? 200 : 236} testId="pane-viz">
              <VisualizationsPane
                engine={engine}
                spec={spec}
                selection={sel}
                onSpec={(s) => commit(s)}
                onSelectVisual={() => setSelection({ kind: 'visual' })}
                onAddSlicer={() => {
                  const r = addSlicer(spec);
                  commit(r.spec);
                  setSelection({ kind: 'slicer', index: r.index });
                }}
                onDrop={(well: WellId, item: DragItem) =>
                  sel.kind === 'slicer' && well === 'slicer' ? apply(setSlicerField(spec, sel.index, item)) : apply(addToWell(engine, spec, well, item))
                }
                onUnavailable={(l) => showToast(`${l} is not available in the exercises yet.`)}
                pickToAdd={minimal}
              />
            </Pane>
          </>
        )}
        {view !== 'model' && (
          <Pane title="Data" open={panes.data} onToggle={() => setPanes({ ...panes, data: !panes.data })} width={minimal ? 180 : 220} testId="pane-data">
            <DataPane
              engine={modelBase}
              spec={view === 'report' ? spec : null}
              slicerField={sel.kind === 'slicer' ? spec.slicers?.[sel.index] : undefined}
              given={given}
              measures={measures}
              selectedTable={view === 'table' ? tableSel : homeTable}
              onSelectTable={(t) => {
                setHomeTable(t);
                if (view === 'table') setTableSel(t);
              }}
              onToggle={onDataToggle}
              onOpenMeasure={(m, mine) => setEditor({ mode: 'measure', table: factTable, text: `${m.name} = ${m.expression}`, editing: mine ? m.name : null, readOnly: !mine })}
              onNewMeasure={() => newMeasure()}
              onNewColumn={(t) => newColumn(t)}
              onDeleteMeasure={(m) => {
                commit(removeField(spec, { kind: 'measure', name: m.name }), measures.filter((x) => x !== m));
                showToast(`Measure "${m.name}" deleted.`);
              }}
              onOpenColumn={(c) => setEditor({ mode: 'column', table: c.table, text: `${c.name} = ${c.expression}`, editing: c.name })}
              clickToTick={minimal}
              onDeleteColumn={(c) => {
                commit(removeColumnEverywhere(spec, c.table, c.name), measures, columns.filter((x) => !(x.table === c.table && x.name === c.name)));
                showToast(`Column "${c.name}" deleted.`);
              }}
            />
          </Pane>
        )}
      </div>
      {!minimal && <StatusBar left={status} />}
      {pqOpen && querySource && (
        <PowerQueryEditor
          source={querySource}
          steps={steps}
          onSteps={(st) => commit(spec, measures, columns, { steps: st })}
          onClose={() => {
            setPqOpen(false);
            showToast(`Query "${querySource}" applied.`);
          }}
          onToast={showToast}
        />
      )}
      {toast && (
        <div role="status" className="pointer-events-none absolute bottom-10 left-1/2 z-40 -translate-x-1/2 rounded-[4px] bg-[#323130] px-4 py-2 text-[12px] text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
