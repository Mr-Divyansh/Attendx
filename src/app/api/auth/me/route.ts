import { getSession, json } from '@/lib/auth'

// GET /api/auth/me — current session user
export async function GET() {
  const session = await getSession()
  if (!session) return json({ user: null })
  return json({ user: session })
}
