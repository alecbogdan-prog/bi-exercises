import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { computeVisual, valueLabel, visualTitle } from '../engine/visual';
import { Chart } from '../components/Chart';
import { DesktopShell } from '../components/desktop/DesktopShell';
import type { Work } from '../components/desktop/DesktopShell';
import { Header } from '../components/Layout';
import { VISUAL_NAMES, checkExercise, queryResult } from '../exercises/checker';
import type { QTable } from '../engine/query';
import { TYPE_LABEL, stepNames } from '../engine/query';
import type { CheckResult } from '../exercises/checker';
import { EXERCISES, exerciseById } from '../exercises/exercises';
import { projectOf } from '../projects/projects';
import { COMPANY } from '../exercises/scenarios';
import type { Exercise } from '../exercises/types';
import { MODULES } from '../exercises/types';
import { baseEngine } from '../lib/base';
import { Paragraphs, inline } from '../lib/md';
import { awardPoints, clearWork, completedIds, loadWork, markCompleted, saveWork, startedIds, stats } from '../lib/storage';
import { pointsFor } from '../lib/points';
import { ChapterProgress, StatsChip, SuccessBar } from '../components/Progress';
import { LockedEditor, ProUnlockCard } from '../components/ProLock';
import { canOpen, hasPro } from '../lib/access';
import { HintSpotlight } from '../components/HintSpotlight';
import type { LessonStatus } from '../components/Progress';

