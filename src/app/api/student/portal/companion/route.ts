import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { assertCsrf, handleRouteError, json, requireRole } from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { createPortalPairingCode, hashPortalCompanionSecret } from '@/lib/portal-companion'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    if (!session.studentId) return json({ error: 'Student profile missing' }, 403)
    const [devices, jobs] = await Promise.all([
      db.portalCompanionDevice.findMany({
        where: { studentId: session.studentId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          status: true,
          lastSeenAt: true,
          pairedAt: true,
          revokedAt: true,
        },
      }),
      db.portalCompanionJob.findMany({
        where: { studentId: session.studentId },
        orderBy: { queuedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          queuedAt: true,
          startedAt: true,
          completedAt: true,
        },
      }),
    ])
    return json({ devices, jobs })
  } catch (e) {
    return handleRouteError(e, 'student/portal/companion')
  }
}

export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const session = await requireRole('STUDENT')
    if (!session.studentId) return json({ error: 'Student profile missing' }, 403)
    await rateLimit({
      ip: getClientIp(req),
      identifier: `portal-companion-pair:${session.studentId}`,
      rule: { name: 'portal:companion-pair', limit: 5, windowMs: 15 * 60 * 1000 },
    })

    await db.portalCompanionPairing.deleteMany({
      where: { studentId: session.studentId, OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
    })
    const code = createPortalPairingCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await db.portalCompanionPairing.create({
      data: {
        studentId: session.studentId,
        codeHash: hashPortalCompanionSecret(code),
        expiresAt,
      },
    })
    return json({ ok: true, code, expiresAt })
  } catch (e) {
    return handleRouteError(e, 'student/portal/companion/pair')
  }
}
