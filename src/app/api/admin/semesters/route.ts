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

// GET /api/admin/semesters
export async function GET() {
  try {
    await requireRole('ADMIN')
    const semesters = await db.semester.findMany({
      orderBy: { number: 'asc' },
      include: {
        _count: { select: { students: true, subjects: true, sections: true } },
      },
    })
    return json(
      semesters.map((s) => ({
        id: s.id,
        name: s.name,
        number: s.number,
        studentCount: s._count.students,
        subjectCount: s._count.subjects,
        sectionCount: s._count.sections,
        createdAt: s.createdAt,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/semesters')
  }
}

// POST /api/admin/semesters
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const body = await parseBody<{ name?: string; number?: number }>(req)
    const name = body.name?.trim()
    const number = Number(body.number)
    if (!name || !Number.isFinite(number)) {
      return errorResponse('name and number are required', 400)
    }

    const nameClash = await db.semester.findUnique({ where: { name } })
    if (nameClash) return errorResponse('Semester name already exists', 409)
    const numClash = await db.semester.findUnique({ where: { number } })
    if (numClash) return errorResponse('Semester number already exists', 409)

    const sem = await db.semester.create({ data: { name, number } })
    return json(
      {
        id: sem.id,
        name: sem.name,
        number: sem.number,
        studentCount: 0,
        subjectCount: 0,
        sectionCount: 0,
        createdAt: sem.createdAt,
      },
      201
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/semesters')
  }
}
