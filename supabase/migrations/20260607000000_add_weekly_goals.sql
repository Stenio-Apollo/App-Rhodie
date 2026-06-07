create table if not exists public.weekly_goals (
  user_id uuid references auth.users(id) on delete cascade,
  text text not null,
  preset_id text,
  week_start_date date not null,
  updated_at timestamptz not null default now(),
  achieved_at timestamptz,
  last_checked_at timestamptz,
  primary key (user_id, week_start_date)
);

create table if not exists public.weekly_goal_progress (
  user_id uuid references auth.users(id) on delete cascade primary key,
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.weekly_goals'::regclass
      and conname = 'weekly_goals_pkey'
  ) then
    alter table public.weekly_goals drop constraint weekly_goals_pkey;
  end if;
end $$;

alter table public.weekly_goals
  add constraint weekly_goals_pkey primary key (user_id, week_start_date);

alter table public.weekly_goals enable row level security;
alter table public.weekly_goal_progress enable row level security;

grant select, insert, update, delete on table public.weekly_goals to authenticated;
grant select, insert, update, delete on table public.weekly_goal_progress to authenticated;

drop policy if exists "own weekly goal" on public.weekly_goals;
drop policy if exists "select own weekly goals" on public.weekly_goals;
create policy "select own weekly goals" on public.weekly_goals
  for select using (auth.uid() = user_id);

drop policy if exists "insert weekly goal" on public.weekly_goals;
create policy "insert weekly goal" on public.weekly_goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own weekly goals" on public.weekly_goals;
create policy "update own weekly goals" on public.weekly_goals
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own weekly goals" on public.weekly_goals;
create policy "delete own weekly goals" on public.weekly_goals
  for delete using (auth.uid() = user_id);

drop policy if exists "own weekly goal progress" on public.weekly_goal_progress;
drop policy if exists "select own weekly goal progress" on public.weekly_goal_progress;
create policy "select own weekly goal progress" on public.weekly_goal_progress
  for select using (auth.uid() = user_id);

drop policy if exists "insert weekly goal progress" on public.weekly_goal_progress;
create policy "insert weekly goal progress" on public.weekly_goal_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own weekly goal progress" on public.weekly_goal_progress;
create policy "update own weekly goal progress" on public.weekly_goal_progress
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own weekly goal progress" on public.weekly_goal_progress;
create policy "delete own weekly goal progress" on public.weekly_goal_progress
  for delete using (auth.uid() = user_id);

revoke all on public.weekly_goals from anon;
revoke all on public.weekly_goal_progress from anon;
