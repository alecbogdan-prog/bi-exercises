import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EXERCISES } from '../exercises/exercises';
import type { Exercise } from '../exercises/types';
import { freeExercises, nextFreeAfter } from '../lib/access';

export function LockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

const PRO_PERKS = [`All ${EXERCISES.length} exercises, including Power Query, modeling and advanced DAX`, 'Hints, full solutions and explanations', 'Progress saved on every device'];

/** Short card in the exercise panel, in place of Check answer and hints. */
export function ProUnlockCard({ ex }: { ex: Exercise }) {
  const free = nextFreeAfter(ex);
  return (
    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="pro-lock">
      <div className="flex items-center gap-2 font-semibold text-amber-900">
        <LockIcon /> This is a Pro exercise
      </div>
      <p className="mt-1 text-sm text-slate-700">You can read the request and the expected result. Unlock Pro to build it in the editor and get it checked.</p>
      <Link to="/pricing" className="mt-3 block rounded-lg bg-brand-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-brand-600">
        Unlock with Pro
      </Link>
      {free && (
        <Link to={`/exercise/${free.id}`} className="mt-2 block text-center text-sm font-medium text-brand-700 hover:underline">
          Try a free exercise instead →
        </Link>
      )}
    </div>
  );
}

/** The report editor, dimmed and not clickable, with the unlock message on top. */
export function LockedEditor({ ex, children }: { ex: Exercise; children: ReactNode }) {
  const free = nextFreeAfter(ex);
  return (
    <div className="relative h-full min-h-[680px] lg:min-h-0">
      <div inert className="pointer-events-none h-full opacity-60 blur-[2px] select-none" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/30 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <LockIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink">Unlock this exercise with Pro</h2>
          <ul className="mt-4 space-y-2 text-left text-sm text-slate-700">
            {PRO_PERKS.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-brand-600">✓</span>
                {p}
              </li>
            ))}
          </ul>
          <Link to="/pricing" className="mt-5 block rounded-full bg-brand-500 px-6 py-3 font-display text-lg font-extrabold text-white shadow-[0_4px_0_var(--color-brand-700)] hover:bg-brand-600">
            See Pro plans
          </Link>
          {free && (
            <Link to={`/exercise/${free.id}`} className="mt-3 block text-sm font-semibold text-brand-700 hover:underline">
              Or keep practicing for free: {free.title} →
            </Link>
          )}
          <p className="mt-4 text-xs text-slate-500">
            {freeExercises().length} exercises are free: the first two in every chapter. Already Pro?{' '}
            <Link to="/login" className="font-semibold text-ink hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
