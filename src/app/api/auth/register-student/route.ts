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

// POST /api/auth/register-student — student email/password registration.
// The role is ALWAYS assigned server-side as STUDENT — the browser cannot
// choose a privileged role. The Student profile is created with a "PENDING"
// roll number so the profile-completion step can fill it in later.
//
// Requires an OTP verification ticket (purpose 'register-student'); the
// ticket's email is authoritative and becomes the account email.
export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)

    const { fullName, email, password, confirm, ticket } = await parseBody<{
      fullName?: string
      email?: string
      password?: string
      confirm?: string
      ticket?: string
    }>(req)

    if (!fullName?.trim() || !email?.trim() || !password || !confirm) {
      return errorResponse('Full name, email and password are required', 400)
    }
    if (password !== confirm) {
      return errorResponse('Passwords do not match', 400)
    }

    const ip = getClientIp(req)
    await rateLimit({ ip, identifier: `register-student:${ip}`, rule: RULES.register })

    // Email must be OTP-verified first; the ticket's email is authoritative.
    const verified = consumeVerificationTicket(ticket, 'register-student')
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
        role: 'STUDENT',
        emailVerified: true,
        student: {
          create: {
            fullName: fullName.trim(),
            rollNo: 'PENDING',
            hasRollNumber: true,
            profileComplete: false,
          },
        },
      },
      include: { student: true },
    })

    await createCollegeSession({ id: user.id, email: user.email, role: 'STUDENT' })
    const csrf = await issueCsrfToken()

    return json({
      ok: true,
      needsProfile: true,
      user: {
        id: user.id,
        email: user.email,
        role: 'STUDENT',
        name: user.student!.fullName,
        studentId: user.student!.id,
        rollNo: user.student!.rollNo,
      },
      csrfToken: csrf,
    })
  } catch (e) {
    return handleRouteError(e, 'auth/register-student')
  }
}
