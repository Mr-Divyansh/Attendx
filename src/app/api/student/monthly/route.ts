// AttendX — Student monthly trend API
// GET /api/student/monthly → [{ week: 'W1', pct }] for the last 4 weeks (W1 = oldest, W4 = current).
// pct = (present+late) / total per week.
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

function pct(attended: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((attended / total) * 100)
}

/** Monday of the week containing the given date (local-time aware). */
function mondayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    // Compute the Monday of the current week, then walk back 3 more Mondays
    // for a 4-week window: W1 (oldest) → W4 (current).
    const thisMonday = mondayOfWeek(new Date())
    const weekStarts: { week: string; start: Date; end: Date }[] = []
    for (let i = 3; i >= 0; i--) {
      const start = new Date(thisMonday)
      start.setDate(thisMonday.getDate() - i * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      const label = `W${4 - i}` // i=3 → W1, i=0 → W4
      weekStarts.push({ week: label, start, end })
    }

    const earliest = fmt(weekStarts[0].start)
    const latest = fmt(weekStarts[3].end)

    const records = await db.attendance.findMany({
      where: {
        studentId,
        date: { gte: earliest, lte: latest },
      },
      select: { date: true, status: true },
    })

    // Bucket records into weeks
    const buckets = weekStarts.map((w) => ({
      week: w.week,
      start: fmt(w.start),
      end: fmt(w.end),
      attended: 0,
      total: 0,
    }))

    for (const r of records) {
      const b = buckets.find((bk) => r.date >= bk.start && r.date <= bk.end)
      if (!b) continue
      b.total += 1
      if (r.status === 'present' || r.status === 'late') b.attended += 1
    }

    const result = buckets.map((b) => ({
      week: b.week,
      start: b.start,
      end: b.end,
      attended: b.attended,
      total: b.total,
      pct: pct(b.attended, b.total),
    }))

    return json({ weeks: result })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    console.error('[student/monthly] error:', e)
    return errorResponse('Internal server error', 500)
  }
}
