import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Exercise } from '../exercises/types';
import type { Stats } from '../lib/storage';
import type { CheckResult } from '../exercises/checker';

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
    <div className="mb-4" data-testid="chapter-progress">
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

/** Always-visible lesson list for the focused exercise layout (like a course sidebar). */
export function LessonList({ lessons, currentId, status }: { lessons: Exercise[]; currentId: string; status: (id: string) => LessonStatus }) {
  return (
    <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200" data-testid="lesson-list">
      {lessons.map((l, i) => {
        const s = status(l.id);
        const current = l.id === currentId;
        return (
          <li key={l.id}>
            <Link
              to={`/exercise/${l.id}`}
              aria-current={current ? 'page' : undefined}
              className={`flex items-center gap-2 px-3 py-2 text-[13px] ${current ? 'border-l-4 border-brand-500 bg-brand-50 pl-2 font-semibold text-ink' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <StatusBadge s={s} />
              <span className="min-w-0 flex-1 truncate">
                {i + 1}. {l.title}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
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

function typing(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  return !!t && (['TEXTAREA', 'INPUT', 'SELECT'].includes(t.tagName) || t.isContentEditable);
}

/**
 * The exercise page's bottom bar: Skip and Reset on the left, Check answer on the right.
 * After a check it turns into the feedback: what is still wrong, or "Correct!" with the points and Continue.
 * Keys: Ctrl/⌘+Enter checks from anywhere; Enter (outside a text field) checks, or continues once solved.
 */
export function ActionBar({
  result,
  misses,
  points,
  nextId,
  done,
  onCheck,
  onReset,
  onShowAnswer,
  inset = false,
}: {
  result: CheckResult | null;
  misses: number;
  points: number | null;
  nextId?: string;
  done?: { href: string; label: string };
  onCheck: () => void;
  onReset: () => void;
  onShowAnswer: () => void;
  /** Line the bar's contents up with the middle column of the focused layout ('wide': no right-hand column). */
  inset?: boolean | 'wide';
}) {
  const ok = !!result?.ok;
  const inner = `flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5 ${inset ? `mx-auto max-w-[1600px] px-4 lg:pl-[344px] ${inset === 'wide' ? 'lg:pr-6' : 'lg:pr-[324px]'}` : 'px-4'}`;
  const [go, setGo] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.altKey) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod && typing(e.target)) return;
      e.preventDefault();
      if (ok) {
        if (nextId) setGo(true);
      } else onCheck();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ok, nextId, onCheck]);
  useEffect(() => {
    if (go) document.getElementById('continue-link')?.click();
  }, [go]);

  const skip = nextId && !ok && (
    <Link to={`/exercise/${nextId}`} className="rounded-full border border-slate-300 bg-white px-5 py-2 text-[15px] font-semibold text-slate-600 hover:border-slate-400 hover:text-ink">
      Skip
    </Link>
  );

  if (ok) {
    return (
      <div className="shrink-0 border-t border-emerald-200 bg-emerald-50" role="status" data-testid="success-bar">
        <div className={inner}>
          <span className="text-xl font-extrabold text-emerald-700">Correct!</span>
          {points ? <span className="font-semibold text-emerald-600 tabular-nums">+{points} pts</span> : <span className="text-sm text-slate-500">Already solved, no new points</span>}
          <span className="flex-1" />
          {nextId ? (
            <Link id="continue-link" to={`/exercise/${nextId}`} className="rounded-full bg-emerald-600 px-7 py-2.5 text-center text-base font-semibold text-white shadow-sm hover:bg-emerald-700" title="or press Enter">
              Continue →
            </Link>
          ) : (
            <Link to={done?.href ?? '/exercises'} className="rounded-full bg-emerald-600 px-7 py-2.5 text-base font-semibold text-white hover:bg-emerald-700">
              {done?.label ?? 'All exercises done 🎉'}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`shrink-0 border-t ${result ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-100'}`} data-testid="action-bar">
      <div className={inner}>
        <div className="flex items-center gap-2">
          {skip}
          <button onClick={onReset} className="rounded-full px-3 py-2 text-[15px] font-medium text-slate-500 hover:text-ink" title="Start this exercise over">
            Reset
          </button>
        </div>
        <div className="min-w-0 flex-1 basis-64" aria-live="polite">
          {result && (
            <div className="flex items-start gap-3 text-sm" data-testid="feedback">
              <span className="shrink-0 rounded-md bg-red-600 px-2 py-0.5 font-bold text-white">Not yet{misses > 1 ? ` (${misses})` : ''}</span>
              <ul className="min-w-0 flex-1 space-y-0.5 text-red-900">
                {result.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <div className="flex shrink-0 gap-3">
                {misses >= 2 && (
                  <button onClick={onShowAnswer} className="font-semibold text-red-700 hover:underline">
                    Show answer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        {!result && <span className="ml-auto hidden text-sm text-slate-400 sm:inline">or press Enter</span>}
        <button onClick={onCheck} data-testid="check-answer" className="rounded-full bg-brand-500 px-7 py-2.5 text-center text-base font-semibold text-white shadow-sm hover:bg-brand-600" title="Enter, or Ctrl+Enter while typing">
          Check answer
        </button>
      </div>
    </div>
  );
}
