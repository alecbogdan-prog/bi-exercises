import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { computeVisual, valueLabel, visualTitle } from '../engine/visual';
import { Chart } from '../components/Chart';
import { DesktopShell } from '../components/desktop/DesktopShell';
import type { Work } from '../components/desktop/DesktopShell';
import { Header } from '../components/Layout';
import { Logo } from '../components/icons';
import { Leaderboard } from '../components/Leaderboard';
import { useAccount } from '../lib/account';
import { VISUAL_NAMES, checkExercise, queryResult } from '../exercises/checker';
import type { QTable } from '../engine/query';
import { TYPE_LABEL, stepNames } from '../engine/query';
import type { CheckResult } from '../exercises/checker';
import { EXERCISES, exerciseById } from '../exercises/exercises';
import { projectOf } from '../projects/projects';
import { COMPANY } from '../exercises/scenarios';
import type { Exercise } from '../exercises/types';
import { MODULES } from '../exercises/types';
import { engineFor } from '../lib/base';
import { FESTIVAL } from '../engine/festival';
import { Paragraphs, inline } from '../lib/md';
import { awardPoints, clearWork, completedIds, loadWork, markCompleted, saveWork, startedIds, stats } from '../lib/storage';
import { pointsFor } from '../lib/points';
import { ActionBar, ChapterProgress, LessonList, ProgressBar, StatsChip } from '../components/Progress';
import { canFocus, needsFilters } from '../components/focused/canFocus';
import { nextClick } from '../components/focused/nextClick';
import type { NextClick } from '../components/focused/nextClick';
import { LockedEditor, ProUnlockCard } from '../components/ProLock';
import { canOpen, hasPro } from '../lib/access';
import { HintSpotlight } from '../components/HintSpotlight';
import type { LessonStatus } from '../components/Progress';
import { exerciseTitle } from '../lib/titles';

export default function ExercisePage() {
  const { id = '' } = useParams();
  const ex = exerciseById(id);
  useEffect(() => {
    // Same title as the static HTML written at build time (src/lib/sitemapPaths.ts).
    if (ex) document.title = exerciseTitle(ex.title);
  }, [ex]);
  if (!ex) {
    return (
      <div className="flex h-full flex-col">
        <Header />
        <div className="p-10 text-center">
          Exercise not found.{' '}
          <Link className="text-brand-700 underline" to="/exercises">
            See all exercises
          </Link>
        </div>
      </div>
    );
  }
  return <ExerciseView key={ex.id} ex={ex} />;
}

function describeSolution(ex: Exercise): string[] {
  const s = ex.solution.spec;
  if (ex.check.kind === 'dax') return (ex.solution.measures ?? []).map((m) => `${m.name} = ${m.expression}`);
  if (ex.check.kind === 'query') {
    const st = ex.solution.steps ?? [];
    return stepNames(st).map(
      (n, i) =>
        `${i + 1}. ${n}: ${JSON.stringify(st[i])
          .replace(/"op":"[^"]+",?/, '')
          .replace(/[{}"]/g, '')
          .replace(/,/g, ', ')}`,
    );
  }
  if (ex.check.kind === 'model') {
    return [
      ...ex.check.required.map((r) => `Create: ${r.fromTable}[${r.fromColumn}] (many) → ${r.toTable}[${r.toColumn}] (one)`),
      ...(ex.check.forbidden ?? []).map((r) => `Delete: ${r.fromTable}[${r.fromColumn}] → ${r.toTable}[${r.toColumn}]`),
    ];
  }
  const lines: string[] = (ex.solution.columns ?? []).map((c) => `New column in ${c.table}:\n  ${c.name} = ${c.expression}`);
  if (ex.check.kind === 'column' && !ex.check.report) return lines;
  if (lines.length) lines.push('');
  lines.push(`Visual: ${VISUAL_NAMES[s.type]}`);
  if (s.category.length)
    lines.push(
      `${s.type === 'matrix' ? 'Rows' : s.type === 'table' ? 'Columns' : s.type === 'pie' ? 'Legend' : s.type === 'bar' ? 'Y-axis' : 'X-axis'}: ${s.category.map((f) => `${f.table}[${f.column}]`).join(', ')}`,
    );
  if (s.series.length) lines.push(`${s.type === 'matrix' ? 'Columns' : 'Legend'}: ${s.series.map((f) => `${f.table}[${f.column}]`).join(', ')}`);
  lines.push(`Values: ${s.values.map(valueLabel).join(', ')}`);
  for (const f of s.filters) {
    lines.push(f.topN ? `Filter: ${f.table}[${f.column}], Top N = ${f.topN.n} by ${valueLabel(s.values[f.topN.valueIndex])}` : `Filter: ${f.table}[${f.column}] is ${f.values.join(' or ')}`);
  }
  for (const sl of s.slicers ?? []) lines.push(`Slicer: ${sl.table}[${sl.column}], select ${sl.values.join(', ')}`);
  if (s.sort) lines.push(`Sort: ${s.sort.by === 'axis' ? s.category.map((c) => c.column).join(', ') : valueLabel(s.values[s.sort.by])}, ${s.sort.dir === 'asc' ? 'ascending' : 'descending'}`);
  if (s.format?.dataLabels) lines.push('Format: Data labels on');
  if (s.format?.titleText) lines.push(`Format: Title text "${s.format.titleText}"`);
  return lines;
}

