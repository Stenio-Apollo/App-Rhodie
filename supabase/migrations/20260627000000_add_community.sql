alter table public.profiles
  add column if not exists avatar_url text;

drop policy if exists "own profile" on public.profiles;
drop policy if exists "insert profile" on public.profiles;
drop policy if exists "select public profiles" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "delete own profile" on public.profiles;

create policy "select public profiles" on public.profiles
  for select to authenticated
  using (true);

create policy "insert own profile" on public.profiles
  for insert to authenticated
  with check (auth.uid()::text = id);

create policy "update own profile" on public.profiles
  for update to authenticated
  using (auth.uid()::text = id)
  with check (auth.uid()::text = id);

create policy "delete own profile" on public.profiles
  for delete to authenticated
  using (auth.uid()::text = id);

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

create index if not exists community_posts_created_at_idx
  on public.community_posts (created_at desc);

create index if not exists community_comments_post_created_at_idx
  on public.community_comments (post_id, created_at);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_shares enable row level security;

grant select, insert, update, delete on table public.community_posts to authenticated;
grant select, insert, update, delete on table public.community_comments to authenticated;
grant select, insert, delete on table public.community_likes to authenticated;
grant select, insert, delete on table public.community_shares to authenticated;
revoke all on public.community_posts from anon;
revoke all on public.community_comments from anon;
revoke all on public.community_likes from anon;
revoke all on public.community_shares from anon;

drop policy if exists "read community posts" on public.community_posts;
create policy "read community posts" on public.community_posts
  for select to authenticated
  using (true);

drop policy if exists "insert own community posts" on public.community_posts;
create policy "insert own community posts" on public.community_posts
  for insert to authenticated
  with check (auth.uid()::text = user_id);

drop policy if exists "update own community posts" on public.community_posts;
create policy "update own community posts" on public.community_posts
  for update to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists "delete own community posts" on public.community_posts;
create policy "delete own community posts" on public.community_posts
  for delete to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "read community comments" on public.community_comments;
create policy "read community comments" on public.community_comments
  for select to authenticated
  using (true);

drop policy if exists "insert own community comments" on public.community_comments;
create policy "insert own community comments" on public.community_comments
  for insert to authenticated
  with check (auth.uid()::text = user_id);

drop policy if exists "delete own community comments" on public.community_comments;
create policy "delete own community comments" on public.community_comments
  for delete to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "read community likes" on public.community_likes;
create policy "read community likes" on public.community_likes
  for select to authenticated
  using (true);

drop policy if exists "insert own community likes" on public.community_likes;
create policy "insert own community likes" on public.community_likes
  for insert to authenticated
  with check (auth.uid()::text = user_id);

drop policy if exists "delete own community likes" on public.community_likes;
create policy "delete own community likes" on public.community_likes
  for delete to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "read community shares" on public.community_shares;
create policy "read community shares" on public.community_shares
  for select to authenticated
  using (true);

drop policy if exists "insert own community shares" on public.community_shares;
create policy "insert own community shares" on public.community_shares
  for insert to authenticated
  with check (auth.uid()::text = user_id);

drop policy if exists "delete own community shares" on public.community_shares;
create policy "delete own community shares" on public.community_shares
  for delete to authenticated
  using (auth.uid()::text = user_id);
