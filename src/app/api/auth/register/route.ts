import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  createPersonalSession,
  hashPassword,
  parseBody,
  json,
  errorResponse,
  issueCsrfToken,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/authz'
import { validatePasswordPolicy } from '@/lib/security'
import { consumeVerificationTicket } from '@/lib/otp'

export const runtime = 'nodejs'

// POST /api/auth/register — personal-mode self-registration
// Fields: fullName, username (email), password, confirm, ticket
// `ticket` is the HMAC-signed proof from /api/auth/otp/verify that the
// email was verified for purpose 'register-personal'. ticket.email is
// authoritative — the client cannot register a different address.
export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)

    const { fullName, username, password, confirm, ticket } = await parseBody<{
      fullName?: string
      username?: string
      password?: string
      confirm?: string
      ticket?: string
    }>(req)

    if (!fullName || !username || !password || !confirm) {
      return errorResponse('All fields are required', 400)
    }
    if (password !== confirm) {
      return errorResponse('Passwords do not match', 400)
    }

    // Username in personal mode IS the login email — validate the format.
    const uname = username.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(uname)) {
      return errorResponse('Username must be a valid email address', 400)
    }
    if (uname.length > 254) {
      return errorResponse('Username is too long', 400)
    }

    const ip = getClientIp(req)
    await rateLimit({ ip, identifier: `register:${ip}`, rule: RULES.register })

    // Email must be OTP-verified first; the ticket's email is authoritative.
    const verified = consumeVerificationTicket(ticket, 'register-personal')
    if (verified.email !== uname) {
      return errorResponse('Verification email does not match the username', 400)
    }

    const policy = validatePasswordPolicy(password, { email: uname, name: fullName })
    if (!policy.ok) {
      return errorResponse(policy.reason, 400)
    }

    const existing = await db.personalUser.findUnique({ where: { username: uname } })
    if (existing) {
      return errorResponse('Username already taken', 409)
    }

    const pu = await db.personalUser.create({
      data: {
        fullName: fullName.trim(),
        username: uname,
        emailVerified: true,
        passwordHash: hashPassword(password),
        settings: { create: { darkMode: false, language: 'en', goalPct: 75 } },
      },
      include: { settings: true },
    })

    await createPersonalSession({ id: pu.id })
    const csrf = await issueCsrfToken()

    return json({
      ok: true,
      user: {
        id: pu.id,
        role: 'PERSONAL',
        name: pu.fullName,
        username: pu.username,
        email: pu.username,
        avatarUrl: pu.avatarUrl,
        goalPct: pu.settings?.goalPct ?? 75,
        darkMode: pu.settings?.darkMode ?? false,
      },
      csrfToken: csrf,
    })

  } catch (e) {
    return handleRouteError(e, 'auth/register')
  }
}
