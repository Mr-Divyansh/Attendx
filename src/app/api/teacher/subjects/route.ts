import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

type SubjectOption = { id: string; code: string; name: string }

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    const teacherId = session.teacherId
    const sectionId = req.nextUrl.searchParams.get('sectionId')
    if (!teacherId) return errorResponse('Teacher profile missing', 403)
    if (!sectionId) return errorResponse('sectionId is required', 400)

    const [assigned, slots] = await Promise.all([
      db.subject.findMany({ where: { teacherId, sectionId }, select: { id: true, code: true, name: true } }),
      db.timetable.findMany({ where: { teacherId, sectionId, subjectId: { not: null } }, select: { subject: { select: { id: true, code: true, name: true } } } }),
    ])
    const byId = new Map<string, SubjectOption>(assigned.map((subject) => [subject.id, subject]))
    for (const slot of slots) if (slot.subject) byId.set(slot.subject.id, slot.subject)
    return json(Array.from(byId.values()).sort((a, b) => a.code.localeCompare(b.code)))
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'teacher/subjects')
  }
}
