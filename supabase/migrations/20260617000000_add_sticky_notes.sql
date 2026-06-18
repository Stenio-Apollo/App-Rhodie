create table if not exists public.sticky_notes (
  user_id text primary key,
  text text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.sticky_notes enable row level security;

grant select, insert, update, delete on table public.sticky_notes to authenticated;

revoke all on public.sticky_notes from anon;

drop policy if exists "select own sticky note" on public.sticky_notes;
create policy "select own sticky note" on public.sticky_notes
  for select to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "insert own sticky note" on public.sticky_notes;
create policy "insert own sticky note" on public.sticky_notes
  for insert to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "update own sticky note" on public.sticky_notes;
create policy "update own sticky note" on public.sticky_notes
  for update to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "delete own sticky note" on public.sticky_notes;
create policy "delete own sticky note" on public.sticky_notes
  for delete to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);
