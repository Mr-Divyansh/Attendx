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
} from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'

const roleCards: {
  role: Role
  title: string
  desc: string
  icon: React.ElementType
  cta: string
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

      {/* Hero */}
      <section className="relative border-b bg-muted/40 overflow-hidden">
        {/* Decorative glow + blueprint grid (purely visual) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hero-glow" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hero-grid" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6 shadow-sm">
            <CheckCircle2 className="size-3.5 text-primary" />
            Student attendance, managed properly
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto leading-[1.08]">
            Smart attendance for{' '}
            <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-5 bg-clip-text text-transparent">
              students &amp; teachers
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            AttendX is a clean, secure platform where teachers mark attendance and
            students track their progress — with clear analytics and classroom
            management in one place.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
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
          {/* How it works (factual) */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            {[
              { n: '1', t: 'Sign in', d: 'As a student or teacher with email, password or Google.' },
              { n: '2', t: 'Mark & track', d: 'Teachers mark attendance; students see it instantly.' },
              { n: '3', t: 'Stay on target', d: 'Analytics flag low attendance before it is a problem.' },
            ].map((s) => (
              <div
                key={s.n}
                className="flex items-start gap-3 rounded-xl border bg-card/70 px-4 py-3.5"
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
          </div>
        </div>
      </section>

      {/* Role entry */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {roleCards.map((c) => (
            <Card
              key={c.role}
              className="group p-6 transition-colors hover:border-primary/40 hover:bg-accent/40 cursor-pointer"
              onClick={() => openLogin(c.role)}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="size-5" />
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {c.desc}
              </p>
              <p className="mt-4 text-sm font-semibold text-primary">
                {c.cta} →
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
            Sign in as a student or teacher to begin.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={() => openLogin('STUDENT')} className="min-w-[180px]">
              Student sign in
            </Button>
            <Button variant="outline" onClick={() => openLogin('TEACHER')} className="min-w-[180px]">
              Teacher sign in
            </Button>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card/50">
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
            <span className="cursor-pointer hover:text-foreground transition-colors">
              About
            </span>
            <span className="cursor-pointer hover:text-foreground transition-colors">
              Contact
            </span>
            <span className="cursor-pointer hover:text-foreground transition-colors">
              Privacy Policy
            </span>
          </nav>
        </div>
        <div className="border-t bg-background/40">
          <p className="mx-auto w-full max-w-6xl px-4 py-3 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} AttendX. Built for classrooms — attendance
            you can trust.
          </p>
        </div>
      </footer>
    </div>
  )
}
