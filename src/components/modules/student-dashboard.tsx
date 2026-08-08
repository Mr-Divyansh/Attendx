'use client'

// AttendX — Student Dashboard (view-only, analytics-rich)
// SQL projections of teacher-marked records: overall %, today's status, subject-wise %,
// weekly report, monthly trend, at-risk subjects. No edit affordances.
import { useEffect, useState, useCallback } from 'react'
import {
  DashboardShell,
  StatCard,
  type NavItem,
} from '@/components/dashboard-shell'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/stores/auth-store'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  LayoutDashboard,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  TriangleAlert,
  RefreshCw,
  CheckCircle2,
  Users,
  KeyRound,
  School,
  Building2,
} from 'lucide-react'

// ── Types (mirrors API responses) ──────────────────────────────────────────
type StatsResp = {
  overallPct: number
  todayPresent: number
  todayTotal: number
  todayStatus: string
  subjectsTracked: number
  atRiskCount: number
  counts: { present: number; late: number; absent: number; attended: number; total: number }
  student: { name: string; rollNo: string; semesterName: string; sectionName: string }
}

type SubjectRow = {
  subjectId: string
  code: string
  name: string
  total: number
  present: number
  absent: number
  late: number
  attended: number
  pct: number
}

type SubjectsResp = { subjects: SubjectRow[] }

type WeekRow = {
  day: string
  date: string
  total: number
  attended: number
  pct: number
}

type WeeklyResp = { week: WeekRow[] }

type MonthRow = {
  week: string
  start: string
  end: string
  attended: number
  total: number
  pct: number
}

type MonthlyResp = { weeks: MonthRow[] }

type ClassroomRow = {
  id: string
  name: string
  subject?: { name: string } | null
  teacher?: { fullName: string } | null
  joinCode: string
  inviteToken: string
  status: string
}

type ClassroomsResp = { classrooms: ClassroomRow[] }

// ── Colors ─────────────────────────────────────────────────────────────────
const COLOR_GOOD = '#22c55e' // green  >= 75
const COLOR_WARN = '#f59e0b' // amber  60..74
const COLOR_RISK = '#ef4444' // red    < 60
const COLOR_PRIMARY = '#10b981'
const COLOR_LATE = '#f59e0b'
const COLOR_PRESENT = '#22c55e'
const COLOR_ABSENT = '#ef4444'

function colorForPct(pct: number): string {
  if (pct >= 75) return COLOR_GOOD
  if (pct >= 60) return COLOR_WARN
  return COLOR_RISK
}

function labelForPct(pct: number): { label: string; className: string } {
  if (pct >= 75)
    return {
      label: 'Good',
      className:
        'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    }
  if (pct >= 60)
    return {
      label: 'Warning',
      className:
        'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400',
    }
  return {
    label: 'At Risk',
    className:
      'border-transparent bg-red-500/15 text-red-600 dark:text-red-400',
  }
}

// ── Nav ────────────────────────────────────────────────────────────────────
const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'weekly', label: 'Weekly', icon: CalendarCheck },
  { id: 'monthly', label: 'Monthly', icon: GraduationCap },
]

