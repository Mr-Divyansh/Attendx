import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  createCollegeSession,
  hashPassword,
  parseBody,
  json,
  errorResponse,
  issueCsrfToken,
  checkRateLimit,
  handleRouteError,
} from '@/lib/auth'

// POST /api/auth/register-student — student email/password registration.
// The role is ALWAYS assigned server-side as STUDENT — the browser cannot
// choose a privileged role. The Student profile is created with a "PENDING"
// roll number so the profile-completion step can fill it in later.
export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, confirm } = await parseBody<{
      fullName?: string
      email?: string
      password?: string
      confirm?: string
    }>(req)

    if (!fullName?.trim() || !email?.trim() || !password || !confirm) {
      return errorResponse('Full name, email and password are required', 400)
    }
    if (password !== confirm) {
      return errorResponse('Passwords do not match', 400)
    }
    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters', 400)
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const normalizedEmail = email.toLowerCase().trim()
    if (!checkRateLimit(`register-student:${ip}:${normalizedEmail}`)) {
      return errorResponse('Too many attempts. Please try again shortly.', 429)
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
