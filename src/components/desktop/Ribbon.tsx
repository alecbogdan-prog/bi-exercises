import { useState } from 'react';
import type { ReactNode } from 'react';
import { Logo } from '../icons';
import { Ico, RibbonGlyph } from './icons';

export type RibbonAction =
  | 'new-measure'
  | 'quick-measure'
  | 'new-column'
  | 'new-table'
  | 'refresh'
  | 'transform'
  | 'relationships'
  | 'new-page'
  | 'toggle-filters'
  | 'toggle-viz'
  | 'toggle-data'
  | 'toggle-bookmarks'
  | 'toggle-selection'
  | 'toggle-sync'
  | 'edit-interactions'
  | 'insert-button'
  | 'insert-back-button'
  | 'unavailable';

/** Extra ribbon state for multi-page report exercises. */
export interface PagesRibbon {
  editInteractions: boolean;
  bookmarks: boolean;
  selection: boolean;
  sync: boolean;
}

interface BtnDef {
  label: string;
  icon: string;
  action?: RibbonAction;
  dropdown?: boolean;
  small?: boolean;
  active?: boolean;
}
interface GroupDef {
  label: string;
  buttons: BtnDef[];
}

const TABS = ['Home', 'Insert', 'Modeling', 'View', 'Format', 'Help'] as const;
type Tab = (typeof TABS)[number];

function groupsFor(tab: Tab, panes: { filters: boolean; viz: boolean; data: boolean }, pm?: PagesRibbon): GroupDef[] {
  switch (tab) {
    case 'Home':
      return [
        {
          label: 'Clipboard',
          buttons: [
            { label: 'Paste', icon: 'paste', dropdown: true },
            { label: 'Cut', icon: 'cut', small: true },
            { label: 'Copy', icon: 'copy', small: true },
            { label: 'Format painter', icon: 'painter', small: true },
          ],
        },
        {
          label: 'Data',
          buttons: [
            { label: 'Get data', icon: 'getdata', dropdown: true },
            { label: 'Excel workbook', icon: 'excel' },
            { label: 'SQL Server', icon: 'sql' },
            { label: 'Enter data', icon: 'enterdata' },
            { label: 'Recent sources', icon: 'recent', dropdown: true },
          ],
        },
        {
          label: 'Queries',
          buttons: [
            { label: 'Transform data', icon: 'transform', dropdown: true, action: 'transform' },
            { label: 'Refresh', icon: 'refresh', action: 'refresh' },
          ],
        },
        {
          label: 'Insert',
          buttons: [
            { label: 'New visual', icon: 'newvisual' },
            { label: 'Text box', icon: 'textbox' },
            { label: 'More visuals', icon: 'morevisuals', dropdown: true },
          ],
        },
        {
          label: 'Calculations',
          buttons: [
            { label: 'New measure', icon: 'measure', action: 'new-measure' },
            { label: 'Quick measure', icon: 'quickmeasure', action: 'quick-measure' },
          ],
        },
        { label: 'Share', buttons: [{ label: 'Publish', icon: 'publish' }] },
      ];
    case 'Insert':
      return [
        { label: 'Pages', buttons: [{ label: 'New page', icon: 'newpage', dropdown: true, action: 'new-page' }] },
        {
          label: 'Visuals',
          buttons: [
            { label: 'New visual', icon: 'newvisual' },
            { label: 'More visuals', icon: 'morevisuals', dropdown: true },
          ],
        },
        {
          label: 'Elements',
          buttons: [
            { label: 'Text box', icon: 'textbox' },
            ...(pm
              ? [
                  { label: 'Blank button', icon: 'buttons', action: 'insert-button' as RibbonAction },
                  { label: 'Back button', icon: 'buttons', action: 'insert-back-button' as RibbonAction },
                ]
              : [{ label: 'Buttons', icon: 'buttons', dropdown: true }]),
            { label: 'Shapes', icon: 'shapes', dropdown: true },
            { label: 'Image', icon: 'image' },
          ],
        },
      ];
    case 'Modeling':
      return [
        { label: 'Relationships', buttons: [{ label: 'Manage relationships', icon: 'relationships', action: 'relationships' }] },
        {
          label: 'Calculations',
          buttons: [
            { label: 'New measure', icon: 'measure', action: 'new-measure' },
            { label: 'Quick measure', icon: 'quickmeasure', action: 'quick-measure' },
            { label: 'New column', icon: 'newcolumn', action: 'new-column' },
            { label: 'New table', icon: 'newtable', action: 'new-table' },
          ],
        },
        { label: 'What if', buttons: [{ label: 'New parameter', icon: 'parameter', dropdown: true }] },
        {
          label: 'Security',
          buttons: [
            { label: 'Manage roles', icon: 'roles' },
            { label: 'View as', icon: 'roles' },
          ],
        },
      ];
    case 'View':
      return [
        { label: 'Themes', buttons: [{ label: 'Themes', icon: 'theme', dropdown: true }] },
        { label: 'Scale to fit', buttons: [{ label: 'Page view', icon: 'pageview', dropdown: true }] },
        {
          label: 'Show panes',
          buttons: [
            { label: 'Filters', icon: 'pane', action: 'toggle-filters', active: panes.filters },
            { label: 'Visualizations', icon: 'pane', action: 'toggle-viz', active: panes.viz },
            { label: 'Data', icon: 'pane', action: 'toggle-data', active: panes.data },
            ...(pm
              ? [
                  { label: 'Bookmarks', icon: 'pane', action: 'toggle-bookmarks' as RibbonAction, active: pm.bookmarks },
                  { label: 'Selection', icon: 'pane', action: 'toggle-selection' as RibbonAction, active: pm.selection },
                  { label: 'Sync slicers', icon: 'pane', action: 'toggle-sync' as RibbonAction, active: pm.sync },
                ]
              : []),
          ],
        },
      ];
    case 'Format':
      return [
        {
          label: 'Interactions',
          buttons: [{ label: 'Edit interactions', icon: 'relationships', action: pm ? 'edit-interactions' : 'unavailable', active: pm?.editInteractions }],
        },
      ];
    case 'Help':
      return [
        {
          label: 'Help',
          buttons: [
            { label: 'Guided learning', icon: 'help' },
            { label: 'Documentation', icon: 'docs' },
            { label: 'Support', icon: 'help' },
          ],
        },
      ];
  }
}

