# Rhodie

## Included
- Kanban board with drag-and-drop between:
  - `To Do`
  - `In Progress`
  - `Completed`
- Calendar month view with due-date task filtering
- Insights feed:
  - Official stats cards (NIMH/SAMHSA/CDC links)
  - Expert-reviewed education links
  - App-written simplified summaries with source links
- Journal entries
- Supabase auth + cloud sync (tasks, journal, profile, push tokens)
- Subscription paywall (RevenueCat): 14-day free trial then monthly billing
- Local persistence fallback with AsyncStorage

## Run
```bash
nvm use 20
npm install
npx expo start -c
```

## Supabase setup
1) Create a Supabase project; copy **Project URL** and **Anon key**.  
2) Set them in `app.json` under `expo.extra.supabaseUrl` / `supabaseAnonKey` (or via `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` env vars for builds).  
3) In the Supabase SQL editor, run `src/lib/supabase-schema.sql` to create tables (journal_entries, tasks, push_tokens) and RLS policies.  
4) Enable email auth (or your provider) in Supabase Auth.  
5) For push: store Expo push tokens in `push_tokens` and send via a Supabase Edge Function or other worker.

## Billing setup (RevenueCat + Store subscriptions)
1) In RevenueCat, create an entitlement id `pro`.
2) Add iOS and Android subscription products in RevenueCat and attach both to `pro`.
3) Configure store products:
   - App Store Connect: auto-renewable monthly subscription at `$3.99`, introductory offer `14-day free trial`.
   - Google Play Console: monthly base plan at `$3.99`, offer phase `14-day free trial`.
4) Set keys in `.env`:
   - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
   - `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro`
5) Build a dev client or production build (Expo Go uses preview mode and cannot make real purchases).

## Google Calendar sync setup
1) In Google Cloud Console, enable the Google Calendar API.
2) Create an OAuth client ID for iOS/Android native app usage and copy the client ID.
3) Set `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` in your environment (local `.env` and EAS env vars).
4) In Supabase SQL editor, rerun `src/lib/supabase-schema.sql` to add:
   - `google_calendar_connections`
   - Google metadata columns on `tasks`
5) Rebuild the app with EAS after adding env vars.
6) In-app: Calendar tab -> Google Calendar Sync -> Connect. Events are then auto-imported and synced periodically.

## Release (EAS)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
eas build --platform android --profile production
```

## Health checks
```bash
npx tsc --noEmit
npx expo-doctor
```
