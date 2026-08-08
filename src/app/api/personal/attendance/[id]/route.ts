import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  json,
  errorResponse,
  AuthError,
  validateCsrfToken,
} from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

// DELETE /api/personal/attendance/[id] — delete a single attendance entry (must own it)
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireRole('PERSONAL')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const { id } = await ctx.params

    const existing = await db.personalAttendance.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.id) {
      return errorResponse('Not found', 404)
    }

    await db.personalAttendance.delete({ where: { id } })
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
