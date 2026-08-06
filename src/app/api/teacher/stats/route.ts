import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/teacher/stats — { todayClasses, pending, completed }
// Today = current weekday (Mon..Sun). A slot is "completed" if at least one
// attendance record exists for that subject + today's date + period.
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getToday() {
  const d = new Date()
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
  return { dateStr, dayName: DAY_NAMES[d.getDay()] }
}

export async function GET() {
  try {
    const session = await requireRole('TEACHER')
    const teacherId = session.teacherId!
    const { dateStr, dayName } = getToday()

    const slots = await db.timetable.findMany({
      where: { teacherId, day: dayName },
      select: { id: true, subjectId: true, period: true },
    })

    let completed = 0
    if (slots.length > 0) {
      const counts = await Promise.all(
        slots
          .filter((s) => s.subjectId)
          .map((s) =>
            db.attendance.count({
              where: { subjectId: s.subjectId!, date: dateStr, period: s.period },
            })
          )
      )
      completed = counts.filter((c) => c > 0).length
    }

    return json({
      todayClasses: slots.length,
      pending: slots.length - completed,
      completed,
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
