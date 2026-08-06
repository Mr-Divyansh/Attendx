import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/teacher/sections?semesterId= — distinct sections in that semester
// that have timetable slots for this teacher. Returns [{ id, name }].
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    const teacherId = session.teacherId!
    const semesterId = req.nextUrl.searchParams.get('semesterId')
    if (!semesterId) return errorResponse('semesterId is required', 400)

    const slots = await db.timetable.findMany({
      where: { teacherId, section: { semesterId } },
      select: { sectionId: true },
    })
    const secIds = new Set<string>()
    for (const s of slots) if (s.sectionId) secIds.add(s.sectionId)

    const sections = await db.section.findMany({
      where: { id: { in: [...secIds] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    return json(sections)
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
