import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  parseBody,
  json,
  errorResponse,
  AuthError,
  assertCsrf,
  destroySession,
  handleRouteError,
} from '@/lib/auth'
import { validatePasswordPolicy } from '@/lib/security'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { consumeVerificationTicket } from '@/lib/otp'
import { sendPasswordChangedNotification } from '@/lib/email'

export const runtime = 'nodejs'

// POST /api/auth/reset-password — reset password using OTP verification ticket
export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)

    const { email, newPassword, confirm, ticket } = await parseBody<{
      email?: string
      newPassword?: string
      confirm?: string
      ticket?: string
    }>(req)

    if (
      typeof newPassword !== 'string' ||
      typeof confirm !== 'string' ||
      typeof ticket !== 'string' ||
      typeof email !== 'string'
    ) {
      return errorResponse('New password, confirmation, and verification ticket are required', 400)
    }
    if (newPassword.length > 128) return errorResponse('Password must be at most 128 characters long', 400)

    if (newPassword !== confirm) {
      return errorResponse('Passwords do not match', 400)
    }

    const ip = getClientIp(req)
    await rateLimit({
      ip,
      identifier: `reset-password:${email}`,
      rule: RULES.resetPassword,
    })

    // Verify the OTP ticket
    const verified = consumeVerificationTicket(ticket, 'reset-password')
    const normalizedEmail = verified.email

    const policy = validatePasswordPolicy(newPassword, { email: normalizedEmail })
    if (!policy.ok) {
      return errorResponse(policy.reason, 400)
    }

    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return errorResponse('Invalid credentials', 401)
    }

    const now = new Date()
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashPassword(newPassword),
          securityVersion: { increment: 1 },
          passwordChangedAt: now,
        },
      })
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      })
    })

    await destroySession()
    try {
      await sendPasswordChangedNotification(user.email)
    } catch (error) {
      console.error('[auth/reset-password] password-change notification delivery failed', {
        errorType: error instanceof Error ? error.name : 'unknown',
      })
    }

    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'auth/reset-password')
  }
}