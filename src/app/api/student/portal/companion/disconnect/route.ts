import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { assertCsrf, handleRouteError, json, requireRole } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const session = await requireRole('STUDENT')
    if (!session.studentId) return json({ error: 'Student profile missing' }, 403)
    await db.portalCompanionDevice.updateMany({
      where: { studentId: session.studentId, revokedAt: null },
      data: { status: 'DISCONNECTED', revokedAt: new Date() },
    })
    await db.portalConnection.updateMany({
      where: { studentId: session.studentId },
      data: { status: 'DISCONNECTED', disconnectedAt: new Date(), errorCode: null, errorMessage: null },
    })
    return json({ ok: true, status: 'DISCONNECTED' })
  } catch (e) {
    return handleRouteError(e, 'student/portal/companion/disconnect')
  }
}
