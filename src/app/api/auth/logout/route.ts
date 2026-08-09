import {
  destroySession,
  json,
  handleRouteError,
} from '@/lib/auth'

// POST /api/auth/logout — destroy session
export async function POST() {
  try {
    await destroySession()
    return json({ ok: true })

  } catch (e) {
    return handleRouteError(e, 'auth/logout')
  }
}
