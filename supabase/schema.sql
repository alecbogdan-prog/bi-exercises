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

-- ============================================================================
-- Team plan: a company buys N seats; the owner (manager) takes one seat and invites colleagues.
-- ============================================================================
create extension if not exists citext with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My team',
  owner_id uuid not null references auth.users (id) on delete cascade,
  seats int not null check (seats >= 1),
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teams_owner_idx on public.teams (owner_id);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  email extensions.citext not null,
  user_id uuid references auth.users (id) on delete set null,
  role text not null default 'member' check (role in ('owner', 'member')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (team_id, email)
);
create index if not exists team_members_user_idx on public.team_members (user_id);
create index if not exists team_members_email_idx on public.team_members (email);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- Policy helpers live in a schema the API does not expose.
create or replace function private.is_team_owner(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teams where id = t and owner_id = auth.uid());
$$;
create or replace function private.is_team_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = t and user_id = auth.uid());
$$;
revoke execute on function private.is_team_owner(uuid) from public, anon;
revoke execute on function private.is_team_member(uuid) from public, anon;
grant execute on function private.is_team_owner(uuid) to authenticated, service_role;
grant execute on function private.is_team_member(uuid) to authenticated, service_role;

drop policy if exists "members read their team" on public.teams;
create policy "members read their team" on public.teams for select to authenticated
  using (owner_id = auth.uid() or private.is_team_member(id));
drop policy if exists "read own membership or owner reads all" on public.team_members;
create policy "read own membership or owner reads all" on public.team_members for select to authenticated
  using (user_id = auth.uid() or private.is_team_owner(team_id));
drop policy if exists "owner removes members" on public.team_members;
create policy "owner removes members" on public.team_members for delete to authenticated
  using (private.is_team_owner(team_id) and role <> 'owner');

revoke all on public.teams, public.team_members from anon, authenticated;
grant select on public.teams to authenticated;
grant select, delete on public.team_members to authenticated;
grant all on public.teams, public.team_members to service_role;

create or replace function public.claim_team_invites() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then return 0; end if;
  update public.team_members
     set user_id = auth.uid(), joined_at = coalesce(joined_at, now())
   where user_id is null and email = (auth.jwt() ->> 'email')::extensions.citext;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.my_team()
returns table (id uuid, name text, role text, seats int, used int, status text, current_period_end timestamptz, cancel_at_period_end boolean, owner_email text)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, m.role, t.seats,
         (select count(*)::int from public.team_members x where x.team_id = t.id),
         t.status, t.current_period_end, t.cancel_at_period_end,
         (select u.email::text from auth.users u where u.id = t.owner_id)
    from public.team_members m join public.teams t on t.id = m.team_id
   where m.user_id = auth.uid()
   order by (m.role = 'owner') desc, t.created_at desc
   limit 1;
$$;

create or replace function public.team_progress(t uuid)
returns table (email text, role text, user_id uuid, invited_at timestamptz, joined_at timestamptz, data jsonb, last_active timestamptz)
language sql stable security definer set search_path = public as $$
  select m.email::text, m.role, m.user_id, m.invited_at, m.joined_at, p.data, p.updated_at
    from public.team_members m left join public.progress p on p.user_id = m.user_id
   where m.team_id = t and private.is_team_owner(t)
   order by (m.role = 'owner') desc, m.invited_at;
$$;

create or replace function public.rename_team(t uuid, new_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_owner(t) then raise exception 'not allowed'; end if;
  update public.teams set name = left(trim(new_name), 80), updated_at = now() where id = t and length(trim(new_name)) > 0;
end $$;

revoke execute on function public.claim_team_invites() from public, anon;
revoke execute on function public.my_team() from public, anon;
revoke execute on function public.team_progress(uuid) from public, anon;
revoke execute on function public.rename_team(uuid, text) from public, anon;
grant execute on function public.claim_team_invites() to authenticated;
grant execute on function public.my_team() to authenticated;
grant execute on function public.team_progress(uuid) to authenticated;
grant execute on function public.rename_team(uuid, text) to authenticated;