// ── Component ──────────────────────────────────────────────────────────────
export function StudentDashboard() {
  const { user } = useAuth()
  const [active, setActive] = useState('overview')

  const [stats, setStats] = useState<StatsResp | null>(null)
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [weekly, setWeekly] = useState<WeekRow[]>([])
  const [monthly, setMonthly] = useState<MonthRow[]>([])
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, sub, w, m, c] = await Promise.all([
        apiFetch<StatsResp>('/api/student/stats'),
        apiFetch<SubjectsResp>('/api/student/subjects'),
        apiFetch<WeeklyResp>('/api/student/weekly'),
        apiFetch<MonthlyResp>('/api/student/monthly'),
        apiFetch<ClassroomsResp>('/api/student/classrooms'),
      ])
      setStats(s)
      setSubjects(sub.subjects ?? [])
      setWeekly(w.week ?? [])
      setMonthly(m.weeks ?? [])
      setClassrooms(c.classrooms ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const firstName = (user?.name || stats?.student.name || 'Student')
    .split(' ')[0]
    .toUpperCase()

  const atRiskSubjects = subjects.filter((s) => s.pct < 75)

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoining(true)
    try {
      await apiFetch('/api/classrooms/join', {
        method: 'POST',
        body: JSON.stringify({ joinCode }),
      })
      setJoinCode('')
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Unable to join classroom')
    } finally {
      setJoining(false)
    }
  }

  const scrollToId = (id: string) => {
    setActive(id)
    if (typeof document !== 'undefined') {
      const el = document.getElementById(`section-${id}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <DashboardShell
      nav={NAV}
      active={active}
      onNavigate={scrollToId}
      title="My Attendance"
      accent="Student"
    >
      <div className="space-y-6">
        {/* Error banner */}
        {error && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>Couldn&apos;t load your dashboard</AlertTitle>
            <AlertDescription>
              {error}.{' '}
              <button
                onClick={load}
                className="underline font-medium hover:opacity-80"
              >
                Try again
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Welcome banner */}
        <WelcomeBanner
          firstName={firstName}
          student={stats?.student}
          loading={loading}
        />

        {/* At-risk alert */}
        {!loading && stats && stats.atRiskCount > 0 && (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <TriangleAlert className="text-amber-600 dark:text-amber-400" />
            <AlertTitle>Attendance below 75% in {stats.atRiskCount}{' '}
              {stats.atRiskCount === 1 ? 'subject' : 'subjects'}</AlertTitle>
            <AlertDescription className="text-amber-700/90 dark:text-amber-300/90">
              You may be at risk of attendance shortage. Please check the
              subject breakdown below and reach out to your faculty.
            </AlertDescription>
          </Alert>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : stats ? (
            <>
              <StatCard
                label="Overall Attendance"
                value={`${stats.overallPct}%`}
                icon={GraduationCap}
                tone="primary"
              />
              <StatCard
                label="Today's Status"
                value={stats.todayStatus}
                icon={CalendarCheck}
                tone="chart-2"
              />
              <StatCard
                label="Subjects Tracked"
                value={stats.subjectsTracked}
                icon={BookOpen}
                tone="chart-3"
              />
              <StatCard
                label="At-Risk Subjects"
                value={stats.atRiskCount}
                icon={TriangleAlert}
                tone={stats.atRiskCount > 0 ? 'chart-4' : 'primary'}
              />
            </>
          ) : null}
        </div>

        <section id="section-classrooms" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>Classrooms</CardTitle>
              <CardDescription>Join a classroom with a join code and view your teacher-managed attendance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleJoinClassroom} className="flex flex-col gap-3 sm:flex-row">
                <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Enter join code" className="max-w-sm" />
                <Button type="submit" disabled={joining}>{joining ? 'Joining…' : 'Join Classroom'}</Button>
              </form>
              {classrooms.length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">You have not joined any classroom yet.</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {classrooms.map((c) => (
                    <div key={c.id} className="rounded-lg border bg-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-sm text-muted-foreground">{c.subject?.name || 'Subject pending'}</p>
                        </div>
                        <Badge variant="secondary">{c.status}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{c.teacher?.fullName || 'Teacher pending'}</span>
                        <span className="inline-flex items-center gap-1"><KeyRound className="size-3.5" />{c.joinCode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Subject-wise bar chart */}
        <section id="section-subjects" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>Subject-wise Attendance</CardTitle>
              <CardDescription>
                Your attendance percentage across every tracked subject. Bars
                are colored by status:{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">green ≥ 75%</span>,{' '}
                <span className="text-amber-600 dark:text-amber-400 font-medium">amber 60–74%</span>,{' '}
                <span className="text-red-600 dark:text-red-400 font-medium">red &lt; 60%</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full rounded-lg" />
              ) : subjects.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No subjects yet"
                  description="Your teachers haven't marked any attendance for you. Check back after your next class."
                />
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subjects}
                      margin={{ top: 8, right: 16, left: -8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        opacity={0.4}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="code"
                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                        content={({ active: a, payload }) => {
                          if (!a || !payload?.length) return null
                          const row = payload[0].payload as SubjectRow
                          return (
                            <div className="rounded-lg border bg-card px-3 py-2 shadow-md text-xs">
                              <div className="font-semibold text-sm mb-1">
                                {row.name}{' '}
                                <span className="text-muted-foreground font-normal">
                                  ({row.code})
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                <span className="text-muted-foreground">Present</span>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">
                                  {row.present}
                                </span>
                                <span className="text-muted-foreground">Late</span>
                                <span className="font-medium text-amber-600 dark:text-amber-400 text-right">
                                  {row.late}
                                </span>
                                <span className="text-muted-foreground">Absent</span>
                                <span className="font-medium text-red-600 dark:text-red-400 text-right">
                                  {row.absent}
                                </span>
                                <span className="text-muted-foreground">Attendance</span>
                                <span className="font-semibold text-right">
                                  {row.pct}%
                                </span>
                              </div>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={64}>
                        {subjects.map((s) => (
                          <Cell key={s.subjectId} fill={colorForPct(s.pct)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Weekly + Monthly (two-column on lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly */}
          <section id="section-weekly" className="scroll-mt-24">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Weekly Report</CardTitle>
                <CardDescription>
                  Mon–Sun attendance for the current week. Stacked bars show
                  present, late, and absent counts per day.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full rounded-lg" />
                ) : weekly.length === 0 ? (
                  <EmptyState
                    icon={CalendarCheck}
                    title="No records this week"
                    description="There are no attendance records for the current week yet."
                  />
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weekly}
                        margin={{ top: 8, right: 8, left: -16, bottom: 8 }}
                        stackOffset="sign"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          opacity={0.4}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                          content={({ active: a, payload, label }) => {
                            if (!a || !payload?.length) return null
                            const row = payload[0].payload as WeekRow
                            return (
                              <div className="rounded-lg border bg-card px-3 py-2 shadow-md text-xs">
                                <div className="font-semibold text-sm mb-1">
                                  {label}{' '}
                                  <span className="text-muted-foreground font-normal">
                                    ({row.date})
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                  <span className="text-muted-foreground">Attended</span>
                                  <span className="font-medium text-right">
                                    {row.attended} / {row.total}
                                  </span>
                                  <span className="text-muted-foreground">Pct</span>
                                  <span className="font-semibold text-right">
                                    {row.pct}%
                                  </span>
                                </div>
                              </div>
                            )
                          }}
                        />
                        <Bar
                          dataKey="attended"
                          stackId="a"
                          name="Attended"
                          fill={COLOR_PRESENT}
                          radius={[0, 0, 0, 0]}
                          maxBarSize={48}
                        />
                        <Bar
                          dataKey="total"
                          stackId="b"
                          name="Total periods"
                          fill={COLOR_ABSENT}
                          fillOpacity={0.18}
                          maxBarSize={48}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Monthly */}
          <section id="section-monthly" className="scroll-mt-24">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Monthly Trend</CardTitle>
                <CardDescription>
                  Attendance percentage across the last 4 weeks (W1 = oldest, W4
                  = current). A steady line above 75% keeps you in safe range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full rounded-lg" />
                ) : monthly.length === 0 ? (
                  <EmptyState
                    icon={GraduationCap}
                    title="Not enough data"
                    description="At least one week of attendance is required to plot a monthly trend."
                  />
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthly}
                        margin={{ top: 8, right: 16, left: -16, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          opacity={0.4}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                          tickLine={false}
                          axisLine={false}
                          unit="%"
                        />
                        <Tooltip
                          cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                          content={({ active: a, payload, label }) => {
                            if (!a || !payload?.length) return null
                            const row = payload[0].payload as MonthRow
                            return (
                              <div className="rounded-lg border bg-card px-3 py-2 shadow-md text-xs">
                                <div className="font-semibold text-sm mb-1">
                                  {label}
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                  <span className="text-muted-foreground">Range</span>
                                  <span className="font-medium text-right">
                                    {row.start} → {row.end}
                                  </span>
                                  <span className="text-muted-foreground">Attended</span>
                                  <span className="font-medium text-right">
                                    {row.attended} / {row.total}
                                  </span>
                                  <span className="text-muted-foreground">Pct</span>
                                  <span className="font-semibold text-right">
                                    {row.pct}%
                                  </span>
                                </div>
                              </div>
                            )
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="pct"
                          stroke={COLOR_PRIMARY}
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: COLOR_PRIMARY, strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                          name="Attendance %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Subject breakdown table */}
        <section id="section-overview" className="scroll-mt-24">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Subject Breakdown</CardTitle>
                <CardDescription>
                  Detailed per-subject attendance with status badges. Sorted by
                  attendance % (lowest first).
                </CardDescription>
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-md" />
                  ))}
                </div>
              ) : subjects.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Nothing to show yet"
                  description="Your subject-wise attendance will appear here once your teachers mark attendance."
                />
              ) : (
                <div className="max-h-96 overflow-y-auto scroll-thin rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="pl-4">Code</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-right pr-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((s) => {
                        const st = labelForPct(s.pct)
                        return (
                          <TableRow key={s.subjectId}>
                            <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                              {s.code}
                            </TableCell>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell className="text-center">
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {s.present}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-amber-600 dark:text-amber-400">
                                {s.late}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-red-600 dark:text-red-400">
                                {s.absent}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {s.total}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {s.pct}%
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Badge className={st.className}>{st.label}</Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Summary footer card */}
        {!loading && stats && subjects.length > 0 && (
          <Card className="bg-gradient-to-br from-primary/5 via-card to-card">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                  {stats.overallPct >= 75 ? (
                    <CheckCircle2 className="size-6" />
                  ) : (
                    <TriangleAlert className="size-6" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    {stats.overallPct >= 75
                      ? 'You are on track!'
                      : 'You are below the 75% threshold.'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {stats.counts.attended} attended out of{' '}
                    {stats.counts.total} total periods ·{' '}
                    {atRiskSubjects.length} of {subjects.length} subjects below
                    75%.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold tracking-tight">
                    {stats.overallPct}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Overall attendance
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}

// ── Welcome banner ─────────────────────────────────────────────────────────
function WelcomeBanner({
  firstName,
  student,
  loading,
}: {
  firstName: string
  student?: StatsResp['student']
  loading: boolean
}) {
  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
      <div
        className="absolute inset-0 bg-mesh opacity-40 pointer-events-none"
        aria-hidden
      />
      <CardContent className="relative pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Welcome back
            </p>
            {loading ? (
              <Skeleton className="h-9 w-56 mt-2" />
            ) : (
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
                WELCOME,{' '}
                <span className="text-gradient">{firstName}</span>
              </h2>
            )}
            <p className="text-sm text-muted-foreground mt-1.5">
              Here&apos;s your official attendance summary, projected from
              teacher-marked records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {loading ? (
              <>
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </>
            ) : student ? (
              <>
                <Badge
                  variant="secondary"
                  className="gap-1.5 py-1 px-3"
                >
                  <GraduationCap className="size-3.5" />
                  {student.semesterName}
                </Badge>
                <Badge
                  variant="secondary"
                  className="gap-1.5 py-1 px-3"
                >
                  Section {student.sectionName}
                </Badge>
                <Badge
                  variant="secondary"
                  className="gap-1.5 py-1 px-3"
                >
                  Roll {student.rollNo}
                </Badge>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="size-12 rounded-full bg-muted grid place-items-center text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <p className="mt-3 font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {description}
      </p>
    </div>
  )
}
