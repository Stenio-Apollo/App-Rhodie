create table if not exists public.planner_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  color text not null,
  notify_minutes_before integer,
  recurrence_rule text,
  recurrence_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.planner_event_overrides (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.planner_events(id) on delete cascade,
  occurrence_date date not null,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  color text,
  notify_minutes_before integer,
  is_cancelled boolean not null default false,
  unique (event_id, occurrence_date)
);

create index if not exists planner_events_user_start_idx
  on public.planner_events (user_id, start_at);

create index if not exists planner_event_overrides_event_date_idx
  on public.planner_event_overrides (event_id, occurrence_date);

alter table public.planner_events enable row level security;
alter table public.planner_event_overrides enable row level security;

grant select, insert, update, delete on table public.planner_events to authenticated;
grant select, insert, update, delete on table public.planner_event_overrides to authenticated;

drop policy if exists "own planner events" on public.planner_events;

drop policy if exists "select own planner events" on public.planner_events;
create policy "select own planner events" on public.planner_events
  for select to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "insert planner events" on public.planner_events;
create policy "insert planner events" on public.planner_events
  for insert to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "update own planner events" on public.planner_events;
create policy "update own planner events" on public.planner_events
  for update to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "delete own planner events" on public.planner_events;
create policy "delete own planner events" on public.planner_events
  for delete to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "select own planner event overrides" on public.planner_event_overrides;
create policy "select own planner event overrides" on public.planner_event_overrides
  for select to authenticated
  using (
    exists (
      select 1
      from public.planner_events e
      where e.id = event_id
        and e.user_id = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "insert own planner event overrides" on public.planner_event_overrides;
create policy "insert own planner event overrides" on public.planner_event_overrides
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.planner_events e
      where e.id = event_id
        and e.user_id = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "update own planner event overrides" on public.planner_event_overrides;
create policy "update own planner event overrides" on public.planner_event_overrides
  for update to authenticated
  using (
    exists (
      select 1
      from public.planner_events e
      where e.id = event_id
        and e.user_id = (auth.jwt() ->> 'sub')
    )
  )
  with check (
    exists (
      select 1
      from public.planner_events e
      where e.id = event_id
        and e.user_id = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "delete own planner event overrides" on public.planner_event_overrides;
create policy "delete own planner event overrides" on public.planner_event_overrides
  for delete to authenticated
  using (
    exists (
      select 1
      from public.planner_events e
      where e.id = event_id
        and e.user_id = (auth.jwt() ->> 'sub')
    )
  );

revoke all on public.planner_events from anon;
revoke all on public.planner_event_overrides from anon;
