import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Chart } from './Chart';
import { LockIcon } from './ProLock';
import { computeVisual } from '../engine/visual';
import { canOpen } from '../lib/access';
import { engineFor } from '../lib/base';
import { FESTIVAL } from '../engine/festival';
import { completedIds } from '../lib/storage';
import { dashboardTiles, projectMeasures } from '../projects/projects';
import type { Project } from '../projects/projects';
import { EXERCISES } from '../exercises/exercises';
import { MODULES } from '../exercises/types';

/** The finished dashboard of a project, drawn small with the real engine (not a screenshot, so it never goes stale). */
function MiniDashboard({ project: p }: { project: Project }) {
  const tiles = useMemo(() => dashboardTiles(p), [p]);
  const results = useMemo(() => {
    const engine = engineFor(p).withMeasures(projectMeasures(p));
    return tiles.map((t) => computeVisual(engine, t.spec));
  }, [p, tiles]);
  return (
    <div className="overflow-hidden rounded-xl bg-[#f3f2f1] ring-1 ring-slate-200" style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }} data-testid="project-preview-dashboard">
      <div className="flex items-center gap-2 bg-ink px-3 py-2 text-[13px] font-semibold text-white">
        <span className="h-2.5 w-2.5 rounded-sm bg-[#f2c811]" aria-hidden="true" />
        {(() => {
          const org = p.dataset === 'festival' ? FESTIVAL : 'Ridgeline Cycles';
          return p.title.startsWith(org) ? p.title : `${org} · ${p.title}`;
        })()}
      </div>
      <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
        {tiles.map((t, i) => {
          const card = t.spec.type === 'card';
          const wide = t.spec.type === 'table' && t.spec.values.length >= 3;
          return (
            <figure key={t.step.id} className={`min-w-0 rounded-md bg-white p-2 ${wide ? 'col-span-2 sm:col-span-3' : ''}`}>
              <figcaption className="mb-0.5 truncate text-[11px] font-semibold text-[#252423]">{t.title}</figcaption>
              <div className={card ? 'h-14' : 'h-32'}>
                <Chart result={results[i]} type={t.spec.type} format={{ ...t.spec.format, xTitle: false, yTitle: false }} compact />
              </div>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

/** The chapters a project's steps come from, each linked to its first exercise: what to practise before (or alongside) the project. */
export function SkillsToKnow({ project: p, onNavigate }: { project: Project; onNavigate?: () => void }) {
  const ids = [...new Set(p.steps.map((s) => s.module))];
  const chapters = MODULES.filter((m) => ids.includes(m.id));
  return (
    <div data-testid="skills-to-know">
      <div className="mb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">Skills to know</div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {chapters.map((m) => {
          const first = EXERCISES.find((e) => e.module === m.id);
          return (
            <li key={m.id}>
              <Link to={first ? `/exercise/${first.id}` : '/exercises'} onClick={onNavigate} className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline">
                {m.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Opens when a project card is clicked: the finished dashboard, what you will do, and a button to start. */
export function ProjectPreview({ project: p, onClose }: { project: Project; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const done = new Set(completedIds());
  const solved = p.steps.filter((s) => done.has(s.id)).length;
  const next = p.steps.find((s) => !done.has(s.id)) ?? p.steps[0];
  const locked = !canOpen(p.steps[0]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-preview-title"
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        data-testid="project-preview"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="project-preview-title" className="text-xl font-extrabold tracking-tight text-ink">
              {p.title}
            </h2>
            <p className="text-sm text-slate-500">
              {p.steps.length} steps · {solved ? `${solved} done` : 'ends in a finished dashboard'}
            </p>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-ink">
            ×
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <MiniDashboard project={p} />
          <p className="text-[16px] leading-relaxed text-slate-700">{p.tagline}</p>
          <SkillsToKnow project={p} onNavigate={onClose} />
          <div className="flex flex-wrap gap-1.5">
            {p.skills.map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-4">
          {locked ? (
            <>
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <LockIcon className="h-3.5 w-3.5" /> This project is part of Pro.
              </span>
              <span className="flex-1" />
              <Link to={`/projects/${p.id}`} className="text-sm font-semibold text-slate-600 hover:text-ink hover:underline">
                See the steps
              </Link>
              <Link to="/pricing" className="rounded-full bg-brand-500 px-5 py-2.5 font-bold text-white hover:bg-brand-600">
                Unlock with Pro
              </Link>
            </>
          ) : (
            <>
              <Link to={`/projects/${p.id}`} className="text-sm font-semibold text-slate-600 hover:text-ink hover:underline">
                See all steps
              </Link>
              <span className="flex-1" />
              <Link to={`/exercise/${next.id}`} className="rounded-full bg-brand-500 px-5 py-2.5 font-bold text-white hover:bg-brand-600" data-testid="project-preview-start">
                {solved === 0 ? 'Start the project →' : solved === p.steps.length ? 'Review the steps →' : `Continue: step ${p.steps.indexOf(next) + 1} →`}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
