import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  AuthError,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'

// GET /api/admin/timetable — list all timetable entries with relations.
export async function GET() {
  try {
    await requireRole('ADMIN')
    const entries = await db.timetable.findMany({
      orderBy: [{ day: 'asc' }, { period: 'asc' }],
      include: {
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, code: true, name: true } },
        teacher: { select: { id: true, fullName: true } },
      },
    })
    return json(
      entries.map((t) => ({
        id: t.id,
        sectionId: t.sectionId,
        sectionName: t.section?.name ?? null,
        subjectId: t.subjectId,
        subjectCode: t.subject?.code ?? null,
        subjectName: t.subject?.name ?? null,
        teacherId: t.teacherId,
        teacherName: t.teacher?.fullName ?? null,
        day: t.day,
        period: t.period,
        startTime: t.startTime,
        endTime: t.endTime,
        room: t.room,
        createdAt: t.createdAt,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/timetable')
  }
}

// POST /api/admin/timetable — create a timetable entry.
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    await assertCsrf(req)
    const body = await parseBody<{
      sectionId?: string | null
      subjectId?: string | null
      teacherId?: string | null
      day?: string
      period?: number
      startTime?: string
      endTime?: string
      room?: string | null
    }>(req)

    const day = body.day?.trim()
    const period = Number(body.period)
    const startTime = body.startTime?.trim()
    const endTime = body.endTime?.trim()

    if (!day || !Number.isFinite(period) || !startTime || !endTime) {
      return errorResponse('day, period, startTime and endTime are required', 400)
    }

    const entry = await db.timetable.create({
      data: {
        sectionId: body.sectionId || null,
        subjectId: body.subjectId || null,
        teacherId: body.teacherId || null,
        day,
        period,
        startTime,
        endTime,
        room: body.room?.trim() || null,
      },
      include: {
        section: { select: { name: true } },
        subject: { select: { code: true, name: true } },
        teacher: { select: { fullName: true } },
      },
    })

    return json(
      {
        id: entry.id,
        sectionId: entry.sectionId,
        sectionName: entry.section?.name ?? null,
        subjectId: entry.subjectId,
        subjectCode: entry.subject?.code ?? null,
        subjectName: entry.subject?.name ?? null,
        teacherId: entry.teacherId,
        teacherName: entry.teacher?.fullName ?? null,
        day: entry.day,
        period: entry.period,
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room,
      },
      201
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/timetable')
  }
}
