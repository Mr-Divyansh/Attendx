import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    const teacherId = session.teacherId
    const semesterId = req.nextUrl.searchParams.get('semesterId')
    if (!teacherId) return errorResponse('Teacher profile missing', 403)
    if (!semesterId) return errorResponse('semesterId is required', 400)

    const [subjects, slots] = await Promise.all([
      db.subject.findMany({ where: { teacherId, semesterId, sectionId: { not: null } }, select: { sectionId: true } }),
      db.timetable.findMany({ where: { teacherId, section: { semesterId } }, select: { sectionId: true } }),
    ])
    const ids = new Set<string>()
    for (const row of [...subjects, ...slots]) if (row.sectionId) ids.add(row.sectionId)
    return json(await db.section.findMany({ where: { id: { in: [...ids] } }, orderBy: { name: 'asc' }, select: { id: true, name: true } }))
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'teacher/sections')
  }
}
