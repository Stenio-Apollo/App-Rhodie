# Task Editor Mobile (React Native)

Expo-based React Native app connected to the existing Next.js backend.

## Features
- Clerk authentication (email/password)
- Kanban board with drag-and-drop between `To Do`, `In Progress`, and `Completed`
- Reorder by dropping on a task card
- Calendar month view with due-date task markers
- Push notifications (Expo token + backend test push)
- Local scheduled reminders for due tasks (9:00 AM on due date)
- Tailwind-style utility styling via NativeWind

## Setup
1. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```
2. Copy env file and set values:
   ```bash
   cp .env.example .env
   ```
3. Start Expo:
   ```bash
   npm run start
   ```

## Important
- `EXPO_PUBLIC_API_BASE_URL` should point to your Next.js server.
- Your Next.js app must run with Clerk middleware enabled so API auth works.
- Push notifications require a physical device for full testing.
