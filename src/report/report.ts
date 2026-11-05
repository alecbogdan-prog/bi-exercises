// Multi-page reports: pages, cross-visual interactions, drillthrough, bookmarks, buttons, tooltip pages and synced slicers.
// Pure data and functions; the UI lives in src/components/report.
import type { Scalar } from '../engine/model';
import type { FieldFilter, FieldRef, VisualSpec } from '../engine/visual';

export type Interaction = 'filter' | 'highlight' | 'none';

export type ButtonAction = { type: 'back' } | { type: 'page'; pageId: string } | { type: 'bookmark'; bookmarkId: string };

export interface ReportVisual {
  id: string;
  title: string;
  /** Position and size on the page, in percent of the page. */
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'visual' | 'slicer' | 'button';
  spec?: VisualSpec;
  /** Slicers: the field and the selected values (empty = all). */
  field?: FieldRef;
  values?: Scalar[];
  /** Buttons: label and what happens on Ctrl+click. */
  label?: string;
  action?: ButtonAction;
  /** Visuals: a report page shown as the tooltip. */
  tooltipPage?: string;
}

export interface ReportPage {
  id: string;
  name: string;
  visuals: ReportVisual[];
  /** Fields in the page's Drill through well. */
  drillthrough?: FieldRef[];
  /** Page information → Allow use as tooltip. */
  tooltip?: boolean;
  hidden?: boolean;
}

export interface Bookmark {
  id: string;
  name: string;
  pageId: string;
  hidden: string[];
  /** Slicer selections captured with the bookmark, by slicer id. */
  slicers: Record<string, Scalar[]>;
}

export interface ReportState {
  pages: ReportPage[];
  /** interactions[sourceVisualId][targetVisualId]; anything not listed uses the default (filter). */
  interactions: Record<string, Record<string, Interaction>>;
  /** Slicer sync groups: slicers on the listed pages with the same field share one selection. */
  syncGroups: { field: FieldRef; pages: string[] }[];
  bookmarks: Bookmark[];
  /** Visual ids hidden in the Selection pane. */
  hidden: string[];
}

export const fieldKey = (f: FieldRef) => `${f.table}[${f.column}]`;
const sameField = (a: FieldRef | undefined, b: FieldRef | undefined) => !!a && !!b && a.table === b.table && a.column === b.column;

export const pageById = (r: ReportState, id: string) => r.pages.find((p) => p.id === id);
export const pageByName = (r: ReportState, name: string) => r.pages.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());

export function findVisual(r: ReportState, id: string): { page: ReportPage; visual: ReportVisual } | null {
  for (const page of r.pages) {
    const visual = page.visuals.find((v) => v.id === id);
    if (visual) return { page, visual };
  }
  return null;
}

export function interactionOf(r: ReportState, from: string, to: string): Interaction {
  return r.interactions[from]?.[to] ?? 'filter';
}

let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

// ---------------- updates (all immutable) ----------------

export function updatePage(r: ReportState, id: string, fn: (p: ReportPage) => ReportPage): ReportState {
  return { ...r, pages: r.pages.map((p) => (p.id === id ? fn(p) : p)) };
}

export function updateVisual(r: ReportState, id: string, fn: (v: ReportVisual) => ReportVisual): ReportState {
  return { ...r, pages: r.pages.map((p) => ({ ...p, visuals: p.visuals.map((v) => (v.id === id ? fn(v) : v)) })) };
}

export function addPage(r: ReportState): { report: ReportState; page: ReportPage } {
  let n = r.pages.length + 1;
  while (r.pages.some((p) => p.name === `Page ${n}`)) n++;
  const page: ReportPage = { id: newId('page'), name: `Page ${n}`, visuals: [] };
  return { report: { ...r, pages: [...r.pages, page] }, page };
}

export function deletePage(r: ReportState, id: string): ReportState {
  if (r.pages.length <= 1) return r;
  return { ...r, pages: r.pages.filter((p) => p.id !== id), syncGroups: r.syncGroups.map((g) => ({ ...g, pages: g.pages.filter((x) => x !== id) })) };
}

export function setInteraction(r: ReportState, from: string, to: string, mode: Interaction): ReportState {
  return { ...r, interactions: { ...r.interactions, [from]: { ...(r.interactions[from] ?? {}), [to]: mode } } };
}

/** Selecting values in a slicer also updates every slicer synced with it. */
export function setSlicerValues(r: ReportState, slicerId: string, values: Scalar[]): ReportState {
  const found = findVisual(r, slicerId);
  if (!found?.visual.field) return r;
  const group = r.syncGroups.find((g) => sameField(g.field, found.visual.field) && g.pages.includes(found.page.id));
  const targets = new Set<string>([slicerId]);
  if (group) for (const p of r.pages) if (group.pages.includes(p.id)) for (const v of p.visuals) if (v.kind === 'slicer' && sameField(v.field, found.visual.field)) targets.add(v.id);
  return { ...r, pages: r.pages.map((p) => ({ ...p, visuals: p.visuals.map((v) => (targets.has(v.id) ? { ...v, values } : v)) })) };
}

