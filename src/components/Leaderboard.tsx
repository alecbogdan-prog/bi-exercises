import { Link } from 'react-router-dom';
import { accountsEnabled } from '../lib/supabase';
import { useAccount } from '../lib/account';
import { useLeaderboard } from '../lib/leaderboard';
import type { LeaderRow } from '../lib/leaderboard';
import type { Stats } from '../lib/storage';

// Power BI's default theme colours by rank; the signed-in learner always gets the orange one.
const RANK_COLORS = ['#118DFF', '#12239E', '#6B007B', '#E044A7'];
const ME = '#E66C37';
const TOP = 4;

interface Tile {
  row: LeaderRow;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Treemap layout for a handful of tiles: the biggest takes its share of the long side, the rest
 * fill what is left, switching direction each time (so 1st is a big block, 2nd and 3rd stack beside it).
 */
function layout(rows: LeaderRow[], x: number, y: number, w: number, h: number): Tile[] {
  if (!rows.length) return [];
  if (rows.length === 1) return [{ row: rows[0], x, y, w, h }];
  const total = rows.reduce((a, r) => a + r.value, 0);
  const share = rows[0].value / total;
  if (w >= h) {
    const w0 = w * share;
    return [{ row: rows[0], x, y, w: w0, h }, ...layout(rows.slice(1), x + w0, y, w - w0, h)];
  }
  const h0 = h * share;
  return [{ row: rows[0], x, y, w, h: h0 }, ...layout(rows.slice(1), x, y + h0, w, h - h0)];
}

/** Today's top learners as a Power BI treemap: the bigger the tile, the more points. */
function Treemap({ rows }: { rows: LeaderRow[] }) {
  const tiles = layout(rows, 0, 0, 100, 100);
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md" role="img" aria-label={`Today's top ${rows.length} learners by points`}>
      {tiles.map(({ row, x, y, w, h }) => {
        const big = w * h > 1200;
        return (
          <div
            key={row.rank}
            className="absolute flex flex-col justify-between overflow-hidden border-2 border-white p-2 text-white"
            style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, background: row.isMe ? ME : RANK_COLORS[(row.rank - 1) % RANK_COLORS.length] }}
            title={`${row.rank}. ${row.name}: ${row.value.toLocaleString()} pts`}
          >
            <div className="flex min-w-0 items-start gap-1">
              <span className={`shrink-0 font-bold ${big ? 'text-2xl leading-none' : 'text-sm'}`}>{row.rank === 1 ? '🏆' : `#${row.rank}`}</span>
              <span className={`min-w-0 truncate font-semibold ${big ? 'text-[15px]' : 'text-[12px]'}`}>
                {row.name}
                {row.isMe && ' (you)'}
              </span>
            </div>
            <span className={`font-bold tabular-nums ${big ? 'text-2xl' : 'text-[13px]'}`}>
              {row.value.toLocaleString()}
              <span className="ml-0.5 text-[11px] font-normal opacity-80">pts</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The leaderboard: today's top 4 as a treemap (first place takes the most room),
 * then your points and streak, and who holds the longest streak.
 */
export function Leaderboard({ stats, compact = false }: { stats: Stats; compact?: boolean }) {
  const { email } = useAccount();
  const board = useLeaderboard(TOP, stats.total);
  if (!accountsEnabled || board === null) return null;
  const top = (board?.points ?? []).filter((r) => r.rank <= TOP && r.value > 0);
  const topStreak = board?.streaks[0];

  return (
    <section
      className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${compact ? '' : 'sm:max-w-md'}`}
      style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}
      data-testid="leaderboard"
    >
      <h2 className="text-[15px] font-semibold text-[#252423]">Today's leaders</h2>
      <p className="mb-2 text-[12px] text-[#605e5c]">Points earned today, top {TOP}</p>

      {board === undefined ? (
        <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
      ) : top.length ? (
        <Treemap rows={top} />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-md border-2 border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
          Nobody has scored today yet. Solve an exercise and take the whole square!
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <div className="text-[11px] text-slate-500">Your points today</div>
          <div className="text-lg font-bold text-ink tabular-nums">{stats.today.toLocaleString()}</div>
        </div>
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <div className="text-[11px] text-slate-500">Your streak</div>
          <div className="text-lg font-bold text-ink tabular-nums">
            {stats.streak} {stats.streak === 1 ? 'day' : 'days'} {stats.streak > 0 && <span aria-hidden="true">🔥</span>}
          </div>
        </div>
      </div>
      {topStreak && (
        <p className="mt-2 text-[12px] text-slate-500">
          Longest streak now: <b className="text-slate-700">{topStreak.name}</b>, {topStreak.value} {topStreak.value === 1 ? 'day' : 'days'}
        </p>
      )}
      {!email && (
        <p className="mt-2 text-[12px] text-slate-500">
          <Link to="/login" className="underline underline-offset-2 hover:text-brand-700">
            Log in
          </Link>{' '}
          or{' '}
          <Link to="/signup" className="underline underline-offset-2 hover:text-brand-700">
            create an account
          </Link>{' '}
          to appear on the leaderboard.
        </p>
      )}
    </section>
  );
}
