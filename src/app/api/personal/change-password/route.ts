import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  verifyPassword,
  hashPassword,
  AuthError,
  assertCsrf,
  handleRouteError,
  destroySession,
} from '@/lib/auth'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/authz'
import { validatePasswordPolicy } from '@/lib/security'
import { sendPasswordChangedNotification } from '@/lib/email'

export const runtime = 'nodejs'

// POST /api/personal/change-password — verify current, set new
export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const session = await requireRole('PERSONAL')

    await rateLimit({
      ip: getClientIp(req),
      identifier: `change-password:${session.id}`,
      rule: RULES.changePassword,
    })

    const { currentPassword, newPassword, confirm } = await parseBody<{
      currentPassword?: string
      newPassword?: string
      confirm?: string
    }>(req)

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || typeof confirm !== 'string') {
      return errorResponse('Current password, new password, and confirmation are required', 400)
    }
    if (newPassword !== confirm) return errorResponse('New passwords do not match', 400)
    if (currentPassword.length > 128 || newPassword.length > 128) {
      return errorResponse('Password must be at most 128 characters long', 400)
    }

    const pu = await db.personalUser.findUnique({ where: { id: session.id } })
    if (!pu) return errorResponse('User not found', 404)

    if (!verifyPassword(currentPassword, pu.passwordHash)) {
      return errorResponse('Current password is incorrect', 401)
    }
    if (verifyPassword(newPassword, pu.passwordHash)) {
      return errorResponse('Choose a password you have not used before.', 400)
    }

    const policy = validatePasswordPolicy(newPassword, {
      email: pu.username,
      name: pu.fullName,
    })
    if (!policy.ok) {
      return errorResponse(policy.reason, 400)
    }

    const now = new Date()
    const changed = await db.$transaction(async (tx) => {
      const result = await tx.personalUser.updateMany({
        where: {
          id: session.id,
          passwordHash: pu.passwordHash,
          securityVersion: pu.securityVersion,
        },
        data: {
          passwordHash: hashPassword(newPassword),
          securityVersion: { increment: 1 },
          passwordChangedAt: now,
        },
      })
      if (result.count === 1) {
        await tx.passwordResetToken.updateMany({
          where: { personalUserId: session.id, usedAt: null },
          data: { usedAt: now },
        })
      }
      return result
    })
    if (changed.count !== 1) {
      throw new AuthError('Your account changed. Sign in again and retry.', 409)
    }

    await destroySession()
    try {
      await sendPasswordChangedNotification(pu.username)
    } catch (error) {
      console.error('[personal/change-password] notification delivery failed', {
        errorType: error instanceof Error ? error.name : 'unknown',
      })
    }
    return json({ ok: true, reauthenticate: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'personal/change-password')
  }
}
