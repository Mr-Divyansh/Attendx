# Project Memory

## Purpose

This file is the persistent memory for this project.

Cline MUST keep this file updated whenever important project information changes.

## Rules

1. Before making a significant change, check this file.
2. After completing a significant change, update this file if the change affects:

   * Project architecture
   * Features
   * Database/schema
   * API routes
   * Authentication
   * Dependencies
   * Configuration
   * Important bugs or fixes
   * Deployment
   * File/folder structure
   * Important decisions
3. When something is removed, update this file so the memory does not contain outdated information.
4. Do NOT record temporary information that will become useless.
5. Do NOT store passwords, API keys, tokens, secrets, or private credentials.
6. Keep this file concise and organized.
7. Never claim something is completed unless it has actually been implemented and verified.

## Project Overview

### Current Goal

AttendX is an attendance-management application for schools, colleges, and universities. It provides dedicated Teacher, Student, Admin, and Personal Tracker experiences. The app is actively deployed on Vercel.

### Technology Stack

* Next.js 16 (App Router, Turbopack, React 19)
* TypeScript (strict)
* Prisma 6 (PostgreSQL — Neon)
* Tailwind CSS v4
* shadcn/ui (Radix primitives)
* Recharts (analytics)
* Zustand (client state — auth store)
* React Hook Form + Zod
* next-auth (Google OAuth), Nodemailer (SMTP OTP)
* Upstash Redis (rate limiting, optional; PostgreSQL fallback)
* dnd-kit (drag-and-drop), framer-motion, sonner (toasts), next-themes

### Architecture

* **Pages**: Single landing page (`src/app/page.tsx`) + `/admin-panel`, `/contact`, `/privacy`, `/terms`, `/join/[token]`.
* **API routes as controllers**: All logic lives under `src/app/api/**` — auth, admin, teacher, student, personal, classrooms, notifications, contact.
* **Prisma as models**: `prisma/schema.prisma` defines 20+ models across 4 logical zones.
* **React components as views**: `src/components/modules/` contains role-specific dashboards (`teacher-dashboard.tsx`, `student-dashboard.tsx`, `personal-dashboard.tsx`, `admin-dashboard.tsx`).
* **MVCS + shared libs**: `src/lib/` provides `auth.ts` (session/CSRF/password/errors), `db.ts`, `api.ts`, `otp.ts`, `email.ts`, `security.ts`, `rate-limit.ts`, `audit.ts`, `config.ts`.
* **Auth store** (`src/stores/auth-store.ts`) controls login/role/view on the client.
* **Security headers** enforced via `middleware.ts` (HSTS, CSP, nosniff, frame-deny, referrer-policy).
* **Session-based auth** with `ATTENDX_SECRET` (HMAC-signed cookie), CSRF tokens, and role-based authorization via `requireRole()`.

### Features

* **Teacher panel**: Create classrooms, academic structure (semester/class, section, subject), join codes, timetable entries, mark/load/correct attendance (7-day edit window), view/remove classroom members.
* **Student panel**: Join multiple classrooms (no duplicate memberships), view joined classrooms/schedules, view teacher-recorded attendance (read-only), summaries and analytics.
* **Admin panel**: User/academic-catalogue CRUD, stats overview, attendance CSV export, JSON backup, password reset, timetable management, departments/semesters/sections management.
* **Personal tracker**: Independent isolated attendance tracking — register/login, today's quick-mark, weekly/monthly charts, attendance predictor, goal setting (75/80/85/90%), timetable manager, settings (dark mode, password change, delete account).
* **Authentication**: Email/password (scrypt hashing), Google OAuth, email OTP verification (registration, password reset, email change), session cookies, CSRF protection, rate limiting.

### Database

PostgreSQL via Prisma. Schema split into zones:

* **Zone 1 — Identity & Auth**: `User`, `AuthAccount`, `Admin`, `Teacher`, `Student`
* **Zone 2 — Academic Structure**: `Department`, `Semester`, `Section`, `Subject`, `Classroom`, `ClassroomMember`, `Timetable`, `Attendance`
* **Zone 3 — Personal Mode (isolated)**: `PersonalUser`, `PersonalTimetable`, `PersonalAttendance`, `Notification`, `Setting`
* **Zone 4 — Security/Trust**: `OtpVerification`, `RateLimit`, `AuditLog`, `SystemSetting`, `CollegeNotification`

Key details: `User.role` enum (`ADMIN | TEACHER | STUDENT`), session role also supports `PERSONAL`. Compound uniques on Attendance and PersonalTimetable. Classrooms have `publicId`, `joinCode`, `inviteToken`, `expiresAt`. Audit columns `markedById`/`markedAt` on Attendance. `Setting.goalPct` validates to {75,80,85,90}.

### Important Decisions

* **PostgreSQL over SQLite** (migrated from SQLite): SQLite's file-based storage breaks on serverless platforms (Netlify/Vercel serverless functions get throwaway filesystems). Postgres is required for production.
* **No standalone Next output**: `standalone` was removed from `next.config.ts`; Netlify/Vercel official build pipeline is used instead.
* **Session-based custom auth** instead of relying solely on next-auth for the primary flow; next-auth only used for Google OAuth.
* **Dynamic import in instrumentation**: `src/instrumentation.ts` must NOT statically import `auth.ts` (which pulls Node `crypto` into the Edge bundle and causes build warnings). It uses `process.env.NEXT_RUNTIME === 'nodejs'` guard + dynamic import instead.
* **Strict password policy**: 12+ chars with upper/lower/digit/special, denylist, no email/name substrings.
* **OTP + rate limiting** on all sensitive endpoints — required for production.
* **Admin role enforcement on server** — not just frontend hiding.

### Current Status

* [x] Full-stack app implemented end-to-end: all 4 role dashboards, auth flows, OTP, Google OAuth, classrooms, analytics, predictor, CSV export, JSON backup.
* [x] Deployed to Vercel; build verified clean (`npm run build` — no warnings after instrumentation fix, TypeScript passes).
* [ ] Ongoing feature work and maintenance.
* [ ] Demo seed data available (`npx prisma db seed`). Demo credentials: admin@attendx.edu/admin123, rao@attendx.edu/teacher123, student1@attendx.edu/student123, riya/personal123. ⚠️ Never run seed against production.

### Known Issues

* (None currently tracked.)

### Important Commands

```bash
npm install                 # install dependencies
npx prisma generate        # generate Prisma client
npx prisma db push         # sync schema to database
npx prisma validate        # validate schema
npx prisma db seed         # seed demo data (dev only!)
npx tsc --noEmit           # type check
npm run build              # production build
npm run dev                # start dev server on :3000
npm run lint               # eslint
```

### Change Log

#### 2026-08-18

* Fixed Edge Runtime build warnings (6 warnings from `src/instrumentation.ts`): replaced static import of `./lib/auth` (which transitively loads Node `crypto`) with a `process.env.NEXT_RUNTIME === 'nodejs'` guard + dynamic `await import('./lib/auth')`, and replaced `process.exit(1)` with throwing errors. Build is now clean (0 warnings), TypeScript passes, all 67 static pages generate.
* Created this Project Memory file.