/** Sync slicers pane, "Visible" column: adds a copy of the slicer to a page, or removes it. */
export function setSlicerVisibleOn(r: ReportState, slicerId: string, pageId: string, visible: boolean): ReportState {
  const found = findVisual(r, slicerId);
  if (!found?.visual.field) return r;
  const field = found.visual.field;
  const page = pageById(r, pageId);
  if (!page) return r;
  const existing = page.visuals.find((v) => v.kind === 'slicer' && sameField(v.field, field));
  if (visible && !existing) {
    const copy: ReportVisual = { ...found.visual, id: newId('slicer') };
    return updatePage(r, pageId, (p) => ({ ...p, visuals: [...p.visuals, copy] }));
  }
  if (!visible && existing && page.id !== found.page.id) return updatePage(r, pageId, (p) => ({ ...p, visuals: p.visuals.filter((v) => v.id !== existing.id) }));
  return r;
}

/** Sync slicers pane, "Sync" column. */
export function setSlicerSyncedOn(r: ReportState, slicerId: string, pageId: string, synced: boolean): ReportState {
  const found = findVisual(r, slicerId);
  if (!found?.visual.field) return r;
  const field = found.visual.field;
  const groups = [...r.syncGroups];
  let i = groups.findIndex((g) => sameField(g.field, field));
  if (i === -1) {
    groups.push({ field, pages: [found.page.id] });
    i = groups.length - 1;
  }
  const pages = new Set(groups[i].pages);
  pages.add(found.page.id);
  if (synced) pages.add(pageId);
  else if (pageId !== found.page.id) pages.delete(pageId);
  groups[i] = { field, pages: r.pages.map((p) => p.id).filter((id) => pages.has(id)) };
  return { ...r, syncGroups: groups };
}

export function isSyncedOn(r: ReportState, field: FieldRef | undefined, pageId: string): boolean {
  return !!field && r.syncGroups.some((g) => sameField(g.field, field) && g.pages.includes(pageId));
}

export function captureBookmark(r: ReportState, pageId: string, name: string): Bookmark {
  const page = pageById(r, pageId)!;
  const slicers: Record<string, Scalar[]> = {};
  for (const v of page.visuals) if (v.kind === 'slicer') slicers[v.id] = v.values ?? [];
  return { id: newId('bm'), name, pageId, hidden: page.visuals.filter((v) => r.hidden.includes(v.id)).map((v) => v.id), slicers };
}

export function applyBookmark(r: ReportState, b: Bookmark): ReportState {
  const page = pageById(r, b.pageId);
  if (!page) return r;
  const onPage = new Set(page.visuals.map((v) => v.id));
  let next: ReportState = { ...r, hidden: [...r.hidden.filter((id) => !onPage.has(id)), ...b.hidden] };
  for (const [id, values] of Object.entries(b.slicers)) next = setSlicerValues(next, id, values);
  return next;
}

// ---------------- what each visual shows ----------------

/** A data point clicked in another visual: it cross-filters the rest of the page. */
export interface CrossSelection {
  sourceId: string;
  field: FieldRef;
  value: Scalar;
}

/** The spec a visual is computed with: its own filters plus slicers, drillthrough context and cross-filtering. */
export function effectiveVisualSpec(page: ReportPage, visual: ReportVisual, r: ReportState, cross: CrossSelection | null, drill: FieldFilter[]): VisualSpec | null {
  if (!visual.spec) return null;
  const extra: FieldFilter[] = [...drill];
  for (const s of page.visuals) {
    if (s.kind !== 'slicer' || !s.field || !s.values?.length) continue;
    if (interactionOf(r, s.id, visual.id) === 'none') continue;
    extra.push({ ...s.field, values: s.values });
  }
  if (cross && cross.sourceId !== visual.id && interactionOf(r, cross.sourceId, visual.id) !== 'none') extra.push({ ...cross.field, values: [cross.value] });
  return { ...visual.spec, filters: [...visual.spec.filters, ...extra] };
}

/** Pages a data point can be drilled through to: their Drill through well contains the clicked field. */
export function drillTargets(r: ReportState, field: FieldRef, fromPageId: string): ReportPage[] {
  return r.pages.filter((p) => p.id !== fromPageId && p.drillthrough?.some((d) => sameField(d, field)));
}

// ---------------- checking ----------------

