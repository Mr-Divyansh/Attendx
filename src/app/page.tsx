'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/stores/auth-store'
import { Landing } from '@/components/landing'
import { AuthModal } from '@/components/auth-modal'
import { TeacherDashboard } from '@/components/modules/teacher-dashboard'
import { StudentDashboard } from '@/components/modules/student-dashboard'
import { PersonalDashboard } from '@/components/modules/personal-dashboard'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

function HomeContent() {
  const { user, loading, view, refresh, openLogin } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (searchParams.get('student_setup') === '1') {
      refresh().then(() => openLogin('STUDENT', { profileSetup: true }))
      router.replace('/')
    }
    if (searchParams.get('teacher_setup') === '1') {
      refresh().then(() => openLogin('TEACHER', { profileSetup: true }))
      router.replace('/')
    }
    if (searchParams.get('student_login') === '1' || searchParams.get('teacher_login') === '1') {
      toast.success('Signed in successfully!')
      router.replace('/')
    }
    const authError = searchParams.get('auth_error')
    if (authError) {
      toast.error(`Sign-in failed: ${authError.replace(/_/g, ' ')}`)
      router.replace('/')
    }
  }, [searchParams, openLogin, router])

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      router.replace('/admin-panel')
    }
  }, [user, router])

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold">
            A
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading AttendX…
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {!user ? (
        <Landing />
      ) : view === 'teacher' ? (
        <TeacherDashboard />
      ) : view === 'student' ? (
        <StudentDashboard />
      ) : view === 'personal' ? (
        <PersonalDashboard />
      ) : (
        <Landing />
      )}
      <AuthModal />
    </>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">
          <Loader2 className="size-6 animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}