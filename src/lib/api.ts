'use client'

// AttendX — API fetch helper with automatic CSRF token attachment.
import { useAuth } from '@/stores/auth-store'

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const isMutation = method !== 'GET' && method !== 'HEAD'

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (isMutation) {
    const csrf = useAuth.getState().csrfToken
    if (csrf) headers['x-csrf-token'] = csrf
  }

  const res = await fetch(url, { ...options, headers, cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data && (data as { error: string }).error) ||
      `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}
