import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { LockIcon } from '../components/ProLock';
import { ProgressBar } from '../components/Progress';
import { hasPl300 } from '../lib/access';
import { saveScore } from '../pl300/scores';
import { DOMAINS, EXAM_MINUTES, PASS_MARK, TESTS, caseById, isCorrect, questionById, scaledScore } from '../pl300/questions';
import type { Question } from '../pl300/questions';
import { chapterLinks, rememberAnswers } from '../pl300/practice';
import Pl300Page from './Pl300Page';
import { testTitle } from '../lib/titles';

const LETTERS = 'ABCDEFG';

export type Mode = 'practice' | 'exam';
type Answers = Record<string, number[]>;

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

const correctCount = (questions: Question[], answers: Answers) => questions.filter((x) => isCorrect(x, answers[x.id] ?? [])).length;

export default function Pl300TestPage() {
  const { testId = '' } = useParams();
  const [params] = useSearchParams();
  const mode: Mode = params.get('mode') === 'exam' ? 'exam' : 'practice';
  const test = TESTS.find((t) => t.id === testId);
  if (!test) return <Pl300Page />;
  if (!test.free && !hasPl300()) return <LockedPage title={`${test.title} is part of Pro`} />;
  return <TestSession key={`${test.id}-${mode}`} testId={test.id} mode={mode} />;
}

export function LockedPage({ title, text = 'Practice test 1 is free. Pro and PL-300 Prep unlock every practice test, exam mode and the weak-topic review.' }: { title: string; text?: string }) {
  return (
    <div className="flex min-h-full flex-col bg-mint">
      <Header />
      <main className="flex flex-1 items-start justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm" data-testid="pl300-locked">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <LockIcon className="h-6 w-6" />
          </span>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-slate-600">{text}</p>
          <Link to="/pricing" className="mt-5 block rounded-full bg-brand-500 px-6 py-3 font-display text-lg font-extrabold text-white hover:bg-brand-600">
            See plans
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

function TestSession({ testId, mode }: { testId: string; mode: Mode }) {
  const test = TESTS.find((t) => t.id === testId)!;
  const questions = useMemo(() => test.questionIds.map(questionById), [test]);
  const [result, setResult] = useState<Answers | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    document.title = testTitle(test.title);
  }, [test]);

  const done = (answers: Answers) => {
    saveScore(test.id, correctCount(questions, answers) / questions.length);
    rememberAnswers(questions, answers);
    setResult(answers);
    window.scrollTo(0, 0);
  };
  const restart = () => {
    setResult(null);
    setRound(round + 1);
  };

  const label = `${test.title}${mode === 'exam' ? ' · exam mode' : ''}`;
  if (result) return <Results title={label} questions={questions} answers={result} mode={mode} onRestart={restart} />;
  return mode === 'exam' ? (
    <ExamRunner key={round} title={label} questions={questions} onDone={done} />
  ) : (
    <PracticeRunner key={round} title={label} questions={questions} onDone={done} />
  );
}

