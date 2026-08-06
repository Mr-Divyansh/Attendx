import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/personal/weekly — current week Mon-Sun aggregated by day
export async function GET() {
  try {
    const session = await requireRole('PERSONAL')

    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    // Compute this week's Monday
    const now = new Date()
    const dow = now.getDay() // 0=Sun..6=Sat
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    const dateByDay = new Map<string, string>()
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dateByDay.set(DAYS[i], d.toISOString().slice(0, 10))
    }

    const weekDates = Array.from(dateByDay.values())
    const [timetable, attendance] = await Promise.all([
      db.personalTimetable.findMany({
        where: { userId: session.id, day: { in: DAYS } },
        select: { day: true, period: true },
      }),
      db.personalAttendance.findMany({
        where: { userId: session.id, date: { in: weekDates } },
        select: { date: true, status: true },
      }),
    ])

    // Build per-day buckets keyed by date string
    const totalByDate = new Map<string, number>()
    const presentByDate = new Map<string, number>()
    for (const t of timetable) {
      const d = dateByDay.get(t.day)
      if (!d) continue
      totalByDate.set(d, (totalByDate.get(d) || 0) + 1)
    }
    for (const a of attendance) {
      if (a.status === 'present') {
        presentByDate.set(a.date, (presentByDate.get(a.date) || 0) + 1)
      }
    }

    const result = DAYS.map((day) => {
      const d = dateByDay.get(day)!
      const total = totalByDate.get(d) || 0
      const attended = presentByDate.get(d) || 0
      const pct = total > 0 ? Math.round((attended / total) * 100) : 0
      return { day, total, attended, pct }
    })

    return json(result)
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
