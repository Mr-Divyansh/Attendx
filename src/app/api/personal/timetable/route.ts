import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError } from '@/lib/auth'

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// GET /api/personal/timetable — list all timetable entries, sorted by day then period
export async function GET() {
  try {
    const session = await requireRole('PERSONAL')
    const rows = await db.personalTimetable.findMany({
      where: { userId: session.id },
      orderBy: [{ period: 'asc' }],
    })
    rows.sort((a, b) => {
      const da = DAY_ORDER.indexOf(a.day)
      const db_ = DAY_ORDER.indexOf(b.day)
      if (da !== db_) return da - db_
      return a.period - b.period
    })
    return json(
      rows.map((r) => ({
        id: r.id,
        day: r.day,
        period: r.period,
        startTime: r.startTime,
        endTime: r.endTime,
        subjectName: r.subjectName,
        room: r.room,
        teacher: r.teacher,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}

// POST /api/personal/timetable — create an entry
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    const body = await parseBody<{
      day?: string
      period?: number
      startTime?: string
      endTime?: string
      subjectName?: string
      room?: string
      teacher?: string
    }>(req)

    const { day, period, startTime, endTime, subjectName, room, teacher } = body
    if (!day || !DAY_ORDER.includes(day)) return errorResponse('Invalid day', 400)
    if (typeof period !== 'number' || period < 1) return errorResponse('Invalid period', 400)
    if (!startTime || !endTime) return errorResponse('Start/end time required', 400)
    if (!subjectName || !subjectName.trim()) return errorResponse('Subject name required', 400)

    const created = await db.personalTimetable.create({
      data: {
        userId: session.id,
        day,
        period,
        startTime,
        endTime,
        subjectName: subjectName.trim(),
        room: room?.trim() || null,
        teacher: teacher?.trim() || null,
      },
    })
    return json(created, 201)
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    const msg = (e as Error)?.message || ''
    if (msg.includes('Unique constraint')) {
      return errorResponse('A period with this day/period already exists', 409)
    }
    throw e
  }
}
