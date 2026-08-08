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

// PUT /api/admin/subjects/[id] — update subject fields.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const { id } = await params
    const body = await parseBody<{
      code?: string
      name?: string
      semesterId?: string | null
      sectionId?: string | null
      deptId?: string | null
      teacherId?: string | null
    }>(req)

    const subject = await db.subject.findUnique({ where: { id } })
    if (!subject) return errorResponse('Subject not found', 404)

    if (body.code && body.code.trim() !== subject.code) {
      const clash = await db.subject.findUnique({ where: { code: body.code.trim() } })
      if (clash && clash.id !== id) {
        return errorResponse('Subject code already in use', 409)
      }
    }

    const updated = await db.subject.update({
      where: { id },
      data: {
        code: body.code?.trim() ?? undefined,
        name: body.name?.trim() ?? undefined,
        semesterId: body.semesterId === undefined ? undefined : body.semesterId || null,
        sectionId: body.sectionId === undefined ? undefined : body.sectionId || null,
        deptId: body.deptId === undefined ? undefined : body.deptId || null,
        teacherId: body.teacherId === undefined ? undefined : body.teacherId || null,
      },
      include: {
        semester: { select: { name: true } },
        section: { select: { name: true } },
        department: { select: { name: true, code: true } },
        teacher: { select: { fullName: true } },
      },
    })

    return json({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      semesterId: updated.semesterId,
      semesterName: updated.semester?.name ?? null,
      sectionId: updated.sectionId,
      sectionName: updated.section?.name ?? null,
      deptId: updated.deptId,
      deptName: updated.department?.name ?? null,
      teacherId: updated.teacherId,
      teacherName: updated.teacher?.fullName ?? null,
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Server error', 500)
  }
}

// DELETE /api/admin/subjects/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const { id } = await params
    await db.subject.delete({ where: { id } })
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Server error', 500)
  }
}
