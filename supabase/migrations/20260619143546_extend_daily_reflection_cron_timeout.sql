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
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
