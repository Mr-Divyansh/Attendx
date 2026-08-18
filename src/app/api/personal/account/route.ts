import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  json,
  errorResponse,
  AuthError,
  destroySession,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'

// DELETE /api/personal/account — delete the PersonalUser (cascades to all related data)
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    await assertCsrf(req)
    await db.personalUser.delete({ where: { id: session.id } })
    await destroySession()
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'personal/account')
  }
}
