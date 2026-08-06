'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Layers,
  Database,
  Download,
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  UserPlus,
  ClipboardList,
  Building2,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardShell, StatCard, type NavItem } from '@/components/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch } from '@/lib/api'

// ── Types ───────────────────────────────────────────────────────────
type Stats = { students: number; teachers: number; subjects: number; attendanceRecords: number }

type Student = {
  id: string
  userId: string
  email: string
  fullName: string
  rollNo: string
  semesterId: string | null
  semesterName: string | null
  sectionId: string | null
  sectionName: string | null
}

type Teacher = {
  id: string
  userId: string
  email: string
  fullName: string
  deptId: string | null
  deptName: string | null
  deptCode: string | null
}

type Subject = {
  id: string
  code: string
  name: string
  semesterId: string | null
  semesterName: string | null
  sectionId: string | null
  sectionName: string | null
  deptId: string | null
  deptName: string | null
  teacherId: string | null
  teacherName: string | null
}

type Semester = {
  id: string
  name: string
  number: number
  studentCount: number
  subjectCount: number
  sectionCount: number
}

type Section = {
  id: string
  name: string
  semesterId: string | null
  semesterName: string | null
  studentCount: number
  timetableCount: number
  subjectCount: number
}

type Department = {
  id: string
  name: string
  code: string
  teacherCount: number
  subjectCount: number
}

type Timetable = {
  id: string
  sectionId: string | null
  sectionName: string | null
  subjectId: string | null
  subjectCode: string | null
  subjectName: string | null
  teacherId: string | null
  teacherName: string | null
  day: string
  period: number
  startTime: string
  endTime: string
  room: string | null
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'teachers', label: 'Teachers', icon: GraduationCap },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'timetable', label: 'Timetable', icon: CalendarDays },
  { id: 'structure', label: 'Semesters & Sections', icon: Layers },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

// ── Main component ──────────────────────────────────────────────────
export function AdminDashboard() {
  const [active, setActive] = useState('overview')

  const titleMap: Record<string, string> = {
    overview: 'Admin Overview',
    students: 'Manage Students',
    teachers: 'Manage Teachers',
    subjects: 'Manage Subjects',
    timetable: 'Timetable',
    structure: 'Semesters & Sections',
  }

  return (
    <DashboardShell
      nav={NAV}
      active={active}
      onNavigate={setActive}
      title={titleMap[active] ?? 'Admin'}
      accent="Admin"
    >
      {active === 'overview' && <OverviewSection />}
      {active === 'students' && <StudentsSection />}
      {active === 'teachers' && <TeachersSection />}
      {active === 'subjects' && <SubjectsSection />}
      {active === 'timetable' && <TimetableSection />}
      {active === 'structure' && <StructureSection />}
    </DashboardShell>
  )
}

