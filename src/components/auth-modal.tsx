'use client'

import { useState } from 'react'
import { useAuth, type Role, type SessionUser } from '@/stores/auth-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { GraduationCap, Users, Loader2, BookOpen, Building2 } from 'lucide-react'

const roleMeta: Record<Exclude<Role, 'ADMIN' | 'PERSONAL'>, { icon: React.ElementType; label: string; hint: string }> = {
  STUDENT: { icon: GraduationCap, label: 'Student', hint: 'Use your Google account to continue' },
  TEACHER: { icon: Users, label: 'Teacher', hint: 'Sign in with your teacher account' },
}

type ProfileForm = {
  fullName: string
  rollNo: string
  studentType: 'SCHOOL' | 'COLLEGE'
  institutionName: string
  gradeLevel: string
  schoolSection: string
  academicYear: string
  course: string
  semesterLabel: string
}

export function AuthModal() {
  const { loginRole, openLogin, setUser, setCsrf } = useAuth()
  const open = loginRole !== null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [profileMode, setProfileMode] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    fullName: '',
    rollNo: '',
    studentType: 'COLLEGE',
    institutionName: '',
    gradeLevel: '',
    schoolSection: '',
    academicYear: '',
    course: '',
    semesterLabel: '',
  })
  const [busy, setBusy] = useState(false)

  const close = () => {
    openLogin(null)
    setProfileMode(false)
    setEmail('')
    setPassword('')
    setStudentName('')
    setStudentEmail('')
    setProfileForm({
      fullName: '',
      rollNo: '',
      studentType: 'COLLEGE',
      institutionName: '',
      gradeLevel: '',
      schoolSection: '',
      academicYear: '',
      course: '',
      semesterLabel: '',
    })
  }

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginRole || loginRole === 'STUDENT') return
    setBusy(true)
    try {
      const data = await apiFetch<{ user: SessionUser; csrfToken: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role: 'TEACHER' }),
      })
      setUser(data.user)
      setCsrf(data.csrfToken)
      toast.success(`Welcome back, ${data.user.name}!`)
      close()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleStudentGoogle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginRole || loginRole !== 'STUDENT') return
    setBusy(true)
    try {
      const data = await apiFetch<{ user: SessionUser; csrfToken: string; needsProfile: boolean }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ name: studentName, email: studentEmail }),
      })
      setUser(data.user)
      setCsrf(data.csrfToken)
      if (data.needsProfile) {
        setProfileForm((prev) => ({ ...prev, fullName: data.user.name || studentName }))
        setProfileMode(true)
        toast.success('Welcome! Please complete your student profile.')
      } else {
        toast.success(`Welcome, ${data.user.name}!`)
        close()
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await apiFetch('/api/student/profile', {
        method: 'POST',
        body: JSON.stringify(profileForm),
      })
      toast.success('Profile saved. Your dashboard is ready.')
      close()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const meta = loginRole ? roleMeta[loginRole as Exclude<Role, 'ADMIN' | 'PERSONAL'>] : roleMeta.STUDENT

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-2">
            <meta.icon className="size-6" />
          </div>
          <DialogTitle>{loginRole === 'TEACHER' ? 'Teacher access' : 'Student access'}</DialogTitle>
          <DialogDescription>
            {loginRole === 'TEACHER'
              ? 'Use your teacher credentials to continue.'
              : 'Continue with Google and finish your student profile.'}
          </DialogDescription>
        </DialogHeader>

        {loginRole === 'STUDENT' && !profileMode ? (
          <form onSubmit={handleStudentGoogle} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="student-name">Your name</Label>
              <Input id="student-name" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Divyansh Kumar" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student-email">Email</Label>
              <Input id="student-email" type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <GraduationCap className="size-4 mr-2" />}
              Continue with Google
            </Button>
            <p className="text-xs text-muted-foreground text-center">This flow creates a secure student profile and session for your device.</p>
          </form>
        ) : null}

        {loginRole === 'STUDENT' && profileMode ? (
          <form onSubmit={handleProfileSave} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Student name</Label>
              <Input id="profile-name" value={profileForm.fullName} onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-roll">Roll number</Label>
              <Input id="profile-roll" value={profileForm.rollNo} onChange={(e) => setProfileForm((prev) => ({ ...prev, rollNo: e.target.value }))} placeholder="BCA2026001" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-type">Student type</Label>
              <select id="profile-type" value={profileForm.studentType} onChange={(e) => setProfileForm((prev) => ({ ...prev, studentType: e.target.value as 'SCHOOL' | 'COLLEGE' }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="SCHOOL">School Student</option>
                <option value="COLLEGE">College Student</option>
              </select>
            </div>
            {profileForm.studentType === 'SCHOOL' ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-school">School name</Label>
                  <Input id="profile-school" value={profileForm.institutionName} onChange={(e) => setProfileForm((prev) => ({ ...prev, institutionName: e.target.value }))} placeholder="ABC School" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-grade">Grade/Class</Label>
                    <Input id="profile-grade" value={profileForm.gradeLevel} onChange={(e) => setProfileForm((prev) => ({ ...prev, gradeLevel: e.target.value }))} placeholder="10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-section">Section</Label>
                    <Input id="profile-section" value={profileForm.schoolSection} onChange={(e) => setProfileForm((prev) => ({ ...prev, schoolSection: e.target.value }))} placeholder="A" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-year">Academic year</Label>
                  <Input id="profile-year" value={profileForm.academicYear} onChange={(e) => setProfileForm((prev) => ({ ...prev, academicYear: e.target.value }))} placeholder="2026-27" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-college">College or university</Label>
                  <Input id="profile-college" value={profileForm.institutionName} onChange={(e) => setProfileForm((prev) => ({ ...prev, institutionName: e.target.value }))} placeholder="ABC College" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-course">Course</Label>
                    <Input id="profile-course" value={profileForm.course} onChange={(e) => setProfileForm((prev) => ({ ...prev, course: e.target.value }))} placeholder="BCA" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-sem">Semester/year</Label>
                    <Input id="profile-sem" value={profileForm.semesterLabel} onChange={(e) => setProfileForm((prev) => ({ ...prev, semesterLabel: e.target.value }))} placeholder="1st Semester" />
                  </div>
                </div>
              </>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <BookOpen className="size-4 mr-2" />}
              Save profile and continue
            </Button>
          </form>
        ) : null}

        {loginRole === 'TEACHER' ? (
          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="teacher-email">Teacher email</Label>
              <Input id="teacher-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rao@attendx.edu" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacher-password">Password</Label>
              <Input id="teacher-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Users className="size-4 mr-2" />}
              Sign in as Teacher
            </Button>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
