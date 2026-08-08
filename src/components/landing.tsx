'use client'

import { useAuth, type Role } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  GraduationCap,
  Users,
  UserCog,
  BarChart3,
  CalendarDays,
  ShieldCheck,
  Moon,
  Sun,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'

const roleCards: {
  role: Role
  title: string
  desc: string
  icon: React.ElementType
  accent: string
}[] = [
  {
    role: 'STUDENT',
    title: 'Student Login',
    desc: 'View your official attendance & analytics',
    icon: GraduationCap,
    accent: 'text-chart-1',
  },
  {
    role: 'TEACHER',
    title: 'Teacher Login',
    desc: 'Mark attendance with a guided 6-step flow',
    icon: Users,
    accent: 'text-chart-2',
  },
  {
    role: 'ADMIN',
    title: 'Admin Login',
    desc: 'Full institutional control cockpit',
    icon: UserCog,
    accent: 'text-chart-3',
  },
  {
    role: 'PERSONAL',
    title: 'Personal Tracker',
    desc: 'Independent tracker — no college required',
    icon: Target,
    accent: 'text-chart-4',
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
    desc: 'bcrypt hashing, prepared statements, role-based auth, and CSRF protection.',
  },
  {
    icon: Clock,
    title: 'Audit Trail',
    desc: 'Every attendance record carries marked-by and marked-at audit metadata.',
  },
  {
    icon: Sparkles,
    title: 'Dual-Mode',
    desc: 'College Management System + independent Personal Tracker in one platform.',
  },
]

export function Landing() {
  const { openLogin } = useAuth()
  const { setTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border bg-card/80 shadow-sm">
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
              onClick={() => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <Sun className="size-5 hidden dark:block" />
              <Moon className="size-5 block dark:hidden" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLogin('PERSONAL')}
              className="hidden sm:inline-flex"
            >
              Personal Mode
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-mesh">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
            <CheckCircle2 className="size-3.5 text-primary" />
            PHP 8 · MySQL · Bootstrap 5 · Chart.js
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto">
            Smart Attendance Management for{' '}
            <span className="text-gradient">Students & Colleges</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            A modular, dual-mode attendance platform combining a College
            Management System with an independent Personal Attendance Tracker.
          </p>

          {/* Role entry cards */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {roleCards.map((c) => (
              <button
                key={c.role}
                onClick={() => openLogin(c.role)}
                className="group text-left"
              >
                <Card className="h-full p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 hover:border-primary/50 cursor-pointer">
                  <div
                    className={`size-11 rounded-lg bg-primary/10 grid place-items-center mb-4 ${c.accent}`}
                  >
                    <c.icon className="size-6" />
                  </div>
                  <h3 className="font-semibold text-base">{c.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
                  <div className="mt-4 text-sm font-medium text-primary group-hover:gap-2 inline-flex items-center gap-1 transition-all">
                    Enter →
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Everything you need to track attendance
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            One platform, two independent systems — sharing a design language
            but running on isolated data models.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <Card key={f.title} className="p-6 hover:shadow-md transition-shadow">
              <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Dual-mode banner */}
      <section className="container mx-auto px-4 pb-16 md:pb-20">
        <div className="grid md:grid-cols-2 gap-5">
          <Card className="p-8 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 text-primary font-semibold mb-2">
              <UserCog className="size-5" /> College Mode
            </div>
            <h3 className="text-2xl font-bold mb-2">Admin · Teacher · Student</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Centralized, role-based attendance engine. Admins manage the
              institution, teachers mark attendance, students view it. Every
              route is middleware-protected and role-checked.
            </p>
          </Card>
          <Card className="p-8 bg-chart-4/5 border-chart-4/20">
            <div className="flex items-center gap-2 text-chart-4 font-semibold mb-2">
              <Target className="size-5" /> Personal Mode
            </div>
            <h3 className="text-2xl font-bold mb-2">Self-contained Tracker</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Any student self-registers with no institutional code or admin
              approval. Build your own timetable, attendance, and analytics —
              fully isolated data plane.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer (sticky to bottom via mt-auto) */}
      <footer className="mt-auto border-t bg-card/50">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-sm">
              A
            </div>
            <span className="font-semibold">AttendX</span>
            <span className="text-sm text-muted-foreground">
              · Smart Attendance Management
            </span>
          </div>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <button type="button" className="hover:text-foreground transition-colors cursor-pointer">
              About
            </button>
            <button type="button" className="hover:text-foreground transition-colors cursor-pointer">
              Contact
            </button>
            <button type="button" className="hover:text-foreground transition-colors cursor-pointer">
              Privacy Policy
            </button>
          </nav>
        </div>
      </footer>
    </div>
  )
}
