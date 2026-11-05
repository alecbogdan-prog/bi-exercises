import { useEffect } from 'react';
import { Footer, Header } from '../components/Layout';
import { BRAND } from '../lib/base';
import { PRIVACY, TERMS, UPDATED } from '../content/legal';

export default function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const title = kind === 'terms' ? 'Terms of Use' : 'Privacy Policy';
  const sections = kind === 'terms' ? TERMS : PRIVACY;

  useEffect(() => {
    document.title = `${title} | ${BRAND}`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>
        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-bold text-ink">{s.h}</h2>
              {s.p.map((t) => (
                <p key={t.slice(0, 40)} className="mt-2 leading-relaxed text-slate-700">
                  {t}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
