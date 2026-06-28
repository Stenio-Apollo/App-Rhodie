create schema if not exists private;
revoke all on schema private from public;

insert into public.profiles (id, full_name)
select
  users.id::text,
  nullif(coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name', ''), '')
from auth.users
on conflict (id) do nothing;

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id::text,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_profile_for_new_user() from public;

drop trigger if exists create_profile_after_auth_user_insert on auth.users;
create trigger create_profile_after_auth_user_insert
  after insert on auth.users
  for each row execute function private.create_profile_for_new_user();

drop policy if exists "update own community comments" on public.community_comments;
create policy "update own community comments" on public.community_comments
  for update to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

grant update, delete on table public.dm_messages to authenticated;

drop policy if exists "update own dm messages" on public.dm_messages;
create policy "update own dm messages" on public.dm_messages
  for update to authenticated
  using (
    sender_id = auth.uid()::text
    and private.is_dm_participant(conversation_id)
  )
  with check (
    sender_id = auth.uid()::text
    and private.is_dm_participant(conversation_id)
  );

drop policy if exists "delete own dm messages" on public.dm_messages;
create policy "delete own dm messages" on public.dm_messages
  for delete to authenticated
  using (
    sender_id = auth.uid()::text
    and private.is_dm_participant(conversation_id)
  );
