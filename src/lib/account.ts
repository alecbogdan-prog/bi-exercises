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

export interface AccountState {
  /** False until the first session check finishes. */
  ready: boolean;
  email: string | null;
  entitlement: Entitlement | null;
}

// The last known entitlement is cached so paid pages open instantly on reload, before Supabase answers.
const CACHE_KEY = 'biex:entitlement';

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

let state: AccountState = { ready: !supabase, email: null, entitlement: supabase ? readCache() : null };
const listeners = new Set<() => void>();

function setState(next: Partial<AccountState>): void {
  state = { ...state, ...next };
  if ('entitlement' in next) writeCache(state.entitlement);
  listeners.forEach((l) => l());
}

/** Statuses that keep access open. past_due keeps access while Stripe retries the card. */
const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'paid']);

export function isLive(e: Entitlement | null, now = Date.now()): boolean {
  if (!e || !LIVE_STATUSES.has(e.status)) return false;
  return !e.current_period_end || new Date(e.current_period_end).getTime() > now;
}

/** The plan the signed-in visitor has paid for and can use right now. */
export function currentPlan(): Plan | null {
  return isLive(state.entitlement) ? state.entitlement!.plan : null;
}

async function load(session: Session | null): Promise<void> {
  if (!supabase || !session) {
    setState({ ready: true, email: null, entitlement: null });
    return;
  }
  const { data, error } = await supabase
    .from('entitlements')
    .select('plan, status, current_period_end, cancel_at_period_end')
    .eq('user_id', session.user.id)
    .maybeSingle();
  // On a network error keep the cached entitlement rather than locking a paying user out.
  setState({ ready: true, email: session.user.email ?? null, entitlement: error ? state.entitlement : ((data as Entitlement | null) ?? null) });
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
  setState({ email: null, entitlement: null });
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
