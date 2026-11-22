// AttendX — Student calendar-month attendance API
// GET /api/student/monthly → calendar-week buckets within the current calendar month.
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

function pct(attended: number, total: number): number {
  return total > 0 ? Math.round((attended / total) * 100) : 0
}

function mondayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const offset = d.getDay() === 0 ? -6 : 1 - d.getDay()
  d.setDate(d.getDate() + offset)
  return d
}

function fmt(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    monthStart.setHours(0, 0, 0, 0)
    monthEnd.setHours(0, 0, 0, 0)

    const records = await db.attendance.findMany({
      where: { studentId, date: { gte: fmt(monthStart), lte: fmt(monthEnd) } },
      select: { date: true, status: true },
    })

    const weeks: { week: string; start: string; end: string; attended: number; total: number }[] = []
    let cursor = mondayOfWeek(monthStart)
    let index = 1
    while (cursor <= monthEnd) {
      const weekEnd = new Date(cursor)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const clippedStart = cursor < monthStart ? monthStart : cursor
      const clippedEnd = weekEnd > monthEnd ? monthEnd : weekEnd
      weeks.push({ week: 'Week ' + index, start: fmt(clippedStart), end: fmt(clippedEnd), attended: 0, total: 0 })
      cursor = new Date(cursor)
      cursor.setDate(cursor.getDate() + 7)
      index += 1
    }

    for (const record of records) {
      const bucket = weeks.find((week) => record.date >= week.start && record.date <= week.end)
      if (!bucket) continue
      bucket.total += 1
      if (record.status === 'present' || record.status === 'late') bucket.attended += 1
    }

    return json({ weeks: weeks.map((week) => ({ ...week, pct: pct(week.attended, week.total) })) })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    console.error('[student/monthly] error:', e)
    return handleRouteError(e, 'student/monthly')
  }
}
