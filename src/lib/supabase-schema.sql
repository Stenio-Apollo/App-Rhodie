-- Journal entries
create table if not exists public.journal_entries (
  id text primary key,
  user_id text not null,
  date date not null,
  category text not null check (category in ('gratitude','prompt')),
  text text not null,
  text_encrypted text,
  created_at timestamptz not null default now()
);
update public.journal_entries set category = 'prompt' where category = 'journal';
alter table public.journal_entries drop constraint if exists journal_entries_category_check;
alter table public.journal_entries
  add constraint journal_entries_category_check check (category in ('gratitude','prompt'));
create index if not exists journal_entries_user_date_idx on public.journal_entries (user_id, date);

-- Tasks / board
create table if not exists public.tasks (
  id text primary key,
  user_id text not null,
  title text not null,
  title_encrypted text,
  description text,
  description_encrypted text,
  due_date date,
  due_time time,
  status text not null check (status in ('todo','completed')),
  priority text not null check (priority in ('low','medium','high')),
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  source text not null default 'manual',
  external_id text,
  external_updated_at timestamptz
);
update public.tasks set status = 'todo' where status = 'in_progress';
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check check (status in ('todo','completed'));
alter table public.tasks add column if not exists source text not null default 'manual';
alter table public.tasks add column if not exists external_id text;
alter table public.tasks add column if not exists external_updated_at timestamptz;
alter table public.tasks add column if not exists due_time time;
create index if not exists tasks_user_status_order_idx on public.tasks (user_id, status, "order");
create index if not exists tasks_user_due_date_idx on public.tasks (user_id, due_date);
create index if not exists tasks_user_due_date_time_idx on public.tasks (user_id, due_date, due_time);
create index if not exists tasks_user_source_external_idx on public.tasks (user_id, source, external_id);
create unique index if not exists tasks_google_external_unique on public.tasks (user_id, source, external_id) where external_id is not null;

-- Google Calendar OAuth connection
create table if not exists public.google_calendar_connections (
  user_id text primary key,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  updated_at timestamptz not null default now()
);

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

-- Push tokens for Expo notifications
create table if not exists public.push_tokens (
  user_id text not null,
  token text not null,
  platform text,
  timezone text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table if not exists public.push_notification_deliveries (
  token text not null,
  kind text not null check (kind in ('daily_quote', 'daily_prompt')),
  local_date date not null,
  delivered_at timestamptz not null default now(),
  primary key (token, kind, local_date)
);

-- Enable RLS
alter table public.journal_entries enable row level security;
alter table public.tasks enable row level security;
alter table public.push_tokens enable row level security;
alter table public.push_notification_deliveries enable row level security;
alter table public.google_calendar_connections enable row level security;
alter table public.encryption_profiles enable row level security;

-- Ownership policies
drop policy if exists "own journal entries" on public.journal_entries;
create policy "own journal entries" on public.journal_entries
  for all using (auth.uid()::text = user_id);

drop policy if exists "own tasks" on public.tasks;
create policy "own tasks" on public.tasks
  for all using (auth.uid()::text = user_id);

drop policy if exists "own push tokens" on public.push_tokens;
create policy "own push tokens" on public.push_tokens
  for all using (auth.uid()::text = user_id);

drop policy if exists "own google calendar connection" on public.google_calendar_connections;
create policy "own google calendar connection" on public.google_calendar_connections
  for all using (auth.uid()::text = user_id);

drop policy if exists "select own encryption profile" on public.encryption_profiles;
create policy "select own encryption profile" on public.encryption_profiles
  for select to authenticated using (auth.uid()::text = user_id);
drop policy if exists "insert own encryption profile" on public.encryption_profiles;
create policy "insert own encryption profile" on public.encryption_profiles
  for insert to authenticated with check (auth.uid()::text = user_id);
drop policy if exists "update own encryption profile" on public.encryption_profiles;
create policy "update own encryption profile" on public.encryption_profiles
  for update to authenticated using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- Insert policies
drop policy if exists "insert journal entries" on public.journal_entries;
create policy "insert journal entries" on public.journal_entries
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "insert tasks" on public.tasks;
create policy "insert tasks" on public.tasks
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "insert push tokens" on public.push_tokens;
create policy "insert push tokens" on public.push_tokens
  for insert with check (auth.uid()::text = user_id);

drop policy if exists "insert google calendar connection" on public.google_calendar_connections;
create policy "insert google calendar connection" on public.google_calendar_connections
  for insert with check (auth.uid()::text = user_id);

-- Optional: lock down anon
revoke all on public.journal_entries from anon;
revoke all on public.tasks from anon;
revoke all on public.push_tokens from anon;
revoke all on public.push_notification_deliveries from anon, authenticated;
revoke all on public.google_calendar_connections from anon;
grant select, insert, update on table public.encryption_profiles to authenticated;
revoke all on public.encryption_profiles from anon;

-- Profiles
create table if not exists public.profiles (
  id text primary key,
  full_name text,
  birthday date,
  avatar_url text,
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
drop policy if exists "select public profiles" on public.profiles;
create policy "select public profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "insert profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid()::text = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid()::text = id) with check (auth.uid()::text = id);
drop policy if exists "delete own profile" on public.profiles;
create policy "delete own profile" on public.profiles for delete to authenticated using (auth.uid()::text = id);
revoke all on public.profiles from anon;

-- Community
create table if not exists public.community_posts (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id text primary key,
  post_id text not null references public.community_posts(id) on delete cascade,
  parent_comment_id text references public.community_comments(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.community_likes (
  post_id text not null references public.community_posts(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_shares (
  post_id text not null references public.community_posts(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_comment_likes (
  comment_id text not null references public.community_comments(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.dm_conversations (
  id text primary key,
  created_by text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dm_conversation_participants (
  conversation_id text not null references public.dm_conversations(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.dm_messages (
  id text primary key,
  conversation_id text not null references public.dm_conversations(id) on delete cascade,
  sender_id text not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  body_encrypted text,
  created_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_shares enable row level security;
alter table public.community_comment_likes enable row level security;
alter table public.dm_conversations enable row level security;
alter table public.dm_conversation_participants enable row level security;
alter table public.dm_messages enable row level security;

-- Sticky notes
create table if not exists public.sticky_notes (
  user_id text primary key,
  text text not null default '',
  text_encrypted text,
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

-- Subscription access
create table if not exists public.subscription_access (
  user_id text primary key,
  provider text check (provider in ('app_store', 'play_store', 'none')),
  platform text check (platform in ('ios', 'android', 'web', 'unknown')),
  product_identifier text,
  status text check (status in ('trial', 'active', 'billing_issue', 'expired', 'inactive')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  subscription_started_at timestamptz,
  current_period_ends_at timestamptz,
  will_renew boolean not null default false,
  last_verified_at timestamptz,
  last_synced_from_client_at timestamptz,
  raw_payload jsonb,
  updated_at timestamptz not null default now()
);
alter table public.subscription_access enable row level security;
drop policy if exists "own subscription access" on public.subscription_access;
create policy "own subscription access" on public.subscription_access
  for all using (auth.uid()::text = user_id);
drop policy if exists "insert subscription access" on public.subscription_access;
create policy "insert subscription access" on public.subscription_access
  for insert with check (auth.uid()::text = user_id);
revoke all on public.subscription_access from anon;
