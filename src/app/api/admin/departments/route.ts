import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  AuthError,
  validateCsrfToken,
  handleRouteError,
} from '@/lib/auth'

// GET /api/admin/departments
export async function GET() {
  try {
    await requireRole('ADMIN')
    const depts = await db.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { teachers: true, subjects: true } },
      },
    })
    return json(
      depts.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        teacherCount: d._count.teachers,
        subjectCount: d._count.subjects,
        createdAt: d.createdAt,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/departments')
  }
}

// POST /api/admin/departments
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const body = await parseBody<{ name?: string; code?: string }>(req)
    const name = body.name?.trim()
    const code = body.code?.trim().toUpperCase()
    if (!name || !code) {
      return errorResponse('name and code are required', 400)
    }

    const nameClash = await db.department.findUnique({ where: { name } })
    if (nameClash) return errorResponse('Department name already exists', 409)
    const codeClash = await db.department.findUnique({ where: { code } })
    if (codeClash) return errorResponse('Department code already exists', 409)

    const dept = await db.department.create({ data: { name, code } })
    return json(
      {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        teacherCount: 0,
        subjectCount: 0,
        createdAt: dept.createdAt,
      },
      201
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/departments')
  }
}
