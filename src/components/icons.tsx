import type { VisualType } from '../engine/visual';

export function VisualIcon({ type, className = 'h-5 w-5' }: { type: VisualType; className?: string }) {
  const common = { viewBox: '0 0 24 24', className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'card':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M8 13.5h8M10 10.5h4" />
        </svg>
      );
    case 'table':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M3 14h18M10 4v16" />
        </svg>
      );
    case 'matrix':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M3 14h18M8 4v16M14 9v11" />
        </svg>
      );
    case 'column':
      return (
        <svg {...common}>
          <path d="M5 20V12M10 20V6M15 20v-9M20 20V9M3 20h18" />
        </svg>
      );
    case 'bar':
      return (
        <svg {...common}>
          <path d="M4 5h9M4 10h15M4 15h6M4 20h12M4 3v18" />
        </svg>
      );
    case 'line':
      return (
        <svg {...common}>
          <path d="M3 20h18M4 16l5-6 4 3 7-8" />
        </svg>
      );
    case 'pie':
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 1 0 9 9h-9z" />
          <path d="M15 3.5A9 9 0 0 1 20.5 9H15z" />
        </svg>
      );
  }
}

export function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  // Treemap mark: six tiles in Power BI-style colors, clipped to a rounded square.
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <clipPath id="logo-clip">
          <rect width="32" height="32" rx="7" />
        </clipPath>
      </defs>
      <g clipPath="url(#logo-clip)">
        <rect x="0" y="0" width="18.2" height="17.4" rx="1.2" fill="#2b8cf0" />
        <rect x="0" y="19" width="18.2" height="13" rx="1.2" fill="#2a2378" />
        <rect x="19.8" y="0" width="12.2" height="10.6" rx="1.2" fill="#f2733a" />
        <rect x="19.8" y="12.2" width="12.2" height="7.8" rx="1.2" fill="#f2b62c" />
        <rect x="19.8" y="21.6" width="5.3" height="10.4" rx="1.2" fill="#8e3fa6" />
        <rect x="26.7" y="21.6" width="5.3" height="10.4" rx="1.2" fill="#13a58f" />
      </g>
    </svg>
  );
}
