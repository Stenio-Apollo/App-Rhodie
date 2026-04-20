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
- Subscription paywall: 14-day free trial, then monthly or yearly billing through the App Store / Google Play
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

## Billing setup (Store billing + Supabase verification)
1) Configure store products:
- App Store Connect: monthly `rhodie.30` and yearly `rhodie.365` auto-renewable subscriptions.
   - Google Play Console: matching monthly and yearly subscriptions/base plans.
2) Apply the Supabase migration for `subscription_access`.
3) Deploy the `subscription-access` and `delete-account` Edge Functions.
4) Set Supabase Edge Function secrets:
   - `SUBSCRIPTION_TRIAL_DAYS`
   - Apple App Store Server API credentials
   - Google Play Developer API service-account credentials
5) Set app config / env values:
   - `EXPO_PUBLIC_MONTHLY_PRODUCT_ID`
   - `EXPO_PUBLIC_YEARLY_PRODUCT_ID`
   - `EXPO_PUBLIC_PRIVACY_POLICY_URL`
   - `EXPO_PUBLIC_TERMS_OF_USE_URL`
6) Turn off `EXPO_PUBLIC_BYPASS_SUBSCRIPTIONS` before any real billing build.
7) Test on a dev client / TestFlight / internal Android build with sandbox users before production. Expo Go cannot make real purchases.

## Subscription launch checklist
- App Store Connect and Google Play products exist for `rhodie.30` and `rhodie.365`.
- Supabase `subscription_access` table exists with RLS enabled.
- `subscription-access` function is deployed and has the required Apple / Google verification secrets.
- EAS `production` environment has `EXPO_PUBLIC_BYPASS_SUBSCRIPTIONS=false`.
- Paywall shows working Terms of Use and Privacy Policy URLs.
- Test these flows on-device: yearly purchase, monthly purchase, restore purchase, cancel from store, reinstall app, sign in on a second device.

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
