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
1) In RevenueCat, create an entitlement id `Rhodie Pro` (or set `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` to whatever identifier you use).
2) In RevenueCat, create one current offering containing these package/product mappings:
   - `yearly`
   - `monthly`
3) Configure store products:
   - App Store Connect: one yearly auto-renewable subscription and one monthly auto-renewable subscription.
   - Google Play Console: one yearly subscription base plan and one monthly subscription base plan.
4) Local development can use the shared RevenueCat test key:
   - `EXPO_PUBLIC_REVENUECAT_API_KEY`
5) Store builds should use platform-specific public SDK keys:
   - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
6) Also set:
   - `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`
   - `EXPO_PUBLIC_PRIVACY_POLICY_URL`
   - `EXPO_PUBLIC_TERMS_OF_USE_URL`
7) Add the same RevenueCat and legal URL variables to your EAS `preview` and `production` environments.
8) Turn on Apple App Store Server Notifications V2 and Google Real-time Developer Notifications inside RevenueCat before launch.
9) Test on a dev client / TestFlight / internal Android build with sandbox users before production. Expo Go cannot make real purchases.

## Subscription launch checklist
- RevenueCat dashboard has the `Rhodie Pro` entitlement (or your configured entitlement id).
- The current offering contains `yearly` and `monthly`.
- The RevenueCat paywall is configured in the dashboard.
- RevenueCat Customer Center is configured in the dashboard.
- iOS and Android products are attached to the correct packages.
- EAS `production` environment contains the correct RevenueCat SDK keys.
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
