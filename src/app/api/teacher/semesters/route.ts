import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/teacher/semesters — distinct semesters that have sections with
// timetable slots for this teacher. Returns [{ id, name }].
export async function GET() {
  try {
    const session = await requireRole('TEACHER')
    const teacherId = session.teacherId!

    const slots = await db.timetable.findMany({
      where: { teacherId },
      select: { section: { select: { semesterId: true } } },
    })
    const semIds = new Set<string>()
    for (const s of slots) {
      if (s.section?.semesterId) semIds.add(s.section.semesterId)
    }

    const semesters = await db.semester.findMany({
      where: { id: { in: [...semIds] } },
      orderBy: { number: 'asc' },
      select: { id: true, name: true },
    })
    return json(semesters)
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
