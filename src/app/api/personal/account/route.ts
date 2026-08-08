import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  json,
  errorResponse,
  AuthError,
  destroySession,
  validateCsrfToken,
} from '@/lib/auth'

// DELETE /api/personal/account — delete the PersonalUser (cascades to all related data)
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    await db.personalUser.delete({ where: { id: session.id } })
    await destroySession()
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
