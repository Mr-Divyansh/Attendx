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
import { sendPasswordChangedNotification } from '@/lib/email'

export const runtime = 'nodejs'

// PUT /api/admin/teachers/[id] — update a teacher (and optionally email/password).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN')
    await assertCsrf(req)
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

    if (body.password !== undefined && typeof body.password !== 'string') {
      return errorResponse('Password must be text.', 400)
    }
    if (body.password) {
      const policy = validatePasswordPolicy(body.password, {
        email: body.email?.trim().toLowerCase() || teacher.user.email,
        name: body.fullName?.trim() || teacher.fullName,
      })
      if (!policy.ok) return errorResponse(policy.reason, 400)
    }

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
      const password = body.password
      const now = new Date()
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            passwordHash: hashPassword(password),
            securityVersion: { increment: 1 },
            passwordChangedAt: now,
          },
        })
        await tx.passwordResetToken.updateMany({
          where: { userId: teacher.userId, usedAt: null },
          data: { usedAt: now },
        })
      })
      try {
        await sendPasswordChangedNotification(body.email?.trim().toLowerCase() || teacher.user.email)
      } catch (error) {
        console.error('[admin/teachers] password-change notification delivery failed', {
          errorType: error instanceof Error ? error.name : 'unknown',
        })
      }
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
    return handleRouteError(e, 'admin/teachers/[id]')
  }
}

// DELETE /api/admin/teachers/[id] — remove Teacher + User.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN')
    await assertCsrf(req)
    const { id } = await params
    const teacher = await db.teacher.findUnique({ where: { id } })
    if (!teacher) return errorResponse('Teacher not found', 404)

    await db.user.delete({ where: { id: teacher.userId } })
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/teachers/[id]')
  }
}
