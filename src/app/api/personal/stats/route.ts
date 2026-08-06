import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/personal/stats — top-line dashboard numbers
export async function GET() {
  try {
    const session = await requireRole('PERSONAL')

    const [attendance, settings, todayTimetable, todayAttendance] = await Promise.all([
      db.personalAttendance.findMany({
        where: { userId: session.id },
        select: { status: true },
      }),
      db.setting.findUnique({ where: { userId: session.id } }),
      db.personalTimetable.findMany({
        where: { userId: session.id, day: todayDayName() },
        select: { period: true },
      }),
      db.personalAttendance.findMany({
        where: { userId: session.id, date: todayDateStr() },
        select: { id: true },
      }),
    ])

    const present = attendance.filter((a) => a.status === 'present').length
    const absent = attendance.filter((a) => a.status === 'absent').length
    const total = present + absent
    const overallPct = total > 0 ? Math.round((present / total) * 100) : 0

    return json({
      overallPct,
      present,
      absent,
      total,
      goalPct: settings?.goalPct ?? 75,
      darkMode: settings?.darkMode ?? false,
      todayMarked: todayAttendance.length,
      todayTotal: todayTimetable.length,
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}

function todayDateStr(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function todayDayName(): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
}
