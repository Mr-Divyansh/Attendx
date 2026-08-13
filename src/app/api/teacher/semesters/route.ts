import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { requireRole, parseBody, json, errorResponse, AuthError, handleRouteError, validateCsrfToken } from '@/lib/auth'

// Semesters are assigned through either Subject.teacherId or a timetable slot.
// Supporting both reflects the existing admin workflows and avoids an empty
// selector while a timetable is still being configured.
export async function GET() {
  try {
    const session = await requireRole('TEACHER')
    const teacherId = session.teacherId
    if (!teacherId) return errorResponse('Teacher profile missing', 403)

    const [subjects, slots, owned] = await Promise.all([
      db.subject.findMany({ where: { teacherId, semesterId: { not: null } }, select: { semesterId: true } }),
      db.timetable.findMany({ where: { teacherId }, select: { section: { select: { semesterId: true } }, subject: { select: { semesterId: true } } } }),
      db.semester.findMany({ where: { teacherId }, select: { id: true } }),
    ])
    const ids = new Set<string>()
    for (const subject of subjects) if (subject.semesterId) ids.add(subject.semesterId)
    for (const slot of slots) {
      if (slot.section?.semesterId) ids.add(slot.section.semesterId)
      if (slot.subject?.semesterId) ids.add(slot.subject.semesterId)
    }
    for (const semester of owned) ids.add(semester.id)

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

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const { name } = await parseBody<{ name?: string }>(req)
    if (!name?.trim()) return errorResponse('Semester name is required', 400)
    const count = await db.semester.count({ where: { teacherId: session.teacherId! } })
    return json(await db.semester.create({ data: { name: name.trim(), number: count + 1, teacherId: session.teacherId! }, select: { id: true, name: true } }))
  } catch (e) { return handleRouteError(e, 'teacher/semesters') }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const { id, name } = await parseBody<{ id?: string; name?: string }>(req)
    if (!id || !name?.trim()) return errorResponse('Semester and name are required', 400)
    const result = await db.semester.updateMany({ where: { id, teacherId: session.teacherId! }, data: { name: name.trim() } })
    if (!result.count) return errorResponse('Semester not found', 404)
    return json({ ok: true })
  } catch (e) { return handleRouteError(e, 'teacher/semesters') }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return errorResponse('Semester id is required', 400)
    const result = await db.semester.deleteMany({ where: { id, teacherId: session.teacherId! } })
    if (!result.count) return errorResponse('Semester not found', 404)
    return json({ ok: true })
  } catch (e) { return handleRouteError(e, 'teacher/semesters') }
}
