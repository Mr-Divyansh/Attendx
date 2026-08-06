'use client'

import { useEffect } from 'react'
import { useAuth } from '@/stores/auth-store'
import { Landing } from '@/components/landing'
import { AuthModal } from '@/components/auth-modal'
import { AdminDashboard } from '@/components/modules/admin-dashboard'
import { TeacherDashboard } from '@/components/modules/teacher-dashboard'
import { StudentDashboard } from '@/components/modules/student-dashboard'
import { PersonalDashboard } from '@/components/modules/personal-dashboard'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { user, loading, view, refresh } = useAuth()

  useEffect(() => {
    refresh()
  }, [refresh])

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
      ) : view === 'admin' ? (
        <AdminDashboard />
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
