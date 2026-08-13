'use client'

import { useState } from 'react'
import { useAuth, type Role } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  GraduationCap,
  Users,
  BarChart3,
  CalendarDays,
  ShieldCheck,
  Moon,
  Sun,
  Clock,
  Target,
  Layers,
  ArrowRight,
  UserRoundCheck,
  Menu,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const roleCards: {
  role: Role
  title: string
  tag: string
  desc: string
  icon: React.ElementType
  cta: string
  points: string[]
}[] = [
  {
    role: 'STUDENT',
    title: 'Student',
    tag: 'For students',
    desc: 'Manage your classes, attendance, subjects and academic progress.',
    icon: GraduationCap,
    cta: 'Continue as Student',
    points: ['Join classes from multiple teachers', 'Subject-wise attendance', 'Weekly & monthly insights'],
  },
  {
    role: 'TEACHER',
    title: 'Teacher',
    tag: 'For educators',
    desc: 'Manage classes, students, subjects and attendance with ease.',
    icon: Users,
    cta: 'Continue as Teacher',
    points: ['Create classes & invite students', 'Mark attendance in seconds', 'Timetable & statistics'],
  },
  {
    role: 'PERSONAL',
    title: 'Personal Tracker',
    tag: 'Solo, no classroom',
    desc: 'Track your personal attendance, timetable and progress solo.',
    icon: UserRoundCheck,
    cta: 'Open Personal Tracker',
    points: ['No classroom required', 'Private to you', 'Attendance goal predictor'],
  },
]

const features = [
  {
    icon: CalendarDays,
    title: 'Smart Timetable',
    desc: 'Build a 7-day timetable once. Daily attendance auto-loads the right periods.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Charts',
    desc: 'Weekly and monthly graphs, subject-wise breakdowns, and at-risk detection.',
  },
  {
    icon: Target,
    title: 'Attendance Predictor',
    desc: 'A forward-looking engine tells you exactly how many classes to hit your goal.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Design',
    desc: 'Password hashing, role-based auth, CSRF protection and server-side authorization.',
  },
  {
    icon: Clock,
    title: 'Audit Trail',
    desc: 'Every attendance record carries marked-by and marked-at audit metadata.',
  },
  {
    icon: Layers,
    title: 'Multi-Teacher Classes',
    desc: 'Students join classrooms from many teachers; attendance stays teacher-managed.',
  },
]

const navLinks: { label: string; role?: Role; href?: string }[] = [
  { label: 'Student', role: 'STUDENT' },
  { label: 'Teacher', role: 'TEACHER' },
  { label: 'Personal Tracker', role: 'PERSONAL' },
  { label: 'Contact', href: '/contact' },
]

