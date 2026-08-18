import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError, assertCsrf } from '@/lib/auth'

// DELETE /api/student/classrooms/[id] — leave one classroom only.
// The student account and memberships in other classrooms are untouched.
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('STUDENT')
    await assertCsrf(req)
    const { id } = await context.params
    const result = await db.classroomMember.deleteMany({
      where: { classroomId: id, studentId: session.studentId! },
    })
    if (!result.count) return errorResponse('You are not a member of this classroom', 404)
    return json({ ok: true })
  } catch (e) {
    return handleRouteError(e, 'student/classrooms/id')
  }
}