export default function ExercisePage() {
  const { id = '' } = useParams();
  const ex = exerciseById(id);
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

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-slate-200">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-2.5 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase hover:text-ink">
        {title}
        <span className={`transition ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function ExerciseView({ ex }: { ex: Exercise }) {
  const base = baseEngine();
  const saved = useMemo(() => loadWork(ex.id), [ex.id]);
  const fresh = (): Work => ({ spec: ex.starter, measures: [], columns: [], report: ex.report });
  const [work, setWork] = useState<Work>(() => (saved ? { ...saved, columns: saved.columns ?? [], report: saved.report ?? ex.report } : fresh()));
  const { spec, measures, columns } = work;
  const [result, setResult] = useState<CheckResult | null>(null);
  const [solved, setSolved] = useState(() => completedIds().includes(ex.id));
  const [hints, setHints] = useState(0);
  const [spot, setSpot] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [earned, setEarned] = useState<number | null>(null);
  const [myStats, setMyStats] = useState(() => stats());
  const [doneIds, setDoneIds] = useState(() => new Set(completedIds()));

  const project = projectOf(ex);
  const siblings = project ? project.steps : EXERCISES;
  const index = siblings.findIndex((e) => e.id === ex.id);
  const next = siblings[index + 1];
  const prev = siblings[index - 1];
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
      setEarned(awardPoints(ex.id, pointsFor(ex, hints > 0 || showSolution)));
      setMyStats(stats());
      setDoneIds(new Set(completedIds()));
    }
  };
  const chapter = project ? project.steps : EXERCISES.filter((e) => e.module === ex.module);
  const started = new Set(startedIds());
  const lessonStatus = (id: string): LessonStatus => (doneIds.has(id) ? 'done' : started.has(id) || id === ex.id ? 'progress' : 'new');

  return (
    <div className="flex h-full flex-col">
      <Header>
        <StatsChip stats={myStats} />
        <div className="flex items-center gap-1 text-sm">
          {prev && (
            <Link to={`/exercise/${prev.id}`} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-ink">
              ← Prev
            </Link>
          )}
          <span className="hidden text-slate-400 sm:inline">
            {project ? 'Step ' : ''}{index + 1} / {siblings.length}
          </span>
          {next && (
            <Link to={`/exercise/${next.id}`} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-ink">
              Next →
            </Link>
          )}
        </div>
      </Header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {panelOpen ? (
          <aside className="shrink-0 border-b border-slate-200 bg-white lg:w-[340px] lg:overflow-y-auto lg:border-r lg:border-b-0" data-testid="exercise-panel">
            <div className="p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                <Link to={chapterHref} className="hover:text-brand-700">
                  {project ? `Project · ${project.title}` : module.title}
                </Link>
                <span>·</span>
                <span>{ex.level}</span>
                {!ex.free && !hasPro() && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">PRO</span>}
                {solved && <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">✓ Solved</span>}
                <span className="flex-1" />
                <button onClick={() => setPanelOpen(false)} className="hidden rounded px-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink lg:block" title="Hide the exercise panel">
                  «
                </button>
              </div>
              <h1 className="mb-4 text-xl font-bold tracking-tight">{ex.title}</h1>
              <ChapterProgress title={chapterTitle} lessons={chapter} currentId={ex.id} status={lessonStatus} kind={project ? 'project' : 'chapter'} />

              {sc && (
                <div className="mb-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200" data-testid="scenario">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: sc.from.color }}>
                      {sc.from.initials}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <div className="text-sm font-semibold">{sc.from.name}</div>
                      <div className="truncate text-[11px] text-slate-500">
                        {sc.from.role} · {COMPANY}
                      </div>
                    </div>
                    <span className="ml-auto shrink-0 text-[11px] text-slate-400">{sc.time}</span>
                  </div>
                  <p className="rounded-lg rounded-tl-sm bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm ring-1 ring-slate-200">{sc.message}</p>
                </div>
              )}

              {sc && (
                <div className="mb-4 flex gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
                  <span className="font-semibold">Deliver:</span>
                  <span className="text-slate-800">{sc.deliver}</span>
                </div>
              )}

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
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button onClick={check} className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">
                      Check answer
                    </button>
                    <button
                      onClick={() => {
                        clearWork(ex.id);
                        setWork(fresh());
                        setResult(null);
                        setResetKey((k) => k + 1);
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-400"
                    >
                      Reset
                    </button>
                  </div>

                  {result && (
                    <div className={`mb-3 rounded-lg p-3 text-sm ${result.ok ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                      {result.ok ? (
                        <>
                          <div className="font-semibold">Correct ✓</div>
                          <p className="mt-1 text-slate-700">{ex.explanation}</p>
                          {next && (
                            <Link to={`/exercise/${next.id}`} className="mt-3 inline-block rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700">
                              Next exercise →
                            </Link>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="mb-1 font-semibold">Not quite yet</div>
                          <ul className="list-disc space-y-1 pl-5">
                            {result.messages.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}

                  <Section title="Concept" defaultOpen={ex.level === 'Beginner'}>
                    <Paragraphs text={ex.lesson} className="lesson text-sm leading-relaxed text-slate-700" />
                  </Section>
                  <Section title="Step-by-step help">
                    <ol className="task list-decimal space-y-1 pl-5 text-sm">
                      {ex.task.map((t, i) => (
                        <li key={i}>{inline(t)}</li>
                      ))}
                    </ol>
                  </Section>
                  <Section title="Hints & solution">
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
                      <div className="flex gap-3">
                        {hints < ex.hints.length && (
                          <button
                            onClick={() => {
                              setHints(hints + 1);
                              setSpot(ex.hintTargets?.[hints] ? hints : null);
                            }}
                            className="text-brand-700 hover:underline"
                          >
                            {hints ? 'Another hint' : 'Show a hint'}
                          </button>
                        )}
                        <button onClick={() => setShowSolution(!showSolution)} className="text-slate-500 hover:underline">
                          {showSolution ? 'Hide solution' : 'Show solution'}
                        </button>
                      </div>
                      {showSolution && <pre className="overflow-x-auto rounded-md bg-ink p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-100">{describeSolution(ex).join('\n')}</pre>}
                    </div>
                  </Section>
                </>
              )}
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
          {locked ? (
            <LockedEditor ex={ex}>
              <DesktopShell
                key={resetKey}
                base={base}
                title={`${COMPANY} Sales Report`}
                work={work}
                given={given}
                onChange={onChange}
                focus={ex.check.kind === 'dax' ? 'measure' : ex.check.kind === 'column' ? 'column' : ex.check.kind === 'query' ? 'query' : ex.check.kind === 'model' ? 'model' : ex.check.kind === 'pages' ? 'pages' : 'report'}
                querySource={ex.query?.source}
                starterSteps={ex.query?.starterSteps}
                starterRelationships={ex.starterRelationships}
                columnTable={ex.check.kind === 'column' ? ex.check.table : undefined}
                filtersOpenInitially={ex.module === 'filters'}
              />
            </LockedEditor>
          ) : (
            <DesktopShell
              key={resetKey}
              base={base}
              title={`${COMPANY} Sales Report`}
              work={work}
              given={given}
              onChange={onChange}
              focus={ex.check.kind === 'dax' ? 'measure' : ex.check.kind === 'column' ? 'column' : ex.check.kind === 'query' ? 'query' : ex.check.kind === 'model' ? 'model' : ex.check.kind === 'pages' ? 'pages' : 'report'}
              querySource={ex.query?.source}
              starterSteps={ex.query?.starterSteps}
              starterRelationships={ex.starterRelationships}
              columnTable={ex.check.kind === 'column' ? ex.check.table : undefined}
              filtersOpenInitially={ex.module === 'filters'}
            />
          )}
        </div>
      </div>
      {spot !== null && !locked && ex.hintTargets?.[spot] && <HintSpotlight hint={ex.hintTargets[spot]!} text={ex.hints[spot].replace(/\*\*|`/g, '')} onClose={() => setSpot(null)} />}
      {result?.ok && earned !== null && <SuccessBar points={earned} nextId={next?.id} onClose={() => setEarned(null)} done={project ? { href: chapterHref, label: 'See your finished dashboard 🎉' } : undefined} />}
    </div>
  );
}
