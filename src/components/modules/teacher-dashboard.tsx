'use client'

// AttendX — Teacher module
// 6-step guided attendance flow + Today's Classes panel.
import { useEffect, useState, useCallback, useMemo } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/stores/auth-store'
import {
  DashboardShell,
  StatCard,
  type NavItem,
} from '@/components/dashboard-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ClipboardCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  Loader2,
  MapPin,
  GraduationCap,
  BookOpen,
  Users,
  CalendarCheck,
  Hourglass,
  PlusCircle,
  KeyRound,
} from 'lucide-react'

// ── types ──
type Semester = { id: string; name: string }
type Section = { id: string; name: string }
type Subject = { id: string; code: string; name: string }
type Student = { id: string; rollNo: string; fullName: string }
type AttendanceRecord = {
  studentId: string | null
  status: string
  period: number
}
type PeriodInfo = { period: number; startTime: string; endTime: string }
type TodayClass = {
  slotId: string
  semesterId: string | null
  subjectId: string | null
  subjectCode: string
  subjectName: string
  sectionId: string | null
  sectionName: string
  room: string | null
  startTime: string
  endTime: string
  period: number
  marked: boolean
}
type Stats = { todayClasses: number; pending: number; completed: number }
type Status = 'present' | 'absent' | 'late'
type Classroom = {
  id: string
  publicId?: string
  name: string
  joinCode: string
  inviteToken: string
  subject?: { name: string } | null
  members: Array<{
    id: string
    status: string
    student: { fullName: string; rollNo: string; userId?: string }
    attendance?: {
      present: number
      late: number
      absent: number
      total: number
      pct: number | null
    }
  }>
}

const STEPS = [
  { n: 1, label: 'Semester' },
  { n: 2, label: 'Section' },
  { n: 3, label: 'Subject' },
  { n: 4, label: 'Date' },
  { n: 5, label: 'Period' },
  { n: 6, label: 'Mark' },
]

