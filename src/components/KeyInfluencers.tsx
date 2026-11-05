import { useState } from 'react';

export interface Influencer {
  when: string;
  factor: number;
}

/** A "Key influencers" style card: factors on the left, arrows to bubbles showing how much each one raises the likelihood. */
export function KeyInfluencers({ question, outcome, items, note }: { question: string; outcome: string; items: Influencer[]; note?: string }) {
  const [tab, setTab] = useState<'influencers' | 'segments'>('influencers');
  const max = Math.max(...items.map((i) => i.factor));
  return (
    <figure
      className="flex min-w-0 flex-col rounded-xl border border-[#d6d3cf] bg-white p-4"
      style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}
    >
      <div className="flex items-center gap-4 border-b border-[#edebe9] text-[14px]">
        {(
          [
            ['influencers', 'Key influencers'],
            ['segments', 'Top segments'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`relative pb-1.5 ${tab === k ? 'text-[#252423]' : 'text-[#605e5c] hover:text-[#252423]'}`}>
            {label}
            {tab === k && <span className="absolute right-0 bottom-0 left-0 h-[2px] bg-[#118DFF]" />}
          </button>
        ))}
        <span className="ml-auto flex gap-2 text-[#605e5c]" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7" />
          </svg>
          <svg viewBox="0 0 24 24" className="h-4 w-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7" />
          </svg>
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[13px] text-[#605e5c]">
        <span>
          {question} <b className="font-semibold text-[#252423]">{outcome}</b>
        </span>
        <span aria-hidden>⌄</span>
      </div>
      {tab === 'influencers' ? (
        <div className="mt-2 flex flex-1 flex-col rounded-md bg-[#f3f2f1] p-3">
          <div className="mb-2 grid grid-cols-[1fr_auto] gap-2 text-[11px] text-[#605e5c]">
            <span>When...</span>
            <span className="text-right">...the likelihood increases by</span>
          </div>
          <ul className="flex flex-1 flex-col justify-around gap-2.5">
            {items.map((it) => {
              const size = 30 + (it.factor / max) * 22;
              return (
                <li key={it.when} className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-[12px] text-[#252423]">
                    <span className="min-w-0 flex-1">{it.when}</span>
                    <span className="relative h-px w-8 shrink-0 bg-[#12239E]" aria-hidden>
                      <span className="absolute -top-[3px] right-0 border-y-[3.5px] border-l-[6px] border-y-transparent border-l-[#12239E]" />
                    </span>
                  </span>
                  <span className="flex justify-center">
                    <span
                      className="flex items-center justify-center rounded-full bg-[#12239E] text-[11px] font-semibold text-white tabular-nums"
                      style={{ width: size, height: size }}
                    >
                      {it.factor.toFixed(1)}x
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="mt-2 flex flex-1 items-center justify-center rounded-md bg-[#f3f2f1] p-6 text-center text-[12px] text-[#605e5c]">
          Learners who practice a few times a week and finish the DAX chapters form the most job-ready segment.
        </div>
      )}
      {note && <p className="mt-2 text-[11px] text-[#8a8886]">{note}</p>}
    </figure>
  );
}
