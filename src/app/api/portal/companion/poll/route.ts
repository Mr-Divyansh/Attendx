import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleRouteError, json } from '@/lib/auth'
import { getBearerSecret, hashPortalCompanionSecret } from '@/lib/portal-companion'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('x-attendx-companion') !== '1') {
      return json({ error: 'Companion header missing' }, 403)
    }
    const secret = getBearerSecret(req)
    const deviceId = req.headers.get('x-attendx-device-id')?.trim()
    if (!secret || !deviceId) return json({ error: 'Device authentication missing' }, 401)
    const device = await db.portalCompanionDevice.findFirst({
      where: {
        id: deviceId,
        secretHash: hashPortalCompanionSecret(secret),
        revokedAt: null,
        status: 'CONNECTED',
      },
    })
    if (!device) return json({ error: 'Device is not paired or was revoked' }, 401)

    await db.portalCompanionDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date(), status: 'CONNECTED' },
    })
    const job = await db.portalCompanionJob.findFirst({
      where: {
        deviceId: device.id,
        studentId: device.studentId,
        status: 'QUEUED',
        expiresAt: { gt: new Date() },
      },
      orderBy: { queuedAt: 'asc' },
    })
    if (!job) return json({ ok: true, job: null })

    await db.portalCompanionJob.update({
      where: { id: job.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    })
    return json({
      ok: true,
      job: {
        id: job.id,
        type: job.type,
      },
    })
  } catch (e) {
    return handleRouteError(e, 'portal/companion/poll')
  }
}
