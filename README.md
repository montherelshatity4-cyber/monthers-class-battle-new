# Monther’s Class Battle

A real-time classroom battle lobby built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Local setup

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key, and service-role key. The service-role key is server-only and must never be exposed to the browser.
4. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, choose **Create teacher game**, then share the displayed PIN or QR code.

## Implemented flow

- Teacher creates a six-digit PIN-backed lobby.
- The teacher receives a signed, HTTP-only cookie used to authorize Start Battle.
- Students must provide a display name, team name, and one mandatory color: Red, Blue, Green, or Yellow.
- A database unique constraint prevents two teams in one game from using the same color.
- Teacher lobby subscribes to Supabase Realtime for team and player inserts.
- Student screens subscribe to the game row and react when the teacher starts the battle.
- The UI shows live/reconnecting connection state and reloads authoritative state after realtime events.

## Supabase notes

The API routes use the service-role key on the server to perform validated game mutations. Run the migration in a fresh Supabase project. If the publication already contains one of the tables, remove the corresponding `alter publication` line or ignore the duplicate relation error and confirm the tables are enabled under Database > Publications > supabase_realtime.

Before production, add teacher authentication, rate limiting, player-name uniqueness rules, and question/answer tables. The current teacher cookie is appropriate for the initial lobby prototype, not a full identity system.
