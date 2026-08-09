import { issueCsrfToken, json,
  handleRouteError,
} from '@/lib/auth'

// GET /api/auth/csrf — issue a CSRF token for the current session
export async function GET() {
  try {
    const token = await issueCsrfToken()
    return json({ token })

  } catch (e) {
    return handleRouteError(e, 'auth/csrf')
  }
}
