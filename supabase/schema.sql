-- Power BI Exercises: paid access.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 'pro' unlocks everything; 'pl300' unlocks only the PL-300 practice tests.
  plan text not null check (plan in ('pro', 'pl300')),
  -- Stripe subscription status ('active', 'trialing', 'past_due', 'canceled', ...) or 'paid' for one-time purchases.
  status text not null,
  -- Access ends at this moment (end of the paid period, or 3 months after a PL-300 Prep purchase).
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  updated_at timestamptz not null default now()
);

create index if not exists entitlements_customer_idx on public.entitlements (stripe_customer_id);

alter table public.entitlements enable row level security;

-- Signed-in users can read their own row. Only the server (service role, from the Stripe webhook) writes.
drop policy if exists "read own entitlement" on public.entitlements;
create policy "read own entitlement" on public.entitlements
  for select using (auth.uid() = user_id);
