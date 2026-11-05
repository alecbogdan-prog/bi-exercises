import { Link } from 'react-router-dom';
import { completedIds } from '../lib/storage';
import { PROJECTS } from '../projects/projects';
import { LockIcon } from './ProLock';
import { ProgressBar } from './Progress';

/** One card per end-to-end project, with the learner's progress. */
export function ProjectCards() {
  const done = new Set(completedIds());
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PROJECTS.map((p) => {
        const solved = p.steps.filter((s) => done.has(s.id)).length;
        return (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="group flex min-w-0 flex-col rounded-xl border-l-4 border-l-brand-500 bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
            data-testid={`project-${p.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-xl font-extrabold tracking-tight text-ink uppercase group-hover:text-brand-700">{p.title}</h3>
              {p.free ? (
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">FREE</span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                  <LockIcon className="h-3 w-3" /> PRO
                </span>
              )}
            </div>
            <p className="mt-1 flex-1 text-sm text-slate-600">{p.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.skills.map((s) => (
                <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <ProgressBar value={solved / p.steps.length} className="flex-1" />
              <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                {solved}/{p.steps.length} steps
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
