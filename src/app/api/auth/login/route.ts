import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  createCollegeSession,
  verifyPassword,
  parseBody,
  json,
  errorResponse,
  issueCsrfToken,
} from '@/lib/auth'

// POST /api/auth/login — college login (email + password + role)
export async function POST(req: NextRequest) {
  const { email, password, role } = await parseBody<{
    email?: string
    password?: string
    role?: 'ADMIN' | 'TEACHER' | 'STUDENT'
  }>(req)

  if (!email || !password || !role) {
    return errorResponse('Email, password and role are required', 400)
  }

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { admin: true, teacher: true, student: true },
  })

  if (!user || user.role !== role) {
    return errorResponse('Invalid credentials for the selected role', 401)
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return errorResponse('Invalid credentials', 401)
  }

  // Ensure the role-specific profile exists
  if (role === 'ADMIN' && !user.admin) return errorResponse('Admin profile missing', 403)
  if (role === 'TEACHER' && !user.teacher) return errorResponse('Teacher profile missing', 403)
  if (role === 'STUDENT' && !user.student) return errorResponse('Student profile missing', 403)

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
}