function QueryPreview({ table }: { table: QTable }) {
  return (
    <div className="max-h-48 overflow-auto" style={{ fontFamily: '"Segoe UI", sans-serif' }}>
      <div className="mb-1 text-[11px] text-slate-600">
        {table.columns.length} columns, {table.rows.length} rows
      </div>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="border-b border-slate-300">
            {table.columns.map((c) => (
              <th key={c.name} className="px-1 py-0.5 text-left font-semibold whitespace-nowrap" title={TYPE_LABEL[c.type]}>
                {c.name}
                <span className="ml-1 font-normal text-slate-400">{c.type === 'any' ? '' : TYPE_LABEL[c.type]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.slice(0, 8).map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              {r.map((v, j) => (
                <td key={j} className="px-1 py-0.5 whitespace-nowrap">
                  {v === null ? <span className="text-slate-400 italic">null</span> : String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.rows.length > 8 && <div className="mt-1 text-[10px] text-slate-400">… {table.rows.length - 8} more rows</div>}
    </div>
  );
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="border-t border-slate-200">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between py-2.5 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase hover:text-ink">
        {title}
        <span className={`transition ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

/** Slim top bar for the exercise page: breadcrumb instead of the full site menu, so the editor gets the room. */
function ExerciseTopBar({ crumbs, right }: { crumbs: { label: string; to?: string }[]; right: ReactNode }) {
  const { email } = useAccount();
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 bg-ink px-4 text-sm text-white/70">
      <Link to="/" className="shrink-0" title="Home">
        <Logo className="h-6 w-6" />
      </Link>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((c, i) => (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span className="text-white/30">›</span>}
            {c.to ? (
              <Link to={c.to} className="truncate hover:text-white hover:underline">
                {c.label}
              </Link>
            ) : (
              <span className="truncate font-semibold text-white">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex-1" />
      {right}
      <Link to={email ? '/account' : '/login'} className="hidden shrink-0 font-semibold hover:text-white md:block">
        {email ? 'Account' : 'Log in'}
      </Link>
    </header>
  );
}

function ExerciseView({ ex }: { ex: Exercise }) {
  const base = engineFor(ex);
  const saved = useMemo(() => loadWork(ex.id), [ex.id]);
  const fresh = (): Work => ({ spec: ex.starter, measures: [], columns: [], report: ex.report });
  const [work, setWork] = useState<Work>(() => (saved ? { ...saved, columns: saved.columns ?? [], report: saved.report ?? ex.report } : fresh()));
  const { spec, measures, columns } = work;
  const [result, setResult] = useState<CheckResult | null>(null);
  const [misses, setMisses] = useState(0);
  const [solved, setSolved] = useState(() => completedIds().includes(ex.id));
  const [hints, setHints] = useState(0);
  const [spot, setSpot] = useState<number | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [conceptOpen, setConceptOpen] = useState(ex.level === 'Beginner');
  const [helpOpen, setHelpOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [full, setFull] = useState(false);
  const [guide, setGuide] = useState<NextClick | null>(null);
  const [textHints, setTextHints] = useState(0);
  const [earned, setEarned] = useState<number | null>(null);
  const [myStats, setMyStats] = useState(() => stats());
  const [doneIds, setDoneIds] = useState(() => new Set(completedIds()));

  const project = projectOf(ex);
  const siblings = project ? project.steps : EXERCISES;
  const index = siblings.findIndex((e) => e.id === ex.id);
  const next = siblings[index + 1];
  const module = MODULES.find((m) => m.id === ex.module)!;
  const chapterTitle = project ? project.title : module.title;
  const chapterHref = project ? `/projects/${project.id}` : '/exercises';
  const given = useMemo(() => ex.givenMeasures ?? [], [ex]);
  const sc = ex.scenario;
  const locked = !canOpen(ex);

  const target = useMemo(
    () =>
      ex.check.kind === 'query' || ex.check.kind === 'pages'
        ? null
        : computeVisual(
            base
              .withRelationships(ex.solution.relationships ?? base.model.relationships)
              .withColumns(ex.solution.columns ?? [])
              .withMeasures([...given, ...(ex.solution.measures ?? [])]),
            ex.solution.spec,
          ),
    [base, ex, given],
  );
  const targetTable = useMemo(() => (ex.check.kind === 'query' ? queryResult(ex, ex.solution.steps ?? []) : null), [ex]);

  const onChange = (w: Work) => {
    setWork(w);
    setResult(null);
    saveWork(ex.id, w);
  };

  const check = () => {
    const r = checkExercise(base, ex, spec, measures, columns, {
      steps: work.steps,
      relationships: work.relationships,
      report: work.report,
    });
    setResult(r);
    if (r.ok) {
      markCompleted(ex.id);
      setSolved(true);
      setEarned(awardPoints(ex.id, pointsFor(ex, hints > 0 || showSolution || showSteps)));
      setMyStats(stats());
      setDoneIds(new Set(completedIds()));
    } else {
      setMisses((n) => n + 1);
    }
  };
  const reset = () => {
    clearWork(ex.id);
    setWork(fresh());
    setResult(null);
    setResetKey((k) => k + 1);
  };
  const revealAnswer = () => {
    setPanelOpen(true);
    setHelpOpen(true);
    setShowSolution(true);
  };
  const chapter = project ? project.steps : EXERCISES.filter((e) => e.module === ex.module);
  const started = new Set(startedIds());
  const lessonStatus = (id: string): LessonStatus => (doneIds.has(id) ? 'done' : started.has(id) || id === ex.id ? 'progress' : 'new');
  const focus = ex.check.kind === 'dax' ? 'measure' : ex.check.kind === 'column' ? 'column' : ex.check.kind === 'query' ? 'query' : ex.check.kind === 'model' ? 'model' : ex.check.kind === 'pages' ? 'pages' : 'report';
  const shellProps = {
    base,
    title: ex.dataset === 'festival' ? `${FESTIVAL} Report` : `${COMPANY} Sales Report`,
    work,
    given,
    onChange,
    focus,
    querySource: ex.query?.source,
    starterSteps: ex.query?.starterSteps,
    starterRelationships: ex.starterRelationships,
    columnTable: ex.check.kind === 'column' ? ex.check.table : undefined,
  } as const;
  const shell = <DesktopShell key={resetKey} {...shellProps} filtersOpenInitially={ex.module === 'filters'} />;
  const factTable = base.model.tables[0]?.name ?? 'Sales';
  // Simple view hint: point at the next click when we can work it out, otherwise the exercise's own hints in order.
  const showHint = () => {
    setHints((h) => h + 1);
    const g = nextClick(ex, work, factTable);
    if (g) return setGuide(g);
    if (!ex.hints.length) return;
    const i = Math.min(textHints, ex.hints.length - 1);
    setTextHints(i + 1);
    const t = ex.hintTargets?.[i];
    if (t && document.querySelector(t.target)) setGuide({ hint: t, text: ex.hints[i].replace(/\*\*|`/g, '') });
  };

  const focusedView = canFocus(ex) && !locked && !full;
  // Simple view "Show answer": fill the solution into the editor and point at it (no bonus points, like a hint).
  const fillAnswer = () => {
    const sol = ex.solution;
    onChange({
      ...work,
      spec: sol.spec,
      measures: [...(sol.measures ?? [])],
      columns: sol.columns ?? work.columns,
      steps: sol.steps ?? work.steps,
      relationships: sol.relationships ?? work.relationships,
      report: sol.report ?? work.report,
    });
    setShowSolution(true);
    setResetKey((k) => k + 1);
    const c = ex.check;
    const target =
      c.kind === 'dax'
        ? `[data-testid="data-pane"] [data-field="${factTable}.${c.measureName}"]`
        : c.kind === 'column'
          ? `[data-testid="data-pane"] [data-field="${c.table}.${c.name}"]`
          : c.kind === 'query'
            ? '[data-testid="pq-editor"]'
            : c.kind === 'model'
              ? '[data-testid="model-view"]'
              : sol.spec.filters.length
                ? `[data-filter-section="${sol.spec.filters[0].scope ?? 'visual'}"] [data-filter-card="${sol.spec.filters[0].column}"]`
                : sol.spec.slicers?.length
                  ? '[data-testid="slicer-0"]'
                  : '[data-testid="visual"]';
    setGuide({ hint: { target, label: 'The answer' }, text: 'Here is the answer, filled in for you. Look at what changed, then click Check answer.' });
  };
  // Exercises that also show the Filters pane need the room: the leaderboard moves to the left column.
  const wideEditor = focusedView && needsFilters(ex);
  const crumbs = [{ label: 'Exercises', to: '/exercises' }, project ? { label: project.title, to: chapterHref } : { label: module.title, to: '/exercises' }, { label: ex.title }];
  const actionBar = (
    <ActionBar
      result={result}
      misses={misses}
      points={earned}
      nextId={next?.id}
      done={project ? { href: chapterHref, label: 'See your finished dashboard 🎉' } : undefined}
      onCheck={check}
      onReset={reset}
      onShowAnswer={focusedView ? fillAnswer : revealAnswer}
      inset={wideEditor ? 'wide' : focusedView}
    />
  );

  if (focusedView) {
    const chapterDone = chapter.filter((l) => doneIds.has(l.id)).length;
    return (
      <div className="flex h-full flex-col">
        <ExerciseTopBar crumbs={crumbs} right={<StatsChip stats={myStats} />} />
        <div className="min-h-0 flex-1 overflow-y-auto bg-cream">
          <div className={`mx-auto grid max-w-[1600px] gap-5 p-4 lg:h-full lg:p-6 ${wideEditor ? 'lg:grid-cols-[300px_minmax(0,1fr)]' : 'lg:grid-cols-[300px_minmax(0,1fr)_280px]'}`}>
            <aside className="order-3 space-y-4 lg:order-1 lg:min-h-0 lg:overflow-y-auto">
              {wideEditor && <Leaderboard stats={myStats} compact />}
              <LessonList lessons={chapter} currentId={ex.id} status={lessonStatus} />
            </aside>
            <main className="order-1 flex min-w-0 flex-col lg:order-2 lg:min-h-0">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{ex.title}</h1>
              <div className="mt-1 mb-4 flex items-center gap-3">
                <span className="w-10 text-sm font-medium text-slate-600 tabular-nums">{Math.round((chapterDone / chapter.length) * 100)}%</span>
                <ProgressBar value={chapterDone / chapter.length} className="flex-1" />
              </div>
              <div className="flex flex-col rounded-xl border border-slate-300 bg-white p-4 shadow-sm lg:min-h-0 lg:flex-1" data-testid="task-card">
                <Paragraphs text={ex.lesson} className="lesson text-[17px] leading-relaxed text-slate-800" />
                <ol className="task mt-3 list-decimal space-y-1 pl-6 text-[17px] font-semibold text-ink">
                  {ex.task.map((t, i) => (
                    <li key={i}>{inline(t)}</li>
                  ))}
                </ol>
                {(ex.check.kind === 'model' || needsFilters(ex)) && (
                  <p className="mt-2 text-[15px] text-slate-500">
                    {ex.check.kind === 'model'
                      ? 'No dragging needed: click a column, then the matching column in the other table.'
                      : 'No dragging needed: in Filters, choose the field from “+ Add a field…”.'}
                  </p>
                )}
                <div className="mt-4 h-[460px] overflow-x-auto lg:h-auto lg:min-h-[420px] lg:flex-1">
                  <DesktopShell key={resetKey} {...shellProps} filtersOpenInitially={needsFilters(ex)} showFilters={needsFilters(ex)} minimal />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
                  {(hints === 0 || textHints < ex.hints.length || ex.check.kind === 'report' || ex.check.kind === 'dax' || ex.check.kind === 'column') && (
                    <button onClick={showHint} className="font-medium text-brand-700 hover:underline" data-testid="show-hint">
                      {hints === 0 ? 'Show a hint' : 'Show me the next step'}
                    </button>
                  )}
                  <button onClick={fillAnswer} className="text-slate-500 hover:underline" data-testid="show-solution">
                    Show answer
                  </button>
                  <span className="flex-1" />
                  <button onClick={() => setFull(true)} className="text-slate-500 hover:text-ink hover:underline" data-testid="open-full">
                    Open in full Power BI ↗
                  </button>
                </div>
                {ex.hints.slice(0, textHints).map((h, i) => (
                  <div key={i} className="lesson mt-2 rounded-md bg-amber-50 px-3 py-2 text-[15px] text-amber-900">
                    💡 {inline(h)}
                  </div>
                ))}
              </div>
            </main>
            {!wideEditor && (
              <aside className="order-2 lg:order-3 lg:min-h-0 lg:overflow-y-auto">
                <Leaderboard stats={myStats} compact />
              </aside>
            )}
          </div>
        </div>
        {actionBar}
        {guide && <HintSpotlight hint={guide.hint} text={guide.text} onClose={() => setGuide(null)} />}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ExerciseTopBar crumbs={crumbs} right={<StatsChip stats={myStats} />} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {panelOpen ? (
          <aside className="shrink-0 border-b border-slate-200 bg-white lg:w-[340px] lg:overflow-y-auto lg:border-r lg:border-b-0" data-testid="exercise-panel">
            <div className="p-4">
              <div className="mb-1 flex items-start gap-2">
                <h1 className="flex-1 text-xl font-bold tracking-tight">{ex.title}</h1>
                <button onClick={() => setPanelOpen(false)} className="hidden rounded px-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink lg:block" title="Hide the exercise panel">
                  «
                </button>
              </div>
              <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                <span>{ex.level}</span>
                {!ex.free && !hasPro() && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">PRO</span>}
                {solved && <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">✓ Solved</span>}
                {canFocus(ex) && !locked && (
                  <button onClick={() => setFull(false)} className="ml-auto font-semibold text-brand-700 hover:underline" data-testid="back-simple">
                    ← Simple view
                  </button>
                )}
              </div>
              <ChapterProgress title={chapterTitle} lessons={chapter} currentId={ex.id} status={lessonStatus} kind={project ? 'project' : 'chapter'} />

              <div className="mb-4 rounded-xl border border-slate-200 p-3" data-testid="task-card">
                {sc ? (
                  <div data-testid="scenario">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: sc.from.color }}>
                        {sc.from.initials}
                      </span>
                      <div className="min-w-0 truncate text-xs text-slate-500">
                        <b className="text-ink">{sc.from.name}</b> · {sc.from.role}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-800">{sc.message}</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{sc.deliver}</p>
                  </div>
                ) : (
                  <ol className="task list-decimal space-y-1 pl-5 text-sm">
                    {ex.task.map((t, i) => (
                      <li key={i}>{inline(t)}</li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="mb-4">
                <div className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">{ex.check.kind === 'pages' ? 'What to set up' : 'Expected result'}</div>
                <div className="rounded-lg border border-slate-200 bg-white p-2">
                  {ex.check.kind === 'pages' ? (
                    <ol className="task list-decimal space-y-1 py-1 pr-1 pl-6 text-sm" data-testid="pages-goals">
                      {ex.task.map((t, i) => (
                        <li key={i}>{inline(t)}</li>
                      ))}
                    </ol>
                  ) : targetTable ? (
                    <QueryPreview table={targetTable} />
                  ) : (
                    target && (
                      <>
                        <div className="mb-1 truncate text-[11px] text-slate-600" style={{ fontFamily: '"Segoe UI", sans-serif' }}>
                          {visualTitle(ex.solution.spec)}
                        </div>
                        <div className="h-40">
                          <Chart result={target} type={ex.solution.spec.type} format={ex.solution.spec.format} compact />
                        </div>
                      </>
                    )
                  )}
                </div>
              </div>

              {locked ? (
                <ProUnlockCard ex={ex} />
              ) : (
                <>
                  <Section title="Concept" open={conceptOpen} onToggle={() => setConceptOpen(!conceptOpen)}>
                    <Paragraphs text={ex.lesson} className="lesson text-sm leading-relaxed text-slate-700" />
                  </Section>
                  <Section title="Stuck? Hints & solution" open={helpOpen} onToggle={() => setHelpOpen(!helpOpen)}>
                    <div className="space-y-2 text-sm">
                      {ex.hints.slice(0, hints).map((h, i) => (
                        <div key={i} className="lesson rounded-md bg-amber-50 px-3 py-2 text-amber-900">
                          💡 {inline(h)}
                          {ex.hintTargets?.[i] && (
                            <button onClick={() => setSpot(i)} className="ml-1 font-semibold whitespace-nowrap text-brand-700 hover:underline" data-testid={`show-me-${i}`}>
                              Show me ↗
                            </button>
                          )}
                        </div>
                      ))}
                      {showSteps && sc && (
                        <ol className="task list-decimal space-y-1 rounded-md bg-slate-50 py-2 pr-2 pl-7" data-testid="steps">
                          {ex.task.map((t, i) => (
                            <li key={i}>{inline(t)}</li>
                          ))}
                        </ol>
                      )}
                      {showSolution && <pre className="overflow-x-auto rounded-md bg-ink p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-100">{describeSolution(ex).join('\n')}</pre>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {hints < ex.hints.length && (
                          <button
                            onClick={() => {
                              setHints(hints + 1);
                              setSpot(ex.hintTargets?.[hints] ? hints : null);
                            }}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {hints ? 'Another hint' : 'Show a hint'}
                          </button>
                        )}
                        {sc && (
                          <button onClick={() => setShowSteps(!showSteps)} className="text-slate-500 hover:underline">
                            {showSteps ? 'Hide steps' : 'Step by step'}
                          </button>
                        )}
                        <button onClick={() => setShowSolution(!showSolution)} className="text-slate-500 hover:underline">
                          {showSolution ? 'Hide solution' : 'Show solution'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">Solving without help earns 50 bonus points.</p>
                    </div>
                  </Section>
                </>
              )}
              <div className="mt-4">
                <Leaderboard stats={myStats} compact />
              </div>
            </div>
          </aside>
        ) : (
          <button
            onClick={() => setPanelOpen(true)}
            className="hidden w-9 shrink-0 flex-col items-center gap-2 border-r border-slate-200 bg-white pt-3 text-slate-500 hover:text-ink lg:flex"
            title="Show the exercise"
          >
            »<span className="text-xs font-semibold [writing-mode:vertical-rl]">Exercise · {ex.title}</span>
          </button>
        )}
        <div className="min-h-[680px] min-w-0 flex-1 overflow-x-auto lg:min-h-0">
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 lg:hidden">
            The report editor works best on a computer. On a phone, scroll sideways inside the window.
          </div>
          {locked ? <LockedEditor ex={ex}>{shell}</LockedEditor> : shell}
        </div>
      </div>
      {!locked && actionBar}
      {spot !== null && !locked && ex.hintTargets?.[spot] && <HintSpotlight hint={ex.hintTargets[spot]!} text={ex.hints[spot].replace(/\*\*|`/g, '')} onClose={() => setSpot(null)} />}
    </div>
  );
}
