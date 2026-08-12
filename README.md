# AttendX

Smart Attendance Management — dual-mode (College Management System + independent
Personal Attendance Tracker). Next.js 16 + TypeScript + Prisma (Postgres) + Tailwind +
shadcn/ui.

## What was fixed (Aug 2026 pass)

- **CSRF tokens were issued but never checked server-side.** Every mutation route
  (admin/personal/teacher, 22 files) now validates the `x-csrf-token` header against
  the session's CSRF cookie before making any change.
- **SQLite → Postgres.** SQLite writes to a local file, which does not persist across
  Netlify's serverless function invocations — this was almost certainly why the live
  site behaved inconsistently / lost data. Swapped `prisma/schema.prisma` to
  `postgresql`.
- **Removed `output: "standalone"`** from `next.config.ts` — that config (plus the old
  `Caddyfile`) was for a self-hosted Node/Bun server, not Netlify. Added `netlify.toml`
  + `@netlify/plugin-nextjs` so Netlify builds this correctly as a Next.js app.
- **Session secret** (`ATTENDX_SECRET`) had an insecure hardcoded fallback. The app now
  refuses to start in production if it isn't set, instead of silently signing cookies
  with a secret anyone can read in this source file.
- **Cookies now set `secure: true` in production.**
- **Basic rate limiting** added to login/register endpoints (were previously
  unprotected against password brute-forcing).
- **Demo credentials removed from the production build** of the login modal — showing
  `admin@attendx.edu` / `admin123` on a public site is a real risk if you've run the
  seed script against your real database. **Change or remove the seeded admin account
  before letting real users onto a production deployment.**
- Fixed 2 accessibility lint errors (`<a>` tags with no `href` in the footer).
- Removed an unused dependency (`z-ai-web-dev-sdk`) and `bun-types`.
- Added a `.gitignore` (there wasn't one — risk of accidentally committing
  `node_modules`, `.env`, build output).

## Deploying to Netlify

1. **Get a Postgres database.** Easiest: in your Netlify site, go to
   **Extensions -> Database** and provision one (powered by Neon) — it sets
   `DATABASE_URL` for you automatically. Or get a free one manually from
   [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
2. In **Site settings -> Environment variables**, set:
   - `DATABASE_URL` — your Postgres connection string (skip if the Netlify DB
     extension already set it)
   - `ATTENDX_SECRET` — a long random string, e.g. output of `openssl rand -hex 32`
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — credentials for a Google Cloud Web OAuth client
   - `GOOGLE_CALLBACK_URL` — `https://<your-site>.netlify.app/api/auth/google/callback`
     (recommended in production so the configured redirect is unambiguous)
3. Push this code to your GitHub repo (`git push`), connect the repo in Netlify — it
   will auto-detect `netlify.toml` and build with `@netlify/plugin-nextjs`.
4. After the first deploy, run the schema against your new database once (from your
   own machine, with `DATABASE_URL` pointed at production):
   ```
   npx prisma db push
   ```
5. Optional: seed demo data with `npx prisma db seed` — but if you do this on a real
   production database, **change the seeded admin password immediately** (or delete
   that account) since it's a well-known default.

## Local development

```bash
cp .env.example .env   # fill in DATABASE_URL (any Postgres, even a free Neon branch) and ATTENDX_SECRET
npm install
npx prisma db push
npm run dev
```

## Stack

Next.js 16 (App Router) · TypeScript · Prisma + Postgres · Tailwind CSS · shadcn/ui ·
Recharts · Zustand
