import { EXERCISES } from '../exercises/exercises';
import { MODULES } from '../exercises/types';
import { DAX_CATEGORIES, DAX_FUNCTIONS } from '../content/daxFunctions';
import { PROJECTS } from '../projects/projects';
import { DOMAINS, TESTS } from '../pl300/questions';
import { PRIVACY, TERMS, UPDATED } from '../content/legal';
import { daxTitle, exerciseTitle, projectTitle, testTitle, withBrand } from './titles';

export interface PageLink {
  href: string;
  text: string;
}

export interface PageMeta {
  path: string;
  /** Full <title>, kept to ~60 characters. */
  title: string;
  /** <meta name="description">, 70–160 characters. */
  description: string;
  /** Static content written into the HTML for crawlers that don't run JavaScript (replaced by React on load). */
  h1: string;
  paragraphs: string[];
  /** Optional section heading above the links. */
  linksHeading?: string;
  links: PageLink[];
}

const BRAND = 'Power BI Exercises';
const DESC_MIN = 70;
const DESC_MAX = 160;

const title = withBrand;

/** Markdown to plain text. */
function plain(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A meta description between DESC_MIN and DESC_MAX characters, cut at a word boundary. */
function desc(text: string, filler: string): string {
  let t = plain(text);
  if (t.length < DESC_MIN) t = `${t} ${filler}`.trim();
  if (t.length <= DESC_MAX) return t;
  const cut = t.slice(0, DESC_MAX - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '') + '…';
}

const FILLER = 'Hands-on Power BI practice in your browser, with instant feedback.';

/**
 * Every public page the router serves, with its title, description and static content.
 * Used at build time (vite.config.ts) for sitemap.xml and for a per-page index.html,
 * so search engines and AI crawlers see real content without running JavaScript.
 */
export function pageMeta(): PageMeta[] {
  const moduleTitle = new Map<string, string>(MODULES.map((m) => [m.id, m.title]));
  const exLink = (e: (typeof EXERCISES)[number]) => ({ href: `/exercise/${e.id}`, text: e.title });
  const fnLink = (f: (typeof DAX_FUNCTIONS)[number]) => ({ href: `/dax-functions/${f.name.toLowerCase()}`, text: `DAX ${f.name}` });

  const pages: PageMeta[] = [
    {
      path: '/',
      title: 'Power BI Practice Exercises Online: Learn Power BI and DAX',
      description: desc(
        `Practice Power BI online with ${EXERCISES.length} hands-on exercises: build reports, write DAX, clean data in Power Query and model relationships, with instant feedback.`,
        FILLER,
      ),
      h1: 'Power BI practice exercises: learn Power BI by doing',
      paragraphs: [
        'Short, interactive exercises in a report editor that runs in your browser. Build the visual, write the DAX, clean the data, and get your answer checked in seconds. No install and no Power BI license needed.',
        `${EXERCISES.length} hands-on exercises in ${MODULES.length} chapters, end-to-end dashboard projects, a DAX functions guide and PL-300 practice tests.`,
        ...MODULES.map((m) => `${m.title}: ${m.blurb}`),
      ],
      linksHeading: 'Start practicing',
      links: [
        { href: '/exercises', text: 'All Power BI practice exercises' },
        { href: '/projects', text: 'Power BI practice projects' },
        { href: '/dax-functions', text: 'DAX functions list with examples' },
        { href: '/pl300', text: 'PL-300 practice test' },
        ...MODULES.flatMap((m) => EXERCISES.filter((e) => e.module === m.id).slice(0, 2).map(exLink)),
      ],
    },
    {
      path: '/exercises',
      title: title(`${EXERCISES.length} Power BI Practice Exercises`),
      description: desc('Every Power BI practice exercise in one place: reports and visuals, DAX measures, time intelligence, Power Query and data modeling, from beginner to advanced.', FILLER),
      h1: 'All Power BI practice exercises',
      paragraphs: ['Every exercise runs in your browser on a realistic sales model with Sales, Product, Customer and Date tables. Your answer is checked instantly.'],
      linksHeading: 'Exercises by chapter',
      links: EXERCISES.map((e) => ({ href: `/exercise/${e.id}`, text: `${moduleTitle.get(e.module) ?? 'Power BI'}: ${e.title}` })),
    },
    {
      path: '/projects',
      title: title('Power BI Practice Projects: Build Real Dashboards'),
      description: desc('End-to-end Power BI practice projects written like real requests from a manager: build the model, the measures and the dashboard, then compare with the solution.', FILLER),
      h1: 'Power BI practice projects',
      paragraphs: ['Each project is a realistic request from a manager or a CFO. You build the model, the measures and the dashboard step by step, then compare your work with the full solution.'],
      linksHeading: 'Projects',
      links: PROJECTS.map((p) => ({ href: `/projects/${p.id}`, text: `${p.title}: ${p.tagline}` })),
    },
    {
      path: '/dax-functions',
      title: title('DAX Functions List with Practice Exercises'),
      description: desc(`All ${DAX_FUNCTIONS.length} common DAX functions with syntax, a worked example and a hands-on practice exercise for each.`, FILLER),
      h1: 'DAX functions list with examples and practice',
      paragraphs: DAX_CATEGORIES.map((c) => `${c.title}: ${c.blurb}`),
      linksHeading: 'DAX functions',
      links: DAX_FUNCTIONS.map(fnLink),
    },
    {
      path: '/pl300',
      title: title('PL-300 Practice Test: Power BI Exam Prep'),
      description: desc('Free PL-300 practice test with exam-style questions across all four domains, explanations for every answer and a score that shows if you are ready.', FILLER),
      h1: 'PL-300 practice tests for the Power BI Data Analyst exam',
      paragraphs: [
        'Exam-style questions across the four PL-300 domains: prepare the data, model the data, visualize and analyze the data, and manage and secure Power BI. Every answer comes with an explanation. The first test is free.',
      ],
      linksHeading: 'Practice tests',
      links: TESTS.map((t) => ({ href: `/pl300/${t.id}`, text: `${t.title}${t.free ? ' (free)' : ''}` })),
    },
    {
      path: '/pricing',
      title: title('Pricing: Power BI Practice Plans'),
      description: desc('Start practicing Power BI for free. Upgrade to Pro for every exercise, project and PL-300 practice test, or buy a 3-month PL-300 Prep pass.', FILLER),
      h1: 'Pricing',
      paragraphs: ['Free: the first exercises of every chapter, one project and PL-300 practice test 1. Pro: every exercise, project and practice test, yearly or monthly. PL-300 Prep: 3 months of practice tests. Enterprise: Pro for your whole team, a manager dashboard with everyone’s progress and one company invoice; contact us for a quote.'],
      links: [
        { href: '/exercises', text: 'Start with the free exercises' },
        { href: '/pl300', text: 'Try the free PL-300 practice test' },
      ],
    },
    {
      path: '/terms',
      title: title('Terms of Use'),
      description: desc(`The terms for using ${BRAND}: accounts, paid plans, practice tests and certificates, and trademarks.`, FILLER),
      h1: 'Terms of Use',
      paragraphs: [`Last updated ${UPDATED}.`, ...TERMS.flatMap((x) => [`${x.h}.`, ...x.p])],
      links: [{ href: '/privacy', text: 'Privacy Policy' }],
    },
    {
      path: '/privacy',
      title: title('Privacy Policy'),
      description: desc(`How ${BRAND} handles your data: progress, accounts, payments through Stripe, cookies and Google Analytics, and your rights.`, FILLER),
      h1: 'Privacy Policy',
      paragraphs: [`Last updated ${UPDATED}.`, ...PRIVACY.flatMap((x) => [`${x.h}.`, ...x.p])],
      links: [{ href: '/terms', text: 'Terms of Use' }],
    },
  ];

  // Exercises: the lesson and task as text, plus previous/next in the same chapter.
  for (const mod of MODULES) {
    const list = EXERCISES.filter((e) => e.module === mod.id);
    list.forEach((e, i) => {
      const lesson = plain(e.lesson);
      pages.push({
        path: `/exercise/${e.id}`,
        title: exerciseTitle(e.title),
        description: desc(`${mod.title} (${e.level}). ${lesson}`, FILLER),
        h1: e.title,
        paragraphs: [
          `${mod.title} · ${e.level} · Chapter ${MODULES.indexOf(mod) + 1} of ${MODULES.length}. ${mod.blurb}`,
          lesson,
          ...e.task.map((t) => `Task: ${plain(t)}`),
          'How it works: the exercise opens a practice copy of the Power BI report editor in your browser, on a sales model with Sales, Product, Customer and Date tables. Do the task, press Check, and your result is compared with the expected answer in seconds. Hints are there if you get stuck.',
        ],
        linksHeading: `More ${mod.title} exercises`,
        links: [
          ...(list[i - 1] ? [{ href: `/exercise/${list[i - 1].id}`, text: `Previous: ${list[i - 1].title}` }] : []),
          ...(list[i + 1] ? [{ href: `/exercise/${list[i + 1].id}`, text: `Next: ${list[i + 1].title}` }] : []),
          { href: '/exercises', text: 'All Power BI practice exercises' },
        ],
      });
    });
  }

  for (const p of PROJECTS) {
    pages.push({
      path: `/projects/${p.id}`,
      title: projectTitle(p.title),
      description: desc(`${p.tagline} ${plain(p.brief.message)}`, FILLER),
      h1: p.title,
      paragraphs: [p.tagline, plain(p.brief.message), `Skills: ${p.skills.join(', ')}.`],
      linksHeading: 'Project steps',
      links: [...p.steps.map(exLink), { href: '/projects', text: 'All Power BI practice projects' }],
    });
  }

  const byCategory = new Map<string, typeof DAX_FUNCTIONS>();
  for (const f of DAX_FUNCTIONS) byCategory.set(f.category, [...(byCategory.get(f.category) ?? []), f]);
  for (const f of DAX_FUNCTIONS) {
    pages.push({
      path: `/dax-functions/${f.name.toLowerCase()}`,
      title: daxTitle(f.name),
      description: desc(`${f.name}: ${f.description} Syntax: ${f.syntax}.`, FILLER),
      h1: `DAX ${f.name} function`,
      paragraphs: [
        f.description,
        `Syntax: ${f.syntax}`,
        `Example: ${f.example}`,
        `${f.name} is one of the ${DAX_CATEGORIES.find((c) => c.id === f.category)?.title.toLowerCase() ?? 'DAX functions'}. ${DAX_CATEGORIES.find((c) => c.id === f.category)?.blurb ?? ''}`,
        `Practice ${f.name} hands-on: write a measure that uses it on a realistic sales model and get it checked instantly, without installing Power BI.`,
      ],
      linksHeading: `Related ${f.category} functions`,
      links: [...(byCategory.get(f.category) ?? []).filter((g) => g !== f).map(fnLink), { href: '/dax-functions', text: 'All DAX functions' }],
    });
  }

  for (const t of TESTS) {
    pages.push({
      path: `/pl300/${t.id}`,
      title: testTitle(t.title),
      description: desc(`An exam-style PL-300 practice test with ${t.questionIds.length} questions across all four domains and an explanation for every answer.`, FILLER),
      h1: `${t.title}: PL-300 practice test`,
      paragraphs: [
        `${t.questionIds.length} exam-style questions for the PL-300 Power BI Data Analyst exam, with an explanation for every answer.${t.free ? ' This test is free.' : ''}`,
        `The questions follow the exam's four skill areas: ${DOMAINS.map((d) => `${d.title} (${d.weight} of the exam)`).join(', ')}.`,
        'The real exam is scored from 100 to 1,000 and you need 700 to pass. Here the pass mark is 70%, and your best score is saved so you can see your progress.',
      ],
      links: [{ href: '/pl300', text: 'All PL-300 practice tests' }],
    });
  }

  const seen = new Set<string>();
  return pages.filter((p) => !seen.has(p.path) && seen.add(p.path));
}

/** Kept for callers that only need the paths. */
export function sitemapPaths(): string[] {
  return pageMeta().map((p) => p.path);
}
