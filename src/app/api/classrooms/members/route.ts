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
    if (!session.teacherId) return errorResponse('Teacher profile missing', 403)

    const body = await parseBody<{ memberId?: string; action?: 'approve' | 'reject' }>(req)
    if (!body.memberId || !body.action) {
      return errorResponse('memberId and action are required', 400)
    }

    const member = await db.classroomMember.findUnique({
      where: { id: body.memberId },
      include: { classroom: true },
    })
    if (!member || member.classroom.teacherId !== session.teacherId) {
      return errorResponse('Membership not found', 404)
    }

    if (body.action === 'approve') {
      await db.classroomMember.update({
        where: { id: member.id },
        data: { status: 'ACTIVE' },
      })
    } else {
      await db.classroomMember.delete({ where: { id: member.id } })
    }

    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to update membership', 500)
  }
}
