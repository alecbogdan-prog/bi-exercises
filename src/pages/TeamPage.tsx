import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { BRAND } from '../lib/base';
import { isTeamLive, refreshAccount, useAccount } from '../lib/account';
import type { Team } from '../lib/account';
import { inviteToTeam, openPortal } from '../lib/billing';
import { supabase } from '../lib/supabase';
import { ENTERPRISE_EMAIL } from '../lib/enterprise';
import { chapterProgress, memberStats, teamCsv, teamTotals } from '../lib/teamStats';
import { EXERCISES } from '../exercises/exercises';
import { MODULES } from '../exercises/types';
import type { ProgressSnapshot } from '../lib/progressMerge';


interface MemberRow {
  email: string;
  role: 'owner' | 'member';
  user_id: string | null;
  invited_at: string;
  joined_at: string | null;
  data: Partial<ProgressSnapshot> | null;
  last_active: string | null;
}

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const ago = (iso: string | null) => {
  if (!iso) return 'Never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
};

/** Short chapter names for the progress grid header. */
const SHORT: Record<string, string> = {
  reports: 'Reports',
  filters: 'Filters',
  pages: 'Pages',
  powerquery: 'Power Query',
  modeling: 'Modeling',
  columns: 'Columns',
  'dax-basics': 'DAX basics',
  calculate: 'CALCULATE',
  'dax-advanced': 'Adv. DAX',
  time: 'Time intel.',
};

/** Cell colour by completion: grey (not started) → light → dark brand. */
const heat = (pct: number) => (pct === 0 ? 'bg-slate-100 text-slate-400' : pct < 34 ? 'bg-amber-100 text-amber-900' : pct < 67 ? 'bg-amber-300 text-amber-950' : pct < 100 ? 'bg-emerald-300 text-emerald-950' : 'bg-emerald-600 text-white');

const STATUS_LABEL: Record<string, string> = {
  invited: 'Added',
  already_member: 'Already on the team',
  invalid: 'Not a valid email',
  no_seats: 'No free seats',
  error: 'Error',
};

/** Enterprise team: the manager's dashboard (members, progress, invites, billing), or a member's team info. */
export default function TeamPage() {
  const account = useAccount();
  const navigate = useNavigate();
  const team = account.team;

  useEffect(() => {
    document.title = `Your team | ${BRAND}`;
  }, []);

  useEffect(() => {
    if (account.ready && !account.email) navigate('/login?next=%2Fteam', { replace: true });
  }, [account.ready, account.email, navigate]);

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {!account.ready ? (
          <p className="text-slate-500">Loading…</p>
        ) : !team ? (
          <NoTeam />
        ) : team.role === 'owner' ? (
          <OwnerDashboard team={team} />
        ) : (
          <MemberView team={team} />
        )}
      </main>
      <Footer />
    </div>
  );
}

function NoTeam() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Power BI training for your team</h1>
      <p className="mt-3 text-slate-600">
        Give every analyst Pro access, follow their progress in one dashboard, and pay with a single company invoice. Tell us how many people you want to train and we'll send you an offer.
      </p>
      <a
        href={`mailto:${ENTERPRISE_EMAIL}?subject=${encodeURIComponent('Enterprise plan for my team')}`}
        className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700"
      >
        Contact us
      </a>
      <p className="mt-4 text-sm text-slate-500">
        Already invited by your company? Sign in with the email address your manager used. <Link to="/pricing" className="font-semibold text-brand-700 hover:underline">See plans</Link>
      </p>
    </div>
  );
}

function MemberView({ team }: { team: Team }) {
  const live = isTeamLive(team);
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Your team</div>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">{team.name}</h1>
      <p className="mt-2 text-slate-600">
        {live ? 'Your company gives you Pro: every exercise, project and PL-300 practice test.' : 'Your team plan is not active right now. Please contact your manager.'}
        {team.owner_email && (
          <>
            {' '}
            Managed by <span className="font-semibold text-ink">{team.owner_email}</span>.
          </>
        )}
      </p>
      {live && (
        <Link to="/exercises" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
          Start practicing
        </Link>
      )}
    </div>
  );
}