const STATUS_META: Record<Status, { label: string; active: string; short: string }> = {
  present: { label: 'Present', active: 'bg-emerald-500 text-white', short: 'P' },
  absent: { label: 'Absent', active: 'bg-rose-500 text-white', short: 'A' },
  late: { label: 'Late', active: 'bg-amber-500 text-white', short: 'L' },
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function isReadOnlyDate(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return false
  const t = new Date(todayStr() + 'T00:00:00')
  const min = new Date(t)
  min.setDate(min.getDate() - 6)
  return d > t || d < min
}

function fmtDate(s: string): string {
  const d = new Date(s + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ───────────────────────────────────────────────────────────
export function TeacherDashboard() {
  const { user } = useAuth()
  const [active, setActive] = useState<'mark' | 'today' | 'classrooms'>('mark')

  const nav: NavItem[] = [
    { id: 'mark', label: 'Mark Attendance', icon: ClipboardCheck },
    { id: 'today', label: "Today's Classes", icon: CalendarDays },
    { id: 'classrooms', label: 'Classrooms', icon: Users },
  ]

  // ── stats ──
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [classroomName, setClassroomName] = useState('')
  const [classroomCourse, setClassroomCourse] = useState('')
  const [classroomSection, setClassroomSection] = useState('')
  const [classroomYear, setClassroomYear] = useState('')
  const [classroomSubjectId, setClassroomSubjectId] = useState('')
  const [classroomLoading, setClassroomLoading] = useState(false)
  const refreshStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const s = await apiFetch<Stats>('/api/teacher/stats')
      setStats(s)
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false)
    }
  }, [])
  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  // ── today's classes ──
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])
  const [todayMeta, setTodayMeta] = useState<{ date: string; dayName: string } | null>(null)
  const [loadingToday, setLoadingToday] = useState(true)
  const refreshToday = useCallback(async () => {
    setLoadingToday(true)
    try {
      const data = await apiFetch<{
        date: string
        dayName: string
        classes: TodayClass[]
      }>('/api/teacher/classes')
      setTodayClasses(data.classes)
      setTodayMeta({ date: data.date, dayName: data.dayName })
    } catch {
      /* ignore */
    } finally {
      setLoadingToday(false)
    }
  }, [])
  useEffect(() => {
    refreshToday()
  }, [refreshToday])

  const refreshClassrooms = useCallback(async () => {
    try {
      const data = await apiFetch<{ classrooms: Classroom[] }>('/api/classrooms')
      setClassrooms(data.classrooms || [])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    refreshClassrooms()
  }, [refreshClassrooms])

  // ── 6-step flow state ──
  const [step, setStep] = useState(1)
  const [semesterId, setSemesterId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(todayStr())
  const [period, setPeriod] = useState<number | null>(null)

  // ── data lists ──
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])

  // ── classroom form subjects (independent of the mark-attendance flow) ──
  // The 6-step flow only loads subjects after a semester+section is picked, so
  // the create-classroom dropdown would be empty if the teacher opens the
  // Classrooms tab directly. Load subjects from the first available section.
  const [classroomSubjects, setClassroomSubjects] = useState<Subject[]>([])
  const loadClassroomSubjects = useCallback(async () => {
    try {
      let list = semesters
      if (list.length === 0) {
        list = await apiFetch<Semester[]>('/api/teacher/semesters')
        setSemesters(list)
      }
      const sem = list[0]
      if (!sem) return
      const secList = await apiFetch<Section[]>(
        `/api/teacher/sections?semesterId=${sem.id}`
      )
      const sec = secList[0]
      if (!sec) return
      const subList = await apiFetch<Subject[]>(
        `/api/teacher/subjects?sectionId=${sec.id}`
      )
      setClassroomSubjects(subList)
    } catch {
      /* ignore */
    }
  }, [semesters])
  useEffect(() => {
    if (active === 'classrooms' && classroomSubjects.length === 0) {
      loadClassroomSubjects()
    }
  }, [active, classroomSubjects.length, loadClassroomSubjects])

  // ── attendance fetch result ──
  const [periods, setPeriods] = useState<PeriodInfo[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [editable, setEditable] = useState(true)

  // ── loading flags ──
  const [loadingSem, setLoadingSem] = useState(false)
  const [loadingSec, setLoadingSec] = useState(false)
  const [loadingSubj, setLoadingSubj] = useState(false)
  const [loadingStu, setLoadingStu] = useState(false)
  const [loadingAtt, setLoadingAtt] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── marks map: studentId -> status (for the selected period) ──
  const [marks, setMarks] = useState<Record<string, Status>>({})

  // ── fetch semesters on mount ──
  useEffect(() => {
    setLoadingSem(true)
    apiFetch<Semester[]>('/api/teacher/semesters')
      .then((items) => {
        setSemesters(items)
        if (items.length === 1) {
          setSemesterId(items[0].id)
          setStep(2)
        }
      })
      .catch(() => toast.error('Failed to load semesters'))
      .finally(() => setLoadingSem(false))
  }, [])

  // ── fetch sections when semester changes ──
  useEffect(() => {
    setSections([])
    setSubjects([])
    setStudents([])
    setRecords([])
    setPeriods([])
    if (!semesterId) return
    setLoadingSec(true)
    apiFetch<Section[]>(`/api/teacher/sections?semesterId=${semesterId}`)
      .then((items) => {
        setSections(items)
        if (items.length === 1) {
          setSectionId(items[0].id)
          setStep(3)
        }
      })
      .catch(() => toast.error('Failed to load sections'))
      .finally(() => setLoadingSec(false))
  }, [semesterId])

  // ── fetch subjects + students when section changes ──
  useEffect(() => {
    setSubjects([])
    setStudents([])
    setRecords([])
    setPeriods([])
    if (!sectionId) return
    setLoadingSubj(true)
    apiFetch<Subject[]>(`/api/teacher/subjects?sectionId=${sectionId}`)
      .then((items) => {
        setSubjects(items)
        if (items.length === 1) {
          setSubjectId(items[0].id)
          setStep(4)
        }
      })
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoadingSubj(false))
  }, [sectionId])

  useEffect(() => {
    setStudents([])
    if (!sectionId || !subjectId) return
    setLoadingStu(true)
    apiFetch<Student[]>(`/api/teacher/students?sectionId=${sectionId}&subjectId=${subjectId}`)
      .then(setStudents)
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoadingStu(false))
  }, [sectionId, subjectId])

  // ── fetch attendance (periods + records + editable) when subject+date set ──
  // NOTE: this effect does not touch `period`. The effective period is derived
  // below as `effectivePeriod` so that a programmatic selection (e.g. clicking a
  // today's class) is preserved across the refetch.
  useEffect(() => {
    setRecords([])
    setPeriods([])
    if (!subjectId || !date) return
    setLoadingAtt(true)
    apiFetch<{
      records: AttendanceRecord[]
      periods: PeriodInfo[]
      editable: boolean
      sectionId: string | null
    }>(`/api/teacher/attendance?subjectId=${subjectId}&sectionId=${sectionId}&date=${date}`)
      .then((data) => {
        setRecords(data.records)
        setPeriods(data.periods)
        setEditable(data.editable)
      })
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoadingAtt(false))
  }, [subjectId, sectionId, date])

  // ── effective period: explicit selection, else default to first available ──
  const effectivePeriod = useMemo(
    () => period ?? periods[0]?.period ?? null,
    [period, periods]
  )

  // ── rebuild marks map when effective period / students / records change ──
  useEffect(() => {
    if (effectivePeriod == null) {
      setMarks({})
      return
    }
    const m: Record<string, Status> = {}
    for (const stu of students) {
      const rec = records.find(
        (r) => r.studentId === stu.id && r.period === effectivePeriod
      )
      m[stu.id] = (rec?.status as Status) || 'present'
    }
    setMarks(m)
  }, [effectivePeriod, students, records])

  // ── derived ──
  const selectedSemester = useMemo(
    () => semesters.find((s) => s.id === semesterId),
    [semesters, semesterId]
  )
  const selectedSection = useMemo(
    () => sections.find((s) => s.id === sectionId),
    [sections, sectionId]
  )
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjects, subjectId]
  )
  const selectedPeriod = useMemo(
    () => periods.find((p) => p.period === effectivePeriod),
    [periods, effectivePeriod]
  )

  const dateReadOnly = isReadOnlyDate(date)
  const effectiveReadOnly = loadingAtt ? dateReadOnly : !editable

  const isStepComplete = (n: number): boolean => {
    if (n === 1) return !!semesterId
    if (n === 2) return !!sectionId
    if (n === 3) return !!subjectId
    if (n === 4) return !!date
    if (n === 5) return effectivePeriod != null
    return false
  }
  const canGoToStep = (n: number): boolean => {
    if (n === 1) return true
    if (n === 2) return !!semesterId
    if (n === 3) return !!sectionId
    if (n === 4) return !!subjectId
    if (n === 5) return !!date
    if (n === 6) return effectivePeriod != null
    return false
  }
  const goToStep = (n: number) => {
    if (canGoToStep(n)) setStep(n)
  }

  // ── selection handlers (clear downstream + auto-advance) ──
  const onSemesterChange = (id: string) => {
    setSemesterId(id)
    setSectionId('')
    setSubjectId('')
    setPeriod(null)
    setStep(2)
  }
  const onSectionChange = (id: string) => {
    setSectionId(id)
    setSubjectId('')
    setPeriod(null)
    setStep(3)
  }
  const onSubjectChange = (id: string) => {
    setSubjectId(id)
    setPeriod(null)
    setStep(4)
  }
  const onDateChange = (d: string) => {
    setDate(d)
    setPeriod(null)
    setStep(5)
  }
  const onPeriodChange = (p: number) => {
    setPeriod(p)
    setStep(6)
  }

  // ── bulk mark helpers ──
  const markAll = (status: Status) => {
    const m: Record<string, Status> = {}
    for (const s of students) m[s.id] = status
    setMarks(m)
  }
  const setStudentStatus = (studentId: string, status: Status) => {
    setMarks((prev) => ({ ...prev, [studentId]: status }))
  }

  // ── save ──
  const handleSave = async () => {
    if (!subjectId || !sectionId || !date || effectivePeriod == null) return
    if (effectiveReadOnly) {
      toast.error('Attendance for this date is read-only')
      return
    }
    if (students.length === 0) {
      toast.error('No students to mark')
      return
    }
    const entries = students.map((s) => ({
      studentId: s.id,
      status: marks[s.id] || 'present',
    }))
    setSaving(true)
    try {
      const res = await apiFetch<{ saved: number }>(
        '/api/teacher/attendance',
        {
          method: 'POST',
          body: JSON.stringify({
            subjectId,
            sectionId,
            date,
            period: effectivePeriod,
            entries,
          }),
        }
      )
      toast.success(`Saved attendance for ${res.saved} students`)
      refreshStats()
      refreshToday()
      // re-fetch to reflect saved state
      const data = await apiFetch<{
        records: AttendanceRecord[]
        periods: PeriodInfo[]
        editable: boolean
        sectionId: string | null
      }>(`/api/teacher/attendance?subjectId=${subjectId}&sectionId=${sectionId}&date=${date}`)
      setRecords(data.records)
      setEditable(data.editable)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  // ── click a today's class → pre-fill the flow ──
  const pickTodayClass = (c: TodayClass) => {
    if (!c.subjectId || !c.sectionId) return
    setSemesterId(c.semesterId ?? '')
    setSectionId(c.sectionId)
    setSubjectId(c.subjectId)
    setDate(todayMeta?.date ?? todayStr())
    setPeriod(c.period)
    setStep(6)
    setActive('mark')
  }

  // ── roll list summary ──
  const counts = useMemo(() => {
    let p = 0,
      a = 0,
      l = 0
    for (const s of students) {
      const st = marks[s.id]
      if (st === 'present') p++
      else if (st === 'absent') a++
      else if (st === 'late') l++
    }
    return { present: p, absent: a, late: l }
  }, [marks, students])

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    setClassroomLoading(true)
    try {
      await apiFetch('/api/classrooms', {
        method: 'POST',
        body: JSON.stringify({
          name: classroomName,
          subjectId: classroomSubjectId || undefined,
          course: classroomCourse || undefined,
          section: classroomSection || undefined,
          academicYear: classroomYear || undefined,
        }),
      })
      setClassroomName('')
      setClassroomCourse('')
      setClassroomSection('')
      setClassroomYear('')
      setClassroomSubjectId('')
      toast.success('Classroom created!')
      await refreshClassrooms()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setClassroomLoading(false)
    }
  }

  const handleApproveMember = async (
    memberId: string,
    action: 'approve' | 'reject'
  ) => {
    try {
      await apiFetch('/api/classrooms/members', {
        method: 'POST',
        body: JSON.stringify({ memberId, action }),
      })
      toast.success(action === 'approve' ? 'Student approved' : 'Request rejected')
      await refreshClassrooms()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const title = `Teacher Panel${user?.name ? ` — ${user.name}` : ''}`

  return (
    <DashboardShell
      nav={nav}
      active={active}
      onNavigate={(id) => setActive(id as 'mark' | 'today' | 'classrooms')}
      title={title}
      accent="Teacher"
    >
      <div className="flex flex-col gap-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statsLoading || !stats ? (
            <>
              <Skeleton className="h-[112px] rounded-xl" />
              <Skeleton className="h-[112px] rounded-xl" />
              <Skeleton className="h-[112px] rounded-xl" />
            </>
          ) : (
            <>
              <StatCard
                label="Today's Classes"
                value={stats.todayClasses}
                icon={CalendarCheck}
                tone="primary"
              />
              <StatCard
                label="Attendance Pending"
                value={stats.pending}
                icon={Hourglass}
                tone="chart-4"
              />
              <StatCard
                label="Attendance Completed"
                value={stats.completed}
                icon={CheckCircle2}
                tone="chart-3"
              />
            </>
          )}
        </div>

        {active === 'classrooms' ? (
          <ClassroomsPanel
            classrooms={classrooms}
            classroomName={classroomName}
            classroomCourse={classroomCourse}
            classroomSection={classroomSection}
            classroomYear={classroomYear}
            classroomSubjectId={classroomSubjectId}
            classroomLoading={classroomLoading}
            subjects={classroomSubjects}
            onNameChange={setClassroomName}
            onCourseChange={setClassroomCourse}
            onSectionChange={setClassroomSection}
            onYearChange={setClassroomYear}
            onSubjectChange={setClassroomSubjectId}
            onCreate={handleCreateClassroom}
            onApproveMember={handleApproveMember}
          />
        ) : active === 'mark' ? (
          <MarkAttendanceFlow
            step={step}
            goToStep={goToStep}
            canGoToStep={canGoToStep}
            isStepComplete={isStepComplete}
            semesterId={semesterId}
            sectionId={sectionId}
            subjectId={subjectId}
            date={date}
            period={effectivePeriod}
            semesters={semesters}
            sections={sections}
            subjects={subjects}
            students={students}
            periods={periods}
            marks={marks}
            loadingSem={loadingSem}
            loadingSec={loadingSec}
            loadingSubj={loadingSubj}
            loadingStu={loadingStu}
            loadingAtt={loadingAtt}
            saving={saving}
            effectiveReadOnly={effectiveReadOnly}
            dateReadOnly={dateReadOnly}
            selectedSemester={selectedSemester}
            selectedSection={selectedSection}
            selectedSubject={selectedSubject}
            selectedPeriod={selectedPeriod}
            counts={counts}
            onSemesterChange={onSemesterChange}
            onSectionChange={onSectionChange}
            onSubjectChange={onSubjectChange}
            onDateChange={onDateChange}
            onPeriodChange={onPeriodChange}
            setStudentStatus={setStudentStatus}
            markAll={markAll}
            onSave={handleSave}
          />
        ) : (
          <TodayClassesPanel
            loading={loadingToday}
            classes={todayClasses}
            meta={todayMeta}
            onPick={pickTodayClass}
          />
        )}
      </div>
    </DashboardShell>
  )
}

