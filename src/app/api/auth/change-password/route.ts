import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getSession,
  hashPassword,
  verifyPassword,
  parseBody,
  json,
  errorResponse,
  AuthError,
  assertCsrf,
  destroySession,
  handleRouteError,
} from '@/lib/auth'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/authz'
import { validatePasswordPolicy } from '@/lib/security'
import { sendPasswordChangedNotification } from '@/lib/email'

export const runtime = 'nodejs'

// POST /api/auth/change-password — college users (STUDENT / TEACHER / ADMIN).
//
// Two flows:
//   1. CHANGE — the account already has a password. `currentPassword` is
//      verified first; the new password is hashed and stored.
//   2. CREATE — the account was created via Google and has no application
//      password yet. No `currentPassword` is needed; a password is created.
//
// Passwords are always hashed (scrypt+salt) server-side, never stored in
// plaintext, and never accepted from the client in any other way.
export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const session = await getSession()
    if (!session || session.role === 'PERSONAL') {
      throw new AuthError('Not signed in', 401)
    }

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

    if (
      typeof newPassword !== 'string' ||
      typeof confirm !== 'string' ||
      (currentPassword !== undefined && typeof currentPassword !== 'string')
    ) {
      return errorResponse('New password and confirmation are required', 400)
    }
    if (newPassword !== confirm) return errorResponse('New passwords do not match', 400)
    if (newPassword.length > 128 || (currentPassword && currentPassword.length > 128)) {
      return errorResponse('Password must be at most 128 characters long', 400)
    }

    const user = await db.user.findUnique({
      where: { id: session.id },
      include: { admin: true, teacher: true, student: true },
    })
    if (!user) {
      throw new AuthError('Account not found', 404)
    }

    if (user.passwordHash) {
      if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
        return errorResponse('Current password is incorrect', 401)
      }
    }
    if (user.passwordHash && verifyPassword(newPassword, user.passwordHash)) {
      return errorResponse('Choose a password you have not used before.', 400)
    }

    const policy = validatePasswordPolicy(newPassword, {
      email: user.email,
      name: user.admin?.fullName || user.teacher?.fullName || user.student?.fullName || user.email,
    })
    if (!policy.ok) {
      return errorResponse(policy.reason, 400)
    }

    const now = new Date()
    const changed = await db.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: {
          id: user.id,
          passwordHash: user.passwordHash,
          securityVersion: user.securityVersion,
          disabled: false,
        },
        data: {
          passwordHash: hashPassword(newPassword),
          securityVersion: { increment: 1 },
          passwordChangedAt: now,
        },
      })
      if (result.count === 1) {
        await tx.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: now },
        })
      }
      return result
    })
    if (changed.count !== 1) throw new AuthError('Your account changed. Sign in again and retry.', 409)

    await destroySession()
    try {
      await sendPasswordChangedNotification(user.email)
    } catch (error) {
      console.error('[auth/change-password] notification delivery failed', {
        errorType: error instanceof Error ? error.name : 'unknown',
      })
    }
    return json({ ok: true, reauthenticate: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'auth/change-password')
  }
}