// ── Overview ────────────────────────────────────────────────────────
function OverviewSection() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [backupOpen, setBackupOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<Stats>('/api/admin/stats')
      setStats(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup')
      if (!res.ok) throw new Error('Backup failed')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendx-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Database backup downloaded')
      setBackupOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Backup failed')
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/export')
      if (!res.ok) throw new Error('Export failed')
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendx-attendance-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Attendance CSV exported')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {loading || !stats ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              label="Total Students"
              value={stats.students}
              icon={Users}
              tone="primary"
            />
            <StatCard
              label="Total Teachers"
              value={stats.teachers}
              icon={GraduationCap}
              tone="chart-2"
            />
            <StatCard
              label="Total Subjects"
              value={stats.subjects}
              icon={BookOpen}
              tone="chart-3"
            />
            <StatCard
              label="Attendance Records"
              value={stats.attendanceRecords}
              icon={ClipboardList}
              tone="chart-5"
            />
          </>
        )}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Database className="size-5 text-primary" />
          <h3 className="font-semibold">System Tools</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Backup the database, export attendance to CSV, or reset a user&rsquo;s password.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button
            variant="outline"
            className="justify-start h-auto py-4 px-4"
            onClick={() => setBackupOpen(true)}
          >
            <Database className="size-5 mr-3 text-primary" />
            <div className="text-left">
              <div className="font-medium">Backup Database</div>
              <div className="text-xs text-muted-foreground font-normal">
                Download a JSON dump
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-4 px-4"
            onClick={handleExport}
          >
            <Download className="size-5 mr-3 text-chart-3" />
            <div className="text-left">
              <div className="font-medium">Export Attendance</div>
              <div className="text-xs text-muted-foreground font-normal">
                Download as CSV
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-4 px-4"
            onClick={() => setResetOpen(true)}
          >
            <KeyRound className="size-5 mr-3 text-chart-5" />
            <div className="text-left">
              <div className="font-medium">Reset Password</div>
              <div className="text-xs text-muted-foreground font-normal">
                Set a new credential
              </div>
            </div>
          </Button>
        </div>
      </div>

      <AlertDialog open={backupOpen} onOpenChange={setBackupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Download database backup?</AlertDialogTitle>
            <AlertDialogDescription>
              A JSON dump of all institutional tables (students, teachers, subjects,
              timetables, attendance, etc.) will be downloaded. Password hashes are
              stripped from the dump.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackup}>
              <Download className="size-4 mr-2" />
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResetPasswordDialog open={resetOpen} onOpenChange={setResetOpen} />
    </div>
  )
}

