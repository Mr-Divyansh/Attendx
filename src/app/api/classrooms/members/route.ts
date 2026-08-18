import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  AuthError,
  assertCsrf,
} from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    await assertCsrf(req)
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
      // Only convert a real pending request. If the request was already
      // accepted, the same member row is now ACTIVE — respond successfully
      // instead of double-approving.
      if (member.status === 'ACTIVE') return json({ ok: true, already: true })
      if (member.status !== 'PENDING') return errorResponse('Request is no longer pending', 400)
      await db.classroomMember.update({
        where: { id: member.id },
        data: { status: 'ACTIVE' },
      })
    } else {
      // Reject deletes the membership (pending request or active member),
      // so the student never remains an approved member.
      await db.classroomMember.delete({ where: { id: member.id } })
    }

    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to update membership', 500)
  }
}
