import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Exercise } from '../exercises/types';
import type { Stats } from '../lib/storage';

export type LessonStatus = 'done' | 'progress' | 'new';

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-200 ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ s }: { s: LessonStatus }) {
  if (s === 'done') return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">✓</span>;
  if (s === 'progress') return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-amber-400 bg-amber-100" title="In progress" />;
  return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />;
}

/** Chapter header for the exercise panel: progress bar plus the chapter's lesson list with statuses. */
export function ChapterProgress({
  title,
  lessons,
  currentId,
  status,
  kind = 'chapter',
}: {
  title: string;
  lessons: Exercise[];
  currentId: string;
  status: (id: string) => LessonStatus;
  kind?: 'chapter' | 'project';
}) {
  const [open, setOpen] = useState(false);
  const done = lessons.filter((l) => status(l.id) === 'done').length;
  const index = lessons.findIndex((l) => l.id === currentId);
  return (
    <div className="mb-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200" data-testid="chapter-progress">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 text-left" aria-expanded={open}>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            {kind === 'project' ? 'Project · step' : 'Chapter · lesson'} {index + 1} of {lessons.length}
          </span>
          <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        </span>
        <span className="shrink-0 text-xs text-slate-500">{open ? 'Hide lessons ▴' : 'All lessons ▾'}</span>
      </button>
      <div className="mt-2 flex items-center gap-2">
        <ProgressBar value={lessons.length ? done / lessons.length : 0} className="flex-1" />
        <span className="w-24 shrink-0 text-right text-xs font-medium text-slate-600 tabular-nums" data-testid="chapter-count">
          {done}/{lessons.length} · {lessons.length ? Math.round((done / lessons.length) * 100) : 0}%
        </span>
      </div>
      {open && (
        <ol className="mt-3 max-h-72 space-y-0.5 overflow-y-auto border-t border-slate-200 pt-2" data-testid="lesson-list">
          {lessons.map((l, i) => {
            const s = status(l.id);
            const current = l.id === currentId;
            return (
              <li key={l.id}>
                <Link
                  to={`/exercise/${l.id}`}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${current ? 'bg-white font-semibold text-ink shadow-sm ring-1 ring-slate-200' : 'text-slate-700 hover:bg-white'}`}
                >
                  <StatusBadge s={s} />
                  <span className="min-w-0 flex-1 truncate">
                    {i + 1}. {l.title}
                  </span>
                  {s === 'progress' && !current && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">IN PROGRESS</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Small points/streak summary for the header. */
export function StatsChip({ stats }: { stats: Stats }) {
  return (
    <div className="hidden items-center gap-3 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 md:flex" data-testid="stats">
      <span title="Points earned today">
        <b className="tabular-nums text-ink">{stats.today}</b> pts today
      </span>
      <span className="h-3 w-px bg-slate-300" />
      <span title="Days in a row with at least one solved exercise">
        <b className="tabular-nums text-ink">{stats.streak}</b> day streak
      </span>
    </div>
  );
}

/** Bottom bar shown after a correct answer. Enter continues to the next lesson. */
export function SuccessBar({ points, nextId, onClose, done }: { points: number; nextId?: string; onClose: () => void; done?: { href: string; label: string } }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== 'Enter' || (el && ['TEXTAREA', 'INPUT', 'SELECT'].includes(el.tagName))) return;
      if (nextId) setGo(true);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextId, onClose]);
  useEffect(() => {
    if (go && nextId) document.getElementById('continue-link')?.click();
  }, [go, nextId]);
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-200 bg-brand-50/95 backdrop-blur" role="status" data-testid="success-bar">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-xl font-extrabold text-brand-700">Correct!</span>
          {points > 0 ? <span className="font-semibold text-brand-600 tabular-nums">+{points} pts</span> : <span className="text-sm text-slate-500">Already solved, no new points</span>}
          <Link to="/signup" className="text-sm font-medium text-slate-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700">
            Save your progress: create a free account
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-ink">
            Stay here
          </button>
          {nextId ? (
            <Link id="continue-link" to={`/exercise/${nextId}`} className="rounded-lg bg-brand-600 px-5 py-2.5 text-center font-semibold text-white shadow-sm hover:bg-brand-700">
              Continue →<span className="block text-[10px] font-normal opacity-80">or press Enter</span>
            </Link>
          ) : (
            <Link to={done?.href ?? '/exercises'} className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
              {done?.label ?? 'All exercises done 🎉'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
