import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, validateCsrfToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('STUDENT')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    if (!session.studentId) return errorResponse('Student profile missing', 403)

    const body = await parseBody<{ joinCode?: string; inviteToken?: string }>(req)
    const joinCode = body.joinCode?.trim().toUpperCase()
    const inviteToken = body.inviteToken?.trim().toUpperCase()

    if (!joinCode && !inviteToken) return errorResponse('Join code or invite token is required', 400)

    const classroom = await db.classroom.findFirst({
      where: {
        OR: [
          joinCode ? { joinCode } : {},
          inviteToken ? { inviteToken } : {},
        ],
      },
      include: { teacher: true },
    })

    if (!classroom) return errorResponse('Classroom not found', 404)

    const existing = await db.classroomMember.findFirst({
      where: { classroomId: classroom.id, studentId: session.studentId },
    })

    if (existing) return errorResponse('You already joined this classroom', 409)

    await db.classroomMember.create({
      data: {
        classroomId: classroom.id,
        studentId: session.studentId,
        status: 'PENDING',
      },
    })

    return json({ ok: true, classroom })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to join classroom', 500)
  }
}
