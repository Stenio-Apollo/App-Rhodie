-- Journal entries
create table if not exists public.journal_entries (
  id text primary key,
  user_id uuid not null,
  date date not null,
  category text not null check (category in ('gratitude','prompt')),
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists journal_entries_user_date_idx on public.journal_entries (user_id, date);

-- Tasks / board
create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null,
  title text not null,
  description text,
  due_date date,
  status text not null check (status in ('todo','in_progress','completed')),
  priority text not null check (priority in ('low','medium','high')),
  "order" int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_status_order_idx on public.tasks (user_id, status, "order");
create index if not exists tasks_user_due_date_idx on public.tasks (user_id, due_date);

-- Push tokens for Expo notifications
create table if not exists public.push_tokens (
  user_id uuid not null,
  token text not null,
  platform text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- Enable RLS
alter table public.journal_entries enable row level security;
alter table public.tasks enable row level security;
alter table public.push_tokens enable row level security;

-- Ownership policies
create policy "own journal entries" on public.journal_entries
  for all using (auth.uid() = user_id);

create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id);

create policy "own push tokens" on public.push_tokens
  for all using (auth.uid() = user_id);

-- Insert policies
create policy "insert journal entries" on public.journal_entries
  for insert with check (auth.uid() = user_id);

create policy "insert tasks" on public.tasks
  for insert with check (auth.uid() = user_id);

create policy "insert push tokens" on public.push_tokens
  for insert with check (auth.uid() = user_id);

-- Optional: lock down anon
revoke all on public.journal_entries from anon;
revoke all on public.tasks from anon;
revoke all on public.push_tokens from anon;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  birthday date,
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (auth.uid() = id);
create policy "insert profile" on public.profiles for insert with check (auth.uid() = id);
revoke all on public.profiles from anon;
