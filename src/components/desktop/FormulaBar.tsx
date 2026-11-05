import { useState } from 'react';
import { SUPPORTED_FUNCTIONS } from '../../engine/engine';
import { Ico } from './icons';

export function FormulaBar({
  initial,
  readOnly,
  context,
  placeholder = 'Measure = SUM(Sales[Sales Amount])',
  onCommit,
  onCancel,
}: {
  initial: string;
  readOnly?: boolean;
  /** Small label shown before the editor, e.g. which table a new column goes to. */
  context?: string;
  placeholder?: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const lines = Math.max(1, text.split('\n').length);
  const commit = () => {
    if (readOnly) return onCancel();
    try {
      onCommit(text);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="shrink-0 border-b border-d-border bg-white" data-testid="formula-bar">
      <div className="flex items-stretch">
        <button onClick={onCancel} title="Cancel (Esc)" className="flex w-8 items-center justify-center text-d-sub hover:bg-d-hover hover:text-[#c42b1c]">
          <Ico.close className="h-4 w-4" />
        </button>
        <button onClick={commit} title="Commit (Enter)" disabled={readOnly} className="flex w-8 items-center justify-center text-d-sub hover:bg-d-hover hover:text-[#107c10] disabled:opacity-40">
          <Ico.check className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 border-l border-d-border font-mono text-[13px] leading-[20px]">
          <div className="shrink-0 bg-white py-1 pr-2 pl-2 text-right text-d-faint select-none">
            {Array.from({ length: lines }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            autoFocus
            readOnly={readOnly}
            spellCheck={false}
            value={text}
            placeholder={placeholder}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') onCancel();
            }}
            rows={Math.min(8, lines)}
            className="min-w-0 flex-1 resize-none py-1 pr-2 outline-none"
          />
        </div>
        {context && <span className="flex shrink-0 items-center border-l border-d-border bg-d-ribbon px-2 text-[11px] text-d-sub">{context}</span>}
        <button onClick={() => setHelp(!help)} className="flex items-center px-2 text-[11px] text-d-accent hover:underline" title="Functions supported in this environment">
          fx list
        </button>
      </div>
      {(error || readOnly) && (
        <div className={`border-t border-d-border px-3 py-1 text-[12px] ${error ? 'bg-[#fde7e9] text-[#a4262c]' : 'bg-d-ribbon text-d-sub'}`}>
          {error ? `✕ ${error}` : 'This measure is part of the exercise model and is read-only.'}
        </div>
      )}
      {help && <div className="border-t border-d-border bg-d-ribbon px-3 py-1.5 font-mono text-[11px] leading-5 text-d-sub">{SUPPORTED_FUNCTIONS.join('   ')}</div>}
    </div>
  );
}
