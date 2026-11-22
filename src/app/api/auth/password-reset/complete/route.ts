import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  AuthError,
  assertCsrf,
  destroySession,
  errorResponse,
  handleRouteError,
  hashPassword,
  json,
  parseBody,
  verifyPassword,
} from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { sendPasswordChangedNotification } from '@/lib/email'
import {
  hashPasswordResetToken,
  isPasswordResetTokenFormat,
  isPasswordResetUsable,
} from '@/lib/password-reset'
import { validatePasswordPolicy } from '@/lib/security'
import { rateLimit, RULES } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const INVALID_LINK = 'This password reset link is invalid, expired, or has already been used.'

export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const body = await parseBody<{
      token?: string
      newPassword?: string
      confirm?: string
    }>(req)

    if (!isPasswordResetTokenFormat(body.token)) return errorResponse(INVALID_LINK, 400)
    if (typeof body.newPassword !== 'string' || typeof body.confirm !== 'string') {
      return errorResponse('New password and confirmation are required.', 400)
    }
    if (body.newPassword !== body.confirm) return errorResponse('New passwords do not match.', 400)
    if (body.newPassword.length > 128) return errorResponse('Password must be at most 128 characters long.', 400)

    const ip = getClientIp(req)
    const tokenHash = hashPasswordResetToken(body.token)
    await rateLimit({ ip, identifier: 'password-reset-complete', rule: RULES.resetPassword })
    await rateLimit({ ip, identifier: `password-reset-token:${tokenHash}`, rule: RULES.resetPassword })

    const now = new Date()
    const reset = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: { include: { admin: true, teacher: true, student: true } },
        personalUser: true,
      },
    })
    if (!reset || !isPasswordResetUsable({
      usedAt: reset.usedAt,
      expiresAt: reset.expiresAt,
      hasCollegeOwner: Boolean(reset.user),
      hasPersonalOwner: Boolean(reset.personalUser),
      ownerDisabled: reset.user?.disabled ?? false,
      now,
    })) {
      return errorResponse(INVALID_LINK, 400)
    }
    const account = reset.user
      ? {
          type: 'college' as const,
          id: reset.user.id,
          email: reset.user.email,
          passwordHash: reset.user.passwordHash,
          securityVersion: reset.user.securityVersion,
          name: reset.user.student?.fullName ?? reset.user.teacher?.fullName ?? reset.user.admin?.fullName,
        }
      : reset.personalUser
        ? {
            type: 'personal' as const,
            id: reset.personalUser.id,
            email: reset.personalUser.username,
            passwordHash: reset.personalUser.passwordHash,
            securityVersion: reset.personalUser.securityVersion,
            name: reset.personalUser.fullName,
          }
        : null
    if (!account) return errorResponse(INVALID_LINK, 400)

    if (account.passwordHash && verifyPassword(body.newPassword, account.passwordHash)) {
      return errorResponse('Choose a password you have not used before.', 400)
    }

    const policy = validatePasswordPolicy(body.newPassword, {
      email: account.email,
      name: account.name,
    })
    if (!policy.ok) return errorResponse(policy.reason, 400)

    const newPasswordHash = hashPassword(body.newPassword)
    try {
      await db.$transaction(async (tx) => {
        const claimed = await tx.passwordResetToken.updateMany({
          where: {
            id: reset.id,
            tokenHash,
            usedAt: null,
            expiresAt: { gt: now },
          },
          data: { usedAt: now },
        })
        if (claimed.count !== 1) throw new AuthError(INVALID_LINK, 400)

        const changed = account.type === 'college'
          ? await tx.user.updateMany({
              where: {
                id: account.id,
                disabled: false,
                securityVersion: account.securityVersion,
              },
              data: {
                passwordHash: newPasswordHash,
                securityVersion: { increment: 1 },
                passwordChangedAt: now,
              },
            })
          : await tx.personalUser.updateMany({
              where: {
                id: account.id,
                securityVersion: account.securityVersion,
              },
              data: {
                passwordHash: newPasswordHash,
                securityVersion: { increment: 1 },
                passwordChangedAt: now,
              },
            })
        if (changed.count !== 1) throw new AuthError(INVALID_LINK, 400)

        await tx.passwordResetToken.updateMany({
          where: account.type === 'college'
            ? { userId: account.id, id: { not: reset.id }, usedAt: null }
            : { personalUserId: account.id, id: { not: reset.id }, usedAt: null },
          data: { usedAt: now },
        })
      })
    } catch (error) {
      if (error instanceof AuthError) return errorResponse(error.message, error.status)
      throw error
    }

    await destroySession()
    try {
      await sendPasswordChangedNotification(account.email)
    } catch (error) {
      console.error('[password-reset] password-change notification delivery failed', {
        errorType: error instanceof Error ? error.name : 'unknown',
      })
    }

    return json({ ok: true, message: 'Your password has been reset. Please sign in again.' })
  } catch (error) {
    return handleRouteError(error, 'auth/password-reset/complete')
  }
}
