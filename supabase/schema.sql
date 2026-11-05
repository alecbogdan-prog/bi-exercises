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

-- Needed when "Automatically expose new tables" is off: signed-in users may read (RLS limits it to their own row),
-- and the server's service role may write. Anonymous visitors get nothing.
revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;
grant all on public.entitlements to service_role;

-- Signed-in users can read their own row. Only the server (service role, from the Stripe webhook) writes.
drop policy if exists "read own entitlement" on public.entitlements;
create policy "read own entitlement" on public.entitlements
  for select using (auth.uid() = user_id);

-- Progress synced across devices (solved exercises, points, saved work, PL-300 scores).
create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
drop policy if exists "read own progress" on public.progress;
create policy "read own progress" on public.progress for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert own progress" on public.progress;
create policy "insert own progress" on public.progress for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own progress" on public.progress;
create policy "update own progress" on public.progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.progress from anon, authenticated;
grant select, insert, update on public.progress to authenticated;
grant all on public.progress to service_role;
