import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { LockIcon } from '../components/ProLock';
import { ProgressBar } from '../components/Progress';
import { hasPl300 } from '../lib/access';
import { BRAND } from '../lib/base';
import { saveScore } from '../pl300/scores';
import { DOMAINS, PASS_MARK, TESTS, isCorrect, questionById } from '../pl300/questions';
import type { Question } from '../pl300/questions';
import Pl300Page from './Pl300Page';

const LETTERS = 'ABCDEFG';

/** A new random order of the answer options for every attempt, so the position of the right answer gives nothing away. */
function shuffledOrders(questions: Question[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const q of questions) {
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    out[q.id] = order;
  }
  return out;
}

export default function Pl300TestPage() {
  const { testId = '' } = useParams();
  const test = TESTS.find((t) => t.id === testId);
  if (!test) return <Pl300Page />;
  if (!test.free && !hasPl300()) return <LockedTest title={test.title} />;
  return <TestRunner key={test.id} testId={test.id} />;
}

function LockedTest({ title }: { title: string }) {
  return (
    <div className="flex min-h-full flex-col bg-mint">
      <Header />
      <main className="flex flex-1 items-start justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm" data-testid="pl300-locked">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <LockIcon className="h-6 w-6" />
          </span>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-ink">{title} is part of Pro</h1>
          <p className="mt-2 text-slate-600">Practice test 1 is free. Pro unlocks every practice test and all hands-on exercises.</p>
          <Link to="/pricing" className="mt-5 block rounded-full bg-brand-500 px-6 py-3 font-display text-lg font-extrabold text-white hover:bg-brand-600">
            See Pro plans
          </Link>
          <Link to="/pl300/test-1" className="mt-3 block text-sm font-semibold text-brand-700 hover:underline">
            Take the free practice test →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function TestRunner({ testId }: { testId: string }) {
  const test = TESTS.find((t) => t.id === testId)!;
  const questions = useMemo(() => test.questionIds.map(questionById), [test]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [finished, setFinished] = useState(false);
  const [orders, setOrders] = useState(() => shuffledOrders(questions));

  useEffect(() => {
    document.title = `${test.title}: PL-300 Practice | ${BRAND}`;
  }, [test]);

  const q = questions[index];
  const multi = q.correct.length > 1;

  const toggle = (i: number) => {
    if (checked) return;
    setPicked(multi ? (picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]) : [i]);
  };
  const check = () => {
    if (!picked.length) return;
    setChecked(true);
    setAnswers({ ...answers, [q.id]: picked });
  };
  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setPicked([]);
      setChecked(false);
      window.scrollTo(0, 0);
    } else {
      const score = questions.filter((x) => isCorrect(x, answers[x.id] ?? [])).length / questions.length;
      saveScore(test.id, score);
      setFinished(true);
      window.scrollTo(0, 0);
    }
  };
  const restart = () => {
    setIndex(0);
    setPicked([]);
    setChecked(false);
    setAnswers({});
    setFinished(false);
    setOrders(shuffledOrders(questions));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || e.key !== 'Enter') return;
      if (checked) next();
      else check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (finished) return <Results title={test.title} questions={questions} answers={answers} onRestart={restart} />;

  const right = checked && isCorrect(q, picked);
  const domain = DOMAINS.find((d) => d.id === q.domain)!;

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link to="/pl300" className="font-semibold text-brand-700 hover:underline">
            ← PL-300 · {test.title}
          </Link>
          <span className="text-slate-500 tabular-nums">
            Question {index + 1} of {questions.length}
          </span>
        </div>
        <ProgressBar value={(index + (checked ? 1 : 0)) / questions.length} />

        <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" data-testid="pl300-question">
          <div className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{domain.title}</div>
          <h1 className="mt-2 text-lg leading-relaxed font-semibold text-ink sm:text-xl">{q.prompt}</h1>
          {multi && <p className="mt-1 text-sm text-slate-500">Select {q.correct.length} answers.</p>}

          <ul className="mt-5 space-y-2.5" role={multi ? 'group' : 'radiogroup'}>
            {orders[q.id].map((i, pos) => {
              const opt = q.options[i];
              const on = picked.includes(i);
              const isRight = q.correct.includes(i);
              const tone = !checked
                ? on
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:border-slate-400'
                : isRight
                  ? 'border-green-600 bg-green-50'
                  : on
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 opacity-70';
              return (
                <li key={i}>
                  <button
                    role={multi ? 'checkbox' : 'radio'}
                    aria-checked={on}
                    onClick={() => toggle(i)}
                    disabled={checked}
                    className={`flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${tone}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold ${multi ? 'rounded-md' : 'rounded-full'} ${on ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {LETTERS[pos]}
                    </span>
                    <span className="min-w-0 text-[15px] text-ink">{opt}</span>
                    {checked && isRight && <span className="ml-auto shrink-0 text-sm font-semibold text-green-700">Correct</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {checked && (
            <div className={`mt-5 rounded-xl p-4 text-sm ${right ? 'bg-green-50 text-green-900 ring-1 ring-green-200' : 'bg-red-50 text-red-900 ring-1 ring-red-200'}`} role="status">
              <div className="font-semibold">{right ? 'Correct!' : 'Not quite.'}</div>
              <p className="mt-1 text-slate-700">{q.explanation}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            {checked ? (
              <button onClick={next} className="rounded-lg bg-brand-500 px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-600">
                {index + 1 < questions.length ? 'Next question →' : 'See my results'}
              </button>
            ) : (
              <button onClick={check} disabled={!picked.length} className="rounded-lg bg-brand-500 px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-40">
                Check answer
              </button>
            )}
          </div>
        </article>
        <p className="mt-3 text-center text-xs text-slate-400">Press Enter to check and continue.</p>
      </main>
      <Footer />
    </div>
  );
}

function Results({ title, questions, answers, onRestart }: { title: string; questions: Question[]; answers: Record<string, number[]>; onRestart: () => void }) {
  const right = questions.filter((x) => isCorrect(x, answers[x.id] ?? []));
  const score = right.length / questions.length;
  const passed = score >= PASS_MARK;
  const wrong = questions.filter((x) => !right.includes(x));
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10" data-testid="pl300-results">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="text-sm font-semibold text-slate-500">{title} · results</div>
          <div className={`mt-2 font-display text-6xl font-extrabold tabular-nums ${passed ? 'text-green-700' : 'text-brand-600'}`}>{Math.round(score * 100)}%</div>
          <div className="mt-1 text-slate-600">
            {right.length} of {questions.length} correct · {passed ? 'Above the 70% pass mark. Nice work!' : 'Below the 70% pass mark. Focus on the areas below and try again.'}
          </div>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            {DOMAINS.map((d) => {
              const qs = questions.filter((x) => x.domain === d.id);
              const ok = qs.filter((x) => right.includes(x)).length;
              return (
                <div key={d.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1.5 flex justify-between gap-2 text-sm">
                    <span className="font-semibold text-ink">{d.title}</span>
                    <span className="shrink-0 text-slate-500 tabular-nums">
                      {ok}/{qs.length}
                    </span>
                  </div>
                  <ProgressBar value={qs.length ? ok / qs.length : 0} />
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={onRestart} className="rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600">
              Take it again
            </button>
            <Link to="/pl300" className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-ink hover:border-brand-500">
              All practice tests
            </Link>
            <Link to="/exercises" className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-ink hover:border-brand-500">
              Practice hands-on
            </Link>
          </div>
        </div>

        {wrong.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">Review your mistakes</h2>
            <ul className="mt-4 space-y-3">
              {wrong.map((x) => (
                <li key={x.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-ink">{x.prompt}</p>
                  <p className="mt-2 text-sm text-green-800">
                    <b>Correct answer:</b> {x.correct.map((c) => x.options[c]).join(' + ')}
                  </p>
                  {(answers[x.id] ?? []).length > 0 && (
                    <p className="mt-1 text-sm text-red-700">
                      <b>Your answer:</b> {(answers[x.id] ?? []).map((c) => x.options[c]).join(' + ')}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-600">{x.explanation}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
