import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Footer, Header } from '../components/Layout';
import { ProjectCards } from '../components/ProjectCards';
import { withBrand } from '../lib/titles';

export default function ProjectsPage() {
  useEffect(() => {
    document.title = withBrand('Power BI Practice Projects: Build Real Dashboards');
  }, []);
  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-mint">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ backgroundImage: 'linear-gradient(#f5e6b0 1px, transparent 1px), linear-gradient(90deg, #f5e6b0 1px, transparent 1px)', backgroundSize: '44px 44px' }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-12 text-center sm:pt-20">
            <div className="text-xs font-semibold tracking-widest text-brand-700 uppercase">End-to-end projects</div>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance text-ink sm:text-6xl">Build a real dashboard, step by step</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-balance text-slate-600">
              Each project starts with a request from a manager and ends with a finished report page. Clean the data, build the model, write the measures and design the visuals, with
              every step checked in your browser.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-12">
          <ProjectCards />
          <p className="mt-10 text-center text-slate-600">
            New to Power BI? Start with the{' '}
            <Link to="/exercises" className="font-semibold text-brand-700 hover:underline">
              short exercises
            </Link>{' '}
            first, then come back for the projects.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
