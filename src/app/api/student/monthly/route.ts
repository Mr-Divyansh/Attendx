// AttendX — Student monthly attendance API
// Returns six calendar months, separate from the current Monday–Sunday weekly report.
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

function fmt(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    const now = new Date()
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const records = await db.attendance.findMany({
      where: { studentId, date: { gte: fmt(firstMonth), lte: fmt(lastDay) } },
      select: { date: true, status: true },
    })

    const months: { month: string; start: string; end: string; attended: number; total: number; pct: number }[] = []
    for (let offset = 0; offset < 6; offset += 1) {
      const start = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + offset, 1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      const bucket = records.filter((record) => record.date >= fmt(start) && record.date <= fmt(end))
      const total = bucket.length
      const attended = bucket.filter((record) => record.status === 'present' || record.status === 'late').length
      const month = start.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      months.push({ month, start: fmt(start), end: fmt(end), attended, total, pct: total ? Math.round((attended / total) * 100) : 0 })
    }

    return json({ months })
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status)
    console.error('[student/monthly] error:', error)
    return handleRouteError(error, 'student/monthly')
  }
}
