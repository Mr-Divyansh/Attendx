// AttendX — Student monthly attendance API
// Returns six calendar months (oldest to current), using only marked records.
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    const now = new Date()
    const months: { key: string; month: string; start: Date; end: Date }[] = []
    for (let offset = 5; offset >= 0; offset -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      months.push({
        key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        month: start.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        start,
        end,
      })
    }

    const records = await db.attendance.findMany({
      where: {
        studentId,
        date: { gte: fmt(months[0].start), lte: fmt(months[5].end) },
      },
      select: { date: true, status: true },
    })

    const buckets = months.map((item) => ({
      month: item.month,
      start: fmt(item.start),
      end: fmt(item.end),
      attended: 0,
      total: 0,
    }))

    const bucketByKey = new Map(months.map((item, index) => [item.key, buckets[index]]))
    for (const record of records) {
      const key = record.date.slice(0, 7)
      const bucket = bucketByKey.get(key)
      if (!bucket) continue
      bucket.total += 1
      if (record.status === 'present' || record.status === 'late') bucket.attended += 1
    }

    const weeks = buckets.map((bucket) => ({
      ...bucket,
      pct: bucket.total ? Math.round((bucket.attended / bucket.total) * 100) : 0,
    }))

    return json({ weeks })
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status)
    console.error('[student/monthly] error:', error)
    return handleRouteError(error, 'student/monthly')
  }
}
