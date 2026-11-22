import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { assertCsrf, handleRouteError, json, parseBody, requireRole } from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const session = await requireRole('STUDENT')
    if (!session.studentId) return json({ error: 'Student profile missing' }, 403)
    await rateLimit({
      ip: getClientIp(req),
      identifier: `portal-companion-job:${session.studentId}`,
      rule: RULES.portal,
    })
    const body = await parseBody<{ type?: 'OPEN_LOGIN' | 'SYNC' | 'CLEAR_SESSION' }>(req)
    if (!body.type || !['OPEN_LOGIN', 'SYNC', 'CLEAR_SESSION'].includes(body.type)) {
      return json({ error: 'Invalid companion job type' }, 400)
    }
    const device = await db.portalCompanionDevice.findFirst({
      where: { studentId: session.studentId, status: 'CONNECTED', revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
    })
    if (!device) return json({ error: 'No connected local companion device', code: 'COMPANION_NOT_PAIRED' }, 409)

    const job = await db.portalCompanionJob.create({
      data: {
        studentId: session.studentId,
        deviceId: device.id,
        type: body.type,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      select: { id: true, type: true, status: true, queuedAt: true },
    })
    return json({ ok: true, job })
  } catch (e) {
    return handleRouteError(e, 'student/portal/companion/job')
  }
}
