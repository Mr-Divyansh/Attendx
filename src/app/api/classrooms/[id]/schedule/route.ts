import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, handleRouteError, assertCsrf } from '@/lib/auth'

const DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
const DAY_ALIASES: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' }

function normaliseTime(value?: string) {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return { value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, minutes: hours * 60 + minutes }
}

export async function POST(req: NextRequest, context: RouteContext<'/api/classrooms/[id]/schedule'>) {
  try {
    const session = await requireRole('TEACHER')
    await assertCsrf(req)
    const { id } = await context.params
    const classroom = await db.classroom.findFirst({ where: { id, teacherId: session.teacherId! } })
    if (!classroom) return errorResponse('Classroom not found', 404)
    const { day: submittedDay, startTime: submittedStart, endTime: submittedEnd, room } = await parseBody<{ day?: string; startTime?: string; endTime?: string; room?: string }>(req)
    const day = submittedDay ? (DAY_ALIASES[submittedDay] || submittedDay) : ''
    const startTime = normaliseTime(submittedStart)
    const endTime = normaliseTime(submittedEnd)
    if (!DAYS.has(day) || !startTime || !endTime || startTime.minutes >= endTime.minutes) return errorResponse('Choose a day and an end time later than the start time.', 400)
    const schedule = await db.timetable.create({ data: { classroomId: id, teacherId: session.teacherId!, subjectId: classroom.subjectId, sectionId: classroom.sectionId, day, startTime: startTime.value, endTime: endTime.value, room: room?.trim() || classroom.room, period: startTime.minutes } })
    return json({ schedule })
  } catch (e) { return handleRouteError(e, 'classrooms/schedule') }
}

export async function DELETE(req: NextRequest, context: RouteContext<'/api/classrooms/[id]/schedule'>) {
  try {
    const session = await requireRole('TEACHER')
    await assertCsrf(req)
    const { id } = await context.params
    const scheduleId = req.nextUrl.searchParams.get('scheduleId')
    if (!scheduleId) return errorResponse('Schedule id is required', 400)
    const result = await db.timetable.deleteMany({ where: { id: scheduleId, classroomId: id, teacherId: session.teacherId! } })
    if (!result.count) return errorResponse('Schedule not found', 404)
    return json({ ok: true })
  } catch (e) { return handleRouteError(e, 'classrooms/schedule') }
}