export type PagesRequirement =
  | { type: 'page'; name: string }
  | { type: 'drillthrough'; page: string; field: FieldRef }
  | { type: 'interaction'; from: string; to: string; mode: Interaction }
  | { type: 'synced'; field: FieldRef; pages: string[] }
  | { type: 'bookmark'; name: string; hidden: string[]; visible: string[] }
  | { type: 'button'; page: string; action: { type: 'back' } | { type: 'page'; page: string } | { type: 'bookmark'; name: string } }
  | { type: 'tooltipPage'; page: string; visual: string }
  | { type: 'hiddenPage'; page: string };

export interface PagesCheck {
  kind: 'pages';
  require: PagesRequirement[];
}

const titleOf = (r: ReportState, id: string) => findVisual(r, id)?.visual.title ?? id;

/** One message per requirement that is not met yet. */
export function checkPages(r: ReportState, require: PagesRequirement[]): string[] {
  const out: string[] = [];
  for (const q of require) {
    switch (q.type) {
      case 'page':
        if (!pageByName(r, q.name)) out.push(`Add a page named "${q.name}" (click + next to the page tabs, then double-click the tab to rename it).`);
        break;
      case 'drillthrough': {
        const p = pageByName(r, q.page);
        if (!p) out.push(`The page "${q.page}" is missing.`);
        else if (!p.drillthrough?.some((d) => sameField(d, q.field))) out.push(`On the "${q.page}" page, add ${fieldKey(q.field)} to the Drill through well (Visualizations pane, with no visual selected).`);
        break;
      }
      case 'interaction': {
        const got = interactionOf(r, q.from, q.to);
        if (got !== q.mode)
          out.push(`When you click "${titleOf(r, q.from)}", the "${titleOf(r, q.to)}" visual should be set to ${q.mode === 'none' ? 'None' : q.mode === 'filter' ? 'Filter' : 'Highlight'} (it is ${got === 'none' ? 'None' : got === 'filter' ? 'Filter' : 'Highlight'}). Use Format → Edit interactions.`);
        break;
      }
      case 'synced':
        for (const name of q.pages) {
          const p = pageByName(r, name);
          if (!p) {
            out.push(`The page "${name}" is missing.`);
            continue;
          }
          if (!p.visuals.some((v) => v.kind === 'slicer' && sameField(v.field, q.field))) out.push(`The ${q.field.column} slicer should be visible on "${name}" (View → Sync slicers, Visible column).`);
          if (!isSyncedOn(r, q.field, p.id)) out.push(`The ${q.field.column} slicer should be synced on "${name}" (View → Sync slicers, Sync column).`);
        }
        break;
      case 'bookmark': {
        const b = r.bookmarks.find((x) => x.name.trim().toLowerCase() === q.name.toLowerCase());
        if (!b) {
          out.push(`Add a bookmark named "${q.name}" (View → Bookmarks → Add, then rename it).`);
          break;
        }
        for (const id of q.hidden) if (!b.hidden.includes(id)) out.push(`In the "${q.name}" bookmark, "${titleOf(r, id)}" should be hidden. Hide it in the Selection pane, then Update the bookmark.`);
        for (const id of q.visible) if (b.hidden.includes(id)) out.push(`In the "${q.name}" bookmark, "${titleOf(r, id)}" should be visible.`);
        break;
      }
      case 'button': {
        const p = pageByName(r, q.page);
        const buttons = p?.visuals.filter((v) => v.kind === 'button') ?? [];
        const ok = buttons.some((b) => {
          const a = b.action;
          if (!a || a.type !== q.action.type) return false;
          if (a.type === 'page' && q.action.type === 'page') return pageById(r, a.pageId)?.name.toLowerCase() === q.action.page.toLowerCase();
          if (a.type === 'bookmark' && q.action.type === 'bookmark') return r.bookmarks.find((x) => x.id === a.bookmarkId)?.name.toLowerCase() === q.action.name.toLowerCase();
          return true;
        });
        if (!ok) {
          const what = q.action.type === 'back' ? 'Back' : q.action.type === 'page' ? `Page navigation to "${q.action.page}"` : `Bookmark "${q.action.name}"`;
          out.push(`On "${q.page}", add a button (Insert → Buttons) with the action ${what} (Format → Action).`);
        }
        break;
      }
      case 'tooltipPage': {
        const p = pageByName(r, q.page);
        if (!p?.tooltip) out.push(`Turn on "Allow use as tooltip" for the "${q.page}" page (Format pane → Page information, with no visual selected).`);
        const v = findVisual(r, q.visual)?.visual;
        if (!p || v?.tooltipPage !== p.id) out.push(`Set the tooltip of "${titleOf(r, q.visual)}" to the report page "${q.page}" (select it → Format → Tooltips).`);
        break;
      }
      case 'hiddenPage':
        if (!pageByName(r, q.page)?.hidden) out.push(`Hide the "${q.page}" page (right-click its tab → Hide page).`);
        break;
    }
  }
  return out;
}
