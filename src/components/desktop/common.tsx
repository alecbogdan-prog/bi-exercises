import { useEffect, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { DRAG_MIME } from '../../lib/workspace';
import type { DragItem } from '../../lib/workspace';
import { Ico } from './icons';

export function readDrag(e: DragEvent): DragItem | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    return raw ? (JSON.parse(raw) as DragItem) : null;
  } catch {
    return null;
  }
}

export function startDrag(e: DragEvent, item: DragItem) {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(item));
  e.dataTransfer.effectAllowed = 'copy';
}

/** A right-side pane with a title and a collapse button; collapses to a vertical strip. */
export function Pane({
  title,
  open,
  onToggle,
  width,
  children,
  testId,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  width: number;
  children: ReactNode;
  testId?: string;
}) {
  if (!open) {
    return (
      <button
        onClick={onToggle}
        data-testid={testId}
        className="flex w-7 shrink-0 flex-col items-center gap-2 border-l border-d-border bg-white pt-2 text-d-text hover:bg-d-hover"
        title={`Expand ${title}`}
      >
        <Ico.doubleLeft className="h-3.5 w-3.5" />
        <span className="text-[12px] font-semibold [writing-mode:vertical-rl]">{title}</span>
      </button>
    );
  }
  return (
    <section data-testid={testId} className="flex min-h-0 shrink-0 flex-col border-l border-d-border bg-white" style={{ width }}>
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        <button onClick={onToggle} className="rounded p-1 text-d-sub hover:bg-d-hover" title={`Collapse ${title}`}>
          <Ico.doubleRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Ico.search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-d-sub" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 w-full rounded-sm border border-d-strong bg-white pr-2 pl-7 text-[12px] outline-none placeholder:text-d-faint focus:border-d-accent"
      />
    </div>
  );
}

export interface MenuItem {
  label: string;
  onClick?: () => void;
  checked?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

/** Context/drop-down menu positioned at fixed screen coordinates. */
export function Menu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);
  const left = Math.min(x, window.innerWidth - 220);
  const top = Math.min(y, window.innerHeight - items.length * 28 - 16);
  return (
    <div
      ref={ref}
      role="menu"
      className="desktop fixed z-50 min-w-[200px] rounded-[4px] border border-d-border bg-white py-1 shadow-[0_6.4px_14.4px_rgba(0,0,0,.13),0_1.2px_3.6px_rgba(0,0,0,.11)]"
      style={{ left, top }}
    >
      {items.map((it, i) =>
        it.separator ? (
          <div key={i} className="my-1 border-t border-d-border" />
        ) : (
          <button
            key={i}
            role="menuitem"
            disabled={it.disabled}
            onClick={() => {
              it.onClick?.();
              onClose();
            }}
            className="flex h-7 w-full items-center gap-2 px-3 text-left text-[12px] hover:bg-d-hover disabled:text-d-faint disabled:hover:bg-transparent"
          >
            <span className="w-4">{it.checked && <Ico.check className="h-3.5 w-3.5" />}</span>
            {it.label}
          </button>
        ),
      )}
    </div>
  );
}

export function useToast(): [string | null, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = (m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  };
  return [msg, show];
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="switch disabled:opacity-40"
    />
  );
}