// ───────────────────────────────────────────────────────────
// 6-step Mark Attendance flow
// ───────────────────────────────────────────────────────────
type FlowProps = {
  step: number
  goToStep: (n: number) => void
  canGoToStep: (n: number) => boolean
  isStepComplete: (n: number) => boolean
  semesterId: string
  sectionId: string
  subjectId: string
  date: string
  period: number | null
  semesters: Semester[]
  sections: Section[]
  subjects: Subject[]
  students: Student[]
  periods: PeriodInfo[]
  marks: Record<string, Status>
  loadingSem: boolean
  loadingSec: boolean
  loadingSubj: boolean
  loadingStu: boolean
  loadingAtt: boolean
  saving: boolean
  effectiveReadOnly: boolean
  dateReadOnly: boolean
  selectedSemester?: Semester
  selectedSection?: Section
  selectedSubject?: Subject
  selectedPeriod?: PeriodInfo
  counts: { present: number; absent: number; late: number }
  onSemesterChange: (id: string) => void
  onSectionChange: (id: string) => void
  onSubjectChange: (id: string) => void
  onDateChange: (d: string) => void
  onPeriodChange: (p: number) => void
  setStudentStatus: (id: string, s: Status) => void
  markAll: (s: Status) => void
  onSave: () => void
}