function OwnerDashboard({ team }: { team: Team }) {
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [name, setName] = useState(team.name);
  const [emails, setEmails] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ email: string; status: string; message?: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = isTeamLive(team);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error: e } = await supabase.rpc('team_progress', { t: team.id });
    if (e) setError(e.message);
    else setMembers((data as MemberRow[]) ?? []);
  }, [team.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => (members ?? []).map((m) => memberStats(m.data)), [members]);
  const chapters = useMemo(() => (members ?? []).map((m) => chapterProgress(m.data?.completed, MODULES, EXERCISES)), [members]);

  const exportCsv = () => {
    if (!members) return;
    const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
    const csv = teamCsv(
      members.map((m, i) => ({
        email: m.email,
        status: m.role === 'owner' ? 'Manager' : m.user_id ? 'Joined' : 'Invited',
        joined: day(m.joined_at),
        lastActive: m.user_id ? day(m.last_active) : '',
        stats: stats[i],
        chapters: chapters[i],
      })),
    );
    // The BOM makes Excel read the file as UTF-8.
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${team.name.replace(/[^\w-]+/g, '_')}_progress_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const totals = teamTotals(stats);
  const used = members?.length ?? team.used;
  const free = Math.max(0, team.seats - used);

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    const list = emails.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    if (!list.length) return;
    setBusy(true);
    setError(null);
    try {
      const r = await inviteToTeam(list);
      setResults(r.results);
      setEmails('');
      await Promise.all([load(), refreshAccount()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send invites.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (email: string) => {
    if (!supabase || !window.confirm(`Remove ${email} from the team? Their Pro access ends.`)) return;
    const { error: e } = await supabase.from('team_members').delete().eq('team_id', team.id).eq('email', email);
    if (e) setError(e.message);
    await Promise.all([load(), refreshAccount()]);
  };

  const rename = async () => {
    if (!supabase || name.trim() === team.name) return;
    const { error: e } = await supabase.rpc('rename_team', { t: team.id, new_name: name });
    if (e) setError(e.message);
    else await refreshAccount();
  };

  const billing = async () => {
    try {
      await openPortal('team');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing.');
    }
  };

  return (
    <div data-testid="team-dashboard">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Team dashboard</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void rename()}
            aria-label="Team name"
            className="mt-1 w-full max-w-md rounded-lg border border-transparent bg-transparent px-1 font-display text-3xl font-extrabold tracking-tight text-ink hover:border-slate-200 focus:border-brand-500 focus:outline-none"
          />
          <p className="mt-1 px-1 text-sm text-slate-600">
            {live ? (team.cancel_at_period_end ? 'Ends on ' : 'Renews on ') : 'Not active · '}
            {date(team.current_period_end)}
            {team.status === 'past_due' && ' · Invoice overdue'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} disabled={!members?.length} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-brand-500 disabled:opacity-50">
            Export report (CSV)
          </button>
          <button type="button" onClick={() => void billing()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-brand-500">
            Invoices & billing
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          ['Seats used', `${used} / ${team.seats}`],
          ['Active learners', `${totals.active}`],
          ['Exercises solved', `${totals.solved}`],
          ['Avg. PL-300 score', totals.avgPl300 === null ? '—' : `${totals.avgPl300}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{value}</div>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-ink">Invite colleagues</h2>
        <p className="mt-1 text-sm text-slate-600">
          {free > 0 ? `${free} free seat${free === 1 ? '' : 's'}. ` : 'All seats are used. '}
          New people get an email with a sign-in link; people who already have an account get access next time they open the site.
          {free === 0 && (
            <>
              {' '}
              Need more seats?{' '}
              <a href={`mailto:${ENTERPRISE_EMAIL}?subject=${encodeURIComponent(`More seats for ${team.name}`)}`} className="font-semibold text-brand-700 hover:underline">
                Email us
              </a>
              .
            </>
          )}
        </p>
        <form onSubmit={(e) => void invite(e)} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={2}
            placeholder="ana@company.com, mihai@company.com"
            aria-label="Email addresses to invite"
            disabled={!live || free === 0}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50"
          />
          <button type="submit" disabled={busy || !live || free === 0} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? 'Inviting…' : 'Invite'}
          </button>
        </form>
        {results && (
          <ul className="mt-3 space-y-1 text-sm" role="status">
            {results.map((r) => (
              <li key={r.email} className={r.status === 'invited' ? 'text-emerald-700' : 'text-amber-800'}>
                {r.status === 'invited' ? '✓' : '•'} {r.email}: {STATUS_LABEL[r.status] ?? r.status}
                {r.message ? ` (${r.message})` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Member</th>
              <th className="px-4 py-3 text-right font-semibold">Solved</th>
              <th className="px-4 py-3 text-right font-semibold">Points</th>
              <th className="px-4 py-3 text-right font-semibold">Streak</th>
              <th className="px-4 py-3 text-right font-semibold">PL-300 best</th>
              <th className="px-4 py-3 font-semibold">Last active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Loading members…
                </td>
              </tr>
            ) : (
              members.map((m, i) => (
                <tr key={m.email} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{m.email}</div>
                    <div className="text-xs text-slate-500">{m.role === 'owner' ? 'Manager' : m.user_id ? `Joined ${date(m.joined_at)}` : 'Invited, not signed in yet'}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{stats[i].solved}</td>
                  <td className="px-4 py-3 text-right font-mono">{stats[i].points}</td>
                  <td className="px-4 py-3 text-right font-mono">{stats[i].streak ? `${stats[i].streak}d` : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{stats[i].pl300Best === null ? '—' : `${stats[i].pl300Best}%`}</td>
                  <td className="px-4 py-3 text-slate-600">{m.user_id ? ago(m.last_active) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {m.role !== 'owner' && (
                      <button type="button" onClick={() => void remove(m.email)} className="text-xs font-semibold text-slate-500 hover:text-red-700">
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      {members && members.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="chapter-grid">
          <h2 className="text-lg font-bold text-ink">Progress by chapter</h2>
          <p className="mt-1 text-sm text-slate-600">Share of each chapter's exercises solved. Grey means not started; green means nearly or fully done.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-slate-500">Member</th>
                  {MODULES.map((c) => (
                    <th key={c.id} title={c.title} className="px-1 py-1 text-center font-semibold text-slate-500">
                      {SHORT[c.id] ?? c.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.email}>
                    <td className="max-w-[180px] truncate px-2 py-1 font-semibold text-ink" title={m.email}>
                      {m.email}
                    </td>
                    {chapters[i].map((c) => (
                      <td key={c.id} title={`${c.title}: ${c.done} of ${c.total} exercises`} className={`rounded-md px-1 py-2 text-center font-mono font-semibold ${heat(c.pct)}`}>
                        {c.pct}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="mt-3 text-xs text-slate-500">Progress appears once a member has signed in and solved an exercise. Members can practice on any device.</p>
    </div>
  );
}
