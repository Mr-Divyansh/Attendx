// AttendX — Student weekly attendance API
// GET /api/student/weekly → [{ day: 'Mon', total, attended, pct }] for the current week (Mon..Sun).
// total = timetable periods for that day-of-week in the student's section.
// attended = number of attendance records (present+late) on that date.
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function pct(attended: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((attended / total) * 100)
}

/** Return Monday of the week containing the given date (local-time aware). */
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

    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { sectionId: true },
    })
    if (!student) return errorResponse('Student not found', 404)

    // Build the 7 dates for the current week (Mon..Sun)
    const monday = mondayOfWeek(new Date())
    const weekDates: { day: string; dateStr: string }[] = DAYS.map((day, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return { day, dateStr: fmt(d) }
    })

    // Fetch timetable per-day period counts for this section
    let slotCounts: Record<string, number> = {}
    if (student.sectionId) {
      const slots = await db.timetable.findMany({
        where: { sectionId: student.sectionId },
        select: { day: true, period: true },
      })
      slotCounts = slots.reduce<Record<string, number>>((acc, s) => {
        acc[s.day] = (acc[s.day] ?? 0) + 1
        return acc
      }, {})
    }

    // Fetch all attendance for this student in the current week's date range
    const startDate = weekDates[0].dateStr
    const endDate = weekDates[6].dateStr
    const records = await db.attendance.findMany({
      where: {
        studentId,
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, status: true },
    })

    // Bucket attendance by date
    const byDate = new Map<string, { attended: number; total: number }>()
    for (const r of records) {
      const e = byDate.get(r.date) ?? { attended: 0, total: 0 }
      e.total += 1
      if (r.status === 'present' || r.status === 'late') e.attended += 1
      byDate.set(r.date, e)
    }

    const result = weekDates.map(({ day, dateStr }) => {
      const total = slotCounts[day] ?? 0
      const rec = byDate.get(dateStr)
      const attended = rec?.attended ?? 0
      return { day, date: dateStr, total, attended, pct: pct(attended, total) }
    })

    return json({ week: result })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    console.error('[student/weekly] error:', e)
    return errorResponse('Internal server error', 500)
  }
}
