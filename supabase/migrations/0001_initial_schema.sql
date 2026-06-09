-- ============================================================
-- CALLED IT. — 0001 initial schema
-- Faithful to SPEC.md §3. Apply via Supabase SQL editor / CLI.
-- RLS policies live in 0002_rls_policies.sql (reviewed separately).
-- ============================================================

-- profiles: 1:1 with auth.users (anonymous or upgraded)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null,          -- url-safe, generated from display name + suffix
  display_name text not null,
  created_at timestamptz default now()
);

create table if not exists public.teams (
  id text primary key,                  -- 'ENG', 'FRA' ...
  name text not null,
  flag text not null,
  fifa_rank int not null                -- snapshot frozen at kickoff; never updated
);

create table if not exists public.players (
  id int primary key,                   -- football-data player id where available
  name text not null,
  team_id text references public.teams,
  club text,
  position text
);

create table if not exists public.picks (
  user_id uuid references public.profiles on delete cascade,
  category text check (category in
    ('winner','runner_up','golden_boot','pott','dark_horse','flop')),
  team_id text references public.teams,
  player_id int references public.players,
  locked_at timestamptz,
  primary key (user_id, category)
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,            -- 6 chars, A-Z0-9, no ambiguous chars
  owner_id uuid references public.profiles,
  created_at timestamptz default now()
);

create table if not exists public.league_members (
  league_id uuid references public.leagues on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

-- written by cron only (service role)
create table if not exists public.pick_stats (
  category text,
  entity_id text,                       -- team_id or player_id::text
  pick_count int,
  pct numeric,
  multiplier numeric,
  frozen boolean default false,         -- true at kickoff
  primary key (category, entity_id)
);

create table if not exists public.scores (
  user_id uuid references public.profiles on delete cascade primary key,
  points numeric default 0,
  breakdown jsonb,                      -- per-category provisional/final points
  updated_at timestamptz
);

create table if not exists public.tournament_state (
  key text primary key,                 -- 'golden_boot_leader', 'eliminated_teams', 'winner', 'pott' ...
  value jsonb,
  updated_at timestamptz
);

-- Helpful indexes for the read paths we hit often.
create index if not exists picks_category_idx on public.picks (category);
create index if not exists league_members_user_idx on public.league_members (user_id);
create index if not exists players_team_idx on public.players (team_id);
