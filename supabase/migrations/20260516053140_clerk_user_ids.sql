drop policy if exists "own journal entries" on public.journal_entries;
drop policy if exists "insert journal entries" on public.journal_entries;
drop policy if exists "own tasks" on public.tasks;
drop policy if exists "insert tasks" on public.tasks;
drop policy if exists "own google calendar connection" on public.google_calendar_connections;
drop policy if exists "insert google calendar connection" on public.google_calendar_connections;
drop policy if exists "own push tokens" on public.push_tokens;
drop policy if exists "insert push tokens" on public.push_tokens;
drop policy if exists "own profile" on public.profiles;
drop policy if exists "insert profile" on public.profiles;
drop policy if exists "own subscription access" on public.subscription_access;
drop policy if exists "insert subscription access" on public.subscription_access;

alter table public.journal_entries
  alter column user_id type text using user_id::text;

alter table public.tasks
  alter column user_id type text using user_id::text;

alter table public.google_calendar_connections
  alter column user_id type text using user_id::text;

alter table public.push_tokens
  alter column user_id type text using user_id::text;

alter table public.profiles
  alter column id type text using id::text;

alter table public.subscription_access
  alter column user_id type text using user_id::text;

create policy "own journal entries" on public.journal_entries
  for all using ((auth.jwt() ->> 'sub') = user_id);

create policy "insert journal entries" on public.journal_entries
  for insert with check ((auth.jwt() ->> 'sub') = user_id);

create policy "own tasks" on public.tasks
  for all using ((auth.jwt() ->> 'sub') = user_id);

create policy "insert tasks" on public.tasks
  for insert with check ((auth.jwt() ->> 'sub') = user_id);

create policy "own google calendar connection" on public.google_calendar_connections
  for all using ((auth.jwt() ->> 'sub') = user_id);

create policy "insert google calendar connection" on public.google_calendar_connections
  for insert with check ((auth.jwt() ->> 'sub') = user_id);

create policy "own push tokens" on public.push_tokens
  for all using ((auth.jwt() ->> 'sub') = user_id);

create policy "insert push tokens" on public.push_tokens
  for insert with check ((auth.jwt() ->> 'sub') = user_id);

create policy "own profile" on public.profiles
  for all using ((auth.jwt() ->> 'sub') = id);

create policy "insert profile" on public.profiles
  for insert with check ((auth.jwt() ->> 'sub') = id);

create policy "own subscription access" on public.subscription_access
  for all using ((auth.jwt() ->> 'sub') = user_id);

create policy "insert subscription access" on public.subscription_access
  for insert with check ((auth.jwt() ->> 'sub') = user_id);
