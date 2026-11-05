import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Plan = 'pro' | 'pl300';

export interface Entitlement {
  plan: Plan;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

/** An Enterprise/team plan the visitor belongs to (as manager or member). */
export interface Team {
  id: string;
  name: string;
  role: 'owner' | 'member';
  seats: number;
  used: number;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  owner_email: string | null;
}

export interface AccountState {
  /** False until the first session check finishes. */
  ready: boolean;
  email: string | null;
  entitlement: Entitlement | null;
  team: Team | null;
  /** Bumped when progress synced from the account changes local data, so pages re-render. */
  progressVersion: number;
}

// The last known entitlement is cached so paid pages open instantly on reload, before Supabase answers.
const CACHE_KEY = 'biex:entitlement';
const TEAM_CACHE_KEY = 'biex:team';

function readTeamCache(): Team | null {
  try {
    const raw = localStorage.getItem(TEAM_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Team) : null;
  } catch {
    return null;
  }
}

function writeTeamCache(t: Team | null): void {
  try {
    if (t) localStorage.setItem(TEAM_CACHE_KEY, JSON.stringify(t));
    else localStorage.removeItem(TEAM_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

function readCache(): Entitlement | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Entitlement) : null;
  } catch {
    return null;
  }
}

function writeCache(e: Entitlement | null): void {
  try {
    if (e) localStorage.setItem(CACHE_KEY, JSON.stringify(e));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* storage unavailable: access is simply re-checked on every load */
  }
}

let state: AccountState = { ready: !supabase, email: null, entitlement: supabase ? readCache() : null, team: supabase ? readTeamCache() : null, progressVersion: 0 };
const sessionListeners = new Set<(userId: string | null) => void>();

/** Called with the signed-in user's id (or null) whenever the session is checked. */
export function onSession(cb: (userId: string | null) => void): void {
  sessionListeners.add(cb);
}

export function bumpProgress(): void {
  setState({ progressVersion: state.progressVersion + 1 });
}
const listeners = new Set<() => void>();

function setState(next: Partial<AccountState>): void {
  state = { ...state, ...next };
  if ('entitlement' in next) writeCache(state.entitlement);
  if ('team' in next) writeTeamCache(state.team);
  listeners.forEach((l) => l());
}

/** Statuses that keep access open. past_due keeps access while Stripe retries the card. */
const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'paid']);

export function isLive(e: Entitlement | null, now = Date.now()): boolean {
  if (!e || !LIVE_STATUSES.has(e.status)) return false;
  return !e.current_period_end || new Date(e.current_period_end).getTime() > now;
}

/** A team gives every member Pro while its subscription is active (past_due keeps access while the invoice is chased). */
export function isTeamLive(t: Team | null, now = Date.now()): boolean {
  if (!t || !['active', 'trialing', 'past_due'].includes(t.status)) return false;
  return !t.current_period_end || new Date(t.current_period_end).getTime() > now;
}

/** The plan the signed-in visitor has paid for (or their team has) and can use right now. */
export function currentPlan(): Plan | null {
  if (isTeamLive(state.team)) return 'pro';
  return isLive(state.entitlement) ? state.entitlement!.plan : null;
}

async function load(session: Session | null): Promise<void> {
  sessionListeners.forEach((l) => l(session?.user.id ?? null));
  if (!supabase || !session) {
    setState({ ready: true, email: null, entitlement: null, team: null });
    return;
  }
  // Link any team invites sent to this email, then read the team (if any) and the personal plan.
  await supabase.rpc('claim_team_invites');
  const teamRes = await supabase.rpc('my_team');
  const team = teamRes.error ? state.team : (((teamRes.data as Team[] | null) ?? [])[0] ?? null);
  const { data, error } = await supabase
    .from('entitlements')
    .select('plan, status, current_period_end, cancel_at_period_end')
    .eq('user_id', session.user.id)
    .maybeSingle();
  // On a network error keep the cached entitlement rather than locking a paying user out.
  setState({ ready: true, email: session.user.email ?? null, team, entitlement: error ? state.entitlement : ((data as Entitlement | null) ?? null) });
}

if (supabase) {
  void supabase.auth.getSession().then(({ data }) => load(data.session));
  supabase.auth.onAuthStateChange((_event, session) => {
    // Supabase warns against awaiting other calls inside this callback, so load on the next tick.
    setTimeout(() => void load(session), 0);
  });
}

/** Re-read the entitlement, e.g. after returning from Stripe Checkout. */
export async function refreshAccount(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  await load(data.session);
}

export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
  setState({ email: null, entitlement: null, team: null });
}

export const getAccount = (): AccountState => state;

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
