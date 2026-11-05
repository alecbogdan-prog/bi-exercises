// Shared server code for the /api functions. Files starting with "_" are not exposed as routes on Vercel.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export type Plan = 'pro' | 'pl300';

/** What each Pricing-page button buys. Prices are found in Stripe by lookup key, so no price IDs live in env vars. */
export const OFFERS = {
  'pro-year': { plan: 'pro', lookupKey: 'pro_yearly', mode: 'subscription' },
  'pro-month': { plan: 'pro', lookupKey: 'pro_monthly', mode: 'subscription' },
  pl300: { plan: 'pl300', lookupKey: 'pl300_prep', mode: 'payment' },
} as const satisfies Record<string, { plan: Plan; lookupKey: string; mode: 'subscription' | 'payment' }>;

export type OfferId = keyof typeof OFFERS;

/** A PL-300 Prep purchase gives this many days of access. */
export const PL300_DAYS = 90;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  stripeClient ??= new Stripe(env('STRIPE_SECRET_KEY'));
  return stripeClient;
}

let adminClient: SupabaseClient | null = null;
/** Supabase with the service role key: bypasses row level security, so only use it on the server. */
export function admin(): SupabaseClient {
  adminClient ??= createClient(env('VITE_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  return adminClient;
}

/** The signed-in user from the request's "Authorization: Bearer <supabase access token>" header. */
export async function userFrom(req: Request): Promise<User | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error ? null : data.user;
}

export function siteUrl(req: Request): string {
  return (process.env.SITE_URL ?? new URL(req.url).origin).replace(/\/$/, '');
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export interface EntitlementRow {
  user_id: string;
  plan: Plan;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export async function entitlementOf(userId: string): Promise<EntitlementRow | null> {
  const { data, error } = await admin().from('entitlements').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as EntitlementRow | null;
}

export function isLive(e: Pick<EntitlementRow, 'status' | 'current_period_end'> | null, now = Date.now()): boolean {
  if (!e || !['active', 'trialing', 'past_due', 'paid'].includes(e.status)) return false;
  return !e.current_period_end || new Date(e.current_period_end).getTime() > now;
}
