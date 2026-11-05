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
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#14212b" />
      <path d="M6 22.5l6-6.5 4.5 4 9.5-11" fill="none" stroke="#f2c811" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="9" r="3.2" fill="#e07b00" />
      <path d="M6 26h20" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
