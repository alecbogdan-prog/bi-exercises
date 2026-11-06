import type { Step } from '../../engine/query';
import { DATE_PART_NAME, TYPE_LABEL, stepNames } from '../../engine/query';
import type { NextClick } from './nextClick';

type Tab = 'Home' | 'Transform' | 'Add Column';

const TEXT_FN: Record<string, string> = { lower: 'lowercase', upper: 'UPPERCASE', proper: 'Capitalize Each Word', trim: 'Trim' };
const COND: Record<string, string> = { equals: 'Equals', notEquals: 'Does Not Equal', greaterThan: 'Greater Than', lessThan: 'Less Than', contains: 'Contains' };

/** Where a step is made: the ribbon tab and button, the columns to select first, and what to choose or type after the click. */
function recipe(s: Step): { tab: Tab; button: string; cols: string[]; then?: string } | { header: string; then: string } {
  switch (s.op) {
    case 'promoteHeaders':
      return { tab: 'Home', button: 'Use First Row as Headers', cols: [] };
    case 'removeColumns':
      return { tab: 'Home', button: 'Remove Columns', cols: s.columns };
    case 'keepColumns':
      return { tab: 'Home', button: 'Remove Other Columns', cols: s.columns };
    case 'rename':
      return { tab: 'Transform', button: 'Rename', cols: [s.from], then: `Type the new name “${s.to}” and click OK.` };
    case 'changeType':
      return { tab: 'Home', button: 'Data Type', cols: s.columns, then: `Choose ${TYPE_LABEL[s.type]}.` };
    case 'filterRows':
      return s.cond === 'notBlank'
        ? { header: s.column, then: 'Choose Remove Empty.' }
        : { header: s.column, then: `Choose Filter: ${COND[s.cond]}…, enter ${JSON.stringify(s.value)} and click OK.` };
    case 'replaceValues':
      return { tab: 'Home', button: 'Replace Values', cols: s.columns, then: `Find “${s.find}”, replace with “${s.replace}”, then OK.` };
    case 'transformText':
      return { tab: 'Transform', button: 'Format', cols: s.columns, then: `Choose ${TEXT_FN[s.fn]}.` };
    case 'split':
      return { tab: 'Home', button: 'Split Column', cols: [s.column], then: `Use the delimiter “${s.delimiter}” and click OK.` };
    case 'removeDuplicates':
      return { tab: 'Home', button: 'Remove Rows', cols: [], then: 'Choose Remove Duplicates.' };
    case 'removeBlankRows':
      return { tab: 'Home', button: 'Remove Rows', cols: [], then: 'Choose Remove Blank Rows.' };
    case 'unpivotOther':
      return { tab: 'Transform', button: 'Unpivot Columns', cols: s.keep, then: 'Choose Unpivot Other Columns.' };
    case 'groupBy':
      return {
        tab: 'Home',
        button: 'Group By',
        cols: [],
        then: `Group by ${s.by.join(', ')}; ${s.aggs.map((a) => `${a.name} = ${a.op}${a.column ? ` of ${a.column}` : ''}`).join('; ')}. Then OK.`,
      };
    case 'merge':
      return { tab: 'Home', button: 'Merge Queries', cols: [], then: `Merge with ${s.with} on ${s.leftKey} = ${s.rightKey}, expand ${s.expand.join(', ')}${s.kind && s.kind !== 'left' ? ` (join kind: ${s.kind})` : ''}.` };
    case 'append':
      return { tab: 'Home', button: 'Append Queries', cols: [], then: `Append ${s.with} and click OK.` };
    case 'customColumn':
      return { tab: 'Add Column', button: 'Custom Column', cols: [], then: `Name it “${s.name}” with the formula ${s.formula}.` };
    case 'fillDown':
      return { tab: 'Transform', button: 'Fill', cols: s.columns, then: 'Choose Down.' };
    case 'conditionalColumn':
      return { tab: 'Add Column', button: 'Conditional Column', cols: [], then: `Name it “${s.name}”: if ${s.column} ${s.cond} ${JSON.stringify(s.value)} then ${JSON.stringify(s.then)}, else ${JSON.stringify(s.else)}.` };
    case 'addIndex':
      return { tab: 'Add Column', button: 'Index Column', cols: [], then: `Choose From ${s.start}.` };
    case 'datePart':
      return { tab: 'Add Column', button: 'Date', cols: [s.column], then: `Choose ${s.part === 'monthName' ? 'Name of Month' : DATE_PART_NAME[s.part]}.` };
    case 'pivot':
      return { tab: 'Transform', button: 'Pivot Column', cols: [s.column], then: `Values column: ${s.values}, aggregate: ${s.agg}. Then OK.` };
    case 'sort':
      return { tab: 'Home', button: s.desc ? 'Sort Descending' : 'Sort Ascending', cols: [s.column] };
    case 'keepTop':
      return { tab: 'Home', button: 'Keep Rows', cols: [], then: `Choose Keep Top Rows… and enter ${s.n}.` };
    case 'extractText':
      return { tab: 'Transform', button: 'Extract', cols: [s.column], then: `Choose Text ${s.mode === 'before' ? 'Before' : 'After'} Delimiter… with “${s.delimiter}”.` };
  }
}

