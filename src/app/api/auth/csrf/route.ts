import { issueCsrfToken, json } from '@/lib/auth'

// GET /api/auth/csrf — issue a CSRF token for the current session
export async function GET() {
  const token = await issueCsrfToken()
  return json({ token })
}
