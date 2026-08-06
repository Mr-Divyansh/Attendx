'use client'

// ───────────────────────────────────────────────────────────
// AttendX — Personal module dashboard
// Independent personal attendance tracker (isolated data plane).
// Sections: Dashboard · Timetable · History · Settings
// ───────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  CalendarDays,
  History as HistoryIcon,
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  CalendarRange,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Bell,
  BookOpen,
  Clock,
  DoorOpen,
  User as UserIcon,
  KeyRound,
  Loader2,
  Save,
  Lightbulb,
} from 'lucide-react'

import { apiFetch } from '@/lib/api'
import { useAuth } from '@/stores/auth-store'
import {
  DashboardShell,
  StatCard,
  type NavItem,
} from '@/components/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Cell,
} from 'recharts'

// ── Types ──
type Stats = {
  overallPct: number
  present: number
  absent: number
  total: number
  goalPct: number
  darkMode: boolean
  todayMarked: number
  todayTotal: number
}

type TimetableEntry = {
  id: string
  day: string
  period: number
  startTime: string
  endTime: string
  subjectName: string
  room: string | null
  teacher: string | null
}

type AttendanceEntry = {
  id: string
  period: number
  status: 'present' | 'absent'
  subjectName: string
  date?: string
}

type Predictor = {
  currentPct: number
  targetPct: number
  present: number
  absent: number
  total: number
  classesToAttend: number
  missProjection: { next: number; resultingPct: number }
  attendProjection: { next: number; resultingPct: number }
}

type Weekly = { day: string; total: number; attended: number; pct: number }[]
type Monthly = { week: string; pct: number; total: number; attended: number }[]

type NotificationItem = {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
}

type Settings = {
  darkMode: boolean
  language: string
  goalPct: number
  avatarUrl: string | null
}

// ── Constants ──
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GOAL_OPTIONS = [75, 80, 85, 90]
const PRESENT_COLOR = '#22c55e'
const ABSENT_COLOR = '#ef4444'

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10)
}
function todayDayName(): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
}

// ═══════════════════════════════════════════════════════════
// Root component
// ═══════════════════════════════════════════════════════════
export function PersonalDashboard() {
  const [active, setActive] = useState('dashboard')
  const { setTheme } = useTheme()
  const { user } = useAuth()
  const themeApplied = useRef(false)

  // Apply dark mode once on first load based on settings
  useEffect(() => {
    if (themeApplied.current) return
    if (typeof user?.darkMode === 'boolean') {
      setTheme(user.darkMode ? 'dark' : 'light')
      themeApplied.current = true
    }
  }, [user?.darkMode, setTheme])

  const nav: NavItem[] = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'timetable', label: 'Timetable', icon: CalendarDays },
      { id: 'history', label: 'History', icon: HistoryIcon },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ],
    []
  )

  const titleMap: Record<string, string> = {
    dashboard: 'Personal Dashboard',
    timetable: 'Timetable Manager',
    history: 'Attendance History',
    settings: 'Settings',
  }

  return (
    <DashboardShell
      nav={nav}
      active={active}
      onNavigate={setActive}
      title={titleMap[active] || 'Personal'}
      accent="Personal"
    >
      {active === 'dashboard' && <DashboardView onGoToTimetable={() => setActive('timetable')} />}
      {active === 'timetable' && <TimetableView />}
      {active === 'history' && <HistoryView />}
      {active === 'settings' && <SettingsView />}
    </DashboardShell>
  )
}

