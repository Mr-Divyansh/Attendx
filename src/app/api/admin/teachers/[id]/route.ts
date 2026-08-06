import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  hashPassword,
  AuthError,
} from '@/lib/auth'

// PUT /api/admin/teachers/[id] — update a teacher (and optionally email/password).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN')
    const { id } = await params
    const body = await parseBody<{
      fullName?: string
      deptId?: string | null
      email?: string
      password?: string
    }>(req)

    const teacher = await db.teacher.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!teacher) return errorResponse('Teacher not found', 404)

    if (body.email && body.email.trim().toLowerCase() !== teacher.user.email) {
      const newEmail = body.email.trim().toLowerCase()
      const clash = await db.user.findUnique({ where: { email: newEmail } })
      if (clash && clash.id !== teacher.userId) {
        return errorResponse('Email already in use', 409)
      }
      await db.user.update({
        where: { id: teacher.userId },
        data: { email: newEmail },
      })
    }

    if (body.password) {
      if (body.password.length < 6) {
        return errorResponse('Password must be at least 6 characters', 400)
      }
      await db.user.update({
        where: { id: teacher.userId },
        data: { passwordHash: hashPassword(body.password) },
      })
    }

    const updated = await db.teacher.update({
      where: { id },
      data: {
        fullName: body.fullName?.trim() ?? undefined,
        deptId: body.deptId === undefined ? undefined : body.deptId || null,
      },
      include: {
        user: { select: { email: true } },
        department: { select: { name: true, code: true } },
      },
    })

    return json({
      id: updated.id,
      userId: updated.userId,
      email: updated.user.email,
      fullName: updated.fullName,
      deptId: updated.deptId,
      deptName: updated.department?.name ?? null,
      deptCode: updated.department?.code ?? null,
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Server error', 500)
  }
}

// DELETE /api/admin/teachers/[id] — remove Teacher + User.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN')
    const { id } = await params
    const teacher = await db.teacher.findUnique({ where: { id } })
    if (!teacher) return errorResponse('Teacher not found', 404)

    await db.user.delete({ where: { id: teacher.userId } })
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Server error', 500)
  }
}
