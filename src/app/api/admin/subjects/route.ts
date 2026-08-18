import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  AuthError,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'

// GET /api/admin/subjects — list subjects with related semester/section/dept/teacher.
export async function GET() {
  try {
    await requireRole('ADMIN')
    const subjects = await db.subject.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        semester: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, fullName: true } },
      },
    })
    return json(
      subjects.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        semesterId: s.semesterId,
        semesterName: s.semester?.name ?? null,
        sectionId: s.sectionId,
        sectionName: s.section?.name ?? null,
        deptId: s.deptId,
        deptName: s.department?.name ?? null,
        teacherId: s.teacherId,
        teacherName: s.teacher?.fullName ?? null,
        createdAt: s.createdAt,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/subjects')
  }
}

// POST /api/admin/subjects — create a subject.
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    await assertCsrf(req)
    const body = await parseBody<{
      code?: string
      name?: string
      semesterId?: string | null
      sectionId?: string | null
      deptId?: string | null
      teacherId?: string | null
    }>(req)

    const code = body.code?.trim()
    const name = body.name?.trim()
    if (!code || !name) {
      return errorResponse('code and name are required', 400)
    }

    const clash = await db.subject.findUnique({ where: { code } })
    if (clash) return errorResponse('Subject code already in use', 409)

    const subject = await db.subject.create({
      data: {
        code,
        name,
        semesterId: body.semesterId || null,
        sectionId: body.sectionId || null,
        deptId: body.deptId || null,
        teacherId: body.teacherId || null,
      },
      include: {
        semester: { select: { name: true } },
        section: { select: { name: true } },
        department: { select: { name: true, code: true } },
        teacher: { select: { fullName: true } },
      },
    })

    return json(
      {
        id: subject.id,
        code: subject.code,
        name: subject.name,
        semesterId: subject.semesterId,
        semesterName: subject.semester?.name ?? null,
        sectionId: subject.sectionId,
        sectionName: subject.section?.name ?? null,
        deptId: subject.deptId,
        deptName: subject.department?.name ?? null,
        teacherId: subject.teacherId,
        teacherName: subject.teacher?.fullName ?? null,
      },
      201
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/subjects')
  }
}
