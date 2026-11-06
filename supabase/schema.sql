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

-- ============================================================================
-- Leaderboard: today's top scores and the longest running streaks, read from progress.data.points.
-- Learners appear under a nickname they choose on the Account page (or a masked email until they do).
-- ============================================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  nickname text check (nickname is null or (length(nickname) between 2 and 24 and nickname ~ '^[A-Za-z0-9 _.-]+$')),
  hide_from_leaderboard boolean not null default false,
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_nickname_idx on public.profiles (lower(nickname));
alter table public.profiles enable row level security;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- day: the visitor's local date (YYYY-MM-DD), since points are logged per local day. Must be within a day of the server's date.
-- Returns kind 'points' (points earned that day) and kind 'streak' (consecutive days ending that day or the day before).
create or replace function public.leaderboard(day text, top int default 5)
returns table (kind text, rank int, name text, value int, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare d date;
begin
  if day !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'bad day'; end if;
  d := day::date;
  if abs(d - (now() at time zone 'utc')::date) > 1 then raise exception 'bad day'; end if;
  top := least(greatest(coalesce(top, 5), 1), 25);
  return query
  with learners as (
    select p.user_id, p.data->'points'->'days' as days,
           coalesce(pr.nickname, left(split_part(u.email, '@', 1), 3) || '***') as name
      from public.progress p
      join auth.users u on u.id = p.user_id
      left join public.profiles pr on pr.user_id = p.user_id
     where jsonb_typeof(p.data->'points'->'days') = 'object'
       and not coalesce(pr.hide_from_leaderboard, false)
  ),
  scores as (
    -- Each exercise pays at most 250 points once, so a day above 40,000 is not a real one.
    select l.user_id, l.name, (l.days->>day)::int as v
      from learners l
     where (l.days->>day) ~ '^\d+$' and (l.days->>day)::int between 1 and 40000
  ),
  active_days as (
    select l.user_id, l.name, k::date as dd
      from learners l cross join lateral jsonb_object_keys(l.days) k
     where k ~ '^\d{4}-\d{2}-\d{2}$' and k::date <= d
  ),
  runs as (
    select a.user_id, a.name, max(a.dd) as last_day, count(*)::int as len
      from (select x.*, x.dd - (row_number() over (partition by x.user_id order by x.dd))::int as grp from active_days x) a
     group by a.user_id, a.name, a.grp
  ),
  streaks as (
    select r.user_id, r.name, r.len as v from runs r where r.last_day >= d - 1
  ),
  ranked as (
    select 'points'::text as k, s.user_id, s.name, s.v, (row_number() over (order by s.v desc, s.name))::int as rk from scores s
    union all
    select 'streak'::text, s.user_id, s.name, s.v, (row_number() over (order by s.v desc, s.name))::int from streaks s
  )
  select r.k, r.rk, r.name, r.v, (r.user_id = auth.uid())
    from ranked r
   where r.rk <= top or r.user_id = auth.uid()
   order by r.k, r.rk;
end $$;
revoke execute on function public.leaderboard(text, int) from public;
grant execute on function public.leaderboard(text, int) to anon, authenticated;
