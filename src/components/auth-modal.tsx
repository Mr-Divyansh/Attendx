'use client'

import { useEffect, useState } from 'react'
import { useAuth, type Role, type SessionUser } from '@/stores/auth-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import {
  GraduationCap,
  Users,
  Loader2,
  BookOpen,
  Building2,
  School,
  ArrowLeft,
} from 'lucide-react'

type ProfileForm = {
  fullName: string
  rollNo: string
  hasRollNumber: boolean
  studentType: 'SCHOOL' | 'COLLEGE'
  institutionName: string
  gradeLevel: string
  schoolSection: string
  academicYear: string
  course: string
  semesterLabel: string
}

type TeacherForm = {
  fullName: string
  email: string
  password: string
  confirm: string
  subjectTaught: string
  institutionName: string
  departmentLabel: string
}

export function AuthModal() {
  const { loginRole, openLogin, setUser, setCsrf, refresh, forceProfileSetup } = useAuth()
  const open = loginRole !== null

  const [step, setStep] = useState<'auth' | 'profile' | 'teacher-register'>('auth')
  const [teacherMode, setTeacherMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    fullName: '',
    rollNo: '',
    hasRollNumber: true,
    studentType: 'COLLEGE',
    institutionName: '',
    gradeLevel: '',
    schoolSection: '',
    academicYear: '',
    course: '',
    semesterLabel: '',
  })
  const [teacherForm, setTeacherForm] = useState<TeacherForm>({
    fullName: '',
    email: '',
    password: '',
    confirm: '',
    subjectTaught: '',
    institutionName: '',
    departmentLabel: '',
  })

  useEffect(() => {
    if (open) {
      setStep(forceProfileSetup ? 'profile' : 'auth')
    }
  }, [open, loginRole, forceProfileSetup])

  const close = () => {
    openLogin(null)
    setStep('auth')
    setTeacherMode('login')
    setEmail('')
    setPassword('')
    setProfileForm({
      fullName: '',
      rollNo: '',
      hasRollNumber: true,
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
    setBusy(true)
    try {
      const data = await apiFetch<{ user: SessionUser; csrfToken: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, role: 'TEACHER' }),
        }
      )
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

  const handleTeacherRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const data = await apiFetch<{
        user: SessionUser
        csrfToken: string
        needsProfile: boolean
      }>('/api/auth/register-teacher', {
        method: 'POST',
        body: JSON.stringify(teacherForm),
      })
      setUser(data.user)
      setCsrf(data.csrfToken)
      if (data.needsProfile) {
        toast.success('Account created! Complete your teacher profile.')
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

  const handleDevGoogle = async () => {
    setBusy(true)
    try {
      const devName = profileForm.fullName || 'Student'
      const devEmail =
        profileForm.fullName
          ? `${profileForm.fullName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`
          : 'student@gmail.com'

      const data = await apiFetch<{
        user: SessionUser
        csrfToken: string
        needsProfile: boolean
      }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          name: devName,
          email: devEmail,
          googleId: devEmail,
        }),
      })
      setUser(data.user)
      setCsrf(data.csrfToken)
      if (data.needsProfile) {
        setProfileForm((prev) => ({
          ...prev,
          fullName: data.user.name || devName,
        }))
        setStep('profile')
        toast.success('Signed in! Please complete your profile.')
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

  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google/start?role=STUDENT'
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await apiFetch('/api/student/profile', {
        method: 'POST',
        body: JSON.stringify(profileForm),
      })
      await refresh()
      toast.success('Profile saved. Your dashboard is ready.')
      close()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const title =
    step === 'profile'
      ? 'Complete your profile'
      : loginRole === 'TEACHER'
        ? teacherMode === 'register'
          ? 'Create teacher account'
          : 'Teacher sign in'
        : 'Student sign in'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <div className="bg-muted/40 px-6 pt-6 pb-4 border-b">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-3">
              {step === 'profile' ? (
                <button
                  type="button"
                  onClick={() => setStep('auth')}
                  className="size-10 rounded-xl border bg-card/80 grid place-items-center hover:bg-card transition-colors"
                >
                  <ArrowLeft className="size-4" />
                </button>
              ) : (
                <div className="size-10 rounded-xl bg-primary/15 text-primary grid place-items-center">
                  {loginRole === 'TEACHER' ? (
                    <Users className="size-5" />
                  ) : (
                    <GraduationCap className="size-5" />
                  )}
                </div>
              )}
              <div>
                <DialogTitle className="text-xl">{title}</DialogTitle>
                <DialogDescription className="text-sm">
                  {step === 'profile'
                    ? 'Tell us a little about yourself so we can personalize your dashboard.'
                    : loginRole === 'TEACHER'
                      ? 'Manage classrooms and mark attendance for your students.'
                      : 'Sign in securely and track your attendance in one place.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          {loginRole === 'STUDENT' && step === 'auth' && (
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 justify-center gap-3 font-medium bg-card hover:bg-accent"
                onClick={handleGoogleSignIn}
                disabled={busy}
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Dev mode (no Google credentials)
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dev-name">Your name</Label>
                  <Input
                    id="dev-name"
                    value={profileForm.fullName}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, fullName: e.target.value }))
                    }
                    placeholder="Divyansh Kumar"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleDevGoogle}
                  disabled={busy || !profileForm.fullName.trim()}
                >
                  {busy ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : null}
                  Quick sign-in (development)
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                Your session is stored securely on this device. You won&apos;t need to
                sign in again until you log out.
              </p>
            </div>
          )}

          {loginRole === 'STUDENT' && step === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-4 max-h-[60vh] overflow-y-auto scroll-thin pr-1">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Student name</Label>
                <Input
                  id="profile-name"
                  value={profileForm.fullName}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, fullName: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-roll"
                  checked={profileForm.hasRollNumber}
                  onCheckedChange={(v) =>
                    setProfileForm((p) => ({
                      ...p,
                      hasRollNumber: v === true,
                      rollNo: v === true ? p.rollNo : '',
                    }))
                  }
                />
                <Label htmlFor="has-roll" className="font-normal cursor-pointer">
                  I have a roll number
                </Label>
              </div>

              {profileForm.hasRollNumber && (
                <div className="space-y-1.5">
                  <Label htmlFor="profile-roll">Roll number</Label>
                  <Input
                    id="profile-roll"
                    value={profileForm.rollNo}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, rollNo: e.target.value }))
                    }
                    placeholder="BCA2026001"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setProfileForm((p) => ({ ...p, studentType: 'SCHOOL' }))
                  }
                  className={`rounded-xl border p-4 text-left transition-all ${
                    profileForm.studentType === 'SCHOOL'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'hover:border-primary/40'
                  }`}
                >
                  <School className="size-5 mb-2 text-primary" />
                  <p className="font-medium text-sm">School Student</p>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setProfileForm((p) => ({ ...p, studentType: 'COLLEGE' }))
                  }
                  className={`rounded-xl border p-4 text-left transition-all ${
                    profileForm.studentType === 'COLLEGE'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'hover:border-primary/40'
                  }`}
                >
                  <Building2 className="size-5 mb-2 text-primary" />
                  <p className="font-medium text-sm">College Student</p>
                </button>
              </div>

              {profileForm.studentType === 'SCHOOL' ? (
                <>
                  <div className="space-y-1.5">
                    <Label>School name</Label>
                    <Input
                      value={profileForm.institutionName}
                      onChange={(e) =>
                        setProfileForm((p) => ({
                          ...p,
                          institutionName: e.target.value,
                        }))
                      }
                      placeholder="ABC School"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Grade/Class</Label>
                      <Input
                        value={profileForm.gradeLevel}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            gradeLevel: e.target.value,
                          }))
                        }
                        placeholder="10"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Section</Label>
                      <Input
                        value={profileForm.schoolSection}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            schoolSection: e.target.value,
                          }))
                        }
                        placeholder="A"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Academic year</Label>
                    <Input
                      value={profileForm.academicYear}
                      onChange={(e) =>
                        setProfileForm((p) => ({
                          ...p,
                          academicYear: e.target.value,
                        }))
                      }
                      placeholder="2026-27"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>College or university</Label>
                    <Input
                      value={profileForm.institutionName}
                      onChange={(e) =>
                        setProfileForm((p) => ({
                          ...p,
                          institutionName: e.target.value,
                        }))
                      }
                      placeholder="ABC College"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Course</Label>
                      <Input
                        value={profileForm.course}
                        onChange={(e) =>
                          setProfileForm((p) => ({ ...p, course: e.target.value }))
                        }
                        placeholder="BCA"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Semester</Label>
                      <Input
                        value={profileForm.semesterLabel}
                        onChange={(e) =>
                          setProfileForm((p) => ({
                            ...p,
                            semesterLabel: e.target.value,
                          }))
                        }
                        placeholder="1st Semester"
                      />
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <BookOpen className="size-4 mr-2" />
                )}
                Save profile and continue
              </Button>
            </form>
          )}

          {loginRole === 'TEACHER' && step === 'auth' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted/50">
                <button
                  type="button"
                  onClick={() => setTeacherMode('login')}
                  className={`rounded-md py-2 text-sm font-medium transition-colors ${
                    teacherMode === 'login'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherMode('register')}
                  className={`rounded-md py-2 text-sm font-medium transition-colors ${
                    teacherMode === 'register'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  Register
                </button>
              </div>

              {teacherMode === 'login' ? (
                <form onSubmit={handleTeacherLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="teacher-email">Email</Label>
                    <Input
                      id="teacher-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rao@attendx.edu"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacher-password">Password</Label>
                    <Input
                      id="teacher-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={busy}>
                    {busy ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="size-4 mr-2" />
                    )}
                    Sign in as Teacher
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleTeacherRegister} className="space-y-3 max-h-[55vh] overflow-y-auto scroll-thin pr-1">
                  <div className="space-y-1.5">
                    <Label>Full name</Label>
                    <Input
                      value={teacherForm.fullName}
                      onChange={(e) =>
                        setTeacherForm((p) => ({ ...p, fullName: e.target.value }))
                      }
                      placeholder="Rahul Sharma"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={teacherForm.email}
                      onChange={(e) =>
                        setTeacherForm((p) => ({ ...p, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={teacherForm.password}
                        onChange={(e) =>
                          setTeacherForm((p) => ({ ...p, password: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm</Label>
                      <Input
                        type="password"
                        value={teacherForm.confirm}
                        onChange={(e) =>
                          setTeacherForm((p) => ({ ...p, confirm: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subject taught</Label>
                    <Input
                      value={teacherForm.subjectTaught}
                      onChange={(e) =>
                        setTeacherForm((p) => ({
                          ...p,
                          subjectTaught: e.target.value,
                        }))
                      }
                      placeholder="Programming"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Institution</Label>
                    <Input
                      value={teacherForm.institutionName}
                      onChange={(e) =>
                        setTeacherForm((p) => ({
                          ...p,
                          institutionName: e.target.value,
                        }))
                      }
                      placeholder="ABC College"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={busy}>
                    {busy ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : null}
                    Create teacher account
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
