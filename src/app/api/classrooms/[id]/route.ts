import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, handleRouteError, validateCsrfToken } from '@/lib/auth'

async function owned(id: string, teacherId: string) {
  return db.classroom.findFirst({ where: { id, teacherId }, include: { subject: true, members: { include: { student: { include: { user: { select: { email: true } } } } } }, schedules: { orderBy: [{ day: 'asc' }, { startTime: 'asc' }] } } })
}

export async function GET(_req: NextRequest, context: RouteContext<'/api/classrooms/[id]'>) {
  try {
    const session = await requireRole('TEACHER')
    const { id } = await context.params
    const classroom = await owned(id, session.teacherId!)
    if (!classroom) return errorResponse('Classroom not found', 404)
    return json({ classroom })
  } catch (e) { return handleRouteError(e, 'classrooms/id') }
}

export async function DELETE(req: NextRequest, context: RouteContext<'/api/classrooms/[id]'>) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const { id } = await context.params
    const result = await db.classroom.deleteMany({ where: { id, teacherId: session.teacherId! } })
    if (!result.count) return errorResponse('Classroom not found', 404)
    return json({ ok: true })
  } catch (e) { return handleRouteError(e, 'classrooms/id') }
}

export async function PATCH(req: NextRequest, context: RouteContext<'/api/classrooms/[id]'>) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) throw new AuthError('Invalid or missing CSRF token', 403)
    const { id } = await context.params
    const body = await parseBody<{ name?: string; room?: string; academicYear?: string }>(req)
    const result = await db.classroom.updateMany({ where: { id, teacherId: session.teacherId! }, data: { ...(body.name?.trim() ? { name: body.name.trim() } : {}), room: body.room?.trim() || null, academicYear: body.academicYear?.trim() || null } })
    if (!result.count) return errorResponse('Classroom not found', 404)
    return json({ ok: true })
  } catch (e) { return handleRouteError(e, 'classrooms/id') }
}
