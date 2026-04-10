# RhNative (Frontend Only)

React Native + Expo frontend app with local state only.

## Included
- Kanban board with drag-and-drop between:
  - `To Do`
  - `In Progress`
  - `Completed`
- Calendar month view with due-date task filtering
- Local persistence with AsyncStorage

## Not Included
- Backend APIs
- Authentication
- Database

## Run
```bash
npm install
npx expo start -c
```

## Supabase setup (ready to wire)
1) Create a Supabase project; copy **Project URL** and **Anon key**.  
2) Set them in `app.json` under `expo.extra.supabaseUrl` / `supabaseAnonKey` (or via `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` env vars for builds).  
3) In the Supabase SQL editor, run `src/lib/supabase-schema.sql` to create tables (journal_entries, tasks, push_tokens) and RLS policies.  
4) When you add auth: enable email/OAuth in Supabase Auth and use the provided keys in the app.  
5) For push: store Expo push tokens in `push_tokens` and send via a Supabase Edge Function or other worker.
