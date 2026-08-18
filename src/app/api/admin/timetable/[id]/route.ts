import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  json,
  errorResponse,
  AuthError,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'

export const runtime = 'nodejs'

// DELETE /api/admin/timetable/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN')
    await assertCsrf(req)
    const { id } = await params
    await db.timetable.delete({ where: { id } })
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/timetable/[id]')
  }
}
