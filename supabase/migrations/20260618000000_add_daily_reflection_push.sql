alter table public.push_tokens
  add column if not exists timezone text;

create table if not exists public.push_notification_deliveries (
  token text not null,
  kind text not null check (kind in ('daily_quote', 'daily_prompt')),
  local_date date not null,
  delivered_at timestamptz not null default now(),
  primary key (token, kind, local_date)
);

alter table public.push_notification_deliveries enable row level security;
revoke all on public.push_notification_deliveries from anon, authenticated;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule('daily-reflection-reminder-hourly')
where exists (
  select 1 from cron.job where jobname = 'daily-reflection-reminder-hourly'
);

select cron.schedule(
  'daily-reflection-reminder-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://ddjnezmzwvhcgpktaqpv.supabase.co/functions/v1/daily-reflection-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkam5lem16d3ZoY2dwa3RhcXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTc2ODQsImV4cCI6MjA5MTI5MzY4NH0.I9FvVxcxzug9bBgDtlBdJdR4utguPZVU3aO-Vzg-08U'
    ),
    body := '{}'::jsonb
  );
  $$
);
