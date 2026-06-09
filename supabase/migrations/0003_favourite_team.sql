-- ============================================================
-- CALLED IT. — 0003 favourite team on profiles
-- Identity hook captured at onboarding. Nullable (existing rows + optional).
-- profiles RLS already lets a user insert/update their own row, so no new
-- policy is needed.
-- ============================================================

alter table public.profiles
  add column if not exists favourite_team text references public.teams;
