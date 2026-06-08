alter table public.tasks
  add column if not exists due_time time;

create index if not exists tasks_user_due_date_time_idx
  on public.tasks (user_id, due_date, due_time);
