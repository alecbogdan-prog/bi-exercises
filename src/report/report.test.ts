import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../exercises/exercises';
import { applyBookmark, captureBookmark, effectiveVisualSpec, setInteraction, setSlicerSyncedOn, setSlicerValues, setSlicerVisibleOn } from './report';
import type { ReportState } from './report';

const sync = EXERCISES.find((e) => e.id === 'pages-sync-slicers')!;
const base = sync.report as ReportState;
const overview = () => base.pages[0];

describe('multi-page reports', () => {
  it('slicer selections filter the page, unless the interaction is None', () => {
    const r = setSlicerValues(base, 's-year', [2025]);
    const card = r.pages[0].visuals.find((v) => v.id === 'v-total')!;
    expect(effectiveVisualSpec(r.pages[0], card, r, null, [])!.filters).toEqual([{ table: 'Date', column: 'Year', values: [2025] }]);
    const off = setInteraction(r, 's-year', 'v-total', 'none');
    expect(effectiveVisualSpec(off.pages[0], card, off, null, [])!.filters).toEqual([]);
  });

  it('cross-filtering skips the source visual and respects None', () => {
    const cross = { sourceId: 'v-cat', field: { table: 'Product', column: 'Category' }, value: 'Bikes' };
    const card = overview().visuals.find((v) => v.id === 'v-total')!;
    const cat = overview().visuals.find((v) => v.id === 'v-cat')!;
    expect(effectiveVisualSpec(overview(), card, base, cross, [])!.filters).toHaveLength(1);
    expect(effectiveVisualSpec(overview(), cat, base, cross, [])!.filters).toHaveLength(0);
    const off = setInteraction(base, 'v-cat', 'v-total', 'none');
    expect(effectiveVisualSpec(off.pages[0], card, off, cross, [])!.filters).toHaveLength(0);
  });

  it('synced slicers share their selection across pages', () => {
    let r = setSlicerVisibleOn(base, 's-year', 'products', true);
    r = setSlicerSyncedOn(r, 's-year', 'products', true);
    r = setSlicerValues(r, 's-year', [2024]);
    const copy = r.pages[1].visuals.find((v) => v.kind === 'slicer')!;
    expect(copy.values).toEqual([2024]);
    // Not synced: a visible copy keeps its own selection.
    let r2 = setSlicerVisibleOn(base, 's-year', 'customers', true);
    r2 = setSlicerValues(r2, 's-year', [2024]);
    expect(r2.pages[2].visuals.find((v) => v.kind === 'slicer')!.values).toEqual([]);
  });

  it('bookmarks capture hidden visuals and slicer values, and restore them', () => {
    const state = { ...setSlicerValues(base, 's-year', [2025]), hidden: ['v-state'] };
    const b = captureBookmark(state, 'overview', 'Mine');
    expect(b.hidden).toEqual(['v-state']);
    expect(b.slicers['s-year']).toEqual([2025]);
    const restored = applyBookmark({ ...base, hidden: [] }, b);
    expect(restored.hidden).toEqual(['v-state']);
    expect(restored.pages[0].visuals.find((v) => v.id === 's-year')!.values).toEqual([2025]);
  });
});
