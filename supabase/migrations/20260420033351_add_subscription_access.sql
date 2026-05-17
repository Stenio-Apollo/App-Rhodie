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
