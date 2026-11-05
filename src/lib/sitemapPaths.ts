import { EXERCISES } from '../exercises/exercises';
import { DAX_FUNCTIONS } from '../content/daxFunctions';
import { PROJECTS } from '../projects/projects';
import { TESTS } from '../pl300/questions';

/** Every public page the router serves, for sitemap.xml (built in vite.config.ts). */
export function sitemapPaths(): string[] {
  const paths = [
    '/',
    '/exercises',
    '/projects',
    '/dax-functions',
    '/pl300',
    '/pricing',
    '/terms',
    '/privacy',
    ...EXERCISES.map((e) => `/exercise/${e.id}`),
    ...PROJECTS.map((p) => `/projects/${p.id}`),
    ...DAX_FUNCTIONS.map((f) => `/dax-functions/${f.name.toLowerCase()}`),
    ...TESTS.map((t) => `/pl300/${t.id}`),
  ];
  return [...new Set(paths)];
}
