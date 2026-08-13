'use client'

import { useAuth, type Role } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  GraduationCap,
  Users,
  BarChart3,
  CalendarDays,
  ShieldCheck,
  Moon,
  Sun,
  CheckCircle2,
  Clock,
  Target,
  Layers,
  ArrowRight,
  UserRoundCheck,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'

const roleCards: {
  role: Role
  title: string
  desc: string
  icon: React.ElementType
  cta: string
  badge?: string
}[] = [
  {
    role: 'STUDENT',
    title: 'I am a Student',
    desc: 'Track your attendance, join classrooms and stay on target.',
    icon: GraduationCap,
    cta: 'Student sign in',
  },
  {
    role: 'TEACHER',
    title: 'I am a Teacher',
    desc: 'Create classrooms, mark attendance and support your students.',
    icon: Users,
    cta: 'Teacher sign in',
  },
  {
    role: 'PERSONAL',
    title: 'Personal Attendance',
    desc: 'Track your own attendance privately — no college or classroom required.',
    icon: UserRoundCheck,
    cta: 'Open Personal Tracker',
    badge: 'Works solo',
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
    desc: 'Forward-looking engine tells you exactly how many classes to hit your goal.',
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
    title: 'Classrooms',
    desc: 'Teachers invite students with a code or link; attendance stays teacher-managed.',
  },
]

export function Landing() {
  const { openLogin } = useAuth()
  const { setTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b">
        <div className="mx-auto w-full max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border bg-card shadow-sm">
              <Image
                src="/Attendx-logo.png"
                alt="AttendX logo"
                width={36}
                height={36}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <span className="text-xl font-bold tracking-tight">AttendX</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setTheme(
                  document.documentElement.classList.contains('dark') ? 'light' : 'dark'
                )
              }
              aria-label="Toggle theme"
            >
              <Sun className="size-5 hidden dark:block" />
              <Moon className="size-5 block dark:hidden" />
            </Button>
            <Button size="sm" onClick={() => openLogin('STUDENT')}>
              Sign in
            </Button>
          </div>
        </div>
      </header>

      <section className="border-b bg-muted/35">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground mb-6">
            <CheckCircle2 className="size-3.5 text-primary" />
            For classrooms — and for tracking on your own
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl md:leading-[1.08]">
            Clear attendance, better decisions.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            AttendX is a clean, secure platform where teachers mark attendance and
            students track their progress in a classroom — or, if you&rsquo;d
            rather go it alone, the Personal Tracker lets you log your own
            attendance without joining any college or classroom.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={() => openLogin('STUDENT')}
              className="min-w-[200px] h-11 shadow-sm"
            >
              Continue as Student
            </Button>
            <Button
              variant="outline"
              onClick={() => openLogin('TEACHER')}
              className="min-w-[200px] h-11"
            >
              Teacher access
            </Button>
          </div>
          </div>
          <aside className="rounded-xl border bg-card p-6 shadow-sm md:p-7" aria-label="How AttendX works">
            <p className="text-sm font-semibold">One reliable workflow</p>
            <p className="mt-1 text-sm text-muted-foreground">Designed for the people who use attendance data every day.</p>
          <div className="mt-6 space-y-4 text-left">
            {[
              { n: '1', t: 'Sign in', d: 'As a student or teacher with email, password or Google.' },
              { n: '2', t: 'Mark & track', d: 'Teachers mark attendance; students see it instantly.' },
              { n: '3', t: 'Stay on target', d: 'Analytics flag low attendance before it is a problem.' },
            ].map((s) => (
              <div
                key={s.n}
                className="flex items-start gap-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-semibold">{s.t}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div></aside>
        </div>
      </section>

      {/* Role entry — three balanced, equally prominent paths */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Choose how you want to use AttendX
          </h2>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            Part of a college workflow, or tracking on your own — pick the path that fits.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {roleCards.map((c) => (
            <Card
              key={c.role}
              className="group relative flex flex-col p-6 transition-colors hover:border-primary/40 hover:bg-accent/40 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              role="button"
              tabIndex={0}
              onClick={() => openLogin(c.role)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openLogin(c.role)
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="size-5" />
                </div>
                {c.badge ? (
                  <span className="rounded-full border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                    {c.badge}
                  </span>
                ) : (
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed flex-1">
                {c.desc}
              </p>
              <p className="mt-4 text-sm font-semibold text-primary inline-flex items-center gap-1">
                {c.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Everything you need to track attendance
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              One platform with role-based workflows for students and teachers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <Card key={f.title} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <Card className="p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Sign in as a student or teacher, or start your own personal tracker.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={() => openLogin('STUDENT')} className="min-w-[180px]">
              Student sign in
            </Button>
            <Button variant="outline" onClick={() => openLogin('TEACHER')} className="min-w-[180px]">
              Teacher sign in
            </Button>
            <Button variant="outline" onClick={() => openLogin('PERSONAL')} className="min-w-[180px]">
              Personal Tracker
            </Button>
          </div>
        </Card>
      </section>

      <SiteFooter />
      {/* Legacy footer kept out of the render tree while landing-page styles migrate. */}
      {/* <footer className="mt-auto border-t bg-card/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              A
            </div>
            <span className="font-semibold">AttendX</span>
            <span className="text-sm text-muted-foreground">
              · Smart Attendance Management
            </span>
          </div>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </nav>
        </div>
        <div className="border-t bg-background/40">
          <p className="mx-auto w-full max-w-6xl px-4 py-3 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} AttendX. Built for classrooms — attendance
            you can trust.
          </p>
        </div>
      </footer> */}
    </div>
  )
}
