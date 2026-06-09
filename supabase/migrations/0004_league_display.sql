-- ============================================================
-- CALLED IT. — 0004 league display fields
-- Pre-kickoff, picks RLS hides other members' rows entirely, so lock status
-- and boldness can't be derived from picks in the league view. Store these
-- two DISPLAY-ONLY values on the user's own (public-readable) profile, written
-- by the user when they lock. The picks table stays the source of truth for
-- immutability; these are just what league mates are allowed to see.
-- profiles RLS already allows a user to update their own row.
-- ============================================================

alter table public.profiles
  add column if not exists locked_at timestamptz,
  add column if not exists boldness numeric;
