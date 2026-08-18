import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, handleRouteError, assertCsrf } from '@/lib/auth'

export const runtime = 'nodejs'

function sessionPeriod(startTime: string) { return Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5)) }

export async function GET(req: NextRequest, context: RouteContext<'/api/classrooms/[id]/attendance'>) {
  try {
    const session = await requireRole('TEACHER')
    const { id } = await context.params
    const classroom = await db.classroom.findFirst({ where: { id, teacherId: session.teacherId! }, include: { members: { where: { status: 'ACTIVE' }, include: { student: true } } } })
    if (!classroom) return errorResponse('Classroom not found', 404)
    const date = req.nextUrl.searchParams.get('date')
    const startTime = req.nextUrl.searchParams.get('startTime')
    if (!date || !startTime) return errorResponse('Date and start time are required', 400)
    const period = sessionPeriod(startTime)
    const records = await db.attendance.findMany({ where: { classroomId: id, date, period }, select: { studentId: true, status: true, startTime: true, endTime: true } })
    return json({ students: classroom.members.map((m) => ({ id: m.student.id, fullName: m.student.fullName, rollNo: m.student.rollNo })), records })
  } catch (e) { return handleRouteError(e, 'classrooms/attendance') }
}

export async function POST(req: NextRequest, context: RouteContext<'/api/classrooms/[id]/attendance'>) {
  try {
    const session = await requireRole('TEACHER')
    await assertCsrf(req)
    const { id } = await context.params
    const classroom = await db.classroom.findFirst({ where: { id, teacherId: session.teacherId! } })
    if (!classroom) return errorResponse('Classroom not found', 404)
    const { date, startTime, endTime, entries } = await parseBody<{ date?: string; startTime?: string; endTime?: string; entries?: { studentId: string; status: 'present' | 'absent' }[] }>(req)
    if (!date || !startTime || !endTime || startTime >= endTime || !Array.isArray(entries)) return errorResponse('Provide date, valid start/end times, and attendance entries', 400)
    const period = sessionPeriod(startTime)
    const members = await db.classroomMember.findMany({ where: { classroomId: id, status: 'ACTIVE', studentId: { in: entries.map((e) => e.studentId) } }, select: { studentId: true } })
    const permitted = new Set(members.map((m) => m.studentId))
    const clean = entries.filter((e) => permitted.has(e.studentId) && (e.status === 'present' || e.status === 'absent'))
    await db.$transaction(clean.map((entry) => db.attendance.upsert({ where: { studentId_classroomId_date_period: { studentId: entry.studentId, classroomId: id, date, period } }, update: { status: entry.status, endTime, startTime, markedById: session.teacherId!, markedAt: new Date() }, create: { studentId: entry.studentId, classroomId: id, date, period, startTime, endTime, status: entry.status, markedById: session.teacherId! } })))
    return json({ saved: clean.length })
  } catch (e) { return handleRouteError(e, 'classrooms/attendance') }
}
