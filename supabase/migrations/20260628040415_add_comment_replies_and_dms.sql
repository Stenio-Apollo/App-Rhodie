alter table public.community_comments
  add column if not exists parent_comment_id text references public.community_comments(id) on delete cascade;

create index if not exists community_comments_parent_created_at_idx
  on public.community_comments (parent_comment_id, created_at);

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

create index if not exists community_comment_likes_user_idx
  on public.community_comment_likes (user_id);
create index if not exists dm_conversation_participants_user_idx
  on public.dm_conversation_participants (user_id, conversation_id);
create index if not exists dm_messages_conversation_created_at_idx
  on public.dm_messages (conversation_id, created_at);
create index if not exists dm_messages_sender_idx
  on public.dm_messages (sender_id);

alter table public.community_comment_likes enable row level security;
alter table public.dm_conversations enable row level security;
alter table public.dm_conversation_participants enable row level security;
alter table public.dm_messages enable row level security;

grant select, insert, delete on table public.community_comment_likes to authenticated;
grant select, insert, update, delete on table public.dm_conversations to authenticated;
grant select, insert, update, delete on table public.dm_conversation_participants to authenticated;
grant select, insert, delete on table public.dm_messages to authenticated;
revoke all on public.community_comment_likes from anon;
revoke all on public.dm_conversations from anon;
revoke all on public.dm_conversation_participants from anon;
revoke all on public.dm_messages from anon;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.is_dm_participant(target_conversation_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dm_conversation_participants participant
    where participant.conversation_id = target_conversation_id
      and participant.user_id = auth.uid()::text
  );
$$;

revoke all on function private.is_dm_participant(text) from public;
grant execute on function private.is_dm_participant(text) to authenticated;

drop policy if exists "read community comment likes" on public.community_comment_likes;
create policy "read community comment likes" on public.community_comment_likes
  for select to authenticated
  using (true);

drop policy if exists "insert own community comment likes" on public.community_comment_likes;
create policy "insert own community comment likes" on public.community_comment_likes
  for insert to authenticated
  with check (auth.uid()::text = user_id);

drop policy if exists "delete own community comment likes" on public.community_comment_likes;
create policy "delete own community comment likes" on public.community_comment_likes
  for delete to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "read own dm conversations" on public.dm_conversations;
create policy "read own dm conversations" on public.dm_conversations
  for select to authenticated
  using (created_by = auth.uid()::text or private.is_dm_participant(id));

drop policy if exists "insert own dm conversations" on public.dm_conversations;
create policy "insert own dm conversations" on public.dm_conversations
  for insert to authenticated
  with check (auth.uid()::text = created_by);

drop policy if exists "update own dm conversations" on public.dm_conversations;
create policy "update own dm conversations" on public.dm_conversations
  for update to authenticated
  using (created_by = auth.uid()::text or private.is_dm_participant(id))
  with check (created_by = auth.uid()::text or private.is_dm_participant(id));

drop policy if exists "read own dm participants" on public.dm_conversation_participants;
create policy "read own dm participants" on public.dm_conversation_participants
  for select to authenticated
  using (private.is_dm_participant(conversation_id));

drop policy if exists "insert dm participants for own conversations" on public.dm_conversation_participants;
create policy "insert dm participants for own conversations" on public.dm_conversation_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()::text
    or exists (
      select 1
      from public.dm_conversations conversation
      where conversation.id = conversation_id
        and conversation.created_by = auth.uid()::text
    )
  );

drop policy if exists "update own dm participant state" on public.dm_conversation_participants;
create policy "update own dm participant state" on public.dm_conversation_participants
  for update to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

drop policy if exists "delete own dm participants" on public.dm_conversation_participants;
create policy "delete own dm participants" on public.dm_conversation_participants
  for delete to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists "read own dm messages" on public.dm_messages;
create policy "read own dm messages" on public.dm_messages
  for select to authenticated
  using (private.is_dm_participant(conversation_id));

drop policy if exists "insert own dm messages" on public.dm_messages;
create policy "insert own dm messages" on public.dm_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()::text
    and private.is_dm_participant(conversation_id)
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_comment_likes'
  ) then
    alter publication supabase_realtime add table public.community_comment_likes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dm_conversations'
  ) then
    alter publication supabase_realtime add table public.dm_conversations;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dm_conversation_participants'
  ) then
    alter publication supabase_realtime add table public.dm_conversation_participants;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dm_messages'
  ) then
    alter publication supabase_realtime add table public.dm_messages;
  end if;
end $$;
