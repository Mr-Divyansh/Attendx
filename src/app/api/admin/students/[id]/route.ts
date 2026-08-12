import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  hashPassword,
  AuthError,
  validateCsrfToken,
  handleRouteError,
} from '@/lib/auth'

// PUT /api/admin/students/[id] — update a student (and optionally their email/password).
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
      fullName?: string
      rollNo?: string
      semesterId?: string | null
      sectionId?: string | null
      email?: string
      password?: string
    }>(req)

    const student = await db.student.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!student) return errorResponse('Student not found', 404)

    if (body.email && body.email.trim().toLowerCase() !== student.user.email) {
      const newEmail = body.email.trim().toLowerCase()
      const clash = await db.user.findUnique({ where: { email: newEmail } })
      if (clash && clash.id !== student.userId) {
        return errorResponse('Email already in use', 409)
      }
      await db.user.update({
        where: { id: student.userId },
        data: { email: newEmail },
      })
    }

    if (body.password) {
      if (body.password.length < 6) {
        return errorResponse('Password must be at least 6 characters', 400)
      }
      await db.user.update({
        where: { id: student.userId },
        data: { passwordHash: hashPassword(body.password) },
      })
    }

    if (body.rollNo && body.rollNo !== student.rollNo) {
      const clash = await db.student.findFirst({ where: { rollNo: body.rollNo } })
      if (clash && clash.id !== id) {
        return errorResponse('Roll number already in use', 409)
      }
    }

    const updated = await db.student.update({
      where: { id },
      data: {
        fullName: body.fullName?.trim() ?? undefined,
        rollNo: body.rollNo?.trim() ?? undefined,
        semesterId: body.semesterId === undefined ? undefined : body.semesterId || null,
        sectionId: body.sectionId === undefined ? undefined : body.sectionId || null,
      },
      include: {
        user: { select: { email: true } },
        semester: { select: { name: true } },
        section: { select: { name: true } },
      },
    })

    return json({
      id: updated.id,
      userId: updated.userId,
      email: updated.user.email,
      fullName: updated.fullName,
      rollNo: updated.rollNo,
      semesterId: updated.semesterId,
      semesterName: updated.semester?.name ?? null,
      sectionId: updated.sectionId,
      sectionName: updated.section?.name ?? null,
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/students/[id]')
  }
}

// DELETE /api/admin/students/[id] — remove the Student profile and its User account.
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
    const student = await db.student.findUnique({ where: { id } })
    if (!student) return errorResponse('Student not found', 404)

    // Deleting the User cascades to the Student (and their Attendance).
    await db.user.delete({ where: { id: student.userId } })
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/students/[id]')
  }
}