function LargeButton({ b, onAction }: { b: BtnDef; onAction: (a: RibbonAction, label: string) => void }) {
  return (
    <button
      onClick={() => onAction(b.action ?? 'unavailable', b.label)}
      className={`flex h-[74px] w-[58px] flex-col items-center rounded-[3px] px-1 pt-1.5 text-center hover:bg-d-hover ${b.active ? 'bg-d-pressed' : ''}`}
    >
      <RibbonGlyph name={b.icon} />
      <span className="mt-1 text-[11.5px] leading-[13px]">
        {b.label}
        {b.dropdown && <span className="ml-0.5 text-[8px]">▾</span>}
      </span>
    </button>
  );
}

function SmallButton({ b, onAction }: { b: BtnDef; onAction: (a: RibbonAction, label: string) => void }) {
  return (
    <button onClick={() => onAction(b.action ?? 'unavailable', b.label)} className="flex h-6 items-center gap-1.5 rounded-[3px] px-1.5 text-[12px] whitespace-nowrap hover:bg-d-hover">
      <RibbonGlyph name={b.icon} small />
      {b.label}
    </button>
  );
}

export function Ribbon({
  onAction,
  panes,
  onFile,
  pagesMode,
}: {
  onAction: (a: RibbonAction, label: string) => void;
  panes: { filters: boolean; viz: boolean; data: boolean };
  onFile: () => void;
  pagesMode?: PagesRibbon;
}) {
  const [tab, setTab] = useState<Tab>('Home');
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="shrink-0 border-b border-d-border bg-d-ribbon">
      <div className="flex h-8 items-end gap-0.5 px-2">
        <button onClick={onFile} className="mb-1 rounded-[3px] px-3 py-1 text-[12.5px] hover:bg-d-hover">
          File
        </button>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setCollapsed(false);
            }}
            className={`relative px-3 pt-1 pb-2 text-[12.5px] hover:bg-d-hover ${t === tab ? 'font-semibold' : ''}`}
          >
            {t}
            {t === tab && <span className="absolute right-3 bottom-0.5 left-3 h-[3px] rounded-full bg-d-accent" />}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setCollapsed(!collapsed)} className="mb-1 rounded p-1 text-d-sub hover:bg-d-hover" title={collapsed ? 'Expand the ribbon' : 'Collapse the ribbon'}>
          {collapsed ? <Ico.chevronDown className="h-3.5 w-3.5" /> : <Ico.chevronDown className="h-3.5 w-3.5 rotate-180" />}
        </button>
      </div>
      {!collapsed && (
        <div className="mx-2 mb-2 flex h-[96px] items-stretch overflow-x-auto rounded-[4px] bg-white px-1 shadow-[0_0_2px_rgba(0,0,0,.12),0_1px_2px_rgba(0,0,0,.08)]">
          {groupsFor(tab, panes, pagesMode).map((g) => {
            const large = g.buttons.filter((b) => !b.small);
            const small = g.buttons.filter((b) => b.small);
            return (
              <div key={g.label} className="flex shrink-0 flex-col border-r border-d-border px-1 last:border-r-0">
                <div className="flex flex-1 items-start gap-0.5 pt-1">
                  {large.map((b) => (
                    <LargeButton key={b.label} b={b} onAction={onAction} />
                  ))}
                  {small.length > 0 && (
                    <div className="flex flex-col pt-0.5">
                      {small.map((b) => (
                        <SmallButton key={b.label} b={b} onAction={onAction} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="pb-1 text-center text-[11px] text-d-sub">{g.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TitleBar({
  title,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  right,
}: {
  title: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 bg-d-ribbon px-2 select-none">
      <Logo className="mr-1 h-5 w-5" />
      <button onClick={onSave} title="Save (Ctrl+S)" className="rounded p-1 hover:bg-d-hover">
        <Ico.save className="h-4 w-4" />
      </button>
      <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="rounded p-1 hover:bg-d-hover disabled:opacity-35 disabled:hover:bg-transparent">
        <Ico.undo className="h-4 w-4" />
      </button>
      <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="rounded p-1 hover:bg-d-hover disabled:opacity-35 disabled:hover:bg-transparent">
        <Ico.redo className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1 truncate px-3 text-center text-[12px]">{title}</div>
      <div className="hidden w-56 items-center gap-2 rounded-[4px] border border-d-border bg-white px-2 py-1 text-[12px] text-d-faint xl:flex">
        <Ico.search className="h-3.5 w-3.5" /> Search
      </div>
      {right}
      <div className="ml-2 flex items-center text-d-sub">
        <span className="flex h-9 w-10 items-center justify-center hover:bg-d-hover">
          <Ico.minimize className="h-3.5 w-3.5" />
        </span>
        <span className="flex h-9 w-10 items-center justify-center hover:bg-d-hover">
          <Ico.maximize className="h-3 w-3" />
        </span>
        <span className="flex h-9 w-10 items-center justify-center hover:bg-[#c42b1c] hover:text-white">
          <Ico.close className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
