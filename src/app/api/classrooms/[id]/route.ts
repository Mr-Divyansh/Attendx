import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, handleRouteError, assertCsrf } from '@/lib/auth'

export const runtime = 'nodejs'

async function owned(id: string, teacherId: string) {
  return db.classroom.findFirst({ where: { id, teacherId }, include: { subject: true, semester: { select: { id: true, name: true } }, members: { include: { student: { include: { user: { select: { email: true } } } } } }, schedules: { orderBy: [{ day: 'asc' }, { startTime: 'asc' }] } } })
}

export async function GET(_req: NextRequest, context: RouteContext<'/api/classrooms/[id]'>) {
  try {
    const session = await requireRole('TEACHER')
    const { id } = await context.params
    const classroom = await owned(id, session.teacherId!)
    if (!classroom) return errorResponse('Classroom not found', 404)
    const now = Date.now()
    const expired = !!classroom.expiresAt && classroom.expiresAt.getTime() < now
    return json({ classroom: { ...classroom, expired, status: expired ? 'EXPIRED' : 'ACTIVE' } })
  } catch (e) { return handleRouteError(e, 'classrooms/id') }
}

export async function DELETE(req: NextRequest, context: RouteContext<'/api/classrooms/[id]'>) {
  try {
    const session = await requireRole('TEACHER')
    await assertCsrf(req)
    const { id } = await context.params
    const result = await db.classroom.deleteMany({ where: { id, teacherId: session.teacherId! } })
    if (!result.count) return errorResponse('Classroom not found', 404)
    return json({ ok: true })
  } catch (e) { return handleRouteError(e, 'classrooms/id') }
}

export async function PATCH(req: NextRequest, context: RouteContext<'/api/classrooms/[id]'>) {
  try {
    const session = await requireRole('TEACHER')
    await assertCsrf(req)
    const { id } = await context.params
    const body = await parseBody<{ name?: string; room?: string; academicYear?: string; year?: number | string; durationYears?: number | string }>(req)
    const year = body.year == null || body.year === '' ? undefined : Number(body.year)
    const durationYears = body.durationYears == null || body.durationYears === '' ? undefined : Number(body.durationYears)
    if (year !== undefined && (!Number.isInteger(year) || year < 1 || year > 4)) {
      return errorResponse('Year must be between Year 1 and Year 4', 400)
    }
    if (durationYears !== undefined && (!Number.isInteger(durationYears) || durationYears < 1 || durationYears > 4)) {
      return errorResponse('Class duration must be between 1 and 4 years', 400)
    }
    const data: Record<string, unknown> = {}
    if (body.name?.trim()) data.name = body.name.trim()
    if (body.room !== undefined) data.room = body.room?.trim() || null
    if (body.academicYear !== undefined) data.academicYear = body.academicYear?.trim() || null
    if (year !== undefined) data.year = year
    if (durationYears !== undefined) {
      data.durationYears = durationYears
      data.expiresAt = new Date(Date.now() + durationYears * 365.25 * 24 * 60 * 60 * 1000)
    }
    const result = await db.classroom.updateMany({ where: { id, teacherId: session.teacherId! }, data })
    if (!result.count) return errorResponse('Classroom not found', 404)
    return json({ ok: true })
  } catch (e) { return handleRouteError(e, 'classrooms/id') }
}
