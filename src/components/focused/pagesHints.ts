import type { PagesRequirement, ReportState } from '../../report/report';
import { checkPages, findVisual, pageByName } from '../../report/report';
import type { NextClick } from './nextClick';

const exists = (sel: string) => !!document.querySelector(sel);
const currentPage = () => (document.querySelector('[data-page-tab][data-current]') as HTMLElement | null)?.dataset.pageTab ?? '';
const selectedVisual = () => (document.querySelector('[data-testid^="visual-"][data-selected]') as HTMLElement | null)?.dataset.testid?.slice('visual-'.length) ?? null;
const MODE: Record<string, string> = { none: 'None', filter: 'Filter', highlight: 'Highlight' };

const goTo = (name: string): NextClick => ({ hint: { target: `[data-page-tab="${name}"]` }, text: `Go to the ${name} page.` });
const select = (r: ReportState, id: string): NextClick => ({ hint: { target: `[data-testid="visual-${id}"]` }, text: `Click the ${findVisual(r, id)?.visual.title ?? id} visual to select it.` });
const deselect: NextClick = { hint: { target: '[data-testid="report-page"]' }, text: 'Click an empty spot on the page, so no visual is selected (the page settings appear).' };
const pane = (testid: string, button: string, label: string): NextClick | null => (exists(`[data-testid="${testid}"]`) ? null : { hint: { target: `[data-testid="mini-${button}"]` }, text: `Click ${label} to open its pane.` });
const vizTab = (t: 'build' | 'format'): NextClick | null =>
  exists(`[data-viz-tab="${t}"]`) && !document.querySelector(`[data-viz-tab="${t}"]`)?.className.includes('font-semibold')
    ? { hint: { target: `[data-viz-tab="${t}"]` }, text: `Click ${t === 'build' ? 'Build' : 'Format'} in Visualizations.` }
    : null;

/** On the right page, with this visual selected (or none). */
function at(r: ReportState, page: string, visual: string | null): NextClick | null {
  if (currentPage() !== page) return goTo(page);
  const sel = selectedVisual();
  if (visual === null) return sel ? deselect : null;
  return sel === visual ? null : select(r, visual);
}

