import type { ProgressSnapshot } from './progressMerge';

export interface MemberStats {
  solved: number;
  points: number;
  /** Consecutive days with points, ending today or yesterday. */
  streak: number;
  /** Best PL-300 practice test score (0–100), or null if none taken. */
  pl300Best: number | null;
}

const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Summary of one member's synced progress, for the team manager's dashboard. */
export function memberStats(data: Partial<ProgressSnapshot> | null | undefined, now = new Date()): MemberStats {
  const solved = new Set(data?.completed ?? []).size;
  const awarded = data?.points?.awarded ?? {};
  const days = data?.points?.days ?? {};
  const points = Object.values(awarded).reduce((a, b) => a + (Number(b) || 0), 0);
  // A streak still counts if the member hasn't practiced yet today.
  const d = new Date(now);
  if (days[day(d)] === undefined) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days[day(d)] !== undefined) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  const scores = Object.values(data?.pl300 ?? {}).map(Number).filter((n) => Number.isFinite(n));
  return { solved, points, streak, pl300Best: scores.length ? Math.max(...scores) : null };
}

/** Totals across the team. */
export function teamTotals(members: MemberStats[]): { solved: number; active: number; avgPl300: number | null } {
  const tested = members.filter((m) => m.pl300Best !== null).map((m) => m.pl300Best as number);
  return {
    solved: members.reduce((a, m) => a + m.solved, 0),
    active: members.filter((m) => m.solved > 0 || m.streak > 0).length,
    avgPl300: tested.length ? Math.round(tested.reduce((a, b) => a + b, 0) / tested.length) : null,
  };
}

export interface ChapterProgress {
  id: string;
  title: string;
  done: number;
  total: number;
  /** 0–100, rounded. */
  pct: number;
}

/** Share of each chapter's exercises a member has solved (project steps are not counted). */
export function chapterProgress(completed: string[] | undefined, chapters: { id: string; title: string }[], exercises: { id: string; module: string }[]): ChapterProgress[] {
  const done = new Set(completed ?? []);
  return chapters.map((c) => {
    const ids = exercises.filter((e) => e.module === c.id).map((e) => e.id);
    const n = ids.filter((id) => done.has(id)).length;
    return { id: c.id, title: c.title, done: n, total: ids.length, pct: ids.length ? Math.round((n / ids.length) * 100) : 0 };
  });
}

const csvCell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV rows (header first) for the manager's export; opens directly in Excel. */
export function teamCsv(
  rows: { email: string; status: string; joined: string; lastActive: string; stats: MemberStats; chapters: ChapterProgress[] }[],
): string {
  const chapterHeaders = rows[0]?.chapters.map((c) => `${c.title} (%)`) ?? [];
  const header = ['Email', 'Status', 'Joined', 'Last active', 'Exercises solved', 'Points', 'Streak (days)', 'PL-300 best (%)', ...chapterHeaders];
  const lines = rows.map((r) => [r.email, r.status, r.joined, r.lastActive, r.stats.solved, r.stats.points, r.stats.streak, r.stats.pl300Best ?? '', ...r.chapters.map((c) => c.pct)]);
  return [header, ...lines].map((l) => l.map(csvCell).join(',')).join('\r\n');
}
