import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  hashPassword,
  AuthError,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'
import { validatePasswordPolicy } from '@/lib/security'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { sendPasswordChangedNotification } from '@/lib/email'

export const runtime = 'nodejs'

// POST /api/admin/reset-password — admin resets any user's password.
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('ADMIN')
    await assertCsrf(req)

    await rateLimit({
      ip: getClientIp(req),
      identifier: `admin-reset-password:${session.id}`,
      rule: RULES.resetPassword,
    })

    const body = await parseBody<{ userId?: string; newPassword?: string }>(req)
    const userId = body.userId
    const newPassword = body.newPassword

    if (typeof userId !== 'string' || typeof newPassword !== 'string') {
      return errorResponse('userId and newPassword are required', 400)
    }
    if (newPassword.length > 128) return errorResponse('Password must be at most 128 characters long', 400)

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return errorResponse('User not found', 404)

    const policy = validatePasswordPolicy(newPassword, { email: user.email, name: user.email })
    if (!policy.ok) {
      return errorResponse(policy.reason, 400)
    }

    const now = new Date()
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashPassword(newPassword),
          securityVersion: { increment: 1 },
          passwordChangedAt: now,
        },
      })
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      })
    })
    try {
      await sendPasswordChangedNotification(user.email)
    } catch (error) {
      console.error('[admin/reset-password] notification delivery failed', {
        errorType: error instanceof Error ? error.name : 'unknown',
      })
    }

    await logAudit({
      action: 'admin.reset_password',
      actorId: session.id,
      actorRole: 'ADMIN',
      targetType: 'User',
      targetId: userId,
      ip: getClientIp(req),
    })

    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/reset-password')
  }
}
