-- ============================================================
-- CALLED IT. — 0002 RLS policies
-- Faithful to SPEC.md §3 "RLS essentials" and §9.
--
-- KEY FACTS about Supabase anonymous auth (signInAnonymously):
--   * It creates a REAL row in auth.users with the 'authenticated'
--     postgres role (is_anonymous = true). So auth.uid() is set and
--     these users match policies granted TO authenticated.
--   * The 'anon' postgres role = requests with NO user JWT (just the
--     anon API key): logged-out visitors hitting a public profile/OG.
--
-- Picks immutability and pre-kickoff privacy are enforced HERE, never
-- by UI logic alone (HARD RULE). Service role bypasses RLS entirely,
-- which is how cron/admin/seed write the read-only tables.
-- ============================================================

-- ---- Kickoff constant, used by the picks policies -----------------
create or replace function public.kickoff()
returns timestamptz
language sql immutable
as $$ select '2026-06-11T19:00:00Z'::timestamptz $$;

-- ---- Membership check (SECURITY DEFINER avoids RLS self-recursion
--      when league_members policies reference league_members) --------
create or replace function public.is_league_member(_league_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.league_members
    where league_id = _league_id and user_id = auth.uid()
  );
$$;

-- ===================================================================
-- Enable RLS on every table (deny-by-default until a policy allows).
-- ===================================================================
alter table public.profiles         enable row level security;
alter table public.teams            enable row level security;
alter table public.players          enable row level security;
alter table public.picks            enable row level security;
alter table public.leagues          enable row level security;
alter table public.league_members   enable row level security;
alter table public.pick_stats       enable row level security;
alter table public.scores           enable row level security;
alter table public.tournament_state enable row level security;

-- ===================================================================
-- profiles — public read (handles shown on public profiles + league
-- lists); each user manages only their own row.
-- ===================================================================
create policy profiles_select_public on public.profiles
  for select to anon, authenticated
  using (true);

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ===================================================================
-- teams / players — public read-only reference data.
-- Writes happen only via the seed script (service role → bypasses RLS).
-- ===================================================================
create policy teams_select_public on public.teams
  for select to anon, authenticated using (true);

create policy players_select_public on public.players
  for select to anon, authenticated using (true);

-- ===================================================================
-- picks — the security-critical table.
--
-- SELECT:
--   * Owner can always read their own picks.
--   * After kickoff, picks become readable by everyone (this covers
--     BOTH "readable by anyone sharing a league" AND the public
--     profile / OG card, which is itself public per SPEC §2/§6).
--   * Before kickoff: non-owners (incl. league mates) get NOTHING.
--     This is the two-anon-session privacy test in the checklist.
--
-- INSERT/UPDATE (immutability):
--   * Only your own rows, only while locked_at IS NULL AND pre-kickoff.
--   * UPDATE's USING reads the PRE-image, so once locked_at is set OR
--     kickoff passes, no further update can match → rows are immutable.
--   * WITH CHECK lets you set locked_at (the lock action) but keeps the
--     row yours and pre-kickoff. Un-locking is impossible (USING blocks).
--   * No DELETE policy → deletes are denied for clients.
-- ===================================================================
create policy picks_select_owner_or_postkickoff on public.picks
  for select to anon, authenticated
  using (user_id = auth.uid() or now() >= public.kickoff());

create policy picks_insert_own_prelock on public.picks
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and locked_at is null
    and now() < public.kickoff()
  );

create policy picks_update_own_prelock on public.picks
  for update to authenticated
  using (
    user_id = auth.uid()
    and locked_at is null
    and now() < public.kickoff()
  )
  with check (
    user_id = auth.uid()
    and now() < public.kickoff()
  );

-- ===================================================================
-- leagues — join-by-code needs lookup, so readable by signed-in users;
-- only the owner creates and renames.  (League feature is Wednesday;
-- policy defined now so the schema is complete.)
-- ===================================================================
create policy leagues_select_authed on public.leagues
  for select to authenticated
  using (true);

create policy leagues_insert_owner on public.leagues
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy leagues_update_owner on public.leagues
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ===================================================================
-- league_members — you can add yourself; you can read the membership
-- of any league you belong to (via SECURITY DEFINER helper).
-- ===================================================================
create policy league_members_select_same_league on public.league_members
  for select to authenticated
  using (public.is_league_member(league_id));

create policy league_members_insert_self on public.league_members
  for insert to authenticated
  with check (user_id = auth.uid());

create policy league_members_delete_self on public.league_members
  for delete to authenticated
  using (user_id = auth.uid());

-- ===================================================================
-- pick_stats / scores / tournament_state — read-only to clients.
-- Written exclusively by cron/admin via service role (bypasses RLS).
-- No INSERT/UPDATE/DELETE policies → all client writes denied.
-- ===================================================================
create policy pick_stats_select_public on public.pick_stats
  for select to anon, authenticated using (true);

create policy scores_select_public on public.scores
  for select to anon, authenticated using (true);

create policy tournament_state_select_public on public.tournament_state
  for select to anon, authenticated using (true);
