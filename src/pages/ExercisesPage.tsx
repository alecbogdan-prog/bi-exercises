import { Link } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { EXERCISES } from '../exercises/exercises';
import { MODULES } from '../exercises/types';
import { completedIds, startedIds, stats } from '../lib/storage';
import { ProgressBar } from '../components/Progress';
import { LockIcon } from '../components/ProLock';
import { ProjectCards } from '../components/ProjectCards';

export function ExerciseList() {
  const done = new Set(completedIds());
  const started = new Set(startedIds());
  const all = EXERCISES.length;
  const solvedAll = EXERCISES.filter((e) => done.has(e.id)).length;
  const s = stats();
  return (
    <div className="space-y-10">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6" data-testid="overall-progress">
        <div className="min-w-0">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-semibold">Your progress</span>
            <span className="text-slate-600 tabular-nums">
              {solvedAll}/{all} · {Math.round((solvedAll / all) * 100)}%
            </span>
          </div>
          <ProgressBar value={solvedAll / all} />
        </div>
        <div className="text-sm">
          <b className="tabular-nums">{s.today}</b> <span className="text-slate-500">pts today</span> · <b className="tabular-nums">{s.total}</b> <span className="text-slate-500">total</span>
        </div>
        <div className="text-sm">
          <b className="tabular-nums">{s.streak}</b> <span className="text-slate-500">day streak</span>
        </div>
      </div>
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-xs font-semibold tracking-wide text-brand-700 uppercase">End-to-end</div>
            <h2 className="text-xl font-bold">Projects</h2>
          </div>
          <Link to="/projects" className="text-sm font-semibold text-brand-700 hover:underline">
            About projects →
          </Link>
        </div>
        <ProjectCards />
      </section>
      {MODULES.map((m, mi) => {
        const list = EXERCISES.filter((e) => e.module === m.id);
        const solved = list.filter((e) => done.has(e.id)).length;
        return (
          <section key={m.id}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Module {mi + 1}</div>
                <h2 className="text-xl font-bold tracking-tight">{m.title}</h2>
                <p className="text-sm text-slate-600">{m.blurb}</p>
              </div>
              <span className="text-xs text-slate-500 tabular-nums">
                {solved}/{list.length} solved · {Math.round((solved / list.length) * 100)}%
              </span>
            </div>
            <ProgressBar value={solved / list.length} className="mb-4" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((e) => (
                <Link
                  key={e.id}
                  to={`/exercise/${e.id}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow"
                >
                  <div className="mb-2 flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">{e.level}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">{e.check.kind === 'dax' ? 'DAX' : 'Report'}</span>
                    <span className="flex-1" />
                    {done.has(e.id) ? (
                      <span className="rounded bg-brand-100 px-1.5 py-0.5 font-semibold text-brand-700">✓ Solved</span>
                    ) : started.has(e.id) ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">IN PROGRESS</span>
                    ) : e.free ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">FREE</span>
                    ) : (
                      <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                        <LockIcon className="h-3 w-3" /> PRO
                      </span>
                    )}
                  </div>
                  <div className="font-semibold group-hover:text-brand-700">{e.title}</div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function ExercisesPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight">All exercises</h1>
        <p className="mb-8 max-w-2xl text-slate-600">
          Every exercise runs in your browser on a realistic sales model (Sales, Product, Customer and Date tables). Your answer is checked instantly. Progress is saved on this device.
        </p>
        <ExerciseList />
        <p className="mt-10 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Preview build: PRO exercises are unlocked for now. Power Query, data modeling and PL-300 practice tests are coming next.
        </p>
      </main>
      <Footer />
    </div>
  );
}
