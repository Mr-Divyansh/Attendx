import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    const teacherId = session.teacherId
    const sectionId = req.nextUrl.searchParams.get('sectionId')
    const subjectId = req.nextUrl.searchParams.get('subjectId')
    if (!teacherId) return errorResponse('Teacher profile missing', 403)
    if (!sectionId || !subjectId) return errorResponse('sectionId and subjectId are required', 400)

    const hasAccess = await db.subject.count({ where: { id: subjectId, sectionId, teacherId } }) ||
      await db.timetable.count({ where: { teacherId, sectionId, subjectId } })
    if (!hasAccess) return errorResponse('Subject not found for this teacher', 404)

    return json(await db.student.findMany({
      where: { sectionId },
      orderBy: { rollNo: 'asc' },
      select: { id: true, rollNo: true, fullName: true },
    }))
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'teacher/students')
  }
}
