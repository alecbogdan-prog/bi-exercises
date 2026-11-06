import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { accountsEnabled } from '../lib/supabase';
import { useAccount } from '../lib/account';
import { useLeaderboard } from '../lib/leaderboard';
import type { LeaderRow } from '../lib/leaderboard';
import type { Stats } from '../lib/storage';

function Rows({ rows, unit, top }: { rows: LeaderRow[] | undefined; unit: string; top: number }) {
  if (!rows) return <p className="py-1 text-sm text-slate-400">Loading…</p>;
  const shown = rows.filter((r) => r.rank <= top);
  const me = rows.find((r) => r.isMe && r.rank > top);
  if (!shown.length) return <p className="py-1 text-sm text-slate-500">Nobody yet today. Be the first!</p>;
  return (
    <ol className="space-y-1 text-[15px] text-slate-700">
      {[...shown, ...(me ? [me] : [])].map((r) => (
        <li key={`${r.rank}-${r.name}`} className={`flex items-baseline gap-2 ${r.isMe ? 'font-semibold text-brand-700' : ''}`}>
          <span className="min-w-0 flex-1 truncate">
            {r.rank}. {r.name}
          </span>
          <span className="shrink-0 tabular-nums">
            {r.value.toLocaleString()}
            {unit && (r.value === 1 ? unit.replace(/s$/, '') : unit)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Board({ title, icon, rows, unit, top, mineLabel, mine, children }: { title: string; icon: string; rows: LeaderRow[] | undefined; unit: string; top: number; mineLabel: string; mine: number; children: ReactNode }) {
  return (
    <section className="rounded-lg border-l-4 border-brand-500 bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-2 text-lg leading-tight font-extrabold tracking-tight text-brand-600 uppercase">
        {title} <span aria-hidden="true">{icon}</span>
      </h2>
      <Rows rows={rows} unit={unit} top={top} />
      <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-2 font-bold text-ink">
        <span>{mineLabel}</span>
        <span className="text-brand-600 tabular-nums">{mine}</span>
      </div>
      <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

/**
 * Today's high scores and streaks as two cards. `compact` stacks them (exercise page sidebar);
 * otherwise they sit side by side (exercises page).
 */
export function Leaderboard({ stats, compact = false }: { stats: Stats; compact?: boolean }) {
  const { email } = useAccount();
  const top = compact ? 3 : 5;
  const board = useLeaderboard(top, stats.total);
  if (!accountsEnabled || board === null) return null;
  return (
    <div className={compact ? 'space-y-5' : 'grid gap-4 sm:grid-cols-2'} data-testid="leaderboard">
      <Board title="Today's high scores" icon="📈" rows={board?.points} unit="" top={top} mineLabel="My points today:" mine={stats.today}>
        {email ? (
          'Solve an exercise without hints for 50 bonus points.'
        ) : (
          <>
            You won't appear on the leaderboard until you{' '}
            <Link to="/login" className="underline underline-offset-2 hover:text-brand-700">
              log in
            </Link>{' '}
            or{' '}
            <Link to="/signup" className="underline underline-offset-2 hover:text-brand-700">
              create an account
            </Link>
            .
          </>
        )}
      </Board>
      <Board title="Today's high streaks" icon="🔥" rows={board?.streaks} unit=" days" top={top} mineLabel="My streak today:" mine={stats.streak}>
        {stats.streak ? 'Complete a lesson tomorrow to keep your streak going!' : 'Complete a lesson today to start your streak!'}
      </Board>
    </div>
  );
}
