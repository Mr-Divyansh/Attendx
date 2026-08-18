# AttendX

AttendX is an attendance-management application for schools, colleges, and universities. It includes dedicated Teacher, Student, Admin, and Personal Tracker experiences.

Built with Next.js 16, TypeScript, Prisma, PostgreSQL, Tailwind CSS, and shadcn/ui.

## Features

### Teacher panel

- Create a school or college/university classroom.
- Build a teacher-owned academic structure: semester/class, section, and subject.
- Share a classroom join code with students.
- View actual active classroom members and remove a student from one classroom without deleting their account.
- Create timetable entries with day, start time, and end time. There is no required Period field.
- Mark attendance using date, start time, end time, and Present/Absent controls.
- Load and correct a previously saved attendance session.

### Student panel

- Join multiple classrooms without creating duplicate accounts or memberships.
- See joined classrooms, the responsible teacher, and only the schedules belonging to those classrooms.
- View teacher-recorded attendance and attendance summaries.
- Attendance records are read-only for students.

### Admin and personal tracker

- Admin management for users and the global academic catalogue.
- Independent personal attendance tracking, isolated from school/college data.
- Email/password authentication, Google OAuth, session cookies, CSRF protection, and role checks.
- **Email OTP verification** for registration, password reset, and email changes.

## Run locally

### Prerequisites

- Node.js 20 or newer
- A PostgreSQL database (Neon works well)
- Gmail account with App Password (for OTP emails)

### Setup

```powershell
npm install
```

Create a `.env` file:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
ATTENDX_SECRET="$(openssl rand -hex 32)"
```

**Required for OTP emails:**
```env
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"
```

Get a Gmail App Password:
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords → Generate new app password
4. Use the 16-character password as `SMTP_PASS`

**Optional for production rate limiting:**
```env
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

Apply the Prisma schema and start the app:

```powershell
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database deployment — required

Deploying application code does **not** update the database schema. Whenever `prisma/schema.prisma` changes, run this against the same `DATABASE_URL` configured in Vercel:

```powershell
npx prisma db push
```

Then redeploy the app. If this step is skipped, APIs can return errors such as "Database schema is out of date" or HTTP 500 responses while querying new fields.

## Teacher workflow

1. Sign in as a teacher.
2. Open **Academic Setup**.
3. Create a semester/class, such as `1st Semester` or `Class 10`.
4. Select it, then create a section such as `A`.
5. Select the section and create the actual subject, such as `Programming` or `Mathematics`.
6. Open **Classrooms** and create a classroom. Choose School or College/University mode as appropriate.
7. Share the generated join code with students.
8. Open the classroom to add timetable entries and manage members.
9. Use **Mark Attendance** to load the student list, set any valid date/time range, and save Present/Absent status.

## Admin access

Open `/admin-panel` and sign in with an existing admin account.

For a fresh database, optional demo data can be created with:

```powershell
npx prisma db seed
```

⚠️ **WARNING:** The seed script creates weak passwords for demo purposes only. NEVER run this against a production database. Change all passwords immediately after seeding.

## Validation commands

```powershell
npx prisma generate
npx prisma validate
npx tsc --noEmit
npm run build
```

## Security notes

- **Session Secret:** Generate a unique `ATTENDX_SECRET` with `openssl rand -hex 32`. Minimum 32 characters required.
- **Passwords:** Minimum 12 characters with uppercase, lowercase, number, and special character. Common passwords are rejected.
- **Rate Limiting:** All sensitive endpoints are rate-limited. Configure Upstash Redis for production or use PostgreSQL fallback.
- **CSRF Protection:** All mutation endpoints require valid CSRF tokens.
- **OTP Verification:** Registration, password reset, and email changes require email OTP verification.
- **Authorization:** All API routes verify database-level ownership. Teachers can only access their own classrooms; students only their own data.
- **Admin Panel:** Server-side role enforcement, not just frontend hiding.
- **Security Headers:** HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and CSP are enforced.
- **Never commit** `.env` files, database credentials, or secrets.