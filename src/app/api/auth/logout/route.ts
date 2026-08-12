import {
  destroySession,
  json,
  errorResponse,
  handleRouteError,
  validateCsrfToken,
} from '@/lib/auth'

// POST /api/auth/logout — destroy session
export async function POST(req: Request) {
  try {
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      return errorResponse('Invalid or missing CSRF token', 403)
    }
    await destroySession()
    return json({ ok: true })

  } catch (e) {
    return handleRouteError(e, 'auth/logout')
  }
}
