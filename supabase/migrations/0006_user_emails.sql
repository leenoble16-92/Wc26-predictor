-- ============================================================
-- CALLED IT. — 0006 captured emails (private)
-- Stores a user's email the moment they give it, INDEPENDENT of Supabase
-- Auth's confirmation send (which fails without SMTP and rolls back). This
-- guarantees the address is captured for updates/marketing even before SMTP
-- is configured. Private: only the owner (and the service role, for export)
-- can read it — NOT public like profiles.
-- ============================================================

create table if not exists public.user_emails (
  user_id uuid primary key references auth.users on delete cascade,
  email text not null,
  marketing_opt_in boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_emails enable row level security;

-- Owner-only access. No anon/public read — emails never leak to other players.
create policy user_emails_select_own on public.user_emails
  for select to authenticated using (user_id = auth.uid());
create policy user_emails_insert_own on public.user_emails
  for insert to authenticated with check (user_id = auth.uid());
create policy user_emails_update_own on public.user_emails
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
