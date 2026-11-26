'use client'

// AttendX — API fetch helper with automatic CSRF token attachment.
import { useAuth } from '@/stores/auth-store'

const REQUEST_TIMEOUT_MS = 20_000

// Error thrown by apiFetch for any non-ok response. Carries the server's
// machine-readable code (when present) so callers can branch on it.
export class ApiError extends Error {
  code?: string
  status: number

  constructor(message: string, code?: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

function requestSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
}

async function getCsrfToken(): Promise<string> {
  const cached = useAuth.getState().csrfToken
  if (cached) return cached

  let response: Response
  let data: { token?: unknown }
  try {
    response = await fetch('/api/auth/csrf', {
      cache: 'no-store',
      signal: requestSignal(),
    })
    data = await response.json().catch(() => ({})) as { token?: unknown }
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new ApiError('Security check timed out. Please try again.', 'REQUEST_TIMEOUT', 408)
    }
    throw error
  }

  if (!response.ok || typeof data.token !== 'string' || !data.token) {
    throw new ApiError('Could not establish a secure request. Refresh the page and try again.', undefined, response.status)
  }
  useAuth.getState().setCsrf(data.token)
  return data.token
}

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
    headers['x-csrf-token'] = await getCsrfToken()
  }

  let res: Response
  let data: unknown
  try {
    res = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
      signal: requestSignal(),
    })
    data = await res.json().catch(() => ({}))
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new ApiError('This request is taking too long. Please try again.', 'REQUEST_TIMEOUT', 408)
    }
    throw error
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error) ||
      `Request failed (${res.status})`
    const code =
      data && typeof data === 'object' && 'code' in data
        ? (data as { code?: string }).code
        : undefined
    throw new ApiError(msg, code, res.status)
  }
  return data as T
}
