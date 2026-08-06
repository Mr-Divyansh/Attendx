import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/personal/monthly — last 4 weeks aggregated as W1..W4
// W4 = current week (Mon-Sun), W3 = previous, etc.
export async function GET() {
  try {
    const session = await requireRole('PERSONAL')

    const now = new Date()
    const dow = now.getDay() // 0=Sun..6=Sat
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() + mondayOffset)
    thisMonday.setHours(0, 0, 0, 0)

    // Build 4 week-ranges
    const weeks: { label: string; start: Date; end: Date }[] = []
    for (let w = 3; w >= 0; w--) {
      const start = new Date(thisMonday)
      start.setDate(thisMonday.getDate() - w * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      weeks.push({ label: `W${4 - w}`, start, end })
    }

    const allDates: string[] = []
    const dateToWeek = new Map<string, string>()
    for (const w of weeks) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(w.start)
        d.setDate(w.start.getDate() + i)
        const ds = d.toISOString().slice(0, 10)
        allDates.push(ds)
        dateToWeek.set(ds, w.label)
      }
    }

    const [attendance, timetable] = await Promise.all([
      db.personalAttendance.findMany({
        where: { userId: session.id, date: { in: allDates } },
        select: { date: true, status: true },
      }),
      db.personalTimetable.findMany({
        where: { userId: session.id },
        select: { day: true },
      }),
    ])

    // For each week, compute expected total (sum over each date in that week of how
    // many timetable periods fall on that day-of-week) and present count.
    const dayCount: Record<string, number> = {}
    for (const t of timetable) {
      dayCount[t.day] = (dayCount[t.day] || 0) + 1
    }

    const weekTotal: Record<string, number> = {}
    const weekPresent: Record<string, number> = {}
    for (const w of weeks) weekTotal[w.label] = 0
    for (const w of weeks) weekPresent[w.label] = 0

    for (const ds of allDates) {
      const wk = dateToWeek.get(ds)!
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
        new Date(ds + 'T00:00:00').getDay()
      ]
      // Skip future dates for total (we can't have attendance in the future)
      if (new Date(ds + 'T00:00:00') > now) continue
      weekTotal[wk] += dayCount[dayName] || 0
    }
    for (const a of attendance) {
      if (a.status !== 'present') continue
      const wk = dateToWeek.get(a.date)
      if (!wk) continue
      weekPresent[wk] += 1
    }

    const result = weeks.map((w) => ({
      week: w.label,
      pct: weekTotal[w.label] > 0 ? Math.round((weekPresent[w.label] / weekTotal[w.label]) * 100) : 0,
      total: weekTotal[w.label],
      attended: weekPresent[w.label],
    }))

    return json(result)
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
