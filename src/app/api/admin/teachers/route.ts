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

// GET /api/admin/teachers — list teachers with email + department.
export async function GET() {
  try {
    await requireRole('ADMIN')
    const teachers = await db.teacher.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    })
    return json(
      teachers.map((t) => ({
        id: t.id,
        userId: t.userId,
        email: t.user.email,
        fullName: t.fullName,
        deptId: t.deptId,
        deptName: t.department?.name ?? null,
        deptCode: t.department?.code ?? null,
        createdAt: t.createdAt,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/teachers')
  }
}

// POST /api/admin/teachers — create User (TEACHER) + Teacher profile.
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('ADMIN')
    await assertCsrf(req)

    await rateLimit({
      ip: getClientIp(req),
      identifier: `admin-create-teacher:${session.id}`,
      rule: RULES.register,
    })

    const body = await parseBody<{
      email?: string
      password?: string
      fullName?: string
      deptId?: string | null
    }>(req)

    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const fullName = body.fullName?.trim()

    if (!email || !password || !fullName) {
      return errorResponse('email, password and fullName are required', 400)
    }

    const policy = validatePasswordPolicy(password, { email, name: fullName })
    if (!policy.ok) {
      return errorResponse(policy.reason, 400)
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return errorResponse('Email already in use', 409)

    const user = await db.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        role: 'TEACHER',
        teacher: {
          create: {
            fullName,
            deptId: body.deptId || null,
          },
        },
      },
      include: { teacher: true },
    })

    await logAudit({
      action: 'admin.create_teacher',
      actorId: session.id,
      actorRole: 'ADMIN',
      targetType: 'Teacher',
      targetId: user.teacher?.id,
      ip: getClientIp(req),
    })

    return json(
      {
        id: user.teacher?.id,
        userId: user.id,
        email: user.email,
        fullName: user.teacher?.fullName,
        deptId: user.teacher?.deptId,
      },
      201
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/teachers')
  }
}