function step(r: ReportState, q: PagesRequirement): NextClick | null {
  switch (q.type) {
    case 'page': {
      if (exists('input[aria-label="Page name"]')) return { hint: { target: 'input[aria-label="Page name"]' }, text: `Type “${q.name}” and press Enter.` };
      const fresh = r.pages.find((p) => /^Page \d+$/.test(p.name));
      if (fresh) return { hint: { target: `[data-page-tab="${fresh.name}"]` }, text: `Double-click the ${fresh.name} tab to rename it to “${q.name}”.` };
      return { hint: { target: '[aria-label="New page"]' }, text: 'Click + next to the page tabs to add a page.' };
    }
    case 'hiddenPage':
      return { hint: { target: `[data-page-tab="${q.page}"]` }, text: `Right-click the ${q.page} tab and choose Hide page.` };
    case 'interaction': {
      const from = findVisual(r, q.from);
      if (!from) return null;
      const where = at(r, from.page.name, q.from);
      if (where) return where;
      if (!exists('[data-testid="interaction-bar"]')) return { hint: { target: '[data-testid="mini-edit-interactions"]' }, text: 'Click Edit interactions.' };
      return { hint: { target: `[data-testid="visual-${q.to}"] [aria-label="${MODE[q.mode]}"]` }, text: `On “${findVisual(r, q.to)?.visual.title}”, choose ${MODE[q.mode]}.` };
    }
    case 'drillthrough': {
      const where = at(r, q.page, null);
      if (where) return where;
      const tab = vizTab('build');
      if (tab) return tab;
      return { hint: { target: 'select[aria-label="Add a drill-through field"]' }, text: `In Drill through, choose ${q.field.column} from “+ Add a field…”.` };
    }
    case 'synced': {
      const host = r.pages.find((p) => p.visuals.some((v) => v.kind === 'slicer' && v.field?.table === q.field.table && v.field.column === q.field.column));
      const slicer = host?.visuals.find((v) => v.kind === 'slicer' && v.field?.column === q.field.column);
      if (!host || !slicer) return null;
      const where = at(r, host.name, slicer.id);
      if (where) return where;
      const open = pane('pane-sync', 'toggle-sync', 'Sync slicers');
      if (open) return open;
      for (const name of q.pages) {
        const msg = checkPages(r, [{ ...q, pages: [name] }]);
        if (!msg.length) continue;
        const visible = msg.some((m) => m.includes('visible'));
        return { hint: { target: `[aria-label="${visible ? 'Visible' : 'Sync'} on ${name}"]` }, text: `Tick ${visible ? 'Visible' : 'Sync'} for ${name}.` };
      }
      return null;
    }
    case 'bookmark': {
      const id = q.hidden[0] ?? q.visible[0];
      const home = id ? findVisual(r, id)?.page : undefined;
      if (home && currentPage() !== home.name) return goTo(home.name);
      // First make the page look the way the bookmark should remember it.
      for (const h of q.hidden) {
        if (!r.hidden.includes(h)) {
          return pane('pane-selection', 'toggle-selection', 'Selection') ?? { hint: { target: `[aria-label="Hide ${findVisual(r, h)?.visual.title}"]` }, text: `Hide “${findVisual(r, h)?.visual.title}” with its eye icon.` };
        }
      }
      for (const v of q.visible) {
        if (r.hidden.includes(v)) {
          return pane('pane-selection', 'toggle-selection', 'Selection') ?? { hint: { target: `[aria-label="Show ${findVisual(r, v)?.visual.title}"]` }, text: `Show “${findVisual(r, v)?.visual.title}” again.` };
        }
      }
      const open = pane('pane-bookmarks', 'toggle-bookmarks', 'Bookmarks');
      if (open) return open;
      const b = r.bookmarks.find((x) => x.name.trim().toLowerCase() === q.name.toLowerCase());
      if (b) return { hint: { target: `[aria-label="More options for ${b.name}"]` }, text: 'Choose Update, so the bookmark remembers the page as it is now.' };
      if (exists('input[aria-label="Bookmark name"]')) return { hint: { target: 'input[aria-label="Bookmark name"]' }, text: `Type “${q.name}” and press Enter.` };
      const fresh = r.bookmarks.find((x) => /^Bookmark \d+$/.test(x.name));
      if (fresh) return { hint: { target: `[data-bookmark="${fresh.name}"]` }, text: `Double-click ${fresh.name} to rename it to “${q.name}”.` };
      return { hint: { target: '[data-testid="bookmark-add"]' }, text: 'Click Add to save the page as a bookmark.' };
    }
    case 'button': {
      if (currentPage() !== q.page) return goTo(q.page);
      const page = pageByName(r, q.page);
      const buttons = page?.visuals.filter((v) => v.kind === 'button') ?? [];
      if (q.action.type === 'back' && !buttons.some((b) => b.action?.type === 'back')) {
        return { hint: { target: '[data-testid="mini-insert-back-button"]' }, text: 'Click Back button to add one.' };
      }
      const candidate = buttons.find((b) => !b.action || b.action.type !== q.action.type) ?? buttons.find((b) => b.action?.type === q.action.type);
      if (!candidate) return { hint: { target: '[data-testid="mini-insert-button"]' }, text: 'Click Button to add a button to the page.' };
      if (selectedVisual() !== candidate.id) return select(r, candidate.id);
      const tab = vizTab('format');
      if (tab) return tab;
      const want = q.action.type === 'page' ? 'Page navigation' : q.action.type === 'bookmark' ? 'Bookmark' : 'Back';
      if (candidate.action?.type !== q.action.type) return { hint: { target: 'select[aria-label="Action type"]' }, text: `Set Action type to ${want}.` };
      if (q.action.type === 'page') return { hint: { target: 'select[aria-label="Destination"]' }, text: `Choose ${q.action.page} as the destination.` };
      if (q.action.type === 'bookmark') return { hint: { target: 'select[aria-label="Bookmark"]' }, text: `Choose the ${q.action.name} bookmark.` };
      return null;
    }
    case 'tooltipPage': {
      const p = pageByName(r, q.page);
      if (!p) return null;
      if (!p.tooltip) {
        const where = at(r, q.page, null);
        if (where) return where;
        const tab = vizTab('format');
        if (tab) return tab;
        return { hint: { target: '[aria-label="Allow use as tooltip"]' }, text: 'Turn on Allow use as tooltip.' };
      }
      const v = findVisual(r, q.visual);
      if (!v) return null;
      const where = at(r, v.page.name, q.visual);
      if (where) return where;
      const tab = vizTab('format');
      if (tab) return tab;
      if (!v.visual.tooltipPage) return { hint: { target: 'select[aria-label="Tooltip type"]' }, text: 'Set Tooltips → Type to Report page.' };
      return { hint: { target: 'select[aria-label="Tooltip page"]' }, text: `Choose the ${q.page} page.` };
    }
  }
}

/** Multi-page exercises: the first requirement that is not met yet, and where to click for it. */
export function pagesStep(require: PagesRequirement[], r: ReportState): NextClick | null {
  for (const q of require) {
    if (!checkPages(r, [q]).length) continue;
    const s = step(r, q);
    if (s) return s;
  }
  return null;
}
