import { EXERCISES } from '../exercises/exercises';
import { MODULES } from '../exercises/types';
import type { ModuleId } from '../exercises/types';
import { DOMAINS, QUESTIONS, isCorrect } from './questions';
import { recordAnswers } from './scores';
import type { Domain, Question } from './questions';

/** The hands-on chapters that train each exam domain. "Manage and secure" happens in the Power BI service, so it has none. */
export const DOMAIN_CHAPTERS: Record<Domain, ModuleId[]> = {
  prepare: ['powerquery'],
  model: ['modeling', 'dax-basics', 'calculate', 'time'],
  visualize: ['reports', 'filters', 'pages'],
  manage: [],
};

/** A link to each chapter of a domain, opening its first free exercise when there is one. */
export function chapterLinks(domain: Domain): { href: string; text: string }[] {
  return DOMAIN_CHAPTERS[domain].flatMap((m) => {
    const list = EXERCISES.filter((e) => e.module === m);
    const ex = list.find((e) => e.free) ?? list[0];
    const title = MODULES.find((x) => x.id === m)?.title ?? m;
    return ex ? [{ href: `/exercise/${ex.id}`, text: title }] : [];
  });
}

export interface DomainStat {
  domain: Domain;
  title: string;
  answered: number;
  right: number;
  /** Share of answered questions whose last answer was right, or null when none were answered. */
  rate: number | null;
}

/** How the learner is doing in each domain, from the last answer to every question. */
export function domainStats(last: Record<string, boolean>): DomainStat[] {
  return DOMAINS.map((d) => {
    const ids = QUESTIONS.filter((x) => x.domain === d.id && x.id in last).map((x) => x.id);
    const right = ids.filter((id) => last[id]).length;
    return { domain: d.id, title: d.title, answered: ids.length, right, rate: ids.length ? right / ids.length : null };
  });
}

export const REVIEW_MAX = 20;
export const REVIEW_MIN = 10;

/**
 * The questions for a weak-topic review: every question whose last answer was wrong, weakest domain first,
 * topped up with not-yet-answered questions from the weakest domain so a short review still has substance.
 */
export function reviewQuestions(last: Record<string, boolean>): Question[] {
  const stats = domainStats(last);
  const rank = (d: Domain) => {
    const s = stats.find((x) => x.domain === d)!;
    return s.rate ?? 1;
  };
  const byWeakness = (a: Question, b: Question) => rank(a.domain) - rank(b.domain);
  const missed = QUESTIONS.filter((x) => last[x.id] === false).sort(byWeakness).slice(0, REVIEW_MAX);
  if (missed.length >= REVIEW_MIN) return missed;
  const weakest = [...stats].filter((s) => s.rate !== null).sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1))[0]?.domain;
  if (!weakest) return missed;
  const fresh = QUESTIONS.filter((x) => x.domain === weakest && !(x.id in last) && !x.caseId);
  return [...missed, ...fresh.slice(0, REVIEW_MIN - missed.length)];
}

/** Remembers each answered question for the weak-topic review. */
export function rememberAnswers(questions: Question[], answers: Record<string, number[]>): void {
  recordAnswers(questions.filter((x) => (answers[x.id] ?? []).length > 0).map((x) => ({ id: x.id, correct: isCorrect(x, answers[x.id]) })));
}
