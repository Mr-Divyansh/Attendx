import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, assertCsrf } from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('STUDENT')
    await assertCsrf(req)
    if (!session.studentId) return errorResponse('Student profile missing', 403)

    await rateLimit({
      ip: getClientIp(req),
      identifier: `join-classroom:${session.studentId}`,
      rule: RULES.joinClassroom,
    })

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

    if (classroom.expiresAt && classroom.expiresAt.getTime() < Date.now()) {
      return errorResponse('This classroom has expired and is no longer accepting join requests', 400)
    }

    const existing = await db.classroomMember.findUnique({
      where: {
        classroomId_studentId: { classroomId: classroom.id, studentId: session.studentId },
      },
    })
    if (existing) {
      if (existing.status === 'ACTIVE') {
        return errorResponse('You are already a member of this classroom', 409)
      }
      return errorResponse('You already have a pending request to join this classroom', 409)
    }

    let created: { id: string; status: string; joinedAt: Date }
    try {
      created = await db.classroomMember.create({
        data: {
          classroomId: classroom.id,
          studentId: session.studentId,
          status: 'PENDING',
        },
        select: { id: true, status: true, joinedAt: true },
      })
    } catch (error) {
      // The database's unique constraint is the final authority here. This
      // avoids a concurrent request from a second device creating a 500 or a
      // duplicate membership after both requests pass a pre-check.
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        return errorResponse('You already have a pending request to join this classroom', 409)
      }
      throw error
    }

    return json({ ok: true, status: created.status, classroom })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to join classroom', 500)
  }
}
