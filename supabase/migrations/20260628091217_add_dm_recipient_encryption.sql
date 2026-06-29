create table if not exists public.dm_encryption_public_keys (
  user_id text primary key references public.profiles(id) on delete cascade,
  public_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dm_encryption_private_keys (
  user_id text primary key references public.profiles(id) on delete cascade,
  private_key_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dm_message_recipients (
  message_id text not null references public.dm_messages(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  body_encrypted text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists dm_message_recipients_user_idx
  on public.dm_message_recipients (user_id, message_id);

alter table public.dm_encryption_public_keys enable row level security;
alter table public.dm_encryption_private_keys enable row level security;
alter table public.dm_message_recipients enable row level security;

grant select, insert, update on table public.dm_encryption_public_keys to authenticated;
grant select, insert, update, delete on table public.dm_encryption_private_keys to authenticated;
grant select, insert, update, delete on table public.dm_message_recipients to authenticated;

revoke all on public.dm_encryption_public_keys from anon;
revoke all on public.dm_encryption_private_keys from anon;
revoke all on public.dm_message_recipients from anon;

drop policy if exists "read authenticated dm public keys" on public.dm_encryption_public_keys;
create policy "read authenticated dm public keys" on public.dm_encryption_public_keys
  for select to authenticated
  using (true);

drop policy if exists "insert own dm public key" on public.dm_encryption_public_keys;
create policy "insert own dm public key" on public.dm_encryption_public_keys
  for insert to authenticated
  with check (auth.uid()::text = user_id);

drop policy if exists "update own dm public key" on public.dm_encryption_public_keys;
create policy "update own dm public key" on public.dm_encryption_public_keys
  for update to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists "read own dm private key" on public.dm_encryption_private_keys;
create policy "read own dm private key" on public.dm_encryption_private_keys
  for select to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "insert own dm private key" on public.dm_encryption_private_keys;
create policy "insert own dm private key" on public.dm_encryption_private_keys
  for insert to authenticated
  with check (auth.uid()::text = user_id);

drop policy if exists "update own dm private key" on public.dm_encryption_private_keys;
create policy "update own dm private key" on public.dm_encryption_private_keys
  for update to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists "delete own dm private key" on public.dm_encryption_private_keys;
create policy "delete own dm private key" on public.dm_encryption_private_keys
  for delete to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "read own dm recipient ciphertext" on public.dm_message_recipients;
create policy "read own dm recipient ciphertext" on public.dm_message_recipients
  for select to authenticated
  using (
    user_id = auth.uid()::text
    and exists (
      select 1
      from public.dm_messages message
      where message.id = message_id
        and private.is_dm_participant(message.conversation_id)
    )
  );

drop policy if exists "insert dm recipient ciphertext for own messages" on public.dm_message_recipients;
create policy "insert dm recipient ciphertext for own messages" on public.dm_message_recipients
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.dm_messages message
      join public.dm_conversation_participants participant
        on participant.conversation_id = message.conversation_id
       and participant.user_id = dm_message_recipients.user_id
      where message.id = message_id
        and message.sender_id = auth.uid()::text
        and private.is_dm_participant(message.conversation_id)
    )
  );

drop policy if exists "update dm recipient ciphertext for own messages" on public.dm_message_recipients;
create policy "update dm recipient ciphertext for own messages" on public.dm_message_recipients
  for update to authenticated
  using (
    exists (
      select 1
      from public.dm_messages message
      where message.id = message_id
        and message.sender_id = auth.uid()::text
        and private.is_dm_participant(message.conversation_id)
    )
  )
  with check (
    exists (
      select 1
      from public.dm_messages message
      join public.dm_conversation_participants participant
        on participant.conversation_id = message.conversation_id
       and participant.user_id = dm_message_recipients.user_id
      where message.id = message_id
        and message.sender_id = auth.uid()::text
        and private.is_dm_participant(message.conversation_id)
    )
  );

drop policy if exists "delete dm recipient ciphertext for own messages" on public.dm_message_recipients;
create policy "delete dm recipient ciphertext for own messages" on public.dm_message_recipients
  for delete to authenticated
  using (
    exists (
      select 1
      from public.dm_messages message
      where message.id = message_id
        and message.sender_id = auth.uid()::text
        and private.is_dm_participant(message.conversation_id)
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dm_message_recipients'
  ) then
    alter publication supabase_realtime add table public.dm_message_recipients;
  end if;
end $$;
