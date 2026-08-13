import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, handleRouteError, validateCsrfToken } from '@/lib/auth'

const DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])

export async function POST(req: NextRequest, context: RouteContext<'/api/classrooms/[id]/schedule'>) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const { id } = await context.params
    const classroom = await db.classroom.findFirst({ where: { id, teacherId: session.teacherId! } })
    if (!classroom) return errorResponse('Classroom not found', 404)
    const { day, startTime, endTime, room } = await parseBody<{ day?: string; startTime?: string; endTime?: string; room?: string }>(req)
    if (!day || !DAYS.has(day) || !startTime || !endTime || startTime >= endTime) return errorResponse('Provide a valid day, start time and end time', 400)
    const period = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5))
    const schedule = await db.timetable.create({ data: { classroomId: id, teacherId: session.teacherId!, subjectId: classroom.subjectId, sectionId: classroom.sectionId, day, startTime, endTime, room: room?.trim() || classroom.room, period } })
    return json({ schedule })
  } catch (e) { return handleRouteError(e, 'classrooms/schedule') }
}

export async function DELETE(req: NextRequest, context: RouteContext<'/api/classrooms/[id]/schedule'>) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const { id } = await context.params
    const scheduleId = req.nextUrl.searchParams.get('scheduleId')
    if (!scheduleId) return errorResponse('Schedule id is required', 400)
    const result = await db.timetable.deleteMany({ where: { id: scheduleId, classroomId: id, teacherId: session.teacherId! } })
    if (!result.count) return errorResponse('Schedule not found', 404)
    return json({ ok: true })
  } catch (e) { return handleRouteError(e, 'classrooms/schedule') }
}
