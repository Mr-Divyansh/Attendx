import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  hashPassword,
  AuthError,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'
import { validatePasswordPolicy } from '@/lib/security'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

// GET /api/admin/students — list all students with related fields.
export async function GET() {
  try {
    await requireRole('ADMIN')
    const students = await db.student.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
        semester: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    })
    return json(
      students.map((s) => ({
        id: s.id,
        userId: s.userId,
        email: s.user.email,
        fullName: s.fullName,
        rollNo: s.rollNo,
        semesterId: s.semesterId,
        semesterName: s.semester?.name ?? null,
        sectionId: s.sectionId,
        sectionName: s.section?.name ?? null,
        createdAt: s.createdAt,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/students')
  }
}

// POST /api/admin/students — create a User (STUDENT) + Student profile.
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('ADMIN')
    await assertCsrf(req)

    await rateLimit({
      ip: getClientIp(req),
      identifier: `admin-create-student:${session.id}`,
      rule: RULES.register,
    })

    const body = await parseBody<{
      email?: string
      password?: string
      fullName?: string
      rollNo?: string
      semesterId?: string | null
      sectionId?: string | null
    }>(req)

    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const fullName = body.fullName?.trim()
    const rollNo = body.rollNo?.trim()

    if (!email || !password || !fullName || !rollNo) {
      return errorResponse('email, password, fullName and rollNo are required', 400)
    }

    const policy = validatePasswordPolicy(password, { email, name: fullName })
    if (!policy.ok) {
      return errorResponse(policy.reason, 400)
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return errorResponse('Email already in use', 409)

    const existingRoll = await db.student.findFirst({ where: { rollNo } })
    if (existingRoll) return errorResponse('Roll number already in use', 409)

    const user = await db.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        role: 'STUDENT',
        student: {
          create: {
            fullName,
            rollNo,
            semesterId: body.semesterId || null,
            sectionId: body.sectionId || null,
          },
        },
      },
      include: { student: true },
    })

    await logAudit({
      action: 'admin.create_student',
      actorId: session.id,
      actorRole: 'ADMIN',
      targetType: 'Student',
      targetId: user.student?.id,
      ip: getClientIp(req),
    })

    return json(
      {
        id: user.student?.id,
        userId: user.id,
        email: user.email,
        fullName: user.student?.fullName,
        rollNo: user.student?.rollNo,
        semesterId: user.student?.semesterId,
        sectionId: user.student?.sectionId,
      },
      201
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/students')
  }
}
