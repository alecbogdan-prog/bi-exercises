import { EXERCISES } from '../exercises/exercises';
import { MODULES } from '../exercises/types';
import { DAX_FUNCTIONS } from '../content/daxFunctions';
import { PROJECTS } from '../projects/projects';
import { TESTS } from '../pl300/questions';

export interface PageMeta {
  path: string;
  /** Full <title>, keep under ~60 characters where possible. */
  title: string;
  /** <meta name="description">, ~150 characters. */
  description: string;
}

const BRAND = 'Power BI Exercises';

/** First sentence of a markdown lesson, as plain text, for meta descriptions. */
function plain(md: string, max = 155): string {
  const text = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

/**
 * Every public page the router serves, with its title and description.
 * Used at build time (vite.config.ts) for sitemap.xml and for a per-page index.html,
 * so search engines see the right title and description without running JavaScript.
 */
export function pageMeta(): PageMeta[] {
  const moduleTitle = new Map<string, string>(MODULES.map((m) => [m.id, m.title]));
  const pages: PageMeta[] = [
    {
      path: '/',
      title: 'Power BI Practice Exercises Online: Learn Power BI and DAX by Doing',
      description: `Practice Power BI online with ${EXERCISES.length} hands-on exercises: build reports, write DAX, clean data in Power Query and model relationships, with instant feedback. No install needed.`,
    },
    {
      path: '/exercises',
      title: `${EXERCISES.length} Power BI Practice Exercises with Instant Feedback | ${BRAND}`,
      description: 'Every Power BI practice exercise in one place: reports and visuals, DAX measures, time intelligence, Power Query and data modeling, from beginner to advanced.',
    },
    {
      path: '/projects',
      title: `Power BI Practice Projects: Build Real Dashboards Step by Step | ${BRAND}`,
      description: 'End-to-end Power BI practice projects written like real requests from a manager: build the model, the measures and the dashboard, then compare with the solution.',
    },
    {
      path: '/dax-functions',
      title: `DAX Functions List with Practice Exercises | ${BRAND}`,
      description: `All ${DAX_FUNCTIONS.length} common DAX functions with syntax, a worked example and a hands-on practice exercise for each.`,
    },
    {
      path: '/pl300',
      title: `PL-300 Practice Test: Power BI Data Analyst Exam Prep | ${BRAND}`,
      description: 'Free PL-300 practice test with exam-style questions across all four domains, explanations for every answer and a score that shows if you are ready.',
    },
    {
      path: '/pricing',
      title: `Pricing | ${BRAND}`,
      description: 'Start practicing Power BI for free. Upgrade to Pro for every exercise, project and PL-300 practice test.',
    },
    { path: '/terms', title: `Terms of Use | ${BRAND}`, description: `The terms for using ${BRAND}.` },
    { path: '/privacy', title: `Privacy Policy | ${BRAND}`, description: `How ${BRAND} handles your data, cookies and payments.` },
    ...EXERCISES.map((e) => ({
      path: `/exercise/${e.id}`,
      title: `${e.title}: Power BI Practice Exercise | ${BRAND}`,
      description: plain(`${moduleTitle.get(e.module) ?? 'Power BI'} (${e.level}). ${e.lesson}`),
    })),
    ...PROJECTS.map((p) => ({
      path: `/projects/${p.id}`,
      title: `${p.title}: Power BI Practice Project | ${BRAND}`,
      description: plain(p.tagline),
    })),
    ...DAX_FUNCTIONS.map((f) => ({
      path: `/dax-functions/${f.name.toLowerCase()}`,
      title: `DAX ${f.name} Function: Syntax, Example and Practice | ${BRAND}`,
      description: plain(`${f.name}: ${f.description}`),
    })),
    ...TESTS.map((t) => ({
      path: `/pl300/${t.id}`,
      title: `${t.title}: PL-300 Practice Test | ${BRAND}`,
      description: 'An exam-style PL-300 practice test with explanations for every answer.',
    })),
  ];
  const seen = new Set<string>();
  return pages.filter((p) => !seen.has(p.path) && seen.add(p.path));
}

/** Kept for callers that only need the paths. */
export function sitemapPaths(): string[] {
  return pageMeta().map((p) => p.path);
}
