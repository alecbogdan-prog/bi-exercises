// Original line icons for the desktop-style editor (not copied from any product).
import type { ReactElement } from 'react';
import type { VisualType } from '../../engine/visual';

type P = { className?: string };
const S = (children: ReactElement | ReactElement[], { className = 'h-4 w-4' }: P, vb = '0 0 24 24') => (
  <svg viewBox={vb} className={className} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

// ---------------- visualization gallery ----------------

export const VIZ_GALLERY: { key: string; label: string; type?: VisualType }[] = [
  { key: 'stackedBar', label: 'Stacked bar chart', type: 'bar' },
  { key: 'stackedColumn', label: 'Stacked column chart', type: 'column' },
  { key: 'clusteredBar', label: 'Clustered bar chart', type: 'clusteredBar' },
  { key: 'clusteredColumn', label: 'Clustered column chart', type: 'clusteredColumn' },
  { key: 'pctBar', label: '100% Stacked bar chart', type: 'pctBar' },
  { key: 'pctColumn', label: '100% Stacked column chart', type: 'pctColumn' },
  { key: 'line', label: 'Line chart', type: 'line' },
  { key: 'area', label: 'Area chart', type: 'area' },
  { key: 'stackedArea', label: 'Stacked area chart', type: 'stackedArea' },
  { key: 'lineColumn', label: 'Line and stacked column chart', type: 'lineColumn' },
  { key: 'lineClustered', label: 'Line and clustered column chart' },
  { key: 'ribbon', label: 'Ribbon chart' },
  { key: 'waterfall', label: 'Waterfall chart', type: 'waterfall' },
  { key: 'funnel', label: 'Funnel', type: 'funnel' },
  { key: 'scatter', label: 'Scatter chart' },
  { key: 'pie', label: 'Pie chart', type: 'pie' },
  { key: 'donut', label: 'Donut chart', type: 'donut' },
  { key: 'treemap', label: 'Treemap', type: 'treemap' },
  { key: 'map', label: 'Map' },
  { key: 'filledMap', label: 'Filled map' },
  { key: 'gauge', label: 'Gauge', type: 'gauge' },
  { key: 'card', label: 'Card', type: 'card' },
  { key: 'multiCard', label: 'Multi-row card', type: 'multiCard' },
  { key: 'kpi', label: 'KPI', type: 'kpi' },
  { key: 'slicer', label: 'Slicer' },
  { key: 'table', label: 'Table', type: 'table' },
  { key: 'matrix', label: 'Matrix', type: 'matrix' },
  { key: 'decomp', label: 'Decomposition tree' },
];

const BLUE = '#118DFF';
const NAVY = '#12239E';
const ORANGE = '#E66C37';

export function VizGlyph({ k, className = 'h-[22px] w-[22px]' }: { k: string; className?: string }) {
  const f = (d: ReactElement[]) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {d}
    </svg>
  );
  const r = (x: number, y: number, w: number, h: number, c: string, key: string | number) => <rect key={key} x={x} y={y} width={w} height={h} fill={c} />;
  switch (k) {
    case 'stackedBar':
      return f([r(3, 4, 9, 4, BLUE, 1), r(12, 4, 6, 4, NAVY, 2), r(3, 10, 6, 4, BLUE, 3), r(9, 10, 5, 4, NAVY, 4), r(3, 16, 12, 4, BLUE, 5), r(15, 16, 5, 4, NAVY, 6)]);
    case 'stackedColumn':
      return f([r(4, 10, 4, 10, BLUE, 1), r(4, 5, 4, 5, NAVY, 2), r(10, 13, 4, 7, BLUE, 3), r(10, 9, 4, 4, NAVY, 4), r(16, 8, 4, 12, BLUE, 5), r(16, 3, 4, 5, NAVY, 6)]);
    case 'clusteredBar':
      return f([r(3, 4, 12, 3, BLUE, 1), r(3, 7, 8, 3, NAVY, 2), r(3, 13, 16, 3, BLUE, 3), r(3, 16, 10, 3, NAVY, 4)]);
    case 'clusteredColumn':
      return f([r(4, 8, 3, 12, BLUE, 1), r(7, 12, 3, 8, NAVY, 2), r(13, 4, 3, 16, BLUE, 3), r(16, 10, 3, 10, NAVY, 4)]);
    case 'pctBar':
      return f([r(3, 4, 10, 4, BLUE, 1), r(13, 4, 8, 4, NAVY, 2), r(3, 10, 6, 4, BLUE, 3), r(9, 10, 12, 4, NAVY, 4), r(3, 16, 14, 4, BLUE, 5), r(17, 16, 4, 4, NAVY, 6)]);
    case 'pctColumn':
      return f([r(4, 10, 4, 10, BLUE, 1), r(4, 3, 4, 7, NAVY, 2), r(10, 14, 4, 6, BLUE, 3), r(10, 3, 4, 11, NAVY, 4), r(16, 6, 4, 14, BLUE, 5), r(16, 3, 4, 3, NAVY, 6)]);
    case 'line':
      return f([<polyline key={1} points="3,18 8,11 13,14 21,5" fill="none" stroke={BLUE} strokeWidth={2} />]);
    case 'area':
      return f([<polygon key={1} points="3,20 3,15 9,9 14,13 21,6 21,20" fill={BLUE} opacity={0.5} />, <polyline key={2} points="3,15 9,9 14,13 21,6" fill="none" stroke={BLUE} strokeWidth={1.6} />]);
    case 'stackedArea':
      return f([<polygon key={1} points="3,20 3,13 9,8 15,11 21,5 21,20" fill={NAVY} opacity={0.7} />, <polygon key={2} points="3,20 3,17 9,14 15,16 21,12 21,20" fill={BLUE} />]);
    case 'lineColumn':
    case 'lineClustered':
      return f([r(4, 12, 4, 8, BLUE, 1), r(10, 9, 4, 11, BLUE, 2), r(16, 14, 4, 6, BLUE, 3), <polyline key={4} points="3,9 9,5 15,8 21,3" fill="none" stroke={ORANGE} strokeWidth={1.8} />]);
    case 'ribbon':
      return f([r(3, 6, 4, 12, BLUE, 1), r(10, 4, 4, 14, NAVY, 2), r(17, 8, 4, 10, BLUE, 3), <path key={4} d="M7 8 L10 6 L10 16 L7 16 Z M14 6 L17 10 L17 18 L14 18Z" fill={BLUE} opacity={0.35} />]);
    case 'waterfall':
      return f([r(3, 10, 4, 10, BLUE, 1), r(8, 6, 4, 4, '#1AAB40', 2), r(13, 6, 4, 6, '#D64554', 3), r(18, 12, 3, 8, NAVY, 4)]);
    case 'funnel':
      return f([r(3, 4, 18, 4, BLUE, 1), r(6, 10, 12, 4, BLUE, 2), r(9, 16, 6, 4, BLUE, 3)]);
    case 'scatter':
      return f([[6, 15], [9, 9], [13, 13], [16, 6], [19, 10], [11, 17]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.8} fill={i % 2 ? NAVY : BLUE} />));
    case 'pie':
      return f([<circle key={1} cx={12} cy={12} r={8} fill={BLUE} />, <path key={2} d="M12 12 L12 4 A8 8 0 0 1 19.6 14.5 Z" fill={NAVY} />, <path key={3} d="M12 12 L19.6 14.5 A8 8 0 0 1 9 19.4 Z" fill={ORANGE} />]);
    case 'donut':
      return f([<circle key={1} cx={12} cy={12} r={6.5} fill="none" stroke={BLUE} strokeWidth={3.5} />, <path key={2} d="M12 5.5 A6.5 6.5 0 0 1 18.3 13.6" fill="none" stroke={NAVY} strokeWidth={3.5} />]);
    case 'treemap':
      return f([r(3, 4, 10, 16, BLUE, 1), r(14, 4, 7, 9, NAVY, 2), r(14, 14, 7, 6, ORANGE, 3)]);
    case 'map':
      return f([<path key={1} d="M4 7l5-2 6 2 5-2v12l-5 2-6-2-5 2z" fill="none" stroke="#605E5C" strokeWidth={1.3} />, <circle key={2} cx={9} cy={10} r={2} fill={BLUE} />, <circle key={3} cx={15} cy={13} r={1.5} fill={NAVY} />]);
    case 'filledMap':
      return f([<path key={1} d="M4 7l5-2 6 2 5-2v12l-5 2-6-2-5 2z" fill={BLUE} opacity={0.6} stroke={BLUE} strokeWidth={1} />]);
    case 'gauge':
      return f([<path key={1} d="M4 17a8 8 0 0 1 16 0" fill="none" stroke="#C8C6C4" strokeWidth={3.5} />, <path key={2} d="M4 17a8 8 0 0 1 11-7.4" fill="none" stroke={BLUE} strokeWidth={3.5} />]);
    case 'card':
      return f([<rect key={1} x={3} y={6} width={18} height={12} rx={1} fill="none" stroke="#605E5C" strokeWidth={1.2} />, <text key={2} x={12} y={15} textAnchor="middle" fontSize={8} fontWeight={700} fill={BLUE} fontFamily="Segoe UI, sans-serif">123</text>]);
    case 'multiCard':
      return f([<rect key={1} x={3} y={4} width={18} height={7} rx={1} fill="none" stroke="#605E5C" strokeWidth={1.2} />, <rect key={2} x={3} y={13} width={18} height={7} rx={1} fill="none" stroke="#605E5C" strokeWidth={1.2} />, r(5, 7, 7, 1.6, BLUE, 3), r(5, 16, 9, 1.6, BLUE, 4)]);
    case 'kpi':
      return f([<polyline key={1} points="3,18 8,14 12,16 18,9" fill="none" stroke="#1AAB40" strokeWidth={1.8} />, <path key={2} d="M17 5 l3 4 h-6z" fill="#1AAB40" />]);
    case 'slicer':
      return f([<rect key={1} x={3} y={4} width={18} height={16} rx={1} fill="none" stroke="#605E5C" strokeWidth={1.2} />, r(6, 8, 3, 3, BLUE, 2), r(11, 9, 7, 1.4, '#605E5C', 3), <rect key={4} x={6} y={13} width={3} height={3} fill="none" stroke="#605E5C" strokeWidth={1} />, r(11, 14, 7, 1.4, '#605E5C', 5)]);
    case 'table':
      return f([<rect key={1} x={3} y={4} width={18} height={16} fill="none" stroke="#605E5C" strokeWidth={1.2} />, r(3, 4, 18, 4, BLUE, 2), <path key={3} d="M3 12h18M3 16h18M10 8v12" stroke="#605E5C" strokeWidth={1} />]);
    case 'matrix':
      return f([<rect key={1} x={3} y={4} width={18} height={16} fill="none" stroke="#605E5C" strokeWidth={1.2} />, r(3, 4, 18, 4, BLUE, 2), r(3, 8, 5, 12, NAVY, 3), <path key={4} d="M8 12h13M8 16h13M14 8v12" stroke="#605E5C" strokeWidth={1} />]);
    case 'decomp':
      return f([r(3, 10, 4, 4, BLUE, 1), r(11, 5, 4, 4, NAVY, 2), r(11, 15, 4, 4, NAVY, 3), r(18, 5, 3, 4, ORANGE, 4), <path key={5} d="M7 12h2v-5h2M9 12v5h2M15 7h3" stroke="#605E5C" strokeWidth={1} fill="none" />]);
  }
  return f([r(4, 4, 16, 16, '#C8C6C4', 1)]);
}

