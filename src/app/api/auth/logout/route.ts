import {
  destroySession,
  json,
} from '@/lib/auth'

// POST /api/auth/logout — destroy session
export async function POST() {
  await destroySession()
  return json({ ok: true })
}
