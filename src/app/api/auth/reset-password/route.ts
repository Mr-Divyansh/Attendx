import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  parseBody,
  json,
  errorResponse,
  AuthError,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'
import { validatePasswordPolicy } from '@/lib/security'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { consumeVerificationTicket } from '@/lib/otp'

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

    if (!newPassword || !confirm || !ticket) {
      return errorResponse('New password, confirmation, and verification ticket are required', 400)
    }

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

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword) },
    })

    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'auth/reset-password')
  }
}