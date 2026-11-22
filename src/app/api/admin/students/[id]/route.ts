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

// PUT /api/admin/students/[id] — update a student (and optionally their email/password).
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

    if (body.password !== undefined && typeof body.password !== 'string') {
      return errorResponse('Password must be text.', 400)
    }
    if (body.password) {
      const policy = validatePasswordPolicy(body.password, {
        email: body.email?.trim().toLowerCase() || student.user.email,
        name: body.fullName?.trim() || student.fullName,
      })
      if (!policy.ok) return errorResponse(policy.reason, 400)
    }

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
      const password = body.password
      const now = new Date()
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            passwordHash: hashPassword(password),
            securityVersion: { increment: 1 },
            passwordChangedAt: now,
          },
        })
        await tx.passwordResetToken.updateMany({
          where: { userId: student.userId, usedAt: null },
          data: { usedAt: now },
        })
      })
      try {
        await sendPasswordChangedNotification(body.email?.trim().toLowerCase() || student.user.email)
      } catch (error) {
        console.error('[admin/students] password-change notification delivery failed', {
          errorType: error instanceof Error ? error.name : 'unknown',
        })
      }
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
    await assertCsrf(req)
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
