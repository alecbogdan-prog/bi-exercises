import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { ProgressBar } from '../components/Progress';
import { hasPl300 } from '../lib/access';
import { withBrand } from '../lib/titles';
import { PASS_MARK } from '../pl300/questions';
import type { Question } from '../pl300/questions';
import { chapterLinks, domainStats, rememberAnswers, reviewQuestions } from '../pl300/practice';
import { lastAnswers } from '../pl300/scores';
import { LockedPage, PracticeRunner, Results } from './Pl300TestPage';

/** Weak-topic review: your scores per exam area, and a practice round of the questions you last got wrong. */
export default function Pl300ReviewPage() {
  useEffect(() => {
    document.title = withBrand('PL-300 Weak-Topic Review');
  }, []);
  if (!hasPl300()) return <LockedPage title="Weak-topic review is part of Pro" text="Take the free practice test, then unlock the review with Pro or PL-300 Prep: it collects every question you missed and points you to the chapters to practice." />;
  return <Review />;
}

function Review() {
  const [last, setLast] = useState(lastAnswers);
  const [round, setRound] = useState<Question[] | null>(null);
  const [result, setResult] = useState<Record<string, number[]> | null>(null);

  const stats = domainStats(last);
  const queue = reviewQuestions(last);
  const missed = queue.filter((x) => last[x.id] === false).length;
  const answeredAny = stats.some((s) => s.answered > 0);

  if (round && result)
    return (
      <Results
        title="Weak-topic review"
        questions={round}
        answers={result}
        mode="review"
        backTo="/pl300"
        onRestart={() => {
          setLast(lastAnswers());
          setRound(null);
          setResult(null);
        }}
      />
    );
  if (round)
    return (
      <PracticeRunner
        title="Weak-topic review"
        backTo="/pl300/review"
        questions={round}
        onDone={(answers) => {
          rememberAnswers(round, answers);
          setResult(answers);
          window.scrollTo(0, 0);
        }}
      />
    );

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12" data-testid="pl300-review">
        <Link to="/pl300" className="text-sm font-semibold text-brand-700 hover:underline">
          ← PL-300 practice tests
        </Link>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink">Weak-topic review</h1>
        <p className="mt-2 max-w-2xl text-[17px] text-slate-600">
          Based on your last answer to every question you have seen, in any test. Areas below {Math.round(PASS_MARK * 100)}% need the most work.
        </p>

        {!answeredAny ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-slate-700">Take a practice test first. Your weak topics and the questions to review will appear here.</p>
            <Link to="/pl300/test-1" className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-3 font-bold text-white hover:bg-brand-600">
              Start practice test 1
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[...stats]
                .sort((a, b) => (a.rate ?? 2) - (b.rate ?? 2))
                .map((s) => {
                  const links = chapterLinks(s.domain);
                  const weak = s.rate !== null && s.rate < PASS_MARK;
                  return (
                    <div key={s.domain} className={`min-w-0 rounded-xl border p-4 ${weak ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
                      <div className="mb-1.5 flex justify-between gap-2 text-sm">
                        <span className="font-semibold text-ink">{s.title}</span>
                        <span className="shrink-0 text-slate-500 tabular-nums">{s.rate === null ? 'not started' : `${s.right}/${s.answered} · ${Math.round(s.rate * 100)}%`}</span>
                      </div>
                      <ProgressBar value={s.rate ?? 0} />
                      {weak && links.length > 0 && (
                        <div className="mt-2 text-sm text-slate-600">
                          Practice hands-on:{' '}
                          {links.map((l, i) => (
                            <span key={l.href}>
                              {i > 0 && ', '}
                              <Link to={l.href} className="font-semibold text-brand-700 hover:underline">
                                {l.text}
                              </Link>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="mt-8 rounded-2xl bg-ink p-6 text-white sm:p-8">
              {queue.length === 0 ? (
                <>
                  <h2 className="font-display text-2xl font-extrabold">Nothing to review right now</h2>
                  <p className="mt-2 text-white/80">You answered every question you have seen correctly the last time. Take another practice test to find new gaps.</p>
                  <Link to="/pl300" className="mt-4 inline-block rounded-full bg-sunrise-500 px-6 py-3 font-bold text-ink hover:brightness-95">
                    Practice tests →
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="font-display text-2xl font-extrabold">Review round: {queue.length} questions</h2>
                  <p className="mt-2 text-white/80">
                    {missed > 0 ? `${missed} you got wrong last time, weakest area first` : 'You have no open mistakes'}
                    {queue.length > missed ? `, plus ${queue.length - missed} new questions from your weakest area` : ''}. Each answer is checked with an explanation, and questions you get
                    right leave the list.
                  </p>
                  <button
                    onClick={() => {
                      setRound(queue);
                      window.scrollTo(0, 0);
                    }}
                    className="mt-4 rounded-full bg-sunrise-500 px-6 py-3 font-bold text-ink hover:brightness-95"
                  >
                    Start the review →
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
