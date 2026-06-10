-- ============================================================
-- CALLED IT. — 0005 round picks (recurring engagement layer)
-- Per-round bonus predictions: Best Team of the Round + Top Scorer of the
-- Round. Same immutability + pre-lock privacy model as the six, but each
-- round locks at ITS OWN kickoff (not the tournament kickoff).
-- ============================================================

create table if not exists public.rounds (
  id text primary key,              -- 'GROUP_1','LAST_32','FINAL' ...
  name text not null,               -- 'Group Stage · Matchday 1'
  stage text not null,
  matchday int,
  locks_at timestamptz not null,    -- first kickoff of the round
  ends_at timestamptz,              -- last kickoff of the round (+ buffer)
  status text not null default 'upcoming'
    check (status in ('upcoming','open','locked','resolved')),
  best_team text references public.teams,    -- resolved result
  top_scorer int references public.players,  -- resolved result
  sort int not null default 0
);

create table if not exists public.round_picks (
  user_id uuid references public.profiles on delete cascade,
  round_id text references public.rounds,
  category text check (category in ('round_team','round_scorer')),
  team_id text references public.teams,
  player_id int references public.players,
  locked_at timestamptz,
  primary key (user_id, round_id, category)
);

-- written by cron only (service role)
create table if not exists public.round_stats (
  round_id text,
  category text,
  entity_id text,
  pick_count int,
  pct numeric,
  multiplier numeric,
  frozen boolean default false,
  primary key (round_id, category, entity_id)
);

create index if not exists round_picks_round_idx on public.round_picks (round_id);

-- ---- Helpers (SECURITY DEFINER so policies can read rounds safely) --------
create or replace function public.round_is_open(_round text)
returns boolean language sql security definer stable
set search_path = public
as $$ select exists (select 1 from public.rounds where id = _round and now() < locks_at) $$;

create or replace function public.round_locks_at(_round text)
returns timestamptz language sql security definer stable
set search_path = public
as $$ select locks_at from public.rounds where id = _round $$;

-- ===================================================================
-- RLS
-- ===================================================================
alter table public.rounds       enable row level security;
alter table public.round_picks  enable row level security;
alter table public.round_stats  enable row level security;

-- rounds + round_stats: public read; written by cron (service role).
create policy rounds_select_public on public.rounds
  for select to anon, authenticated using (true);
create policy round_stats_select_public on public.round_stats
  for select to anon, authenticated using (true);

-- round_picks: owner reads always; everyone reads a round's picks once that
-- round has locked. Insert/update only your own rows, only while the round is
-- still open and not yet locked (immutable thereafter). No delete.
create policy round_picks_select on public.round_picks
  for select to anon, authenticated
  using (user_id = auth.uid() or now() >= public.round_locks_at(round_id));

create policy round_picks_insert on public.round_picks
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and locked_at is null
    and public.round_is_open(round_id)
  );

create policy round_picks_update on public.round_picks
  for update to authenticated
  using (
    user_id = auth.uid()
    and locked_at is null
    and public.round_is_open(round_id)
  )
  with check (
    user_id = auth.uid()
    and public.round_is_open(round_id)
  );
