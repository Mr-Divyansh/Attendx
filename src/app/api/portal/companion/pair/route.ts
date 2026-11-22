import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleRouteError, json, parseBody } from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { rateLimit } from '@/lib/rate-limit'
import {
  createPortalDeviceSecret,
  hashPortalCompanionSecret,
} from '@/lib/portal-companion'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('x-attendx-companion') !== '1') {
      return json({ error: 'Companion header missing' }, 403)
    }
    await rateLimit({
      ip: getClientIp(req),
      identifier: 'portal-companion-exchange',
      rule: { name: 'portal:companion-exchange', limit: 10, windowMs: 15 * 60 * 1000 },
    })
    const body = await parseBody<{ code?: string; deviceName?: string }>(req)
    const code = body.code?.replace(/\s/g, '')
    if (!/^\d{8}$/.test(code || '') || !body.deviceName?.trim()) {
      return json({ error: 'Invalid pairing code or device name' }, 400)
    }
    const pairing = await db.portalCompanionPairing.findUnique({
      where: { codeHash: hashPortalCompanionSecret(code!) },
    })
    if (!pairing || pairing.usedAt || pairing.expiresAt.getTime() < Date.now()) {
      return json({ error: 'Pairing code is invalid or expired' }, 401)
    }

    const secret = createPortalDeviceSecret()
    const secretHash = hashPortalCompanionSecret(secret)
    const result = await db.$transaction(async (tx) => {
      await tx.portalCompanionPairing.update({
        where: { id: pairing.id },
        data: { usedAt: new Date() },
      })
      return tx.portalCompanionDevice.create({
        data: {
          studentId: pairing.studentId,
          secretHash,
          name: body.deviceName!.trim().slice(0, 80),
          status: 'CONNECTED',
        },
        select: { id: true },
      })
    })
    return json({
      ok: true,
      deviceId: result.id,
      deviceSecret: secret,
    })
  } catch (e) {
    return handleRouteError(e, 'portal/companion/pair')
  }
}
