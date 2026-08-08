import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  AuthError,
  validateCsrfToken,
} from '@/lib/auth'

// GET /api/admin/sections
export async function GET() {
  try {
    await requireRole('ADMIN')
    const sections = await db.section.findMany({
      orderBy: { name: 'asc' },
      include: {
        semester: { select: { id: true, name: true } },
        _count: { select: { students: true, timetables: true, subjects: true } },
      },
    })
    return json(
      sections.map((s) => ({
        id: s.id,
        name: s.name,
        semesterId: s.semesterId,
        semesterName: s.semester?.name ?? null,
        studentCount: s._count.students,
        timetableCount: s._count.timetables,
        subjectCount: s._count.subjects,
        createdAt: s.createdAt,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Server error', 500)
  }
}

// POST /api/admin/sections
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const body = await parseBody<{ name?: string; semesterId?: string | null }>(req)
    const name = body.name?.trim()
    if (!name) return errorResponse('name is required', 400)

    const clash = await db.section.findUnique({ where: { name } })
    if (clash) return errorResponse('Section name already exists', 409)

    const section = await db.section.create({
      data: {
        name,
        semesterId: body.semesterId || null,
      },
      include: { semester: { select: { name: true } } },
    })
    return json(
      {
        id: section.id,
        name: section.name,
        semesterId: section.semesterId,
        semesterName: section.semester?.name ?? null,
        studentCount: 0,
        timetableCount: 0,
        subjectCount: 0,
        createdAt: section.createdAt,
      },
      201
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Server error', 500)
  }
}