export function Landing() {
  const { openLogin } = useAuth()
  const { setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleTheme = () =>
    setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="AttendX home">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border bg-card shadow-sm">
              <Image
                src="/Attendx-logo.png"
                alt="AttendX logo"
                width={36}
                height={36}
                className="h-full w-full object-contain"
                priority
              />
            </span>
            <span className="text-lg font-bold tracking-tight">AttendX</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navLinks.map((l) =>
              l.href ? (
                <Link
                  key={l.label}
                  href={l.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {l.label}
                </Link>
              ) : (
                <button
                  key={l.label}
                  onClick={() => openLogin(l.role!)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {l.label}
                </button>
              )
            )}
          </nav>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              <Sun className="size-5 hidden dark:block" />
              <Moon className="size-5 block dark:hidden" />
            </Button>
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => openLogin('STUDENT')}>
              Login
            </Button>
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(20rem,88vw)] p-0">
                <SheetHeader className="flex h-16 flex-row items-center gap-2 border-b px-5 text-left">
                  <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg border bg-card">
                    <Image src="/Attendx-logo.png" alt="" width={32} height={32} className="size-full object-contain" />
                  </span>
                  <SheetTitle>AttendX</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-3" aria-label="Mobile">
                  {navLinks.map((l) =>
                    l.href ? (
                      <Link
                        key={l.label}
                        href={l.href}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <button
                        key={l.label}
                        onClick={() => {
                          setMobileOpen(false)
                          openLogin(l.role!)
                        }}
                        className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        {l.label}
                      </button>
                    )
                  )}
                  <Button
                    className="mt-2"
                    onClick={() => {
                      setMobileOpen(false)
                      openLogin('STUDENT')
                    }}
                  >
                    Login
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 dot-grid" aria-hidden />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="size-3.5 text-primary" />
              Smart attendance for students &amp; teachers
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance md:text-6xl md:leading-[1.04]">
              <span className="text-primary">AttendX</span>
              <span className="mt-2 block text-foreground">
                Smart Attendance Management
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              A clean, secure platform where teachers mark attendance and students track
              their progress across every class — or track your own attendance privately with
              the Personal Tracker. No spreadsheets, no guesswork.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => openLogin('STUDENT')} size="lg" className="h-11 shadow-sm">
                Continue as Student
              </Button>
              <Button onClick={() => openLogin('TEACHER')} size="lg" variant="outline" className="h-11">
                Continue as Teacher
              </Button>
            </div>
            <button
              onClick={() => openLogin('PERSONAL')}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <UserRoundCheck className="size-4" />
              Open the Personal Tracker
              <ArrowRight className="size-3.5" />
            </button>

            {/* Trust strip — honest, feature-based reassurance */}
            <dl className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 border-t pt-6">
              {[
                { icon: ShieldCheck, label: 'Secure by design' },
                { icon: Clock, label: 'Real-time marking' },
                { icon: UserRoundCheck, label: 'Private by default' },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2">
                  <t.icon className="size-4 text-primary" />
                  <dt className="text-sm font-medium text-muted-foreground">{t.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Product preview — a realistic attendance panel (load-bearing) */}
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-primary/10 blur-2xl"
              aria-hidden
            />
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* ── Role entry — three equally prominent paths ─────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Three roles, one platform
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-balance md:text-3xl">
            Choose how you want to use AttendX
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty">
            Part of a college workflow, or tracking on your own — every path is a first-class experience.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {roleCards.map((c) => (
            <div
              key={c.role}
              role="button"
              tabIndex={0}
              onClick={() => openLogin(c.role)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openLogin(c.role)
                }
              }}
              className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card p-6 lift hover:border-primary/40 hover:shadow-elevate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100"
                aria-hidden
              />
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                  <c.icon className="size-5" />
                </div>
                <span className="rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {c.tag}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              <ul className="mt-4 space-y-2 border-t pt-4">
                {c.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {c.cta}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              The platform
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl">
              Everything you need to track attendance
            </h2>
            <p className="mt-3 text-muted-foreground text-pretty">
              One platform with focused, role-based workflows for students, teachers and solo learners.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border bg-card p-6 lift hover:border-primary/30 hover:shadow-elevate">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mb-1.5 font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
        <div className="relative overflow-hidden rounded-2xl border bg-card p-8 text-center shadow-elevate md:p-14">
          <div className="pointer-events-none absolute inset-0 hero-glow" aria-hidden />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground text-pretty">
              Sign in as a student or teacher, or start your own personal tracker in seconds.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={() => openLogin('STUDENT')} className="min-w-[180px]">
                Continue as Student
              </Button>
              <Button variant="outline" onClick={() => openLogin('TEACHER')} className="min-w-[180px]">
                Continue as Teacher
              </Button>
              <Button variant="outline" onClick={() => openLogin('PERSONAL')} className="min-w-[180px]">
                Open Personal Tracker
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

/* Realistic, themed attendance preview used in the hero. Purely presentational,
   but load-bearing: it shows what AttendX actually does. */
function HeroPreview() {
  const rows = [
    { name: 'Aarav Sharma', id: 'CS-2101', status: 'present' as const },
    { name: 'Diya Patel', id: 'CS-2102', status: 'present' as const },
    { name: 'Kabir Singh', id: 'CS-2103', status: 'late' as const },
    { name: 'Meera Nair', id: 'CS-2104', status: 'absent' as const },
    { name: 'Rohan Gupta', id: 'CS-2105', status: 'present' as const },
  ]
  const statusStyle: Record<string, string> = {
    present: 'bg-chart-1/12 text-chart-1',
    late: 'bg-chart-3/15 text-chart-3',
    absent: 'bg-chart-4/12 text-chart-4',
  }
  return (
    <div className="relative rounded-2xl border bg-card p-4 shadow-elevate md:p-5">
      <div className="flex items-center justify-between gap-2 border-b pb-4">
        <div>
          <p className="text-sm font-semibold">Data Structures</p>
          <p className="text-xs text-muted-foreground">Today · 10:00 AM – 11:00 AM</p>
        </div>
        <span className="rounded-full bg-chart-1/12 px-2.5 py-1 text-xs font-semibold text-chart-1">
          92% present
        </span>
      </div>
      <div className="mt-3 space-y-1.5" aria-hidden>
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/60">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {r.name.split(' ').map((s) => s[0]).join('')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground tnum">{r.id}</p>
            </div>
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${statusStyle[r.status]}`}>
              {r.status}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4">
        {[
          { l: 'Present', v: '4', c: 'text-chart-1' },
          { l: 'Late', v: '1', c: 'text-chart-3' },
          { l: 'Absent', v: '1', c: 'text-chart-4' },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border bg-background/50 p-2.5 text-center">
            <p className={`text-xl font-bold tnum ${s.c}`}>{s.v}</p>
            <p className="text-[11px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
