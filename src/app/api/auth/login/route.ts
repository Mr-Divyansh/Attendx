import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  createCollegeSession,
  verifyPassword,
  parseBody,
  json,
  errorResponse,
  issueCsrfToken,
  assertCsrf,
  AuthError,
  handleRouteError,
} from '@/lib/auth'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/authz'

export const runtime = 'nodejs'

// POST /api/auth/login — college login (email + password + role)
export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)

    const { email, password, role } = await parseBody<{
      email?: string
      password?: string
      role?: 'ADMIN' | 'TEACHER' | 'STUDENT'
    }>(req)

    if (!email || !password || !role) {
      return errorResponse('Email, password and role are required', 400)
    }

    const ip = getClientIp(req)
    await rateLimit({
      ip,
      identifier: `login:${email.toLowerCase()}`,
      rule: RULES.login,
    })

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { admin: true, teacher: true, student: true },
    })

    // New email: no account exists at all. Distinct message so the client can
    // offer OTP email verification and account creation. Per-email login rate
    // limiting above still applies before this branch is reachable.

    // Single generic message for every remaining failure mode — never reveal
    // whether the role matches, the account is disabled, or the profile is
    // incomplete. User enumeration is a state leak.
    if (!user) {
      return errorResponse(
        'No account found for this email. Verify your email to create your account.',
        401,
        { code: 'EMAIL_NOT_REGISTERED' }
      )
    }

    if (
      user.role !== role ||
      user.disabled ||
      !user.passwordHash ||
      !verifyPassword(password, user.passwordHash) ||
      (role === 'ADMIN' && !user.admin) ||
      (role === 'TEACHER' && !user.teacher) ||
      (role === 'STUDENT' && !user.student)
    ) {
      return errorResponse('Invalid credentials', 401)
    }

    // regenerate session id on login (cookie rotation handled by createCollegeSession)
    await createCollegeSession({ id: user.id, email: user.email, role: user.role })
    const csrf = await issueCsrfToken()

    const name =
      user.admin?.fullName || user.teacher?.fullName || user.student?.fullName || user.email

    return json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name,
        studentId: user.student?.id,
        teacherId: user.teacher?.id,
        adminId: user.admin?.id,
        rollNo: user.student?.rollNo,
        semesterId: user.student?.semesterId,
        sectionId: user.student?.sectionId,
      },
      csrfToken: csrf,
    })
  } catch (e) {
    if (e instanceof AuthError && e.status === 429) return errorResponse(e.message, 429)
    return handleRouteError(e, 'auth/login')
  }
}