/** The case-study scenario, shown above every question that belongs to it. */
function CaseBox({ caseId }: { caseId: string }) {
  const c = caseById(caseId);
  if (!c) return null;
  return (
    <details open className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-[15px] text-slate-700" data-testid="pl300-case">
      <summary className="cursor-pointer font-semibold text-sky-900">Case study: {c.title}</summary>
      <div className="mt-2 space-y-2">
        {c.scenario.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </details>
  );
}

function OptionList({
  q,
  order,
  picked,
  onToggle,
  reveal,
}: {
  q: Question;
  order: number[];
  picked: number[];
  onToggle: (i: number) => void;
  reveal: boolean;
}) {
  const multi = q.correct.length > 1;
  return (
    <ul className="mt-5 space-y-2.5" role={multi ? 'group' : 'radiogroup'}>
      {order.map((i, pos) => {
        const on = picked.includes(i);
        const isRight = q.correct.includes(i);
        const tone = !reveal
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
              onClick={() => onToggle(i)}
              disabled={reveal}
              className={`flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${tone}`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold ${multi ? 'rounded-md' : 'rounded-full'} ${on ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {LETTERS[pos]}
              </span>
              <span className="min-w-0 text-[15px] break-words text-ink">{q.options[i]}</span>
              {reveal && isRight && <span className="ml-auto shrink-0 text-sm font-semibold text-green-700">Correct</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const pick = (q: Question, picked: number[], i: number) => (q.correct.length > 1 ? (picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]) : [i]);

function QuestionHead({ q }: { q: Question }) {
  const domain = DOMAINS.find((d) => d.id === q.domain)!;
  return (
    <>
      {q.caseId && <CaseBox caseId={q.caseId} />}
      <div className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{domain.title}</div>
      <h1 className="mt-2 text-lg leading-relaxed font-semibold text-ink sm:text-xl">{q.prompt}</h1>
      {q.correct.length > 1 && <p className="mt-1 text-sm text-slate-500">Select {q.correct.length} answers.</p>}
    </>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}

/** Practice mode: check each answer and read the explanation right away. */
export function PracticeRunner({ title, questions, onDone, backTo = '/pl300' }: { title: string; questions: Question[]; onDone: (a: Answers) => void; backTo?: string }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [orders] = useState(() => shuffledOrders(questions));

  const q = questions[index];
  const toggle = (i: number) => {
    if (!checked) setPicked(pick(q, picked, i));
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
    } else onDone(answers);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (checked) next();
      else check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const right = checked && isCorrect(q, picked);
  return (
    <Shell>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link to={backTo} className="font-semibold text-brand-700 hover:underline">
          ← {title}
        </Link>
        <span className="text-slate-500 tabular-nums">
          Question {index + 1} of {questions.length}
        </span>
      </div>
      <ProgressBar value={(index + (checked ? 1 : 0)) / questions.length} />

      <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" data-testid="pl300-question">
        <QuestionHead q={q} />
        <OptionList q={q} order={orders[q.id]} picked={picked} onToggle={toggle} reveal={checked} />

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
    </Shell>
  );
}

const clock = (seconds: number) => {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Exam mode: a countdown, no feedback until the end, free navigation and flags, like the real exam. */
function ExamRunner({ title, questions, onDone }: { title: string; questions: Question[]; onDone: (a: Answers) => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [orders] = useState(() => shuffledOrders(questions));
  const [deadline] = useState(() => Date.now() + EXAM_MINUTES * 60_000);
  const [left, setLeft] = useState(EXAM_MINUTES * 60);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.round((deadline - Date.now()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  useEffect(() => {
    if (left <= 0) onDone(answers);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = questions[index];
  const picked = answers[q.id] ?? [];
  const answered = questions.filter((x) => (answers[x.id] ?? []).length > 0).length;
  const go = (i: number) => {
    setIndex(i);
    setConfirming(false);
    window.scrollTo(0, 0);
  };

  return (
    <Shell>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-ink">{title}</span>
        <span
          className={`rounded-full px-3 py-1 font-semibold tabular-nums ${left < 300 ? 'bg-red-100 text-red-800' : 'bg-white text-ink ring-1 ring-slate-200'}`}
          data-testid="exam-timer"
          aria-live="off"
        >
          ⏱ {clock(left)}
        </span>
      </div>
      <ProgressBar value={answered / questions.length} />

      <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" data-testid="pl300-question">
        <div className="mb-3 flex items-center justify-between gap-2 text-sm text-slate-500">
          <span className="tabular-nums">
            Question {index + 1} of {questions.length}
          </span>
          <button
            type="button"
            onClick={() => setFlags({ ...flags, [q.id]: !flags[q.id] })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${flags[q.id] ? 'bg-amber-100 text-amber-900' : 'text-slate-500 ring-1 ring-slate-200 hover:text-ink'}`}
            aria-pressed={!!flags[q.id]}
          >
            {flags[q.id] ? '⚑ Flagged for review' : '⚐ Flag for review'}
          </button>
        </div>
        <QuestionHead q={q} />
        <OptionList q={q} order={orders[q.id]} picked={picked} onToggle={(i) => setAnswers({ ...answers, [q.id]: pick(q, picked, i) })} reveal={false} />

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <button onClick={() => go(index - 1)} disabled={index === 0} className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-ink hover:border-brand-500 disabled:opacity-40">
            ← Previous
          </button>
          {index + 1 < questions.length ? (
            <button onClick={() => go(index + 1)} className="rounded-lg bg-brand-500 px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-600">
              Next →
            </button>
          ) : (
            <button onClick={() => setConfirming(true)} className="rounded-lg bg-ink px-6 py-2.5 font-semibold text-white hover:bg-[#22313d]">
              Finish exam
            </button>
          )}
        </div>
      </article>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5" aria-label="Question overview">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">
            {answered} of {questions.length} answered
          </h2>
          <button onClick={() => setConfirming(true)} className="text-sm font-semibold text-brand-700 hover:underline">
            Finish exam
          </button>
        </div>
        <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {questions.map((x, i) => {
            const isAnswered = (answers[x.id] ?? []).length > 0;
            return (
              <button
                key={x.id}
                onClick={() => go(i)}
                aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ''}${flags[x.id] ? ', flagged' : ''}`}
                aria-current={i === index}
                className={`relative h-9 rounded-md text-sm font-semibold tabular-nums ${i === index ? 'ring-2 ring-brand-500' : ''} ${isAnswered ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {i + 1}
                {flags[x.id] && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />}
              </button>
            );
          })}
        </div>
        {confirming && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm" role="alertdialog" aria-label="Finish the exam">
            <p className="text-slate-700">
              {answered < questions.length
                ? `${questions.length - answered === 1 ? '1 question is' : `${questions.length - answered} questions are`} not answered yet and will count as wrong. `
                : 'All questions are answered. '}
              Finish and see your score?
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => onDone(answers)} className="rounded-lg bg-ink px-4 py-2 font-semibold text-white">
                Finish and see my score
              </button>
              <button onClick={() => setConfirming(false)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-ink">
                Keep going
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="mt-3 text-center text-xs text-slate-400">
        Exam mode: {EXAM_MINUTES} minutes, no feedback until the end. Leaving this page ends the attempt.
      </p>
    </Shell>
  );
}

export function Results({
  title,
  questions,
  answers,
  mode,
  onRestart,
  backTo = '/pl300',
}: {
  title: string;
  questions: Question[];
  answers: Answers;
  mode: Mode | 'review';
  onRestart: () => void;
  backTo?: string;
}) {
  const right = questions.filter((x) => isCorrect(x, answers[x.id] ?? []));
  const score = right.length / questions.length;
  const passed = score >= PASS_MARK;
  const wrong = questions.filter((x) => !right.includes(x));
  const domains = DOMAINS.map((d) => {
    const qs = questions.filter((x) => x.domain === d.id);
    return { ...d, total: qs.length, ok: qs.filter((x) => right.includes(x)).length };
  }).filter((d) => d.total > 0);
  const weak = domains.filter((d) => d.ok / d.total < PASS_MARK);
  const scaled = scaledScore(score);

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10" data-testid="pl300-results">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="text-sm font-semibold text-slate-500">{title} · results</div>
          {mode === 'review' ? (
            <div className={`mt-2 font-display text-6xl font-extrabold tabular-nums ${passed ? 'text-green-700' : 'text-brand-600'}`}>{Math.round(score * 100)}%</div>
          ) : (
            <>
              <div className={`mt-2 font-display text-6xl font-extrabold tabular-nums ${passed ? 'text-green-700' : 'text-brand-600'}`} data-testid="scaled-score">
                {scaled}
                <span className="text-2xl text-slate-400"> / 1,000</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">Estimated exam score: 700 is the pass mark. Microsoft's exact scaling is not public.</div>
            </>
          )}
          <div className="mt-2 text-slate-600">
            {right.length} of {questions.length} correct ({Math.round(score * 100)}%) ·{' '}
            {passed ? 'Above the pass mark. Nice work!' : 'Below the pass mark. Focus on the areas below and try again.'}
          </div>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            {domains.map((d) => (
              <div key={d.id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-1.5 flex justify-between gap-2 text-sm">
                  <span className="font-semibold text-ink">{d.title}</span>
                  <span className="shrink-0 text-slate-500 tabular-nums">
                    {d.ok}/{d.total}
                  </span>
                </div>
                <ProgressBar value={d.ok / d.total} />
              </div>
            ))}
          </div>

          {weak.length > 0 && (
            <div className="mt-6 rounded-xl bg-amber-50 p-4 text-left text-sm ring-1 ring-amber-200" data-testid="weak-topics">
              <div className="font-semibold text-amber-900">Your weak topics</div>
              <ul className="mt-2 space-y-1.5 text-slate-700">
                {weak.map((d) => {
                  const links = chapterLinks(d.id);
                  return (
                    <li key={d.id}>
                      <b>{d.title}</b>
                      {links.length > 0 ? (
                        <>
                          {' '}
                          · practice hands-on:{' '}
                          {links.map((l, i) => (
                            <span key={l.href}>
                              {i > 0 && ', '}
                              <Link to={l.href} className="font-semibold text-brand-700 hover:underline">
                                {l.text}
                              </Link>
                            </span>
                          ))}
                        </>
                      ) : (
                        ' · read the explanations below; this area is about the Power BI service'
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={onRestart} className="rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600">
              {mode === 'review' ? 'New review' : 'Take it again'}
            </button>
            {mode !== 'review' && (
              <Link to="/pl300/review" className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-ink hover:border-brand-500">
                Review weak topics
              </Link>
            )}
            <Link to={backTo} className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-ink hover:border-brand-500">
              All practice tests
            </Link>
          </div>
        </div>

        {wrong.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">Review your mistakes</h2>
            <ul className="mt-4 space-y-3">
              {wrong.map((x) => (
                <li key={x.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  {x.caseId && <div className="mb-1 text-xs font-semibold text-sky-800">Case study: {caseById(x.caseId)?.title}</div>}
                  <p className="font-semibold text-ink">{x.prompt}</p>
                  <p className="mt-2 text-sm text-green-800">
                    <b>Correct answer:</b> {x.correct.map((c) => x.options[c]).join(' + ')}
                  </p>
                  {(answers[x.id] ?? []).length > 0 ? (
                    <p className="mt-1 text-sm text-red-700">
                      <b>Your answer:</b> {(answers[x.id] ?? []).map((c) => x.options[c]).join(' + ')}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-red-700">
                      <b>Not answered.</b>
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