/** Steps compared as data, ignoring the order of column lists. */
const norm = (s: Step) => JSON.stringify(s, (k, v) => (Array.isArray(v) && v.every((x) => typeof x === 'string') && ['columns', 'keep', 'expand', 'by'].includes(k) ? [...v].sort() : v));

/** Power Query hint: the first step that differs from the answer, and where to click to make it. */
export function queryStep(answer: Step[], have: Step[]): NextClick | null {
  if (!document.querySelector('[data-testid="pq-editor"]')) {
    return { hint: { target: '[data-testid="mini-transform"]' }, text: 'Click Transform data to open the Power Query editor.' };
  }
  const i = answer.findIndex((s, k) => !have[k] || norm(have[k]) !== norm(s));
  if (i < 0) {
    if (have.length > answer.length) {
      const name = stepNames(have)[answer.length];
      return { hint: { target: `[data-pq-step="${answer.length}"] [aria-label="Delete ${name}"]` }, text: `“${name}” is not needed. Delete it from Applied Steps.` };
    }
    return null;
  }
  if (have[i]) {
    const name = stepNames(have)[i];
    return { hint: { target: `[data-pq-step="${i}"] [aria-label="Delete ${name}"]` }, text: `“${name}” is not what the answer needs here. Delete it from Applied Steps, then redo this step.` };
  }
  if (document.querySelector('[data-testid="pq-editor"] [role="dialog"]')) {
    const r = recipe(answer[i]);
    return { hint: { target: '[data-testid="pq-editor"] [role="dialog"]' }, text: r.then ?? 'Fill in the dialog and click OK.' };
  }
  const r = recipe(answer[i]);
  if ('header' in r) {
    return { hint: { target: `[data-testid="pq-grid"] th[data-col="${r.header}"] [aria-label="${r.header} menu"]` }, text: `Open the menu on the ${r.header} column header. ${r.then}` };
  }
  const selected = [...document.querySelectorAll('[data-testid="pq-grid"] th[data-selected]')].map((th) => (th as HTMLElement).dataset.col ?? '');
  const need = r.cols;
  const missing = need.find((c) => !selected.includes(c));
  const extra = selected.find((c) => need.length && !need.includes(c));
  if (need.length && (missing || extra)) {
    const c = missing ?? need[0];
    const more = need.length > 1 ? ` Select all of: ${need.join(', ')} (Ctrl or Cmd-click to add more).` : '';
    return { hint: { target: `[data-testid="pq-grid"] th[data-col="${c}"]` }, text: `Click the ${c} column header.${more}` };
  }
  const active = document.querySelector(`[data-testid="pq-editor"] [aria-label="${r.button}"]`);
  if (!active) return { hint: { target: `[data-pq-tab="${r.tab}"]` }, text: `Open the ${r.tab} tab.` };
  return { hint: { target: `[data-testid="pq-editor"] [aria-label="${r.button}"]` }, text: `Click ${r.button}.${r.then ? ` ${r.then}` : ''}` };
}
