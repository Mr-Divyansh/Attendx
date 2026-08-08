import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  AuthError,
  validateCsrfToken,
} from '@/lib/auth'

type Entry = { period: number; status: 'present' | 'absent'; subjectName: string }

// GET /api/personal/attendance?date=YYYY-MM-DD — single day or last 30 days
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    const dateParam = req.nextUrl.searchParams.get('date')

    if (dateParam) {
      const rows = await db.personalAttendance.findMany({
        where: { userId: session.id, date: dateParam },
        orderBy: { period: 'asc' },
      })
      return json(
        rows.map((r) => ({
          id: r.id,
          period: r.period,
          status: r.status,
          subjectName: r.subjectName,
          date: r.date,
        }))
      )
    }

    // Last 30 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const rows = await db.personalAttendance.findMany({
      where: { userId: session.id, date: { gte: cutoffStr } },
      orderBy: [{ date: 'desc' }, { period: 'asc' }],
    })
    return json(
      rows.map((r) => ({
        id: r.id,
        period: r.period,
        status: r.status,
        subjectName: r.subjectName,
        date: r.date,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}

// POST /api/personal/attendance — upsert today's (or any date's) attendance entries
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const body = await parseBody<{ date?: string; entries?: Entry[] }>(req)

    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return errorResponse('Valid date (YYYY-MM-DD) is required', 400)
    }
    if (!Array.isArray(body.entries) || body.entries.length === 0) {
      return errorResponse('At least one attendance entry is required', 400)
    }

    const date = body.date
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
      new Date(date + 'T00:00:00').getDay()
    ]

    // Pull the timetable for that day so we can pull the canonical subjectName/room
    const daySlots = await db.personalTimetable.findMany({
      where: { userId: session.id, day: dayName },
    })
    const slotByPeriod = new Map(daySlots.map((s) => [s.period, s]))

    // Delete existing attendance for that date, then re-create (simpler than per-row upsert)
    await db.personalAttendance.deleteMany({
      where: { userId: session.id, date },
    })

    await db.$transaction(
      body.entries.map((e) =>
        db.personalAttendance.create({
          data: {
            userId: session.id,
            date,
            period: e.period,
            status: e.status === 'present' ? 'present' : 'absent',
            subjectName: slotByPeriod.get(e.period)?.subjectName || e.subjectName,
          },
        })
      )
    )

    return json({ ok: true, count: body.entries.length })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