// ── Reset Password dialog ───────────────────────────────────────────
function ResetPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [newPassword, setNewPassword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, t] = await Promise.all([
        apiFetch<Student[]>('/api/admin/students'),
        apiFetch<Teacher[]>('/api/admin/teachers'),
      ])
      setStudents(s)
      setTeachers(t)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      load()
      setSelectedUserId('')
      setNewPassword('')
    }
  }, [open, load])

  const userOptions = useMemo(() => {
    const opts: { id: string; label: string; role: string }[] = []
    teachers.forEach((t) =>
      opts.push({ id: t.userId, label: `${t.fullName} — ${t.email}`, role: 'Teacher' })
    )
    students.forEach((s) =>
      opts.push({ id: s.userId, label: `${s.fullName} — ${s.email}`, role: 'Student' })
    )
    return opts
  }, [students, teachers])

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast.error('Please pick a user')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/api/admin/reset-password', {
        method: 'POST',
        body: JSON.stringify({ userId: selectedUserId, newPassword }),
      })
      toast.success('Password updated')
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset user password</DialogTitle>
          <DialogDescription>
            Pick a teacher or student and set a new password. They will use it on their
            next login.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rp-user">User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="rp-user" className="w-full">
                <SelectValue placeholder={loading ? 'Loading…' : 'Select a user'} />
              </SelectTrigger>
              <SelectContent>
                {userOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <Badge variant="secondary" className="mr-2">
                      {u.role}
                    </Badge>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-pass">New password</Label>
            <Input
              id="rp-pass"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <KeyRound className="size-4 mr-2" />
            )}
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Students ────────────────────────────────────────────────────────
function StudentsSection() {
  const [items, setItems] = useState<Student[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, sem, sec] = await Promise.all([
        apiFetch<Student[]>('/api/admin/students'),
        apiFetch<Semester[]>('/api/admin/semesters'),
        apiFetch<Section[]>('/api/admin/sections'),
      ])
      setItems(s)
      setSemesters(sem)
      setSections(sec)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (s: Student) => {
    setEditing(s)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await apiFetch(`/api/admin/students/${deleteId}`, { method: 'DELETE' })
      toast.success('Student deleted')
      setDeleteId(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} student{items.length === 1 ? '' : 's'} enrolled.
        </p>
        <Button onClick={openCreate}>
          <UserPlus className="size-4 mr-2" />
          Add Student
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roll No</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No students yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.rollNo}</Badge>
                  </TableCell>
                  <TableCell>{s.semesterName ?? '—'}</TableCell>
                  <TableCell>{s.sectionName ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StudentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        semesters={semesters}
        sections={sections}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the student&rsquo;s profile, their user account, and all
              attendance records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StudentDialog({
  open,
  onOpenChange,
  editing,
  semesters,
  sections,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Student | null
  semesters: Semester[]
  sections: Section[]
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [password, setPassword] = useState('')
  const [semesterId, setSemesterId] = useState<string>('__none__')
  const [sectionId, setSectionId] = useState<string>('__none__')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setFullName(editing?.fullName ?? '')
      setEmail(editing?.email ?? '')
      setRollNo(editing?.rollNo ?? '')
      setPassword('')
      setSemesterId(editing?.semesterId ?? '__none__')
      setSectionId(editing?.sectionId ?? '__none__')
    }
  }, [open, editing])

  const filteredSections = useMemo(() => {
    if (semesterId === '__none__') return sections
    return sections.filter((s) => s.semesterId === semesterId || s.semesterId === null)
  }, [sections, semesterId])

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !rollNo.trim()) {
      toast.error('Full name, email and roll number are required')
      return
    }
    if (!editing && password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        fullName,
        email,
        rollNo,
        semesterId: semesterId === '__none__' ? null : semesterId,
        sectionId: sectionId === '__none__' ? null : sectionId,
      }
      if (password) payload.password = password

      if (editing) {
        await apiFetch(`/api/admin/students/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        toast.success('Student updated')
      } else {
        await apiFetch('/api/admin/students', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Student created')
      }
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Student' : 'Add Student'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update student details. Leave password blank to keep it unchanged.'
              : 'Create a new student account.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label htmlFor="st-name">Full Name</Label>
            <Input
              id="st-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="st-email">Email</Label>
              <Input
                id="st-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@college.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-roll">Roll No</Label>
              <Input
                id="st-roll"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. CS21-001"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-pass">
              Password {editing && <span className="text-muted-foreground">(optional)</span>}
            </Label>
            <Input
              id="st-pass"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="st-sem">Semester</Label>
              <Select value={semesterId} onValueChange={setSemesterId}>
                <SelectTrigger id="st-sem" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-sec">Section</Label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger id="st-sec" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {filteredSections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.semesterName ? ` (${s.semesterName})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            {editing ? 'Save changes' : 'Create student'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Teachers ────────────────────────────────────────────────────────
function TeachersSection() {
  const [items, setItems] = useState<Teacher[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, d] = await Promise.all([
        apiFetch<Teacher[]>('/api/admin/teachers'),
        apiFetch<Department[]>('/api/admin/departments'),
      ])
      setItems(t)
      setDepartments(d)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await apiFetch(`/api/admin/teachers/${deleteId}`, { method: 'DELETE' })
      toast.success('Teacher deleted')
      setDeleteId(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} teacher{items.length === 1 ? '' : 's'} registered.
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="size-4 mr-2" />
          Add Teacher
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                  No teachers yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{t.email}</TableCell>
                  <TableCell>
                    {t.deptName ? (
                      <Badge variant="outline">
                        {t.deptCode ?? ''} · {t.deptName}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(t)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(t.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TeacherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        departments={departments}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this teacher?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the teacher&rsquo;s profile and user account. Timetable slots
              they were assigned to will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TeacherDialog({
  open,
  onOpenChange,
  editing,
  departments,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Teacher | null
  departments: Department[]
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [deptId, setDeptId] = useState<string>('__none__')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setFullName(editing?.fullName ?? '')
      setEmail(editing?.email ?? '')
      setPassword('')
      setDeptId(editing?.deptId ?? '__none__')
    }
  }, [open, editing])

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error('Full name and email are required')
      return
    }
    if (!editing && password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        fullName,
        email,
        deptId: deptId === '__none__' ? null : deptId,
      }
      if (password) payload.password = password

      if (editing) {
        await apiFetch(`/api/admin/teachers/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        toast.success('Teacher updated')
      } else {
        await apiFetch('/api/admin/teachers', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Teacher created')
      }
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update teacher details. Leave password blank to keep it unchanged.'
              : 'Create a new teacher account.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label htmlFor="t-name">Full Name</Label>
            <Input
              id="t-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Alan Turing"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-email">Email</Label>
            <Input
              id="t-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alan@college.edu"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-pass">
              Password {editing && <span className="text-muted-foreground">(optional)</span>}
            </Label>
            <Input
              id="t-pass"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-dept">Department</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger id="t-dept" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code} · {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            {editing ? 'Save changes' : 'Create teacher'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Subjects ────────────────────────────────────────────────────────
function SubjectsSection() {
  const [items, setItems] = useState<Subject[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, sem, sec, d, t] = await Promise.all([
        apiFetch<Subject[]>('/api/admin/subjects'),
        apiFetch<Semester[]>('/api/admin/semesters'),
        apiFetch<Section[]>('/api/admin/sections'),
        apiFetch<Department[]>('/api/admin/departments'),
        apiFetch<Teacher[]>('/api/admin/teachers'),
      ])
      setItems(s)
      setSemesters(sem)
      setSections(sec)
      setDepartments(d)
      setTeachers(t)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await apiFetch(`/api/admin/subjects/${deleteId}`, { method: 'DELETE' })
      toast.success('Subject deleted')
      setDeleteId(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} subject{items.length === 1 ? '' : 's'} configured.
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="size-4 mr-2" />
          Add Subject
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No subjects yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Badge variant="secondary">{s.code}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.semesterName ?? '—'}</TableCell>
                  <TableCell>{s.sectionName ?? '—'}</TableCell>
                  <TableCell>{s.deptName ?? '—'}</TableCell>
                  <TableCell>{s.teacherName ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(s)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        semesters={semesters}
        sections={sections}
        departments={departments}
        teachers={teachers}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this subject?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the subject. Timetable entries and attendance records tied to
              it will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SubjectDialog({
  open,
  onOpenChange,
  editing,
  semesters,
  sections,
  departments,
  teachers,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Subject | null
  semesters: Semester[]
  sections: Section[]
  departments: Department[]
  teachers: Teacher[]
  onSaved: () => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [semesterId, setSemesterId] = useState('__none__')
  const [sectionId, setSectionId] = useState('__none__')
  const [deptId, setDeptId] = useState('__none__')
  const [teacherId, setTeacherId] = useState('__none__')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setCode(editing?.code ?? '')
      setName(editing?.name ?? '')
      setSemesterId(editing?.semesterId ?? '__none__')
      setSectionId(editing?.sectionId ?? '__none__')
      setDeptId(editing?.deptId ?? '__none__')
      setTeacherId(editing?.teacherId ?? '__none__')
    }
  }, [open, editing])

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        code,
        name,
        semesterId: semesterId === '__none__' ? null : semesterId,
        sectionId: sectionId === '__none__' ? null : sectionId,
        deptId: deptId === '__none__' ? null : deptId,
        teacherId: teacherId === '__none__' ? null : teacherId,
      }
      if (editing) {
        await apiFetch(`/api/admin/subjects/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        toast.success('Subject updated')
      } else {
        await apiFetch('/api/admin/subjects', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Subject created')
      }
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          <DialogDescription>
            Configure the subject&rsquo;s code, name, and assignment to semester,
            section, department, and teacher.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-1">
              <Label htmlFor="sub-code">Code</Label>
              <Input
                id="sub-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CS101"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="sub-name">Name</Label>
              <Input
                id="sub-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Programming in C"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sub-sem">Semester</Label>
              <Select value={semesterId} onValueChange={setSemesterId}>
                <SelectTrigger id="sub-sem" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-sec">Section</Label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger id="sub-sec" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.semesterName ? ` (${s.semesterName})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sub-dept">Department</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger id="sub-dept" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.code} · {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-teacher">Teacher</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger id="sub-teacher" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            {editing ? 'Save changes' : 'Create subject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Timetable ───────────────────────────────────────────────────────
function TimetableSection() {
  const [items, setItems] = useState<Timetable[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, sub, sec, tea] = await Promise.all([
        apiFetch<Timetable[]>('/api/admin/timetable'),
        apiFetch<Subject[]>('/api/admin/subjects'),
        apiFetch<Section[]>('/api/admin/sections'),
        apiFetch<Teacher[]>('/api/admin/teachers'),
      ])
      setItems(t)
      setSubjects(sub)
      setSections(sec)
      setTeachers(tea)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await apiFetch(`/api/admin/timetable/${deleteId}`, { method: 'DELETE' })
      toast.success('Slot removed')
      setDeleteId(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  // group by day for display
  const byDay = useMemo(() => {
    const map: Record<string, Timetable[]> = {}
    DAYS.forEach((d) => (map[d] = []))
    items.forEach((t) => {
      if (map[t.day]) map[t.day].push(t)
      else map[t.day] = [t]
    })
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.period - b.period))
    return map
  }, [items])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} slot{items.length === 1 ? '' : 's'} scheduled.
        </p>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add Slot
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          No timetable entries yet. Add a slot to get started.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DAYS.filter((d) => byDay[d]?.length).map((day) => (
            <div key={day} className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
                <h3 className="font-semibold">{day}</h3>
                <Badge variant="outline">{byDay[day].length}</Badge>
              </div>
              <div className="max-h-80 overflow-y-auto scroll-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byDay[day].map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge variant="secondary">P{t.period}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">
                            {t.subjectCode ?? '—'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.subjectName ?? ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {t.sectionName ?? '—'}
                          {t.room && (
                            <div className="text-xs text-muted-foreground">
                              {t.room}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.startTime}–{t.endTime}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(t.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      <TimetableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subjects={subjects}
        sections={sections}
        teachers={teachers}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this timetable slot?</AlertDialogTitle>
            <AlertDialogDescription>
              The scheduled class will be removed from the timetable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TimetableDialog({
  open,
  onOpenChange,
  subjects,
  sections,
  teachers,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  subjects: Subject[]
  sections: Section[]
  teachers: Teacher[]
  onSaved: () => void
}) {
  const [sectionId, setSectionId] = useState('__none__')
  const [subjectId, setSubjectId] = useState('__none__')
  const [teacherId, setTeacherId] = useState('__none__')
  const [day, setDay] = useState('Mon')
  const [period, setPeriod] = useState('1')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [room, setRoom] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setSectionId('__none__')
      setSubjectId('__none__')
      setTeacherId('__none__')
      setDay('Mon')
      setPeriod('1')
      setStartTime('09:00')
      setEndTime('10:00')
      setRoom('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (subjectId === '__none__') {
      toast.error('Please pick a subject')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/api/admin/timetable', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: sectionId === '__none__' ? null : sectionId,
          subjectId: subjectId === '__none__' ? null : subjectId,
          teacherId: teacherId === '__none__' ? null : teacherId,
          day,
          period: Number(period),
          startTime,
          endTime,
          room: room.trim() || null,
        }),
      })
      toast.success('Slot added')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Timetable Slot</DialogTitle>
          <DialogDescription>
            Schedule a class for a section, subject, and teacher.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tt-sec">Section</Label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger id="tt-sec" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.semesterName ? ` (${s.semesterName})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tt-sub">Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="tt-sub" className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tt-tea">Teacher</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger id="tt-tea" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tt-room">Room</Label>
              <Input
                id="tt-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. LH-201"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tt-day">Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger id="tt-day" className="w-full">
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
            <div className="space-y-2">
              <Label htmlFor="tt-period">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="tt-period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      P{p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tt-room2">Time</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="tt-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-xs"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  id="tt-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Plus className="size-4 mr-2" />
            )}
            Add slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Semesters & Sections ────────────────────────────────────────────
function StructureSection() {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  // semester form
  const [semName, setSemName] = useState('')
  const [semNum, setSemNum] = useState('')
  // section form
  const [secName, setSecName] = useState('')
  const [secSem, setSecSem] = useState('__none__')
  // dept form
  const [depName, setDepName] = useState('')
  const [depCode, setDepCode] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, sec, d] = await Promise.all([
        apiFetch<Semester[]>('/api/admin/semesters'),
        apiFetch<Section[]>('/api/admin/sections'),
        apiFetch<Department[]>('/api/admin/departments'),
      ])
      setSemesters(s)
      setSections(sec)
      setDepartments(d)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load structure')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addSemester = async () => {
    const name = semName.trim()
    const number = Number(semNum)
    if (!name || !Number.isFinite(number)) {
      toast.error('Name and number are required')
      return
    }
    try {
      await apiFetch('/api/admin/semesters', {
        method: 'POST',
        body: JSON.stringify({ name, number }),
      })
      toast.success('Semester created')
      setSemName('')
      setSemNum('')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  const addSection = async () => {
    const name = secName.trim()
    if (!name) {
      toast.error('Section name is required')
      return
    }
    try {
      await apiFetch('/api/admin/sections', {
        method: 'POST',
        body: JSON.stringify({
          name,
          semesterId: secSem === '__none__' ? null : secSem,
        }),
      })
      toast.success('Section created')
      setSecName('')
      setSecSem('__none__')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  const addDepartment = async () => {
    const name = depName.trim()
    const code = depCode.trim().toUpperCase()
    if (!name || !code) {
      toast.error('Name and code are required')
      return
    }
    try {
      await apiFetch('/api/admin/departments', {
        method: 'POST',
        body: JSON.stringify({ name, code }),
      })
      toast.success('Department created')
      setDepName('')
      setDepCode('')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Semesters */}
      <div className="rounded-xl border bg-card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="size-4 text-primary" />
          <h3 className="font-semibold">Semesters</h3>
        </div>
        <div className="grid gap-2 mb-3">
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={semName}
              onChange={(e) => setSemName(e.target.value)}
              placeholder="Name"
              className="col-span-2"
            />
            <Input
              type="number"
              value={semNum}
              onChange={(e) => setSemNum(e.target.value)}
              placeholder="No."
              min={1}
            />
          </div>
          <Button size="sm" onClick={addSemester}>
            <Plus className="size-4 mr-1" />
            Add Semester
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto scroll-thin -mx-1">
          {loading ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : semesters.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No semesters yet.
            </p>
          ) : (
            <ul className="space-y-1 px-1">
              {semesters.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.studentCount} students · {s.sectionCount} sections ·{' '}
                      {s.subjectCount} subjects
                    </div>
                  </div>
                  <Badge variant="secondary">#{s.number}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="rounded-xl border bg-card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Users className="size-4 text-chart-2" />
          <h3 className="font-semibold">Sections</h3>
        </div>
        <div className="grid gap-2 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={secName}
              onChange={(e) => setSecName(e.target.value)}
              placeholder="Name"
            />
            <Select value={secSem} onValueChange={setSecSem}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No semester</SelectItem>
                {semesters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={addSection}>
            <Plus className="size-4 mr-1" />
            Add Section
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto scroll-thin -mx-1">
          {loading ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No sections yet.
            </p>
          ) : (
            <ul className="space-y-1 px-1">
              {sections.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.semesterName ?? 'No semester'} · {s.studentCount} students
                    </div>
                  </div>
                  <Badge variant="outline">{s.subjectCount} subs</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Departments */}
      <div className="rounded-xl border bg-card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="size-4 text-chart-3" />
          <h3 className="font-semibold">Departments</h3>
        </div>
        <div className="grid gap-2 mb-3">
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={depName}
              onChange={(e) => setDepName(e.target.value)}
              placeholder="Name"
              className="col-span-2"
            />
            <Input
              value={depCode}
              onChange={(e) => setDepCode(e.target.value.toUpperCase())}
              placeholder="Code"
              maxLength={6}
            />
          </div>
          <Button size="sm" onClick={addDepartment}>
            <Plus className="size-4 mr-1" />
            Add Department
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto scroll-thin -mx-1">
          {loading ? (
            <div className="space-y-2 px-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No departments yet.
            </p>
          ) : (
            <ul className="space-y-1 px-1">
              {departments.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-sm">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.teacherCount} teachers · {d.subjectCount} subjects
                    </div>
                  </div>
                  <Badge variant="secondary">{d.code}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
