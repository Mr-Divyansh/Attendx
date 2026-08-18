'use client'

// AttendX — Sign in / Register experience.
// A professional, focused auth flow with an explicit role selection step
// ("I am a Student" / "I am a Teacher"), secure email+password forms, real
// Google OAuth, and server-side role assignment on registration.
import { useEffect, useState } from 'react'
import { useAuth, type SessionUser } from '@/stores/auth-store'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import {
  GraduationCap,
  Users,
  Loader2,
  BookOpen,
  Building2,
  School,
  ArrowLeft,
  UserRound,
  Mail,
  Lock,
  ShieldCheck,
} from 'lucide-react'

type Step =
  | 'role'
  | 'student-login'
  | 'student-register'
  | 'student-otp'
  | 'teacher-login'
  | 'teacher-register'
  | 'teacher-otp'
  | 'personal-login'
  | 'personal-register'
  | 'personal-otp'
  | 'student-profile'
  | 'teacher-profile'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
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
  )
}

type StudentProfileForm = {
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

const emptyStudentProfile: StudentProfileForm = {
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
}

export function AuthModal() {
  const { loginRole, openLogin, setUser, setCsrf, refresh, forceProfileSetup } = useAuth()
  const open = loginRole !== null

  const [step, setStep] = useState<Step>('role')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Student login / register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reg, setReg] = useState({ fullName: '', email: '', password: '', confirm: '' })

  // Teacher register
  const [teacherReg, setTeacherReg] = useState({
    fullName: '',
    email: '',
    password: '',
    confirm: '',
    subjectTaught: '',
    institutionName: '',
  })

  // Teacher profile
  const [teacherProfile, setTeacherProfile] = useState({
    fullName: '',
    subjectTaught: '',
    institutionName: '',
  })

  // Personal login / register
  const [personal, setPersonal] = useState({
    username: '',
    password: '',
    confirm: '',
    fullName: '',
  })

  const [studentProfile, setStudentProfile] =
    useState<StudentProfileForm>(emptyStudentProfile)

  // OTP state
  const [otp, setOtp] = useState('')
  const [otpTicket, setOtpTicket] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpResendDisabled, setOtpResendDisabled] = useState(false)
  const [otpResendCountdown, setOtpResendCountdown] = useState(0)

  useEffect(() => {
    if (open) {
      setErr(null)
      setStep(
        forceProfileSetup
          ? loginRole === 'TEACHER'
            ? 'teacher-profile'
            : 'student-profile'
          : 'role'
      )
    }
  }, [open, loginRole, forceProfileSetup])

  const close = () => {
    openLogin(null)
    setStep('role')
    setErr(null)
    setInfo(null)
    setBusy(false)
    setEmail('')
    setPassword('')
    setReg({ fullName: '', email: '', password: '', confirm: '' })
    setTeacherReg({
      fullName: '',
      email: '',
      password: '',
      confirm: '',
      subjectTaught: '',
      institutionName: '',
    })
    setPersonal({ username: '', password: '', confirm: '', fullName: '' })
    setStudentProfile(emptyStudentProfile)
    setOtp('')
    setOtpTicket('')
    setOtpEmail('')
    setOtpResendDisabled(false)
    setOtpResendCountdown(0)
  }

  const finishAuth = async () => {
    await refresh()
    close()
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setErr(null)
    setInfo(null)
    try {
      await fn()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // New-email login flow: when the API reports EMAIL_NOT_REGISTERED, jump to
  // the matching register step with email/password prefilled and explain the
  // OTP verification step that follows.
  const beginNewEmailRegistration = (kind: 'student' | 'teacher' | 'personal') => {
    const targetEmail = (kind === 'personal' ? personal.username : email).trim()
    if (kind === 'student') {
      setReg({ fullName: '', email: targetEmail, password, confirm: '' })
      setStep('student-register')
    } else if (kind === 'teacher') {
      setTeacherReg({
        fullName: '',
        email: targetEmail,
        password,
        confirm: '',
        subjectTaught: '',
        institutionName: '',
      })
      setStep('teacher-register')
    } else {
      setPersonal((p) => ({ ...p, password, confirm: '' }))
      setStep('personal-register')
    }
    setErr(null)
    setInfo(
      `No account found for ${targetEmail}. Verify your email below — we'll send a one-time code and create your account.`
    )
  }

  // ── STUDENT ──────────────────────────────────────────────────────────────
  const handleStudentLogin = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
      try {
        const data = await apiFetch<{ user: SessionUser; csrfToken: string }>(
          '/api/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({ email, password, role: 'STUDENT' }),
          }
        )
        setUser(data.user)
        setCsrf(data.csrfToken)
        toast.success(`Welcome back, ${data.user.name}!`)
        await finishAuth()
      } catch (e2) {
        if (e2 instanceof ApiError && e2.code === 'EMAIL_NOT_REGISTERED') {
          beginNewEmailRegistration('student')
          return
        }
        throw e2
      }
    })

  const handleStudentRegister = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
      if (reg.password !== reg.confirm) {
        setErr('Passwords do not match')
        return
      }
      // Send OTP first
      const otpData = await apiFetch<{
        ok: boolean
        maskedEmail: string
        expiresInSeconds: number
        retryAfterSeconds: number
      }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          email: reg.email,
          purpose: 'register-student',
        }),
      })
      setOtpEmail(reg.email)
      setStep('student-otp')
      toast.success(`Verification code sent to ${otpData.maskedEmail}`)
      // Start resend countdown
      setOtpResendDisabled(true)
      setOtpResendCountdown(otpData.retryAfterSeconds)
      const countdown = setInterval(() => {
        setOtpResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown)
            setOtpResendDisabled(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    })

  const handleStudentOtpVerify = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
      const verifyData = await apiFetch<{
        ok: boolean
        ticket: string
        maskedEmail: string
      }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: otpEmail,
          purpose: 'register-student',
          code: otp,
        }),
      })
      setOtpTicket(verifyData.ticket)
      // Now complete registration with the ticket
      const data = await apiFetch<{
        user: SessionUser
        csrfToken: string
        needsProfile: boolean
      }>('/api/auth/register-student', {
        method: 'POST',
        body: JSON.stringify({
          fullName: reg.fullName,
          email: reg.email,
          password: reg.password,
          confirm: reg.confirm,
          ticket: verifyData.ticket,
        }),
      })
      setUser(data.user)
      setCsrf(data.csrfToken)
      setStudentProfile((p) => ({ ...p, fullName: data.user.name }))
      setInfo(null)
      setStep('student-profile')
      toast.success('Account created! Complete your profile to continue.')
    })

  const handleStudentOtpResend = () =>
    run(async () => {
      const otpData = await apiFetch<{
        ok: boolean
        maskedEmail: string
        expiresInSeconds: number
        retryAfterSeconds: number
      }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          email: otpEmail,
          purpose: 'register-student',
        }),
      })
      toast.success(`New code sent to ${otpData.maskedEmail}`)
      setOtpResendDisabled(true)
      setOtpResendCountdown(otpData.retryAfterSeconds)
      const countdown = setInterval(() => {
        setOtpResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown)
            setOtpResendDisabled(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    })

  const handleGoogle = (role: 'STUDENT' | 'TEACHER') => {
    window.location.href = `/api/auth/google/start?role=${role}`
  }

  const handleStudentProfileSave = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
      await apiFetch('/api/student/profile', {
        method: 'POST',
        body: JSON.stringify(studentProfile),
      })
      await refresh()
      toast.success('Profile saved. Your dashboard is ready.')
      close()
    })

  // ── TEACHER ──────────────────────────────────────────────────────────────
  const handleTeacherLogin = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
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
        await finishAuth()
      } catch (e2) {
        if (e2 instanceof ApiError && e2.code === 'EMAIL_NOT_REGISTERED') {
          beginNewEmailRegistration('teacher')
          return
        }
        throw e2
      }
    })

  const handleTeacherRegister = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
      if (teacherReg.password !== teacherReg.confirm) {
        setErr('Passwords do not match')
        return
      }
      // Send OTP first
      const otpData = await apiFetch<{
        ok: boolean
        maskedEmail: string
        expiresInSeconds: number
        retryAfterSeconds: number
      }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          email: teacherReg.email,
          purpose: 'register-teacher',
        }),
      })
      setOtpEmail(teacherReg.email)
      setStep('teacher-otp')
      toast.success(`Verification code sent to ${otpData.maskedEmail}`)
      // Start resend countdown
      setOtpResendDisabled(true)
      setOtpResendCountdown(otpData.retryAfterSeconds)
      const countdown = setInterval(() => {
        setOtpResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown)
            setOtpResendDisabled(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    })

  const handleTeacherOtpVerify = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
      const verifyData = await apiFetch<{
        ok: boolean
        ticket: string
        maskedEmail: string
      }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: otpEmail,
          purpose: 'register-teacher',
          code: otp,
        }),
      })
      setOtpTicket(verifyData.ticket)
      // Now complete registration with the ticket
      const data = await apiFetch<{
        user: SessionUser
        csrfToken: string
        needsProfile: boolean
      }>('/api/auth/register-teacher', {
        method: 'POST',
        body: JSON.stringify({
          ...teacherReg,
          ticket: verifyData.ticket,
        }),
      })
      setUser(data.user)
      setCsrf(data.csrfToken)
      setTeacherProfile({
        fullName: data.user.name,
        subjectTaught: teacherReg.subjectTaught,
        institutionName: teacherReg.institutionName,
      })
      setInfo(null)
      if (data.needsProfile) {
        setStep('teacher-profile')
        toast.success('Account created! Complete your teacher profile.')
      } else {
        toast.success(`Welcome, ${data.user.name}!`)
        await finishAuth()
      }
    })

  const handleTeacherOtpResend = () =>
    run(async () => {
      const otpData = await apiFetch<{
        ok: boolean
        maskedEmail: string
        expiresInSeconds: number
        retryAfterSeconds: number
      }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          email: otpEmail,
          purpose: 'register-teacher',
        }),
      })
      toast.success(`New code sent to ${otpData.maskedEmail}`)
      setOtpResendDisabled(true)
      setOtpResendCountdown(otpData.retryAfterSeconds)
      const countdown = setInterval(() => {
        setOtpResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown)
            setOtpResendDisabled(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    })

  const handleTeacherProfileSave = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
      await apiFetch('/api/teacher/profile', {
        method: 'POST',
        body: JSON.stringify(teacherProfile),
      })
      await refresh()
      toast.success('Profile saved. Your dashboard is ready.')
      close()
    })

  // ── PERSONAL ─────────────────────────────────────────────────────────────
  const handlePersonalLogin = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
      try {
        const data = await apiFetch<{ user: SessionUser; csrfToken: string }>(
          '/api/auth/login-personal',
          {
            method: 'POST',
            body: JSON.stringify({
              username: personal.username,
              password: personal.password,
            }),
          }
        )
        setUser(data.user)
        setCsrf(data.csrfToken)
        toast.success(`Welcome back, ${data.user.name}!`)
        await finishAuth()
      } catch (e2) {
        if (e2 instanceof ApiError && e2.code === 'EMAIL_NOT_REGISTERED') {
          beginNewEmailRegistration('personal')
          return
        }
        throw e2
      }
    })

  const handlePersonalRegister = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
      if (personal.password !== personal.confirm) {
        setErr('Passwords do not match')
        return
      }
      // Send OTP first
      const otpData = await apiFetch<{
        ok: boolean
        maskedEmail: string
        expiresInSeconds: number
        retryAfterSeconds: number
      }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          email: personal.username,
          purpose: 'register-personal',
        }),
      })
      setOtpEmail(personal.username)
      setStep('personal-otp')
      toast.success(`Verification code sent to ${otpData.maskedEmail}`)
      // Start resend countdown
      setOtpResendDisabled(true)
      setOtpResendCountdown(otpData.retryAfterSeconds)
      const countdown = setInterval(() => {
        setOtpResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown)
            setOtpResendDisabled(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    })

  const handlePersonalOtpVerify = (e: React.FormEvent) =>
    run(async () => {
      e.preventDefault()
      const verifyData = await apiFetch<{
        ok: boolean
        ticket: string
        maskedEmail: string
      }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: otpEmail,
          purpose: 'register-personal',
          code: otp,
        }),
      })
      setOtpTicket(verifyData.ticket)
      // Now complete registration with the ticket
      const data = await apiFetch<{ user: SessionUser; csrfToken: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            fullName: personal.fullName,
            username: personal.username,
            password: personal.password,
            confirm: personal.confirm,
            ticket: verifyData.ticket,
          }),
        }
      )
      setUser(data.user)
      setCsrf(data.csrfToken)
      setInfo(null)
      toast.success(`Welcome, ${data.user.name}!`)
      await finishAuth()
    })

  const handlePersonalOtpResend = () =>
    run(async () => {
      const otpData = await apiFetch<{
        ok: boolean
        maskedEmail: string
        expiresInSeconds: number
        retryAfterSeconds: number
      }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          email: otpEmail,
          purpose: 'register-personal',
        }),
      })
      toast.success(`New code sent to ${otpData.maskedEmail}`)
      setOtpResendDisabled(true)
      setOtpResendCountdown(otpData.retryAfterSeconds)
      const countdown = setInterval(() => {
        setOtpResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown)
            setOtpResendDisabled(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    })

  const header = useHeader(step, setStep)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        {/* Branded header */}
        <div className="px-6 pt-6 pb-5 border-b bg-muted/30">
          <DialogHeader className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl tracking-tight">
                {header.title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed max-w-sm mx-auto">
                {header.subtitle}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto scroll-thin">
          {/* Back to role selection */}
          {!header.isRole && (
            <button
              type="button"
              onClick={() => {
                setInfo(null)
                setStep('role')
              }}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              All sign-in options
            </button>
          )}

          {info && (
            <Alert className="mb-4">
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          )}
          {err && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}

          {/* ── STEP: ROLE SELECTION ─────────────────────────────────── */}
          {step === 'role' && (
            <div className="space-y-3">
              <RoleCard
                title="I am a Student"
                desc="Sign in and track your attendance in one place."
                icon={GraduationCap}
                onClick={() => setStep('student-login')}
              />
              <RoleCard
                title="I am a Teacher"
                desc="Create classrooms, invite students and mark attendance."
                icon={Users}
                onClick={() => setStep('teacher-login')}
              />
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep('personal-login')}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <UserRound className="size-4" />
                  Use the Personal attendance tracker
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: STUDENT LOGIN ──────────────────────────────────── */}
          {step === 'student-login' && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <Field label="Email" htmlFor="student-email">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="student-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="h-11 pl-10"
                    required
                  />
                </div>
              </Field>
              <Field label="Password" htmlFor="student-password">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="student-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10"
                    required
                  />
                </div>
              </Field>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Lock className="size-4 mr-2" />}
                Sign In
              </Button>

              <OrDivider />

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 justify-center gap-3 font-medium"
                onClick={() => handleGoogle('STUDENT')}
                disabled={busy}
              >
                <GoogleIcon />
                Continue with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setStep('student-register')}
                  className="font-semibold text-primary hover:underline"
                >
                  Create account
                </button>
              </p>
            </form>
          )}

          {/* ── STEP: STUDENT REGISTER ───────────────────────────────── */}
          {step === 'student-register' && (
            <form onSubmit={handleStudentRegister} className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Password Requirements:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Minimum 12 characters</li>
                  <li>• Uppercase & lowercase letters</li>
                  <li>• At least one number</li>
                  <li>• At least one special character</li>
                </ul>
              </div>
              <Field label="Full Name" htmlFor="student-reg-name">
                <Input
                  id="student-reg-name"
                  autoComplete="name"
                  value={reg.fullName}
                  onChange={(e) => setReg((r) => ({ ...r, fullName: e.target.value }))}
                  placeholder="Aarav Sharma"
                  className="h-11"
                  required
                />
              </Field>
              <Field label="Email" htmlFor="student-reg-email">
                <Input
                  id="student-reg-email"
                  type="email"
                  autoComplete="email"
                  value={reg.email}
                  onChange={(e) => setReg((r) => ({ ...r, email: e.target.value }))}
                  placeholder="you@college.edu"
                  className="h-11"
                  required
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Password" htmlFor="student-reg-pass">
                  <Input
                    id="student-reg-pass"
                    type="password"
                    autoComplete="new-password"
                    value={reg.password}
                    onChange={(e) => setReg((r) => ({ ...r, password: e.target.value }))}
                    className="h-11"
                    required
                  />
                </Field>
                <Field label="Confirm Password" htmlFor="student-reg-confirm">
                  <Input
                    id="student-reg-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={reg.confirm}
                    onChange={(e) => setReg((r) => ({ ...r, confirm: e.target.value }))}
                    className="h-11"
                    required
                  />
                </Field>
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <BookOpen className="size-4 mr-2" />}
                Send Verification Code
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setStep('student-login')}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* ── STEP: STUDENT OTP ──────────────────────────────────── */}
          {step === 'student-otp' && (
            <form onSubmit={handleStudentOtpVerify} className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to your email
                </p>
                <p className="text-xs text-muted-foreground">
                  {otpEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  className="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy || otp.length !== 6}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ShieldCheck className="size-4 mr-2" />}
                Verify & Create Account
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleStudentOtpResend}
                  disabled={otpResendDisabled || busy}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpResendDisabled
                    ? `Resend code in ${otpResendCountdown}s`
                    : "Didn't receive a code? Resend"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setStep('student-register')}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to registration
              </button>
            </form>
          )}

          {/* ── STEP: TEACHER LOGIN ──────────────────────────────────── */}
          {step === 'teacher-login' && (
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <Field label="Email" htmlFor="teacher-email">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="teacher-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rao@college.edu"
                    className="h-11 pl-10"
                    required
                  />
                </div>
              </Field>
              <Field label="Password" htmlFor="teacher-password">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="teacher-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10"
                    required
                  />
                </div>
              </Field>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Users className="size-4 mr-2" />}
                Sign In
              </Button>

              <OrDivider />

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 justify-center gap-3 font-medium"
                onClick={() => handleGoogle('TEACHER')}
                disabled={busy}
              >
                <GoogleIcon />
                Continue with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setStep('teacher-register')}
                  className="font-semibold text-primary hover:underline"
                >
                  Create teacher account
                </button>
              </p>
            </form>
          )}

          {/* ── STEP: TEACHER REGISTER ───────────────────────────────── */}
          {step === 'teacher-register' && (
            <form onSubmit={handleTeacherRegister} className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Password Requirements:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Minimum 12 characters</li>
                  <li>• Uppercase & lowercase letters</li>
                  <li>• At least one number</li>
                  <li>• At least one special character</li>
                </ul>
              </div>
              <Field label="Full Name" htmlFor="teacher-reg-name">
                <Input
                  id="teacher-reg-name"
                  autoComplete="name"
                  value={teacherReg.fullName}
                  onChange={(e) =>
                    setTeacherReg((r) => ({ ...r, fullName: e.target.value }))
                  }
                  placeholder="Rahul Sharma"
                  className="h-11"
                  required
                />
              </Field>
              <Field label="Email" htmlFor="teacher-reg-email">
                <Input
                  id="teacher-reg-email"
                  type="email"
                  autoComplete="email"
                  value={teacherReg.email}
                  onChange={(e) =>
                    setTeacherReg((r) => ({ ...r, email: e.target.value }))
                  }
                  placeholder="rao@college.edu"
                  className="h-11"
                  required
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Password" htmlFor="teacher-reg-pass">
                  <Input
                    id="teacher-reg-pass"
                    type="password"
                    autoComplete="new-password"
                    value={teacherReg.password}
                    onChange={(e) =>
                      setTeacherReg((r) => ({ ...r, password: e.target.value }))
                    }
                    className="h-11"
                    required
                  />
                </Field>
                <Field label="Confirm" htmlFor="teacher-reg-confirm">
                  <Input
                    id="teacher-reg-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={teacherReg.confirm}
                    onChange={(e) =>
                      setTeacherReg((r) => ({ ...r, confirm: e.target.value }))
                    }
                    className="h-11"
                    required
                  />
                </Field>
              </div>
              <Field label="Subject(s) Taught" htmlFor="teacher-reg-subject">
                <Input
                  id="teacher-reg-subject"
                  value={teacherReg.subjectTaught}
                  onChange={(e) =>
                    setTeacherReg((r) => ({ ...r, subjectTaught: e.target.value }))
                  }
                  placeholder="Programming, Data Structures"
                  className="h-11"
                />
              </Field>
              <Field label="Institution / School / College" htmlFor="teacher-reg-institution">
                <Input
                  id="teacher-reg-institution"
                  value={teacherReg.institutionName}
                  onChange={(e) =>
                    setTeacherReg((r) => ({ ...r, institutionName: e.target.value }))
                  }
                  placeholder="ABC College of Engineering"
                  className="h-11"
                />
              </Field>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Users className="size-4 mr-2" />}
                Send Verification Code
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setStep('teacher-login')}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* ── STEP: TEACHER OTP ──────────────────────────────────── */}
          {step === 'teacher-otp' && (
            <form onSubmit={handleTeacherOtpVerify} className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to your email
                </p>
                <p className="text-xs text-muted-foreground">
                  {otpEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  className="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy || otp.length !== 6}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ShieldCheck className="size-4 mr-2" />}
                Verify & Create Account
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleTeacherOtpResend}
                  disabled={otpResendDisabled || busy}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpResendDisabled
                    ? `Resend code in ${otpResendCountdown}s`
                    : "Didn't receive a code? Resend"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setStep('teacher-register')}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to registration
              </button>
            </form>
          )}

          {/* ── STEP: PERSONAL LOGIN / REGISTER ──────────────────────── */}
          {step === 'personal-login' && (
            <form onSubmit={handlePersonalLogin} className="space-y-4">
              <Field label="Username" htmlFor="personal-username">
                <Input
                  id="personal-username"
                  autoComplete="username"
                  value={personal.username}
                  onChange={(e) =>
                    setPersonal((p) => ({ ...p, username: e.target.value }))
                  }
                  placeholder="your.username"
                  className="h-11"
                  required
                />
              </Field>
              <Field label="Password" htmlFor="personal-password">
                <Input
                  id="personal-password"
                  type="password"
                  autoComplete="current-password"
                  value={personal.password}
                  onChange={(e) =>
                    setPersonal((p) => ({ ...p, password: e.target.value }))
                  }
                  className="h-11"
                  required
                />
              </Field>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <UserRound className="size-4 mr-2" />}
                Sign In
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                New here?{' '}
                <button
                  type="button"
                  onClick={() => setStep('personal-register')}
                  className="font-semibold text-primary hover:underline"
                >
                  Create an account
                </button>
              </p>
            </form>
          )}

          {step === 'personal-register' && (
            <form onSubmit={handlePersonalRegister} className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Password Requirements:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Minimum 12 characters</li>
                  <li>• Uppercase & lowercase letters</li>
                  <li>• At least one number</li>
                  <li>• At least one special character</li>
                </ul>
              </div>
              <Field label="Full Name" htmlFor="personal-reg-name">
                <Input
                  id="personal-reg-name"
                  autoComplete="name"
                  value={personal.fullName}
                  onChange={(e) =>
                    setPersonal((p) => ({ ...p, fullName: e.target.value }))
                  }
                  className="h-11"
                  required
                />
              </Field>
              <Field label="Username (Email)" htmlFor="personal-reg-username">
                <Input
                  id="personal-reg-username"
                  autoComplete="username"
                  type="email"
                  value={personal.username}
                  onChange={(e) =>
                    setPersonal((p) => ({ ...p, username: e.target.value }))
                  }
                  placeholder="your.email@example.com"
                  className="h-11"
                  required
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Password" htmlFor="personal-reg-pass">
                  <Input
                    id="personal-reg-pass"
                    type="password"
                    autoComplete="new-password"
                    value={personal.password}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, password: e.target.value }))
                    }
                    className="h-11"
                    required
                  />
                </Field>
                <Field label="Confirm" htmlFor="personal-reg-confirm">
                  <Input
                    id="personal-reg-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={personal.confirm}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, confirm: e.target.value }))
                    }
                    className="h-11"
                    required
                  />
                </Field>
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <BookOpen className="size-4 mr-2" />}
                Send Verification Code
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setStep('personal-login')}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* ── STEP: PERSONAL OTP ─────────────────────────────────── */}
          {step === 'personal-otp' && (
            <form onSubmit={handlePersonalOtpVerify} className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to your email
                </p>
                <p className="text-xs text-muted-foreground">
                  {otpEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  className="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy || otp.length !== 6}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ShieldCheck className="size-4 mr-2" />}
                Verify & Create Account
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handlePersonalOtpResend}
                  disabled={otpResendDisabled || busy}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpResendDisabled
                    ? `Resend code in ${otpResendCountdown}s`
                    : "Didn't receive a code? Resend"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setStep('personal-register')}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to registration
              </button>
            </form>
          )}

          {/* ── STEP: STUDENT PROFILE SETUP ──────────────────────────── */}
          {step === 'student-profile' && (
            <form onSubmit={handleStudentProfileSave} className="space-y-4">
              <Field label="Student name" htmlFor="profile-name">
                <Input
                  id="profile-name"
                  value={studentProfile.fullName}
                  onChange={(e) =>
                    setStudentProfile((p) => ({ ...p, fullName: e.target.value }))
                  }
                  required
                />
              </Field>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-roll"
                  checked={studentProfile.hasRollNumber}
                  onCheckedChange={(v) =>
                    setStudentProfile((p) => ({
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

              {studentProfile.hasRollNumber && (
                <Field label="Roll number" htmlFor="profile-roll">
                  <Input
                    id="profile-roll"
                    value={studentProfile.rollNo}
                    onChange={(e) =>
                      setStudentProfile((p) => ({ ...p, rollNo: e.target.value }))
                    }
                    placeholder="BCA2026001"
                    required
                  />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setStudentProfile((p) => ({ ...p, studentType: 'SCHOOL' }))
                  }
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    studentProfile.studentType === 'SCHOOL'
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
                    setStudentProfile((p) => ({ ...p, studentType: 'COLLEGE' }))
                  }
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    studentProfile.studentType === 'COLLEGE'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'hover:border-primary/40'
                  }`}
                >
                  <Building2 className="size-5 mb-2 text-primary" />
                  <p className="font-medium text-sm">College Student</p>
                </button>
              </div>

              {studentProfile.studentType === 'SCHOOL' ? (
                <>
                  <Field label="School name">
                    <Input
                      value={studentProfile.institutionName}
                      onChange={(e) =>
                        setStudentProfile((p) => ({
                          ...p,
                          institutionName: e.target.value,
                        }))
                      }
                      placeholder="ABC School"
                      required
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Grade/Class">
                      <Input
                        value={studentProfile.gradeLevel}
                        onChange={(e) =>
                          setStudentProfile((p) => ({
                            ...p,
                            gradeLevel: e.target.value,
                          }))
                        }
                        placeholder="10"
                        required
                      />
                    </Field>
                    <Field label="Section">
                      <Input
                        value={studentProfile.schoolSection}
                        onChange={(e) =>
                          setStudentProfile((p) => ({
                            ...p,
                            schoolSection: e.target.value,
                          }))
                        }
                        placeholder="A"
                      />
                    </Field>
                  </div>
                  <Field label="Academic year">
                    <Input
                      value={studentProfile.academicYear}
                      onChange={(e) =>
                        setStudentProfile((p) => ({
                          ...p,
                          academicYear: e.target.value,
                        }))
                      }
                      placeholder="2026-27"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="College or university">
                    <Input
                      value={studentProfile.institutionName}
                      onChange={(e) =>
                        setStudentProfile((p) => ({
                          ...p,
                          institutionName: e.target.value,
                        }))
                      }
                      placeholder="ABC College"
                      required
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Course">
                      <Input
                        value={studentProfile.course}
                        onChange={(e) =>
                          setStudentProfile((p) => ({ ...p, course: e.target.value }))
                        }
                        placeholder="BCA"
                        required
                      />
                    </Field>
                    <Field label="Semester">
                      <Input
                        value={studentProfile.semesterLabel}
                        onChange={(e) =>
                          setStudentProfile((p) => ({
                            ...p,
                            semesterLabel: e.target.value,
                          }))
                        }
                        placeholder="1st Semester"
                      />
                    </Field>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <BookOpen className="size-4 mr-2" />}
                Save profile and continue
              </Button>
            </form>
          )}

          {/* ── STEP: TEACHER PROFILE SETUP ──────────────────────────── */}
          {step === 'teacher-profile' && (
            <form onSubmit={handleTeacherProfileSave} className="space-y-4">
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 mt-0.5 shrink-0 text-primary" />
                Add the details teachers need — your subject and institution — so
                you can be matched with classrooms and students.
              </p>
              <Field label="Full name" htmlFor="tprofile-name">
                <Input
                  id="tprofile-name"
                  value={teacherProfile.fullName}
                  onChange={(e) =>
                    setTeacherProfile((p) => ({ ...p, fullName: e.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Subject(s) taught" htmlFor="tprofile-subject">
                <Input
                  id="tprofile-subject"
                  value={teacherProfile.subjectTaught}
                  onChange={(e) =>
                    setTeacherProfile((p) => ({
                      ...p,
                      subjectTaught: e.target.value,
                    }))
                  }
                  placeholder="Programming, Data Structures"
                  required
                />
              </Field>
              <Field label="Institution / School / College" htmlFor="tprofile-institution">
                <Input
                  id="tprofile-institution"
                  value={teacherProfile.institutionName}
                  onChange={(e) =>
                    setTeacherProfile((p) => ({
                      ...p,
                      institutionName: e.target.value,
                    }))
                  }
                  placeholder="ABC College of Engineering"
                  required
                />
              </Field>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <BookOpen className="size-4 mr-2" />}
                Save and continue
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Small building blocks ───────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function OrDivider() {
  return (
    <div className="relative my-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wider">
        <span className="bg-background px-3 text-muted-foreground">or</span>
      </div>
    </div>
  )
}

function RoleCard({
  title,
  desc,
  icon: Icon,
  onClick,
}: {
  title: string
  desc: string
  icon: React.ElementType
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <span className="text-primary text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100">
        Continue →
      </span>
    </button>
  )
}

function useHeader(step: Step, _setStep: (s: Step) => void): {
  title: string
  subtitle: string
  isRole: boolean
} {
  switch (step) {
    case 'role':
      return {
        title: 'Welcome to AttendX',
        subtitle: 'Choose how you want to sign in to continue.',
        isRole: true,
      }
    case 'student-login':
      return {
        title: 'Student Sign In',
        subtitle: 'Sign in securely and track your attendance in one place.',
        isRole: false,
      }
    case 'student-register':
      return {
        title: 'Create Student Account',
        subtitle: 'Register to track your attendance and join classrooms.',
        isRole: false,
      }
    case 'student-otp':
      return {
        title: 'Verify Your Email',
        subtitle: 'Enter the verification code sent to your email address.',
        isRole: false,
      }
    case 'teacher-login':
      return {
        title: 'Teacher Sign In',
        subtitle: 'Sign in to manage classrooms and mark attendance.',
        isRole: false,
      }
    case 'teacher-register':
      return {
        title: 'Create Teacher Account',
        subtitle: 'Register to create classrooms and manage your students.',
        isRole: false,
      }
    case 'teacher-otp':
      return {
        title: 'Verify Your Email',
        subtitle: 'Enter the verification code sent to your email address.',
        isRole: false,
      }
    case 'personal-login':
      return {
        title: 'Personal Tracker Sign In',
        subtitle: 'Sign in to your personal attendance tracker.',
        isRole: false,
      }
    case 'personal-register':
      return {
        title: 'Create Personal Tracker',
        subtitle: 'Build your own independent attendance tracker.',
        isRole: false,
      }
    case 'personal-otp':
      return {
        title: 'Verify Your Email',
        subtitle: 'Enter the verification code sent to your email address.',
        isRole: false,
      }
    case 'student-profile':
      return {
        title: 'Complete your profile',
        subtitle: 'Tell us a little about yourself so we can personalize your dashboard.',
        isRole: false,
      }
    case 'teacher-profile':
      return {
        title: 'Complete your teacher profile',
        subtitle: 'Add your subject and institution to get started.',
        isRole: false,
      }
    default:
      return { title: 'AttendX', subtitle: '', isRole: true }
  }
}
