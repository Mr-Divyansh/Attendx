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
  AuthError,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await parseBody<{
    fullName?: string
    email?: string
    password?: string
    confirm?: string
    subjectTaught?: string
    institutionName?: string
    departmentLabel?: string
  }>(req)

  const { fullName, email, password, confirm, subjectTaught, institutionName, departmentLabel } =
    body

  if (!fullName?.trim() || !email?.trim() || !password || !confirm) {
    return errorResponse('Name, email, and password are required', 400)
  }
  if (password !== confirm) {
    return errorResponse('Passwords do not match', 400)
  }
  if (password.length < 8) {
    return errorResponse('Password must be at least 8 characters', 400)
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const normalizedEmail = email.toLowerCase().trim()
  if (!checkRateLimit(`register-teacher:${ip}:${normalizedEmail}`)) {
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
      role: 'TEACHER',
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
}
