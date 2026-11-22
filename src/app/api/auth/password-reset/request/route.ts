import crypto from 'node:crypto'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { AuthError, assertCsrf, errorResponse, handleRouteError, json, parseBody } from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { getCanonicalAppUrl, getEmailConfig, passwordResetEmailHtml, sendEmail } from '@/lib/email'
import { createPasswordResetToken, createPasswordResetUrl, hashPasswordResetToken, PASSWORD_RESET_TTL_MS } from '@/lib/password-reset'
import { isValidEmail } from '@/lib/otp'
import { rateLimit, RULES } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const GENERIC_RESPONSE = 'If an account matches that account type and email, reset instructions will arrive if email delivery is available.'
const EMAIL_RATE_LIMIT = { name: 'auth:password-reset:email', limit: 3, windowMs: 15 * 60 * 1000 }

export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const body = await parseBody<{ email?: string; accountType?: string }>(req)
    const email = body.email?.trim().toLowerCase()
    const accountType = body.accountType
    if (!email || !isValidEmail(email)) return errorResponse('Enter a valid email address.', 400)
    if (accountType !== 'college' && accountType !== 'personal') {
      return errorResponse('Choose a valid AttendX account type.', 400)
    }

    const ip = getClientIp(req)
    const emailKey = crypto.createHash('sha256').update(`${accountType}:${email}`).digest('hex')
    await rateLimit({ ip, identifier: 'password-reset-request', rule: RULES.resetPassword })
    await rateLimit({ ip: 'email-scope', identifier: `password-reset:${emailKey}`, rule: EMAIL_RATE_LIMIT })

    if (!getEmailConfig()) {
      throw new AuthError('Password reset email is temporarily unavailable. Please try again later.', 503)
    }
    let appUrl: string
    try {
      appUrl = getCanonicalAppUrl()
    } catch {
      throw new AuthError('Password reset is temporarily unavailable. Please try again later.', 503)
    }

    let accountId: string
    let recipient: string
    if (accountType === 'college') {
      const account = await db.user.findUnique({
        where: { email },
        select: { id: true, email: true, disabled: true },
      })
      if (!account || account.disabled) return json({ ok: true, message: GENERIC_RESPONSE }, 202)
      accountId = account.id
      recipient = account.email
    } else {
      const account = await db.personalUser.findUnique({
        where: { username: email },
        select: { id: true, username: true },
      })
      if (!account) return json({ ok: true, message: GENERIC_RESPONSE }, 202)
      accountId = account.id
      recipient = account.username
    }

    const token = createPasswordResetToken()
    const tokenHash = hashPasswordResetToken(token)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS)
    const resetToken = {
      tokenHash,
      expiresAt,
      ...(accountType === 'college'
        ? { userId: accountId }
        : { personalUserId: accountId }),
    }

    const resetRecord = await db.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: {
          ...(accountType === 'college' ? { userId: accountId } : { personalUserId: accountId }),
          expiresAt: { lt: now },
        },
      })
      return tx.passwordResetToken.create({ data: resetToken, select: { id: true } })
    })

    const resetUrl = createPasswordResetUrl(appUrl, token, accountType)
    const text = [
      'Hello,',
      '',
      'We received a request to reset the password associated with your AttendX account.',
      'If you requested this change, open the secure link below to create a new password.',
      '',
      resetUrl,
      '',
      'This secure link expires in 30 minutes and can only be used once.',
      'If you did not request a password reset, you can safely ignore this email.',
      'For your security, AttendX will never ask you to share your password or verification link.',
      '',
      'Regards,',
      'The AttendX Security Team',
    ].join('\n')

    try {
      await sendEmail({
        to: recipient,
        subject: 'Reset Your AttendX Password',
        html: passwordResetEmailHtml({ resetUrl, appUrl }),
        text,
      })
    } catch (error) {
      await db.passwordResetToken.deleteMany({ where: { id: resetRecord.id } })
      console.error('[password-reset] email delivery failed', {
        errorType: error instanceof Error ? error.name : 'unknown',
      })
      return json({ ok: true, message: GENERIC_RESPONSE }, 202)
    }

    await db.passwordResetToken.updateMany({
      where: accountType === 'college'
        ? { userId: accountId, id: { not: resetRecord.id }, usedAt: null }
        : { personalUserId: accountId, id: { not: resetRecord.id }, usedAt: null },
      data: { usedAt: new Date() },
    })
    return json({ ok: true, message: GENERIC_RESPONSE }, 202)
  } catch (error) {
    return handleRouteError(error, 'auth/password-reset/request')
  }
}
