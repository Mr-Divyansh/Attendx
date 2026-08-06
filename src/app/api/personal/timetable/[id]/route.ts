import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

// PUT /api/personal/timetable/[id] — update an entry (must own it)
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireRole('PERSONAL')
    const { id } = await ctx.params

    const existing = await db.personalTimetable.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.id) {
      return errorResponse('Not found', 404)
    }

    const body = await parseBody<{
      day?: string
      period?: number
      startTime?: string
      endTime?: string
      subjectName?: string
      room?: string | null
      teacher?: string | null
    }>(req)

    const updated = await db.personalTimetable.update({
      where: { id },
      data: {
        day: body.day,
        period: typeof body.period === 'number' ? body.period : undefined,
        startTime: body.startTime,
        endTime: body.endTime,
        subjectName: body.subjectName?.trim(),
        room: body.room === null ? null : body.room?.trim(),
        teacher: body.teacher === null ? null : body.teacher?.trim(),
      },
    })
    return json(updated)
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    const msg = (e as Error)?.message || ''
    if (msg.includes('Unique constraint')) {
      return errorResponse('A period with this day/period already exists', 409)
    }
    throw e
  }
}

// DELETE /api/personal/timetable/[id]
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireRole('PERSONAL')
    const { id } = await ctx.params

    const existing = await db.personalTimetable.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.id) {
      return errorResponse('Not found', 404)
    }

    await db.personalTimetable.delete({ where: { id } })
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
