import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  createCollegeSession,
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

// POST /api/auth/register-teacher — teacher email/password registration.
// Role is assigned server-side. Requires an OTP verification ticket
// (purpose 'register-teacher'); the ticket's email is authoritative.
export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)

    const body = await parseBody<{
      fullName?: string
      email?: string
      password?: string
      confirm?: string
      subjectTaught?: string
      institutionName?: string
      departmentLabel?: string
      ticket?: string
    }>(req)

    const { fullName, password, confirm, subjectTaught, institutionName, departmentLabel } =
      body

    if (!fullName?.trim() || !password || !confirm) {
      return errorResponse('Name, email, and password are required', 400)
    }
    if (password !== confirm) {
      return errorResponse('Passwords do not match', 400)
    }

    const ip = getClientIp(req)
    await rateLimit({ ip, identifier: `register-teacher:${ip}`, rule: RULES.register })

    // Email must be OTP-verified first; the ticket's email is authoritative.
    const verified = consumeVerificationTicket(body.ticket, 'register-teacher')
    const normalizedEmail = verified.email

    const policy = validatePasswordPolicy(password, { email: normalizedEmail, name: fullName })
    if (!policy.ok) {
      return errorResponse(policy.reason, 400)
    }

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return errorResponse('An account with this email already exists', 409)
    }

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        role: 'TEACHER',
        emailVerified: true,
        teacher: {
          create: {
            fullName: fullName.trim(),
            subjectTaught: subjectTaught?.trim() || null,
            institutionName: institutionName?.trim() || null,
            departmentLabel: departmentLabel?.trim() || null,
            profileComplete: Boolean(subjectTaught?.trim() && institutionName?.trim()),
          },
        },
      },
      include: { teacher: true },
    })

    await createCollegeSession({ id: user.id, email: user.email, role: 'TEACHER' })
    const csrf = await issueCsrfToken()

    return json({
      ok: true,
      needsProfile: !user.teacher?.profileComplete,
      user: {
        id: user.id,
        email: user.email,
        role: 'TEACHER',
        name: user.teacher!.fullName,
        teacherId: user.teacher!.id,
      },
      csrfToken: csrf,
    })

  } catch (e) {
    return handleRouteError(e, 'auth/register-teacher')
  }
}
