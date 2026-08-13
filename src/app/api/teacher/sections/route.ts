import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, handleRouteError, validateCsrfToken } from '@/lib/auth'

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

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const { name, semesterId } = await parseBody<{ name?: string; semesterId?: string }>(req)
    if (!name?.trim() || !semesterId) return errorResponse('Section name and semester are required', 400)
    const semester = await db.semester.findFirst({ where: { id: semesterId, teacherId: session.teacherId! } })
    if (!semester) return errorResponse('Semester not found', 404)
    return json(await db.section.create({ data: { name: name.trim(), semesterId, teacherId: session.teacherId! }, select: { id: true, name: true } }))
  } catch (e) { return handleRouteError(e, 'teacher/sections') }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return errorResponse('Section id is required', 400)
    const result = await db.section.deleteMany({ where: { id, teacherId: session.teacherId! } })
    if (!result.count) return errorResponse('Section not found', 404)
    return json({ ok: true })
  } catch (e) { return handleRouteError(e, 'teacher/sections') }
}
