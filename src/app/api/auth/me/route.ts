import { getSession, json,
  handleRouteError,
} from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/auth/me — current session user
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return json({ user: null })
    return json({ user: session })

  } catch (e) {
    return handleRouteError(e, 'auth/me')
  }
}
