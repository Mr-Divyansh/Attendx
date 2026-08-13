import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, handleRouteError, validateCsrfToken } from '@/lib/auth'

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

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const { name, sectionId } = await parseBody<{ name?: string; sectionId?: string }>(req)
    if (!name?.trim() || !sectionId) return errorResponse('Subject name and section are required', 400)
    const section = await db.section.findFirst({ where: { id: sectionId, teacherId: session.teacherId! } })
    if (!section) return errorResponse('Section not found', 404)
    const code = `T-${session.teacherId!.slice(-5).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    return json(await db.subject.create({ data: { code, name: name.trim(), sectionId, semesterId: section.semesterId, teacherId: session.teacherId! }, select: { id: true, code: true, name: true } }))
  } catch (e) { return handleRouteError(e, 'teacher/subjects') }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return errorResponse('Subject id is required', 400)
    const result = await db.subject.deleteMany({ where: { id, teacherId: session.teacherId! } })
    if (!result.count) return errorResponse('Subject not found', 404)
    return json({ ok: true })
  } catch (e) { return handleRouteError(e, 'teacher/subjects') }
}
