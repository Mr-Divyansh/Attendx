// AttendX — Student weekly attendance API
// Returns only attendance that has actually been marked for the signed-in student.
// Each day reports attended (present + late), missed (absent), and total marked classes.
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function mondayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    const monday = mondayOfWeek(new Date())
    const dates = DAYS.map((day, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return { day, date: fmt(date) }
    })

    const records = await db.attendance.findMany({
      where: {
        studentId,
        date: { gte: dates[0].date, lte: dates[6].date },
      },
      select: { date: true, status: true },
    })

    const buckets = new Map<string, { attended: number; total: number }>()
    for (const record of records) {
      const bucket = buckets.get(record.date) ?? { attended: 0, total: 0 }
      bucket.total += 1
      if (record.status === 'present' || record.status === 'late') bucket.attended += 1
      buckets.set(record.date, bucket)
    }

    const week = dates.map(({ day, date }) => {
      const bucket = buckets.get(date) ?? { attended: 0, total: 0 }
      const missed = bucket.total - bucket.attended
      return {
        day,
        date,
        attended: bucket.attended,
        missed,
        total: bucket.total,
        pct: bucket.total ? Math.round((bucket.attended / bucket.total) * 100) : 0,
      }
    })

    return json({ week })
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status)
    console.error('[student/weekly] error:', error)
    return handleRouteError(error, 'student/weekly')
  }
}