export function vizKeyFor(type: string): string {
  return VIZ_GALLERY.find((g) => g.type === type)?.key ?? 'stackedColumn';
}

// ---------------- generic UI icons ----------------

export const Ico = {
  chevronRight: (p: P = {}) => S(<path d="M9 6l6 6-6 6" />, p),
  chevronDown: (p: P = {}) => S(<path d="M6 9l6 6 6-6" />, p),
  chevronLeft: (p: P = {}) => S(<path d="M15 6l-6 6 6 6" />, p),
  doubleRight: (p: P = {}) => S([<path key={1} d="M6 6l6 6-6 6" />, <path key={2} d="M12 6l6 6-6 6" />], p),
  doubleLeft: (p: P = {}) => S([<path key={1} d="M18 6l-6 6 6 6" />, <path key={2} d="M12 6l-6 6 6 6" />], p),
  close: (p: P = {}) => S(<path d="M6 6l12 12M18 6L6 18" />, p),
  check: (p: P = {}) => S(<path d="M5 12.5l4.5 4.5L19 7.5" />, p),
  search: (p: P = {}) => S([<circle key={1} cx={10.5} cy={10.5} r={5.5} />, <path key={2} d="M15 15l5 5" />], p),
  eraser: (p: P = {}) => S([<path key={1} d="M8 19h11" />, <path key={2} d="M4.5 14.5l8-8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 18H8z" />], p),
  table: (p: P = {}) => S([<rect key={1} x={3.5} y={5} width={17} height={14} rx={1.5} />, <path key={2} d="M3.5 10h17M9.5 10v9" />], p),
  sigma: (p: P = {}) => S(<path d="M17 5H7l6 7-6 7h10" />, p),
  calendar: (p: P = {}) => S([<rect key={1} x={4} y={5.5} width={16} height={14} rx={1.5} />, <path key={2} d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />], p),
  calculator: (p: P = {}) => S([<rect key={1} x={5} y={3.5} width={14} height={17} rx={1.5} />, <path key={2} d="M8 7.5h8M8.5 12h1M12 12h1M15.5 12h0.5M8.5 16h1M12 16h1M15.5 16h0.5" />], p),
  funnel: (p: P = {}) => S(<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z" />, p),
  focus: (p: P = {}) => S(<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />, p),
  more: (p: P = {}) => S([<circle key={1} cx={6} cy={12} r={0.9} />, <circle key={2} cx={12} cy={12} r={0.9} />, <circle key={3} cx={18} cy={12} r={0.9} />], p),
  pin: (p: P = {}) => S(<path d="M14 4l6 6-3 1-4 4 .5 4-1.5 1.5-4-4L4 20l-.5-.5 3.5-4-4-4L4.5 10l4 .5 4-4z" />, p),
  build: (p: P = {}) => S([<rect key={1} x={4} y={13} width={4} height={7} />, <rect key={2} x={10} y={8} width={4} height={12} />, <rect key={3} x={16} y={4} width={4} height={16} />], p),
  brush: (p: P = {}) => S([<path key={1} d="M14.5 4.5l5 5-7.5 7.5-5-5z" />, <path key={2} d="M7 12l-3 6 6-3" />], p),
  report: (p: P = {}) => S([<rect key={1} x={4} y={4} width={16} height={16} rx={1.5} />, <path key={2} d="M8 16v-4M12 16V8M16 16v-6" />], p),
  grid: (p: P = {}) => S([<rect key={1} x={4} y={4} width={16} height={16} rx={1.5} />, <path key={2} d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16" />], p),
  model: (p: P = {}) => S([<rect key={1} x={3} y={4} width={7} height={6} rx={1} />, <rect key={2} x={14} y={4} width={7} height={6} rx={1} />, <rect key={3} x={8.5} y={14} width={7} height={6} rx={1} />, <path key={4} d="M6.5 10v2h11v-2M12 12v2" />], p),
  save: (p: P = {}) => S([<path key={1} d="M5 4h11l3 3v13H5z" />, <path key={2} d="M8 4v5h7V4M8 20v-6h8v6" />], p),
  undo: (p: P = {}) => S(<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />, p),
  redo: (p: P = {}) => S(<path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />, p),
  minimize: (p: P = {}) => S(<path d="M5 12h14" />, p),
  maximize: (p: P = {}) => S(<rect x={5} y={5} width={14} height={14} />, p),
  plus: (p: P = {}) => S(<path d="M12 5v14M5 12h14" />, p),
  drillUp: (p: P = {}) => S(<path d="M12 19V5M6 11l6-6 6 6" />, p),
  drillMode: (p: P = {}) => S([<circle key={1} cx={12} cy={12} r={8.5} />, <path key={2} d="M12 7.5v8M8.5 12.5l3.5 3.5 3.5-3.5" />], p),
  nextLevel: (p: P = {}) => S([<path key={1} d="M7 5v9M3.5 10.5 7 14l3.5-3.5" />, <path key={2} d="M17 5v9M13.5 10.5 17 14l3.5-3.5" />, <path key={3} d="M4 19h16" />], p),
  eye: (p: P = {}) => S([<path key={1} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />, <circle key={2} cx={12} cy={12} r={2.8} />], p),
  key: (p: P = {}) => S([<circle key={1} cx={8} cy={12} r={3.5} />, <path key={2} d="M11.5 12H20M17 12v3M20 12v2" />], p),
};

// ---------------- ribbon icons (24px, two-tone) ----------------

export function RibbonGlyph({ name, small = false }: { name: string; small?: boolean }) {
  const cls = small ? 'h-4 w-4' : 'h-7 w-7';
  const accent = '#0f6cbd';
  const g = (children: ReactElement[]) => (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="#424242" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
  switch (name) {
    case 'paste':
      return g([<rect key={1} x={5} y={5} width={11} height={15} rx={1} />, <rect key={2} x={8} y={3} width={5} height={3} rx={1} />, <rect key={3} x={11} y={10} width={9} height={11} rx={1} fill="#fff" stroke={accent} />]);
    case 'cut':
      return g([<circle key={1} cx={7} cy={17} r={2.5} />, <circle key={2} cx={17} cy={17} r={2.5} />, <path key={3} d="M8.5 15L17 4M15.5 15L7 4" />]);
    case 'copy':
      return g([<rect key={1} x={8} y={8} width={11} height={12} rx={1} />, <path key={2} d="M5 16V5a1 1 0 0 1 1-1h9" />]);
    case 'painter':
      return g([<rect key={1} x={5} y={4} width={13} height={5} rx={1} stroke={accent} />, <path key={2} d="M18 6.5h1.5v5H12v3M11 14.5h2V21h-2z" />]);
    case 'getdata':
      return g([<ellipse key={1} cx={11} cy={6} rx={6} ry={2.5} />, <path key={2} d="M5 6v11c0 1.4 2.7 2.5 6 2.5M17 6v5" />, <path key={3} d="M16 14v7M12.5 17.5H19.5" stroke={accent} strokeWidth={1.6} />]);
    case 'excel':
      return g([<rect key={1} x={4} y={4} width={16} height={16} rx={1.5} />, <path key={2} d="M4 9h16M4 14.5h16M10 4v16" />, <path key={3} d="M13 11.5l3 4M16 11.5l-3 4" stroke="#107c41" strokeWidth={1.4} />]);
    case 'sql':
      return g([<ellipse key={1} cx={12} cy={6} rx={7} ry={2.5} />, <path key={2} d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />]);
    case 'enterdata':
      return g([<rect key={1} x={4} y={5} width={16} height={14} rx={1.5} />, <path key={2} d="M4 10h16M10 10v9" />, <path key={3} d="M14 13v4M12 15h4" stroke={accent} strokeWidth={1.6} />]);
    case 'recent':
      return g([<circle key={1} cx={12} cy={12} r={8} />, <path key={2} d="M12 7v5l3 2" stroke={accent} />]);
    case 'transform':
      return g([<rect key={1} x={4} y={5} width={16} height={14} rx={1.5} />, <path key={2} d="M4 10h16" />, <path key={3} d="M9 15h6M13 13l2 2-2 2" stroke={accent} strokeWidth={1.5} />]);
    case 'refresh':
      return g([<path key={1} d="M19 12a7 7 0 1 1-2.1-5" />, <path key={2} d="M19 4.5V8h-3.5" stroke={accent} strokeWidth={1.5} />]);
    case 'newvisual':
      return g([<rect key={1} x={4} y={4} width={16} height={16} rx={1.5} />, <path key={2} d="M8 16v-3M12 16V9M16 16v-5" stroke={accent} strokeWidth={1.6} />]);
    case 'textbox':
      return g([<rect key={1} x={4} y={5} width={16} height={14} rx={1.5} />, <path key={2} d="M8 9h8M12 9v7" stroke={accent} strokeWidth={1.5} />]);
    case 'morevisuals':
      return g([<rect key={1} x={4} y={4} width={7} height={7} rx={1} />, <rect key={2} x={13} y={4} width={7} height={7} rx={1} />, <rect key={3} x={4} y={13} width={7} height={7} rx={1} />, <path key={4} d="M16.5 13v7M13 16.5h7" stroke={accent} strokeWidth={1.5} />]);
    case 'measure':
      return g([<rect key={1} x={4} y={4} width={16} height={16} rx={1.5} />, <path key={2} d="M14.5 7.5c-1.5-.5-2.7 0-3 1.6L10 17c-.3 1.4-1.4 1.8-2.6 1.3M8.5 11.5h6" stroke={accent} strokeWidth={1.5} />]);
    case 'quickmeasure':
      return g([<rect key={1} x={4} y={4} width={16} height={16} rx={1.5} />, <path key={2} d="M13 6l-4 7h4l-2 5 5-8h-4z" stroke={accent} strokeWidth={1.3} />]);
    case 'publish':
      return g([<path key={1} d="M7 18h-.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 17.6 9 4 4 0 0 1 17 18" />, <path key={2} d="M12 20v-8M9 15l3-3 3 3" stroke={accent} strokeWidth={1.5} />]);
    case 'newcolumn':
      return g([<rect key={1} x={4} y={4} width={16} height={16} rx={1.5} />, <path key={2} d="M10 4v16" />, <rect key={3} x={14} y={4} width={6} height={16} fill="#deecf9" stroke={accent} />]);
    case 'newtable':
      return g([<rect key={1} x={4} y={4} width={16} height={16} rx={1.5} />, <path key={2} d="M4 9h16M10 9v11" />, <path key={3} d="M16 12v6M13 15h6" stroke={accent} strokeWidth={1.5} />]);
    case 'relationships':
      return g([<rect key={1} x={3} y={4} width={7} height={6} rx={1} />, <rect key={2} x={14} y={14} width={7} height={6} rx={1} />, <path key={3} d="M10 7h4v10" stroke={accent} strokeWidth={1.5} />]);
    case 'newpage':
      return g([<path key={1} d="M6 3.5h8l4 4V20.5H6z" />, <path key={2} d="M12 11v6M9 14h6" stroke={accent} strokeWidth={1.5} />]);
    case 'buttons':
      return g([<rect key={1} x={3} y={7} width={18} height={10} rx={5} />, <path key={2} d="M10 12h4" stroke={accent} strokeWidth={1.5} />]);
    case 'shapes':
      return g([<circle key={1} cx={8.5} cy={9} r={4.5} />, <rect key={2} x={11} y={11} width={9} height={9} fill="#deecf9" stroke={accent} />]);
    case 'image':
      return g([<rect key={1} x={4} y={5} width={16} height={14} rx={1.5} />, <circle key={2} cx={9} cy={10} r={1.5} />, <path key={3} d="M4 17l5-4 4 3 3-2 4 3" stroke={accent} />]);
    case 'parameter':
      return g([<path key={1} d="M5 18h14M5 12h14M5 6h14" />, <circle key={2} cx={9} cy={18} r={1.6} fill="#fff" stroke={accent} />, <circle key={3} cx={15} cy={12} r={1.6} fill="#fff" stroke={accent} />, <circle key={4} cx={8} cy={6} r={1.6} fill="#fff" stroke={accent} />]);
    case 'roles':
      return g([<circle key={1} cx={12} cy={8} r={3.5} />, <path key={2} d="M5 20a7 7 0 0 1 14 0" />, <path key={3} d="M16 15.5l1.5 1.5 3-3" stroke={accent} strokeWidth={1.5} />]);
    case 'theme':
      return g([<rect key={1} x={4} y={4} width={16} height={16} rx={1.5} />, <rect key={2} x={6.5} y={13} width={2.5} height={4.5} fill={BLUE} stroke="none" />, <rect key={3} x={10.5} y={9} width={2.5} height={8.5} fill={NAVY} stroke="none" />, <rect key={4} x={14.5} y={11} width={2.5} height={6.5} fill={ORANGE} stroke="none" />]);
    case 'pane':
      return g([<rect key={1} x={3} y={5} width={18} height={14} rx={1.5} />, <path key={2} d="M15 5v14" stroke={accent} />]);
    case 'help':
      return g([<circle key={1} cx={12} cy={12} r={8} />, <path key={2} d="M9.8 9.5a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.4v.5M12 16.5v.3" stroke={accent} strokeWidth={1.5} />]);
    case 'docs':
      return g([<path key={1} d="M6 3.5h8l4 4V20.5H6z" />, <path key={2} d="M9 11h6M9 14h6M9 17h4" stroke={accent} />]);
    case 'pageview':
      return g([<rect key={1} x={3} y={5} width={18} height={14} rx={1.5} />, <rect key={2} x={6} y={8} width={12} height={8} stroke={accent} />]);
  }
  return g([<rect key={1} x={5} y={5} width={14} height={14} rx={1.5} />]);
}
