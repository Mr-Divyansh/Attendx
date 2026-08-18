import {
  destroySession,
  json,
  errorResponse,
  handleRouteError,
  assertCsrf,
} from '@/lib/auth'

// POST /api/auth/logout — destroy session
export async function POST(req: Request) {
  try {
    await assertCsrf(req)
    await destroySession()
    return json({ ok: true })

  } catch (e) {
    return handleRouteError(e, 'auth/logout')
  }
}
