'use client'

// AttendX — client-side auth + view state (Zustand)
import { create } from 'zustand'

const AUTH_REQUEST_TIMEOUT_MS = 20_000

async function fetchAuthJson(url: string) {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`Authentication request failed (${response.status})`)
  return data
}

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PERSONAL'

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
  loginRole: Role | null
  forceProfileSetup: boolean
  setUser: (u: SessionUser | null) => void
  setLoading: (b: boolean) => void
  setCsrf: (t: string | null) => void
  setView: (v: View) => void
  openLogin: (role: Role | null, opts?: { profileSetup?: boolean }) => void
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
  forceProfileSetup: false,

  setUser: (u) => {
    if (u) {
      const view: View =
        u.role === 'SUPER_ADMIN' || u.role === 'ADMIN'
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

  openLogin: (role, opts) =>
    set({
      loginRole: role,
      forceProfileSetup: opts?.profileSetup ?? false,
    }),

  logout: async () => {
    const csrf = get().csrfToken
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: csrf ? { 'x-csrf-token': csrf } : undefined,
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
    })
    set({ user: null, view: 'landing', loginRole: null, csrfToken: null, forceProfileSetup: false })
  },

  refresh: async () => {
    set({ loading: true })
    try {
      const data = await fetchAuthJson('/api/auth/me')
      get().setUser(data.user || null)
      const csrf = await fetchAuthJson('/api/auth/csrf')
      set({ csrfToken: csrf.token ?? null })
    } catch {
      set({ user: null, csrfToken: null })
    } finally {
      set({ loading: false })
    }
  },
}))
