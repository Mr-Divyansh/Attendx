'use client'

// AttendX — client-side auth + view state (Zustand)
import { create } from 'zustand'

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PERSONAL'

export type SessionUser = {
  id: string
  email: string
  role: Role
  name: string
  studentId?: string
  teacherId?: string
  adminId?: string
  rollNo?: string
  semesterId?: string | null
  sectionId?: string | null
  username?: string
  avatarUrl?: string | null
  goalPct?: number
  darkMode?: boolean
}

type AuthState = {
  user: SessionUser | null
  loading: boolean
  csrfToken: string | null
  view: View
  loginRole: Role | null // which login form to show
  setUser: (u: SessionUser | null) => void
  setLoading: (b: boolean) => void
  setCsrf: (t: string | null) => void
  setView: (v: View) => void
  openLogin: (role: Role | null) => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export type View =
  | 'landing'
  | 'admin'
  | 'teacher'
  | 'student'
  | 'personal'

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  csrfToken: null,
  view: 'landing',
  loginRole: null,

  setUser: (u) => {
    if (u) {
      const view: View =
        u.role === 'ADMIN'
          ? 'admin'
          : u.role === 'TEACHER'
          ? 'teacher'
          : u.role === 'STUDENT'
          ? 'student'
          : 'personal'
      set({ user: u, view })
    } else {
      set({ user: null, view: 'landing' })
    }
  },
  setLoading: (b) => set({ loading: b }),
  setCsrf: (t) => set({ csrfToken: t }),
  setView: (v) => set({ view: v }),

  openLogin: (role) => set({ loginRole: role }),

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null, view: 'landing', loginRole: null, csrfToken: null })
  },

  refresh: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      const data = await res.json()
      get().setUser(data.user || null)
      const cr = await fetch('/api/auth/csrf', { cache: 'no-store' })
      const cd = await cr.json()
      set({ csrfToken: cd.token ?? null })
    } catch {
      set({ user: null })
    } finally {
      set({ loading: false })
    }
  },
}))