// ═══════════════════════════════════════════════════════════
// Dashboard view
// ═══════════════════════════════════════════════════════════
function DashboardView({ onGoToTimetable }: { onGoToTimetable: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [predictor, setPredictor] = useState<Predictor | null>(null)
  const [weekly, setWeekly] = useState<Weekly>([])
  const [monthly, setMonthly] = useState<Monthly>([])
  const [todaySlots, setTodaySlots] = useState<TimetableEntry[]>([])
  const [todayAttendance, setTodayAttendance] = useState<AttendanceEntry[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingToday, setSavingToday] = useState(false)
  const { user, refresh } = useAuth()
  const { setTheme } = useTheme()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = todayDateStr()
      const [s, p, w, m, tt, ta, n] = await Promise.all([
        apiFetch<Stats>('/api/personal/stats'),
        apiFetch<Predictor>('/api/personal/predictor'),
        apiFetch<Weekly>('/api/personal/weekly'),
        apiFetch<Monthly>('/api/personal/monthly'),
        apiFetch<TimetableEntry[]>('/api/personal/timetable'),
        apiFetch<AttendanceEntry[]>(`/api/personal/attendance?date=${today}`),
        apiFetch<NotificationItem[]>('/api/personal/notifications'),
      ])
      setStats(s)
      setPredictor(p)
      setWeekly(w)
      setMonthly(m)
      const todayName = todayDayName()
      setTodaySlots(tt.filter((t) => t.day === todayName).sort((a, b) => a.period - b.period))
      setTodayAttendance(ta)
      setNotifications(n)
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Build per-period status map for today
  const todayStatusMap = useMemo(() => {
    const m = new Map<number, 'present' | 'absent' | undefined>()
    for (const a of todayAttendance) m.set(a.period, a.status)
    return m
  }, [todayAttendance])

  const [draftStatus, setDraftStatus] = useState<Record<number, 'present' | 'absent'>>({})
  useEffect(() => {
    const d: Record<number, 'present' | 'absent'> = {}
    for (const slot of todaySlots) {
      const existing = todayStatusMap.get(slot.period)
      if (existing) d[slot.period] = existing
    }
    setDraftStatus(d)
  }, [todaySlots, todayStatusMap])

  const handleSaveToday = async () => {
    if (todaySlots.length === 0) {
      toast.error('No timetable for today. Add one in the Timetable tab.')
      return
    }
    setSavingToday(true)
    try {
      const entries = todaySlots.map((s) => ({
        period: s.period,
        status: draftStatus[s.period] || 'absent',
        subjectName: s.subjectName,
      }))
      await apiFetch('/api/personal/attendance', {
        method: 'POST',
        body: JSON.stringify({ date: todayDateStr(), entries }),
      })
      toast.success('Today’s attendance saved')
      await load()
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save')
    } finally {
      setSavingToday(false)
    }
  }

  const handleGoalChange = async (goal: number) => {
    if (!stats) return
    setStats({ ...stats, goalPct: goal })
    try {
      await apiFetch('/api/personal/settings', {
        method: 'PUT',
        body: JSON.stringify({ goalPct: goal }),
      })
      // refresh predictor (target changed) and user store
      const p = await apiFetch<Predictor>('/api/personal/predictor')
      setPredictor(p)
      await refresh()
      toast.success(`Goal set to ${goal}%`)
    } catch (e) {
      toast.error((e as Error).message || 'Failed to update goal')
    }
  }

  const handleMarkNotificationsRead = async () => {
    try {
      await apiFetch('/api/personal/notifications?markRead=1')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      // silent
    }
  }

  if (loading || !stats || !predictor) return <DashboardSkeleton />

  const goalMet = stats.overallPct >= stats.goalPct

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Overall %" value={`${stats.overallPct}%`} icon={TrendingUp} tone="primary" />
        <StatCard label="Present" value={stats.present} icon={CheckCircle2} tone="chart-2" />
        <StatCard label="Absent" value={stats.absent} icon={XCircle} tone="chart-4" />
        <StatCard label="Total Classes" value={stats.total} icon={CalendarRange} tone="chart-3" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goal progress ring */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4" />
              Attendance Goal
            </CardTitle>
            <CardDescription>Track your progress toward your target.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="70%"
                  outerRadius="100%"
                  data={[{ name: 'progress', value: stats.overallPct, fill: goalMet ? PRESENT_COLOR : 'var(--chart-1)' }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={12} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.overallPct}%</div>
                  <div className="text-xs text-muted-foreground">of {stats.goalPct}% goal</div>
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 justify-center">
              {GOAL_OPTIONS.map((g) => (
                <Button
                  key={g}
                  size="sm"
                  variant={stats.goalPct === g ? 'default' : 'outline'}
                  onClick={() => handleGoalChange(g)}
                  className="min-w-[3.5rem]"
                >
                  {g}%
                </Button>
              ))}
            </div>
            <Badge variant={goalMet ? 'default' : 'destructive'} className="mt-3">
              {goalMet ? 'On track' : `${stats.goalPct - stats.overallPct}% below goal`}
            </Badge>
          </CardContent>
        </Card>

        {/* Predictor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-4" />
              Attendance Predictor
            </CardTitle>
            <CardDescription>
              Smart projections based on your current rate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-2xl font-bold">{predictor.currentPct}%</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-2xl font-bold">{predictor.targetPct}%</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-start gap-3">
              <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <Target className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Classes needed to reach target</p>
                <p className="text-2xl font-bold">
                  {predictor.classesToAttend === -1
                    ? '∞ (target 100% unreachable)'
                    : predictor.classesToAttend === 0
                    ? '0 — goal already met!'
                    : `${predictor.classesToAttend} more`}
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 flex items-center gap-3">
                <div className="size-9 rounded-lg" style={{ background: `${ABSENT_COLOR}1a`, color: ABSENT_COLOR }}>
                  <TrendingDown className="size-5 m-2" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    If you miss next {predictor.missProjection.next}
                  </p>
                  <p className="text-lg font-bold" style={{ color: ABSENT_COLOR }}>
                    {predictor.missProjection.resultingPct}%
                  </p>
                </div>
              </div>
              <div className="rounded-lg border p-3 flex items-center gap-3">
                <div className="size-9 rounded-lg" style={{ background: `${PRESENT_COLOR}1a`, color: PRESENT_COLOR }}>
                  <TrendingUp className="size-5 m-2" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    If you attend next {predictor.attendProjection.next}
                  </p>
                  <p className="text-lg font-bold" style={{ color: PRESENT_COLOR }}>
                    {predictor.attendProjection.resultingPct}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4" />
              Weekly Attendance
            </CardTitle>
            <CardDescription>Mon–Sun for the current week.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number, n: string) => (n === 'pct' ? [`${v}%`, 'Attendance'] : [v, n])}
                  />
                  <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {weekly.map((d, i) => (
                      <Cell key={i} fill={d.pct >= stats.goalPct ? PRESENT_COLOR : ABSENT_COLOR} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" />
              Monthly Trend
            </CardTitle>
            <CardDescription>Last 4 weeks (W1 → W4).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}%`, 'Attendance']}
                  />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke="var(--chart-1)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'var(--chart-1)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's attendance */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                Today’s Attendance
              </CardTitle>
              <CardDescription>
                {todaySlots.length > 0
                  ? `${todayDayName()} · ${todayDateStr()} — ${stats.todayMarked}/${stats.todayTotal} marked`
                  : 'No classes scheduled for today.'}
              </CardDescription>
            </div>
            {todaySlots.length === 0 && (
              <Button variant="outline" size="sm" onClick={onGoToTimetable}>
                <Plus className="size-4 mr-1" /> Add Timetable
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {todaySlots.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Nothing scheduled today"
                desc="Build your weekly timetable once and we’ll load the right periods automatically."
                actionLabel="Open Timetable"
                onAction={onGoToTimetable}
              />
            ) : (
              <>
                <div className="max-h-80 overflow-y-auto scroll-thin space-y-2 pr-1">
                  {todaySlots.map((slot) => {
                    const status = draftStatus[slot.period]
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                          <BookOpen className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{slot.subjectName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              {slot.startTime}–{slot.endTime}
                            </span>
                            {slot.room && (
                              <span className="inline-flex items-center gap-1">
                                <DoorOpen className="size-3" />
                                {slot.room}
                              </span>
                            )}
                            {slot.teacher && <span>· {slot.teacher}</span>}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant={status === 'present' ? 'default' : 'outline'}
                            className="data-[on=true]:bg-[#22c55e] data-[on=true]:text-white"
                            style={
                              status === 'present'
                                ? { background: PRESENT_COLOR, color: 'white' }
                                : undefined
                            }
                            onClick={() =>
                              setDraftStatus((d) => ({ ...d, [slot.period]: 'present' }))
                            }
                          >
                            <CheckCircle2 className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={status === 'absent' ? 'default' : 'outline'}
                            style={
                              status === 'absent'
                                ? { background: ABSENT_COLOR, color: 'white' }
                                : undefined
                            }
                            onClick={() =>
                              setDraftStatus((d) => ({ ...d, [slot.period]: 'absent' }))
                            }
                          >
                            <XCircle className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveToday} disabled={savingToday}>
                    {savingToday ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="size-4 mr-2" />
                    )}
                    Save Today’s Attendance
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4" />
              Notifications
            </CardTitle>
            {notifications.some((n) => !n.isRead) && (
              <Button variant="ghost" size="sm" onClick={handleMarkNotificationsRead}>
                Mark read
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No notifications"
                desc="You’re all caught up."
              />
            ) : (
              <div className="max-h-96 overflow-y-auto scroll-thin space-y-2 pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg border p-3 text-sm ${
                      n.isRead ? 'opacity-70' : 'border-primary/30 bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`size-2 rounded-full mt-1.5 shrink-0 ${
                          n.type === 'below_target' || n.type === 'warning'
                            ? 'bg-red-500'
                            : 'bg-primary'
                        }`}
                      />
                      <div className="flex-1">
                        <p>{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Timetable view
// ═══════════════════════════════════════════════════════════
function TimetableView() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<TimetableEntry | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<TimetableEntry[]>('/api/personal/timetable')
      setEntries(data)
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(() => {
    const m = new Map<string, TimetableEntry[]>()
    for (const d of DAYS) m.set(d, [])
    for (const e of entries) {
      if (!m.has(e.day)) m.set(e.day, [])
      m.get(e.day)!.push(e)
    }
    for (const d of DAYS) m.get(d)!.sort((a, b) => a.period - b.period)
    return m
  }, [entries])

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/personal/timetable/${id}`, { method: 'DELETE' })
      toast.success('Period removed')
      await load()
    } catch (e) {
      toast.error((e as Error).message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Weekly Timetable</h2>
          <p className="text-sm text-muted-foreground">
            Build your 7-day schedule once. We use it for daily attendance.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-1" />
              Add Period
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add timetable period</DialogTitle>
              <DialogDescription>
                Add one class to any day. Periods can be any positive integer.
              </DialogDescription>
            </DialogHeader>
            <TimetableForm
              onDone={() => {
                setAddOpen(false)
                load()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Your timetable is empty"
          desc="Add your subjects, times, and rooms to start tracking attendance."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DAYS.map((day) => {
            const list = grouped.get(day) || []
            return (
              <Card key={day}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    {day}
                    <Badge variant="secondary">{list.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No classes
                    </p>
                  ) : (
                    list.map((e) => (
                      <div
                        key={e.id}
                        className="rounded-lg border p-2.5 text-sm hover:bg-accent/40 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              <span className="text-muted-foreground">P{e.period}.</span>{' '}
                              {e.subjectName}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-3" />
                                {e.startTime}–{e.endTime}
                              </span>
                              {e.room && <span>· {e.room}</span>}
                              {e.teacher && <span>· {e.teacher}</span>}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Dialog
                              open={editing?.id === e.id}
                              onOpenChange={(o) => setEditing(o ? e : null)}
                            >
                              <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="size-7">
                                  <Pencil className="size-3.5" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit period</DialogTitle>
                                  <DialogDescription>
                                    Update the details for this class.
                                  </DialogDescription>
                                </DialogHeader>
                                <TimetableForm
                                  entry={e}
                                  onDone={() => {
                                    setEditing(null)
                                    load()
                                  }}
                                />
                              </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this period?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    “{e.subjectName}” on {e.day} P{e.period} will be removed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(e.id)}
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TimetableForm({
  entry,
  onDone,
}: {
  entry?: TimetableEntry
  onDone: () => void
}) {
  const [day, setDay] = useState(entry?.day || 'Mon')
  const [period, setPeriod] = useState(entry?.period?.toString() || '1')
  const [startTime, setStartTime] = useState(entry?.startTime || '09:00')
  const [endTime, setEndTime] = useState(entry?.endTime || '10:00')
  const [subjectName, setSubjectName] = useState(entry?.subjectName || '')
  const [room, setRoom] = useState(entry?.room || '')
  const [teacher, setTeacher] = useState(entry?.teacher || '')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!subjectName.trim()) {
      toast.error('Subject name is required')
      return
    }
    setSaving(true)
    try {
      const body = {
        day,
        period: parseInt(period, 10),
        startTime,
        endTime,
        subjectName: subjectName.trim(),
        room: room.trim() || null,
        teacher: teacher.trim() || null,
      }
      if (entry) {
        await apiFetch(`/api/personal/timetable/${entry.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
        toast.success('Period updated')
      } else {
        await apiFetch('/api/personal/timetable', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        toast.success('Period added')
      }
      onDone()
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Day</Label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Period</Label>
          <Input
            type="number"
            min={1}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Subject name</Label>
        <Input
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="e.g. Programming in C"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Start time</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>End time</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Room (optional)</Label>
          <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room 201" />
        </div>
        <div className="space-y-1.5">
          <Label>Teacher (optional)</Label>
          <Input
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            placeholder="Prof. Rao"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={saving}>
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          {entry ? 'Save changes' : 'Add period'}
        </Button>
      </DialogFooter>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// History view
// ═══════════════════════════════════════════════════════════
function HistoryView() {
  const [date, setDate] = useState(todayDateStr())
  const [entries, setEntries] = useState<AttendanceEntry[]>([])
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Record<number, 'present' | 'absent'>>({})

  const load = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const [att, tt] = await Promise.all([
        apiFetch<AttendanceEntry[]>(`/api/personal/attendance?date=${d}`),
        apiFetch<TimetableEntry[]>('/api/personal/timetable'),
      ])
      setEntries(att)
      setTimetable(tt)
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
        new Date(d + 'T00:00:00').getDay()
      ]
      const slots = tt.filter((t) => t.day === dayName).sort((a, b) => a.period - b.period)
      const init: Record<number, 'present' | 'absent'> = {}
      for (const s of slots) {
        const found = att.find((a) => a.period === s.period)
        if (found) init[s.period] = found.status
      }
      setDraft(init)
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(date)
  }, [date, load])

  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    new Date(date + 'T00:00:00').getDay()
  ]
  const daySlots = timetable
    .filter((t) => t.day === dayName)
    .sort((a, b) => a.period - b.period)

  const handleSave = async () => {
    if (daySlots.length === 0) {
      toast.error('No timetable for this day')
      return
    }
    setSaving(true)
    try {
      const payload = daySlots.map((s) => ({
        period: s.period,
        status: draft[s.period] || 'absent',
        subjectName: s.subjectName,
      }))
      await apiFetch('/api/personal/attendance', {
        method: 'POST',
        body: JSON.stringify({ date, entries: payload }),
      })
      toast.success('Attendance saved')
      await load(date)
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    try {
      await apiFetch(`/api/personal/attendance/${id}`, { method: 'DELETE' })
      toast.success('Entry deleted')
      await load(date)
    } catch (e) {
      toast.error((e as Error).message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="size-4" />
            Browse & edit past attendance
          </CardTitle>
          <CardDescription>
            Pick any date to view, edit, or delete that day’s records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                max={todayDateStr()}
                onChange={(e) => setDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setDate(todayDateStr())}>
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {dayName} · {date}
          </CardTitle>
          <CardDescription>
            {daySlots.length > 0
              ? `${daySlots.length} scheduled period(s)`
              : 'No timetable for this day.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : daySlots.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No classes on this day"
              desc="Add timetable periods for this day to start tracking."
            />
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto scroll-thin space-y-2 pr-1">
                {daySlots.map((slot) => {
                  const status = draft[slot.period]
                  const existing = entries.find((a) => a.period === slot.period)
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                        <BookOpen className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          <span className="text-muted-foreground">P{slot.period}.</span>{' '}
                          {slot.subjectName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            {slot.startTime}–{slot.endTime}
                          </span>
                          {slot.room && <span>· {slot.room}</span>}
                          {slot.teacher && <span>· {slot.teacher}</span>}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant={status === 'present' ? 'default' : 'outline'}
                          style={
                            status === 'present'
                              ? { background: PRESENT_COLOR, color: 'white' }
                              : undefined
                          }
                          onClick={() =>
                            setDraft((d) => ({ ...d, [slot.period]: 'present' }))
                          }
                        >
                          <CheckCircle2 className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={status === 'absent' ? 'default' : 'outline'}
                          style={
                            status === 'absent'
                              ? { background: ABSENT_COLOR, color: 'white' }
                              : undefined
                          }
                          onClick={() =>
                            setDraft((d) => ({ ...d, [slot.period]: 'absent' }))
                          }
                        >
                          <XCircle className="size-4" />
                        </Button>
                        {existing && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="size-8 text-destructive">
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  P{slot.period} · {slot.subjectName} on {date}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEntry(existing.id)}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="size-4 mr-2" />
                  )}
                  Save {date === todayDateStr() ? 'Today' : 'This Day'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Settings view
// ═══════════════════════════════════════════════════════════
function SettingsView() {
  const { user, logout, refresh } = useAuth()
  const { setTheme } = useTheme()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState(user?.name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s = await apiFetch<Settings>('/api/personal/settings')
      setSettings(s)
      setAvatarUrl(s.avatarUrl || user?.avatarUrl || '')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [user?.avatarUrl])

  useEffect(() => {
    load()
  }, [load])

  const handleDarkMode = async (checked: boolean) => {
    setSettings((s) => (s ? { ...s, darkMode: checked } : s))
    setTheme(checked ? 'dark' : 'light')
    try {
      await apiFetch('/api/personal/settings', {
        method: 'PUT',
        body: JSON.stringify({ darkMode: checked }),
      })
      await refresh()
      toast.success(`Dark mode ${checked ? 'on' : 'off'}`)
    } catch (e) {
      toast.error((e as Error).message || 'Failed to update')
    }
  }

  const handleProfileSave = async () => {
    if (!fullName.trim()) {
      toast.error('Full name cannot be empty')
      return
    }
    setProfileSaving(true)
    try {
      await apiFetch('/api/personal/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: fullName.trim(),
          avatarUrl: avatarUrl.trim() || null,
        }),
      })
      await refresh()
      toast.success('Profile updated')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!pw.current || !pw.next || !pw.confirm) {
      toast.error('Fill all password fields')
      return
    }
    if (pw.next !== pw.confirm) {
      toast.error('New passwords do not match')
      return
    }
    if (pw.next.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    setPwSaving(true)
    try {
      await apiFetch('/api/personal/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: pw.current,
          newPassword: pw.next,
        }),
      })
      toast.success('Password changed')
      setPw({ current: '', next: '', confirm: '' })
    } catch (e) {
      toast.error((e as Error).message || 'Failed to change password')
    } finally {
      setPwSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await apiFetch('/api/personal/account', { method: 'DELETE' })
      toast.success('Account deleted')
      await logout()
      window.location.href = '/'
    } catch (e) {
      toast.error((e as Error).message || 'Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const initials = (user?.name || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="size-4" />
            Preferences
          </CardTitle>
          <CardDescription>Theme and tracking preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">
                Toggle dark theme across the dashboard.
              </p>
            </div>
            <Switch checked={settings.darkMode} onCheckedChange={handleDarkMode} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Attendance Goal</p>
              <p className="text-xs text-muted-foreground">
                Target percentage for the dashboard ring.
              </p>
            </div>
            <Select
              value={String(settings.goalPct)}
              onValueChange={async (v) => {
                const g = parseInt(v, 10)
                setSettings({ ...settings, goalPct: g })
                try {
                  await apiFetch('/api/personal/settings', {
                    method: 'PUT',
                    body: JSON.stringify({ goalPct: g }),
                  })
                  await refresh()
                  toast.success(`Goal set to ${g}%`)
                } catch (e) {
                  toast.error((e as Error).message || 'Failed to update goal')
                }
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    {g}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-4" />
            Profile
          </CardTitle>
          <CardDescription>Update your name and avatar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…/photo.jpg"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleProfileSave} disabled={profileSaving}>
              {profileSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Change Password
          </CardTitle>
          <CardDescription>Use at least 6 characters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cur-pw">Current password</Label>
            <Input
              id="cur-pw"
              type="password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conf-pw">Confirm new</Label>
              <Input
                id="conf-pw"
                type="password"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={pwSaving}>
              {pwSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Update password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all related data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="size-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your timetable, attendance history,
                  settings, and notifications. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    'Yes, delete my account'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Shared
// ═══════════════════════════════════════════════════════════
function EmptyState({
  icon: Icon,
  title,
  desc,
  actionLabel,
  onAction,
}: {
  icon: React.ElementType
  title: string
  desc: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="text-center py-8 px-4">
      <div className="size-12 rounded-full bg-muted grid place-items-center mx-auto mb-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{desc}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-1" />
        <Skeleton className="h-72 lg:col-span-2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  )
}
