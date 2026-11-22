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
    return handleRouteError(e, 'personal/attendance')
  }
}

// POST /api/personal/attendance — upsert today's (or any date's) attendance entries
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    await assertCsrf(req)
    const body = await parseBody<{ date?: string; entries?: Entry[] }>(req)

    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return errorResponse('Valid date (YYYY-MM-DD) is required', 400)
    }
    const parsedDate = new Date(`${body.date}T00:00:00.000Z`)
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== body.date) {
      return errorResponse('The attendance date is not a valid calendar date', 400)
    }
    if (!Array.isArray(body.entries) || body.entries.length === 0 || body.entries.length > 24) {
      return errorResponse('Provide between 1 and 24 attendance entries', 400)
    }

    const validEntries = body.entries.every((entry) =>
      Number.isInteger(entry?.period) &&
      entry.period >= 1 &&
      entry.period <= 24 &&
      (entry.status === 'present' || entry.status === 'absent') &&
      typeof entry.subjectName === 'string' &&
      entry.subjectName.trim().length > 0 &&
      entry.subjectName.trim().length <= 120
    )
    if (!validEntries) {
      return errorResponse('Each entry needs a valid period, status, and subject name', 400)
    }
    const periods = body.entries.map((entry) => entry.period)
    if (new Set(periods).size !== periods.length) {
      return errorResponse('Duplicate periods are not allowed for one date', 400)
    }

    const entries = body.entries.map((entry) => ({ ...entry, subjectName: entry.subjectName.trim() }))
    const date = body.date
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parsedDate.getUTCDay()]

    // Pull the timetable for that day so we can pull the canonical subjectName/room
    const daySlots = await db.personalTimetable.findMany({
      where: { userId: session.id, day: dayName },
    })
    const slotByPeriod = new Map<number, { subjectName: string }>(
      daySlots.map((s) => [s.period, { subjectName: s.subjectName }])
    )

    // Replace the day's records atomically so a failed insert never erases
    // the user's previous attendance for that date.
    await db.$transaction([
      db.personalAttendance.deleteMany({
        where: { userId: session.id, date },
      }),
      ...entries.map((entry) =>
        db.personalAttendance.create({
          data: {
            userId: session.id,
            date,
            period: entry.period,
            status: entry.status,
            subjectName: slotByPeriod.get(entry.period)?.subjectName || entry.subjectName,
          },
        })
      ),
    ])

    return json({ ok: true, count: entries.length })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'personal/attendance')
  }
}
