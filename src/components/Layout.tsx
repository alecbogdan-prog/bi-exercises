import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { BRAND } from '../lib/base';
import { Logo } from './icons';

export function Header({ children }: { children?: ReactNode }) {
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
      <Link to="/login" className="hidden whitespace-nowrap rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-ink hover:border-brand-500 md:block">
        Log in
      </Link>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-5 w-5" /> © {new Date().getFullYear()} {BRAND}
          <Link to="/dax-functions" className="ml-3 hover:text-ink">
            DAX Functions List
          </Link>
        </div>
        <p className="max-w-xl text-xs">
          {BRAND} is an independent learning site and is not affiliated with, sponsored or endorsed by Microsoft. Power BI is a trademark of Microsoft Corporation and is used here only to
          describe the skills taught. The sample data is fictional.
        </p>
      </div>
    </footer>
  );
}
