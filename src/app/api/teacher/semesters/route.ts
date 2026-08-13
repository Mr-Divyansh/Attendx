import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

// Semesters are assigned through either Subject.teacherId or a timetable slot.
// Supporting both reflects the existing admin workflows and avoids an empty
// selector while a timetable is still being configured.
export async function GET() {
  try {
    const session = await requireRole('TEACHER')
    const teacherId = session.teacherId
    if (!teacherId) return errorResponse('Teacher profile missing', 403)

    const [subjects, slots] = await Promise.all([
      db.subject.findMany({ where: { teacherId, semesterId: { not: null } }, select: { semesterId: true } }),
      db.timetable.findMany({ where: { teacherId }, select: { section: { select: { semesterId: true } }, subject: { select: { semesterId: true } } } }),
    ])
    const ids = new Set<string>()
    for (const subject of subjects) if (subject.semesterId) ids.add(subject.semesterId)
    for (const slot of slots) {
      if (slot.section?.semesterId) ids.add(slot.section.semesterId)
      if (slot.subject?.semesterId) ids.add(slot.subject.semesterId)
    }

    const semesters = await db.semester.findMany({
      where: { id: { in: [...ids] } },
      orderBy: { number: 'asc' },
      select: { id: true, name: true },
    })
    return json(semesters)
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'teacher/semesters')
  }
}
