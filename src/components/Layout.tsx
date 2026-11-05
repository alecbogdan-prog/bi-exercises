import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { BRAND } from '../lib/base';
import { Logo } from './icons';
import { useAccount } from '../lib/account';
import { GA_ID, reopenConsent } from '../lib/analytics';

export function Header({ children }: { children?: ReactNode }) {
  const { email, team } = useAccount();
  const nav = ({ isActive }: { isActive: boolean }) => `whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium sm:px-2.5 ${isActive ? 'text-ink' : 'text-slate-500 hover:text-ink'}`;
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
      <Link to="/" className="mr-2 flex items-center gap-2 font-bold tracking-tight">
        <Logo className="h-7 w-7" />
        <span className="hidden sm:inline">{BRAND}</span>
      </Link>
      <nav className="flex items-center">
        <NavLink to="/exercises" className={nav}>
          Exercises
        </NavLink>
        <NavLink to="/projects" className={nav}>
          Projects
        </NavLink>
        <NavLink to="/dax-functions" className={(a) => `${nav(a)} hidden sm:block`}>
          <span className="sm:hidden">DAX</span>
          <span className="hidden sm:inline">DAX Functions</span>
        </NavLink>
        <NavLink to="/pl300" className={nav}>
          PL-300
        </NavLink>
        <NavLink to="/pricing" className={(a) => `${nav(a)} hidden sm:block`}>
          Pricing
        </NavLink>
      </nav>
      <div className="flex-1" />
      {children}
      {team && (
        <Link to="/team" className="hidden whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold text-slate-600 hover:text-ink md:block">
          Team
        </Link>
      )}
      <Link to={email ? '/account' : '/login'} className="hidden whitespace-nowrap rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-ink hover:border-brand-500 md:block">
        {email ? 'Account' : 'Log in'}
      </Link>
    </header>
  );
}

const FOOTER_PRODUCT = [
  { to: '/exercises', label: 'Exercises' },
  { to: '/projects', label: 'Projects' },
  { to: '/pl300', label: 'PL-300 Practice Tests' },
  { to: '/pricing', label: 'Pricing' },
];

const FOOTER_LEGAL = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy Policy' },
];

export function Footer() {
  const link = 'font-semibold text-white/85 transition-colors hover:text-[#f2c811]';
  return (
    <footer className="border-t-4 border-[#f2c811] bg-ink px-4 pt-12 pb-8 text-sm text-white/60">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <Link to="/" className="flex items-center gap-3 font-display text-2xl font-extrabold tracking-tight text-white">
          <Logo className="h-11 w-11" />
          {BRAND}
        </Link>
        <p>
          © {new Date().getFullYear()} {BRAND} | All Rights Reserved
        </p>
        <nav aria-label="Footer" className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {FOOTER_PRODUCT.map((l) => (
              <Link key={l.to} to={l.to} className={link}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {FOOTER_LEGAL.map((l) => (
              <Link key={l.to} to={l.to} className={link}>
                {l.label}
              </Link>
            ))}
            <a href="/sitemap.xml" className={link}>
              Sitemap
            </a>
            {GA_ID && (
              <button type="button" onClick={reopenConsent} className={link}>
                Cookie settings
              </button>
            )}
          </div>
        </nav>
        <p className="max-w-2xl text-xs text-white/40">
          {BRAND} is an independent learning site and is not affiliated with, sponsored or endorsed by Microsoft. Power BI is a trademark of Microsoft Corporation and is used here only to
          describe the skills taught. The sample data is fictional.
        </p>
      </div>
    </footer>
  );
}
