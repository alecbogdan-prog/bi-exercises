import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Chart } from '../components/Chart';
import { Footer, Header } from '../components/Layout';
import { LockIcon } from '../components/ProLock';
import { ProgressBar } from '../components/Progress';
import { computeVisual } from '../engine/visual';
import { canOpen, hasPro } from '../lib/access';
import { engineFor } from '../lib/base';
import { SkillsToKnow } from '../components/ProjectPreview';
import { downloadBytes, modelCsvFiles, projectBrief, zipFiles } from '../lib/download';
import { completedIds } from '../lib/storage';
import { dashboardTiles, projectById, projectMeasures } from '../projects/projects';
import type { Project } from '../projects/projects';
import ProjectsPage from './ProjectsPage';
import { projectTitle } from '../lib/titles';

export default function ProjectPage() {
  const { id = '' } = useParams();
  const project = projectById(id);
  if (!project) return <ProjectsPage />;
  return <ProjectView key={project.id} project={project} />;
}

function ProjectView({ project: p }: { project: Project }) {
  const done = new Set(completedIds());
  const solved = p.steps.filter((s) => done.has(s.id)).length;
  const next = p.steps.find((s) => !done.has(s.id)) ?? p.steps[0];
  const locked = !canOpen(p.steps[0]);
  const tiles = useMemo(() => dashboardTiles(p), [p]);
  const results = useMemo(() => {
    const engine = engineFor(p).withMeasures(projectMeasures(p));
    return tiles.map((t) => computeVisual(engine, t.spec));
  }, [p, tiles]);

  useEffect(() => {
    document.title = projectTitle(p.title);
  }, [p]);

  const downloadAll = () => {
    const files = [{ name: 'Project brief.txt', content: projectBrief(p) }, ...modelCsvFiles(engineFor(p).model)];
    downloadBytes(`${p.id}-power-bi-project.zip`, zipFiles(files), 'application/zip');
  };
  const canDownload = p.free || hasPro();

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header />
      <main className="flex-1">
        <section className="bg-mint">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="min-w-0">
              <Link to="/projects" className="text-sm font-semibold text-brand-700 hover:underline">
                ← All projects
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">{p.title}</h1>
                {hasPro() ? null : p.free ? (
                  <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">FREE</span>
                ) : (
                  <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    <LockIcon className="h-3 w-3" /> PRO
                  </span>
                )}
              </div>
              <p className="mt-3 text-lg text-slate-700">{p.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.skills.map((s) => (
                  <span key={s} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-ink ring-1 ring-slate-200">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-5">
                <SkillsToKnow project={p} />
              </div>
              <div className="mt-6 max-w-md">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold">Your progress</span>
                  <span className="text-slate-600 tabular-nums">
                    {solved}/{p.steps.length} steps
                  </span>
                </div>
                <ProgressBar value={solved / p.steps.length} />
              </div>
              <Link
                to={locked ? '/pricing' : `/exercise/${next.id}`}
                className="mt-6 inline-block rounded-full bg-brand-500 px-8 py-4 font-display text-xl font-extrabold text-white shadow-[0_5px_0_var(--color-brand-700)] hover:bg-brand-600"
              >
                {locked ? 'Unlock with Pro' : solved === 0 ? 'Start the project →' : solved === p.steps.length ? 'Review the steps →' : `Continue: step ${p.steps.indexOf(next) + 1} →`}
              </Link>
            </div>
            <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" data-testid="project-brief">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: p.brief.from.color }}>
                  {p.brief.from.initials}
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">{p.brief.from.name}</div>
                  <div className="text-xs text-slate-500">{p.dataset === 'festival' ? p.brief.from.role : `${p.brief.from.role} · Ridgeline Cycles`}</div>
                </div>
              </div>
              <p className="rounded-lg rounded-tl-sm bg-slate-50 px-3 py-2.5 leading-relaxed text-slate-800 ring-1 ring-slate-200">{p.brief.message}</p>
            </div>
          </div>
        </section>

        <section className="bg-[#f3f2f1]">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">Your dashboard</h2>
            <p className="mt-1 text-slate-600">Each step you solve adds a visual. Finish them all to complete the page.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}>
              {tiles.map((t, i) => {
                const ok = done.has(t.step.id);
                const small = t.spec.type === 'card';
                const wide = t.spec.type === 'table' && t.spec.values.length >= 3;
                return (
                  <figure
                    key={t.step.id}
                    className={`min-w-0 rounded-lg border bg-white p-3 ${wide ? 'sm:col-span-2' : ''} ${ok ? 'border-[#d6d3cf]' : 'border-dashed border-slate-300'}`}
                    data-testid={`tile-${t.step.id}`}
                  >
                    <figcaption className="mb-1 truncate text-[13px] font-semibold text-[#252423]">{t.title}</figcaption>
                    <div className={small ? 'h-28' : 'h-56'}>
                      {ok ? (
                        <Chart result={results[i]} type={t.spec.type} format={{ ...t.spec.format, xTitle: false, yTitle: false }} compact={small} />
                      ) : (
                        <Link to={`/exercise/${t.step.id}`} className="flex h-full flex-col items-center justify-center gap-1 rounded bg-slate-50 text-center text-sm text-slate-500 hover:text-brand-700">
                          <span className="text-2xl text-slate-300">＋</span>
                          Solve step {p.steps.indexOf(t.step) + 1} to add this visual
                        </Link>
                      )}
                    </div>
                  </figure>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">Steps</h2>
            <ol className="mt-4 space-y-2">
              {p.steps.map((s, i) => (
                <li key={s.id}>
                  <Link to={`/exercise/${s.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:border-brand-500">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done.has(s.id) ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {done.has(s.id) ? '✓' : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{s.title}</span>
                      <span className="block truncate text-sm text-slate-500">{s.scenario?.deliver}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{s.level}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          <aside className="min-w-0">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">Build it in Power BI Desktop</h2>
              <p className="mt-2 text-sm text-slate-600">
                Download the data as CSV files plus a step-by-step brief, and build the same dashboard in the real Power BI Desktop. Check your numbers against the dashboard above.
              </p>
              {canDownload ? (
                <button onClick={downloadAll} className="mt-4 w-full rounded-lg bg-ink px-4 py-2.5 font-semibold text-white hover:bg-[#22313d]" data-testid="download">
                  Download the data (ZIP)
                </button>
              ) : (
                <Link to="/pricing" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-ink hover:border-brand-500">
                  <LockIcon /> Download with Pro
                </Link>
              )}
              <p className="mt-2 text-xs text-slate-500">One ZIP file: 6 CSV tables (Sales, Product, Customer, Date, Store, Targets) and the project brief. The data is fictional.</p>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}
