import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface HintTarget {
  /** CSS selector of the element to point at. */
  target: string;
  /** Optional drop target: draws a dashed arrow from `target` to here ("drag this onto that"). */
  to?: string;
  /** Small heading in the bubble (defaults to "Click here" / "Drag it here"). */
  label?: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

const find = (sel: string): Box | null => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const b = boxOf(el);
  return b.w || b.h ? b : null;
};

/** The pane (or toolbar) around an element: the bubble stays outside it, so it never hides nearby controls. */
const zoneOf = (sel: string): Box | null => {
  const el = document.querySelector(sel);
  if (!el) return null;
  return boxOf(el.closest('[data-testid^="pane-"], [data-hint-zone]') ?? el);
};

const union = (a: Box, b: Box | null): Box => {
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

const BUBBLE_W = 240;
const BUBBLE_H = 120;
const GAP = 48;

/** Puts the bubble beside the zone (left, right, below, above), wherever it fits on screen. */
function placeBubble(zone: Box, anchor: Box): { x: number; y: number; side: 'left' | 'right' | 'below' | 'above' } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampY = (y: number) => Math.max(8, Math.min(vh - BUBBLE_H - 8, y));
  const clampX = (x: number) => Math.max(8, Math.min(vw - BUBBLE_W - 8, x));
  const midY = anchor.y + anchor.h / 2 - 40;
  if (zone.x - GAP - BUBBLE_W >= 8) return { x: zone.x - GAP - BUBBLE_W, y: clampY(midY), side: 'left' };
  if (zone.x + zone.w + GAP + BUBBLE_W <= vw - 8) return { x: zone.x + zone.w + GAP, y: clampY(midY), side: 'right' };
  if (zone.y + zone.h + GAP + BUBBLE_H <= vh - 8) return { x: clampX(anchor.x + anchor.w / 2 - BUBBLE_W / 2), y: zone.y + zone.h + GAP, side: 'below' };
  return { x: clampX(anchor.x + anchor.w / 2 - BUBBLE_W / 2), y: Math.max(8, zone.y - GAP - BUBBLE_H), side: 'above' };
}

const BRAND = '#e07b00';
const PAD = 4;

/**
 * Points at a part of the editor: a pulsing ring with a dot on the element, a speech bubble with an arrow,
 * and (for drag hints) a dashed arrow to the drop target. It follows the element while the page moves.
 */
export function HintSpotlight({ hint, text, onClose }: { hint: HintTarget; text: string; onClose: () => void }) {
  const [boxes, setBoxes] = useState<{ a: Box | null; b: Box | null; zone: Box | null }>({ a: null, b: null, zone: null });

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const a = find(hint.target);
      const b = hint.to ? find(hint.to) : null;
      const za = zoneOf(hint.target);
      const zone = za ? union(za, hint.to ? zoneOf(hint.to) : null) : null;
      const next = { a, b, zone };
      setBoxes((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [hint]);

  // A click on the highlighted element (for click hints) or Escape closes the hint.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (hint.to) return;
      const el = document.querySelector(hint.target);
      if (el && e.target instanceof Node && el.contains(e.target)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [hint, onClose]);

  const { a, b, zone } = boxes;
  if (!a || !zone) return null;

  const pos = placeBubble(zone, a);
  const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const cb = b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null;
  // Arrow from the bubble edge to the side of the target that faces the bubble.
  const start =
    pos.side === 'left'
      ? { x: pos.x + BUBBLE_W, y: pos.y + 40 }
      : pos.side === 'right'
        ? { x: pos.x, y: pos.y + 40 }
        : pos.side === 'below'
          ? { x: pos.x + BUBBLE_W / 2, y: pos.y }
          : { x: pos.x + BUBBLE_W / 2, y: pos.y + BUBBLE_H };
  const end =
    pos.side === 'left'
      ? { x: a.x - PAD - 3, y: ca.y }
      : pos.side === 'right'
        ? { x: a.x + a.w + PAD + 3, y: ca.y }
        : pos.side === 'below'
          ? { x: ca.x, y: a.y + a.h + PAD + 3 }
          : { x: ca.x, y: a.y - PAD - 3 };
  const horizontal = pos.side === 'left' || pos.side === 'right';
  const ctrl = horizontal ? { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - 40 } : { x: start.x + 40, y: (start.y + end.y) / 2 };

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]" data-testid="hint-spotlight">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <marker id="hint-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={BRAND} />
          </marker>
        </defs>
        <path d={`M${start.x},${start.y} Q${ctrl.x},${ctrl.y} ${end.x},${end.y}`} fill="none" stroke={BRAND} strokeWidth="2.5" markerEnd="url(#hint-head)" />
        {cb && (
          <path
            d={`M${ca.x},${ca.y} C${ca.x},${(ca.y + cb.y) / 2 - 60} ${cb.x},${(ca.y + cb.y) / 2 - 60} ${cb.x},${cb.y - (b!.h / 2 + PAD + 2)}`}
            fill="none"
            stroke={BRAND}
            strokeWidth="2.5"
            strokeDasharray="7 6"
            markerEnd="url(#hint-head)"
            className="hint-dash"
          />
        )}
      </svg>

      {[a, b].map(
        (box, i) =>
          box && (
            <div key={i} className="absolute rounded-md" style={{ left: box.x - PAD, top: box.y - PAD, width: box.w + PAD * 2, height: box.h + PAD * 2, boxShadow: `0 0 0 3px ${BRAND}, 0 0 0 9px rgba(224,123,0,0.18)` }}>
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: BRAND }} />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white" style={{ background: BRAND }} />
              </span>
            </div>
          ),
      )}

      <div
        className="pointer-events-auto absolute rounded-xl bg-ink p-3 text-sm text-white shadow-xl"
        style={{ left: pos.x, top: pos.y, width: BUBBLE_W }}
        role="dialog"
        aria-label="Hint"
      >
        <div className="mb-0.5 text-[11px] font-semibold tracking-wide text-sunrise-500 uppercase">{hint.label ?? (hint.to ? 'Drag it here' : 'Click here')}</div>
        <p className="leading-snug">{text}</p>
        <button onClick={onClose} className="mt-2 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold hover:bg-white/25">
          Got it
        </button>
      </div>
    </div>,
    document.body,
  );
}
