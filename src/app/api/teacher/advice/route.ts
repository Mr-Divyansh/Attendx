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

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }

    const body = await parseBody<{ studentUserId?: string; message?: string }>(req)
    if (!body.studentUserId?.trim() || !body.message?.trim()) {
      return errorResponse('Student and message are required', 400)
    }

    const studentUser = await db.user.findUnique({
      where: { id: body.studentUserId },
      include: { student: true },
    })
    if (!studentUser || studentUser.role !== 'STUDENT') {
      return errorResponse('Student not found', 404)
    }

    const notification = await db.collegeNotification.create({
      data: {
        userId: studentUser.id,
        type: 'advice',
        message: body.message.trim(),
      },
    })

    return json({ ok: true, notification })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to send advice', 500)
  }
}