function MarkAttendanceFlow(props: FlowProps) {
  const {
    step,
    goToStep,
    canGoToStep,
    isStepComplete,
    semesterId,
    sectionId,
    subjectId,
    date,
    period,
    semesters,
    sections,
    subjects,
    students,
    periods,
    marks,
    loadingSem,
    loadingSec,
    loadingSubj,
    loadingStu,
    loadingAtt,
    saving,
    effectiveReadOnly,
    dateReadOnly,
    selectedSemester,
    selectedSection,
    selectedSubject,
    selectedPeriod,
    counts,
    onSemesterChange,
    onSectionChange,
    onSubjectChange,
    onDateChange,
    onPeriodChange,
    setStudentStatus,
    markAll,
    onSave,
  } = props

  const currentStepMeta = STEPS.find((s) => s.n === step)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="size-5 text-primary" />
          Mark Attendance
        </CardTitle>
        <CardDescription>
          A guided 6-step flow — pick semester, section, subject, date, period,
          then mark each student Present / Absent / Late.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1 scroll-thin">
          {STEPS.map((s, i) => {
            const complete = isStepComplete(s.n)
            const active = step === s.n
            const enabled = canGoToStep(s.n)
            return (
              <div key={s.n} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => goToStep(s.n)}
                  disabled={!enabled}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : complete
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground',
                    enabled ? 'hover:opacity-90 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span
                    className={cn(
                      'size-5 rounded-full grid place-items-center text-[10px] sm:text-xs font-bold',
                      active
                        ? 'bg-primary-foreground/20'
                        : complete
                          ? 'bg-primary/20'
                          : 'bg-muted'
                    )}
                  >
                    {complete && !active ? (
                      <Check className="size-3" />
                    ) : (
                      s.n
                    )}
                  </span>
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="size-4 text-muted-foreground mx-0.5 shrink-0" />
                )}
              </div>
            )
          })}
        </div>

        {/* Selection trail summary */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Selection:</span>
          <TrailChip icon={GraduationCap} label={selectedSemester?.name ?? '—'} />
          <ChevronRight className="size-3" />
          <TrailChip icon={Users} label={selectedSection?.name ?? '—'} />
          <ChevronRight className="size-3" />
          <TrailChip
            icon={BookOpen}
            label={
              selectedSubject ? `${selectedSubject.code} · ${selectedSubject.name}` : '—'
            }
          />
          <ChevronRight className="size-3" />
          <TrailChip icon={CalendarDays} label={date ? fmtDate(date) : '—'} />
          {period != null && (
            <>
              <ChevronRight className="size-3" />
              <TrailChip
                icon={Clock}
                label={
                  selectedPeriod
                    ? `P${selectedPeriod.period} · ${selectedPeriod.startTime}–${selectedPeriod.endTime}`
                    : `P${period}`
                }
              />
            </>
          )}
        </div>

        {/* Active step hint */}
        <div className="text-sm text-muted-foreground">
          Step <span className="font-semibold text-foreground">{step}</span> of 6 —{' '}
          <span className="font-medium text-foreground">{currentStepMeta?.label}</span>
        </div>

        {/* Step content */}
        <div className="rounded-lg border bg-muted/30 p-4 sm:p-6 min-h-[160px]">
          {step === 1 && (semesters.length === 0 && !loadingSem ? (
            <EmptyPanel title="No semesters available" description="Ask an administrator to assign a subject or timetable slot to your account." />
          ) : (
            <StepSelect
              label="Select Semester"
              icon={GraduationCap}
              value={semesterId}
              placeholder="Choose a semester…"
              loading={loadingSem}
              options={semesters.map((s) => ({ value: s.id, label: s.name }))}
              onValueChange={onSemesterChange}
            />
          ))}

          {step === 2 && (
            <StepSelect
              label="Select Section"
              icon={Users}
              value={sectionId}
              placeholder="Choose a section…"
              loading={loadingSec}
              disabled={!semesterId}
              emptyMessage="No sections are assigned to this semester."
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              onValueChange={onSectionChange}
            />
          )}

          {step === 3 && (
            <StepSelect
              label="Select Subject"
              icon={BookOpen}
              value={subjectId}
              placeholder="Choose a subject…"
              loading={loadingSubj}
              disabled={!sectionId}
              emptyMessage="No subjects are assigned to this section."
              options={subjects.map((s) => ({
                value: s.id,
                label: `${s.code} — ${s.name}`,
              }))}
              onValueChange={onSubjectChange}
            />
          )}

          {step === 4 && (
            <div className="flex flex-col gap-3 max-w-sm">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="size-4 text-muted-foreground" />
                Pick Date
              </Label>
              <Input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => onDateChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You may mark attendance for today and the previous 6 days.
              </p>
              {dateReadOnly && (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Read-only date</AlertTitle>
                  <AlertDescription>
                    This date is outside the 7-day editable window. Existing
                    marks are shown but cannot be changed.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {step === 5 && (
            <StepSelect
              label="Pick Period"
              icon={Clock}
              value={period != null ? String(period) : ''}
              placeholder="Choose a period…"
              loading={loadingAtt}
              disabled={!subjectId || !date}
              emptyMessage="No timetable slots for this subject on the selected day."
              options={periods.map((p) => ({
                value: String(p.period),
                label: `Period ${p.period} · ${p.startTime}–${p.endTime}`,
              }))}
              onValueChange={(v) => onPeriodChange(Number(v))}
            />
          )}

          {step === 6 && (
            <RollList
              students={students}
              marks={marks}
              counts={counts}
              loadingStu={loadingStu}
              loadingAtt={loadingAtt}
              saving={saving}
              effectiveReadOnly={effectiveReadOnly}
              setStudentStatus={setStudentStatus}
              markAll={markAll}
              onSave={onSave}
            />
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={step === 1}
            onClick={() => goToStep(step - 1)}
          >
            <ChevronLeft className="size-4 mr-1" />
            Back
          </Button>
          {step < 6 ? (
            <Button
              size="sm"
              disabled={!isStepComplete(step)}
              onClick={() => goToStep(step + 1)}
            >
              Continue
              <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <div className="text-xs text-muted-foreground">
              {students.length} students · {counts.present}P · {counts.late}L ·{' '}
              {counts.absent}A
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TrailChip({
  icon: Icon,
  label,
}: {
  icon: React.ElementType
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-background border px-2 py-1 text-xs font-medium">
      <Icon className="size-3 text-muted-foreground" />
      <span className="max-w-[200px] truncate">{label}</span>
    </span>
  )
}

// ── generic step select ──
function StepSelect({
  label,
  icon: Icon,
  value,
  placeholder,
  options,
  loading,
  disabled,
  emptyMessage,
  onValueChange,
}: {
  label: string
  icon: React.ElementType
  value: string
  placeholder: string
  options: { value: string; label: string }[]
  loading: boolean
  disabled?: boolean
  emptyMessage?: string
  onValueChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-3 max-w-md">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </Label>
      {loading ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                {emptyMessage ?? 'No options available.'}
              </div>
            ) : (
              options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

// ── roll list (step 6) ──
function RollList({
  students,
  marks,
  counts,
  loadingStu,
  loadingAtt,
  saving,
  effectiveReadOnly,
  setStudentStatus,
  markAll,
  onSave,
}: {
  students: Student[]
  marks: Record<string, Status>
  counts: { present: number; absent: number; late: number }
  loadingStu: boolean
  loadingAtt: boolean
  saving: boolean
  effectiveReadOnly: boolean
  setStudentStatus: (id: string, s: Status) => void
  markAll: (s: Status) => void
  onSave: () => void
}) {
  if (loadingStu || loadingAtt) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Users className="size-8 mx-auto mb-2 opacity-40" />
        No students found in this section.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="gap-1">
            <span className="size-2 rounded-full bg-emerald-500" />
            {counts.present} Present
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <span className="size-2 rounded-full bg-amber-500" />
            {counts.late} Late
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <span className="size-2 rounded-full bg-rose-500" />
            {counts.absent} Absent
          </Badge>
        </div>
        {!effectiveReadOnly && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Bulk:</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => markAll('present')}
            >
              All Present
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => markAll('absent')}
            >
              All Absent
            </Button>
          </div>
        )}
      </div>

      {/* Table (desktop) / cards (mobile) */}
      <div className="rounded-md border max-h-[420px] overflow-y-auto scroll-thin">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[80px]">Roll</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((stu) => (
              <TableRow key={stu.id}>
                <TableCell className="font-mono text-xs font-medium">
                  {stu.rollNo}
                </TableCell>
                <TableCell className="font-medium">{stu.fullName}</TableCell>
                <TableCell className="text-right">
                  <StatusToggle
                    value={marks[stu.id] ?? 'present'}
                    disabled={effectiveReadOnly}
                    onChange={(s) => setStudentStatus(stu.id, s)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {effectiveReadOnly ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Read-only</AlertTitle>
          <AlertDescription>
            This date is outside the 7-day editable window. Marks are shown for
            reference only.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving || effectiveReadOnly} className="min-w-[160px]">
          {saving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4 mr-2" />
              Save Attendance
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function StatusToggle({
  value,
  disabled,
  onChange,
}: {
  value: Status
  disabled?: boolean
  onChange: (s: Status) => void
}) {
  const statuses: Status[] = ['present', 'absent', 'late']
  return (
    <div
      className="inline-flex rounded-md border overflow-hidden"
      role="radiogroup"
      aria-label="Attendance status"
    >
      {statuses.map((s, i) => {
        const isActive = value === s
        const meta = STATUS_META[s]
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(s)}
            className={cn(
              'px-2.5 sm:px-3 py-1 text-xs font-medium transition-colors border-l first:border-l-0',
              isActive
                ? meta.active
                : 'bg-background text-muted-foreground hover:bg-accent',
              disabled && 'cursor-not-allowed opacity-60 hover:bg-background',
              i > 0 && 'border-l'
            )}
          >
            <span className="sm:hidden">{meta.short}</span>
            <span className="hidden sm:inline">{meta.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// Today's Classes panel
// ───────────────────────────────────────────────────────────
function ClassroomsPanel({
  classrooms,
  classroomName,
  classroomCourse,
  classroomSection,
  classroomYear,
  classroomSubjectId,
  classroomLoading,
  subjects,
  onNameChange,
  onCourseChange,
  onSectionChange,
  onYearChange,
  onSubjectChange,
  onCreate,
  onApproveMember,
}: {
  classrooms: Classroom[]
  classroomName: string
  classroomCourse: string
  classroomSection: string
  classroomYear: string
  classroomSubjectId: string
  classroomLoading: boolean
  subjects: Subject[]
  onNameChange: (value: string) => void
  onCourseChange: (value: string) => void
  onSectionChange: (value: string) => void
  onYearChange: (value: string) => void
  onSubjectChange: (value: string) => void
  onCreate: (e: React.FormEvent) => void
  onApproveMember: (memberId: string, action: 'approve' | 'reject') => void
}) {
  const copyInvite = (token: string) => {
    const url = `${window.location.origin}/join/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Invite link copied!')
  }

  // Send a low-attendance warning to an approved classroom student.
  const [advising, setAdvising] = useState<string | null>(null)
  const handleAdvise = async (studentUserId: string, name: string) => {
    setAdvising(studentUserId)
    try {
      await apiFetch('/api/teacher/advice', {
        method: 'POST',
        body: JSON.stringify({
          studentUserId,
          message: `Hello ${name}, your attendance in this classroom is below the 75% minimum. Please attend classes regularly to stay on track.`,
        }),
      })
      toast.success(`Advice sent to ${name}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send advice')
    } finally {
      setAdvising(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="size-5 text-primary" />Create Classroom</CardTitle>
          <CardDescription>Generate a classroom invite with a join code and share it with students.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Classroom name</Label>
              <Input value={classroomName} onChange={(e) => onNameChange(e.target.value)} placeholder="BCA 1st Semester" required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Course</Label>
                <Input value={classroomCourse} onChange={(e) => onCourseChange(e.target.value)} placeholder="BCA" />
              </div>
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Input value={classroomSection} onChange={(e) => onSectionChange(e.target.value)} placeholder="A" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Academic year</Label>
                <Input value={classroomYear} onChange={(e) => onYearChange(e.target.value)} placeholder="2026-27" />
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select value={classroomSubjectId} onValueChange={onSubjectChange}>
                  <SelectTrigger><SelectValue placeholder="Optional subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} · {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={classroomLoading} className="w-full">
              {classroomLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlusCircle className="mr-2 size-4" />}
              Create classroom
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" />My Classrooms</CardTitle>
          <CardDescription>Share the join code or invite token with students in your sections.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {classrooms.length === 0 ? (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">No classrooms yet. Create one to start inviting students.</div>
          ) : classrooms.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.subject?.name || 'No subject linked'}</p>
                  {c.publicId ? (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">Class ID: {c.publicId}</p>
                  ) : null}
                </div>
                <Badge variant="outline">{c.members.length} enrolled</Badge>
                <Badge variant="secondary">{c.members.filter((m) => m.status === 'ACTIVE').length} active</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
                  <KeyRound className="size-3" /> Join: {c.joinCode}
                </span>
                <Button type="button" size="sm" variant="secondary" onClick={() => copyInvite(c.inviteToken)}>
                  Copy invite link
                </Button>
              </div>
              {c.members.length > 0 ? (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Students</p>
                  {[...c.members]
                    .sort((a, b) => a.student.rollNo.localeCompare(b.student.rollNo))
                    .map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                        <span>
                          {m.student.rollNo} — {m.student.fullName}
                        </span>
                        <div className="flex items-center gap-2">
                          {m.status === 'ACTIVE' && m.attendance && m.attendance.total > 0 && (
                            <Badge
                              className={
                                (m.attendance.pct ?? 0) >= 75
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
                              }
                              title={`${m.attendance.present} present, ${m.attendance.late} late, ${m.attendance.absent} absent · ${m.attendance.total} total`}
                            >
                              {m.attendance.pct}%
                            </Badge>
                          )}
                          {m.status === 'PENDING' ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => onApproveMember(m.id, 'approve')}>
                                Approve
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => onApproveMember(m.id, 'reject')}>
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="secondary">{m.status}</Badge>
                          )}
                          {m.status === 'ACTIVE' &&
                            m.student.userId &&
                            m.attendance?.pct != null &&
                            m.attendance.pct < 75 && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={advising === m.id}
                                onClick={() =>
                                  handleAdvise(m.student.userId!, m.student.fullName)
                                }
                              >
                                {advising === m.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : null}
                                Advise
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pt-2 border-t">
                  No students have joined this classroom yet.
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function TodayClassesPanel({
  loading,
  classes,
  meta,
  onPick,
}: {
  loading: boolean
  classes: TodayClass[]
  meta: { date: string; dayName: string } | null
  onPick: (c: TodayClass) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          Today&apos;s Classes
        </CardTitle>
        <CardDescription>
          {meta
            ? `${meta.dayName}, ${fmtDate(meta.date)} — ${classes.length} class${
                classes.length === 1 ? '' : 'es'
              } scheduled. Click a class to jump straight into marking.`
            : 'Loading today\u2019s schedule…'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-lg" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="size-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No classes scheduled today</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enjoy your day off — or pick a different date in the Mark
              Attendance flow.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((c) => (
              <button
                key={c.slotId}
                onClick={() => onPick(c)}
                className="text-left rounded-lg border bg-card p-4 hover:shadow-md hover:border-primary/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {c.subjectCode}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Period {c.period}
                      </span>
                    </div>
                    <h3 className="font-semibold mt-1.5 truncate group-hover:text-primary transition-colors">
                      {c.subjectName}
                    </h3>
                  </div>
                  {c.marked ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15">
                      <CheckCircle2 className="size-3 mr-1" />
                      Marked
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
                    >
                      <Clock className="size-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" />
                    {c.sectionName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {c.startTime}–{c.endTime}
                  </span>
                  {c.room && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {c.room}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
