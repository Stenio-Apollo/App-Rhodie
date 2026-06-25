create table if not exists public.encryption_profiles (
  user_id text primary key,
  salt text not null,
  verifier text not null,
  kdf text not null,
  iterations int not null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.encryption_profiles enable row level security;
grant select, insert, update on table public.encryption_profiles to authenticated;
revoke all on public.encryption_profiles from anon;

drop policy if exists "select own encryption profile" on public.encryption_profiles;
create policy "select own encryption profile" on public.encryption_profiles
  for select to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "insert own encryption profile" on public.encryption_profiles;
create policy "insert own encryption profile" on public.encryption_profiles
  for insert to authenticated
  with check (auth.uid()::text = user_id);

drop policy if exists "update own encryption profile" on public.encryption_profiles;
create policy "update own encryption profile" on public.encryption_profiles
  for update to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

alter table public.journal_entries
  add column if not exists text_encrypted text;

alter table public.tasks
  add column if not exists title_encrypted text,
  add column if not exists description_encrypted text;

alter table public.sticky_notes
  add column if not exists text_encrypted text;

alter table public.planner_events
  add column if not exists title_encrypted text,
  add column if not exists description_encrypted text;

alter table public.weekly_goals
  add column if not exists text_encrypted text;
