import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/teacher/subjects?sectionId= — distinct subjects taught by this
// teacher in that section (from the timetable). Returns [{ id, code, name }].
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    const teacherId = session.teacherId!
    const sectionId = req.nextUrl.searchParams.get('sectionId')
    if (!sectionId) return errorResponse('sectionId is required', 400)

    const slots = await db.timetable.findMany({
      where: { teacherId, sectionId },
      select: { subjectId: true },
    })
    const subjIds = new Set<string>()
    for (const s of slots) if (s.subjectId) subjIds.add(s.subjectId)

    const subjects = await db.subject.findMany({
      where: { id: { in: [...subjIds] } },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    })
    return json(subjects)
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
