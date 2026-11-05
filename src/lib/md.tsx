import type { ReactNode } from 'react';

/** Tiny inline markdown: **bold**, *italic*, `code`. Paragraphs split by blank lines. */
export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={i++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={i++}>{t.slice(1, -1)}</code>);
    else out.push(<em key={i++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Paragraphs({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i} className="mb-2 last:mb-0">
          {inline(p)}
        </p>
      ))}
    </div>
  );
}
