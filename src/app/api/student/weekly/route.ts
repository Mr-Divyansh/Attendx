// AttendX — Student weekly attendance API
// Calendar-week reporting is Monday through Sunday and is scoped to the signed-in student.
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const HISTORY_WEEKS = 6

function mondayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function fmt(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function summarize(records: { status: string }[]) {
  const present = records.filter((record) => record.status === 'present').length
  const late = records.filter((record) => record.status === 'late').length
  const absent = records.filter((record) => record.status === 'absent').length
  const total = present + late + absent
  const attended = present + late
  return { present, late, absent, attended, total, pct: total ? Math.round((attended / total) * 100) : null }
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    const currentMonday = mondayOfWeek(new Date())
    const firstMonday = addDays(currentMonday, -7 * (HISTORY_WEEKS - 1))
    const currentSunday = addDays(currentMonday, 6)
    const records = await db.attendance.findMany({
      where: { studentId, date: { gte: fmt(firstMonday), lte: fmt(currentSunday) } },
      select: {
        date: true,
        status: true,
        subjectId: true,
        subject: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { subjectId: 'asc' }],
    })

    const currentRecords = records.filter((record) => record.date >= fmt(currentMonday) && record.date <= fmt(currentSunday))
    const week = DAYS.map((day, index) => {
      const date = fmt(addDays(currentMonday, index))
      const dayRecords = currentRecords.filter((record) => record.date === date)
      const counts = summarize(dayRecords)
      return {
        day,
        date,
        attended: counts.attended,
        missed: counts.absent,
        total: counts.total,
        present: counts.present,
        late: counts.late,
        absent: counts.absent,
        pct: counts.pct ?? 0,
      }
    })

    const subjectMap = new Map<string, { subjectId: string; code: string; name: string; records: { status: string }[] }>()
    for (const record of currentRecords) {
      if (!record.subjectId || !record.subject) continue
      const existing: { subjectId: string; code: string; name: string; records: { status: string }[] } = subjectMap.get(record.subjectId) ?? {
        subjectId: record.subject.id,
        code: record.subject.code,
        name: record.subject.name,
        records: [],
      }
      existing.records.push(record)
      subjectMap.set(record.subjectId, existing)
    }
    const subjects = Array.from(subjectMap.values()).map(({ records: subjectRecords, ...subject }) => ({
      ...subject,
      ...summarize(subjectRecords),
    })).sort((a, b) => a.name.localeCompare(b.name))

    const history = Array.from({ length: HISTORY_WEEKS }, (_, index) => {
      const start = addDays(firstMonday, index * 7)
      const end = addDays(start, 6)
      const weekRecords = records.filter((record) => record.date >= fmt(start) && record.date <= fmt(end))
      return {
        start: fmt(start),
        end: fmt(end),
        label: `${fmt(start)} – ${fmt(end)}`,
        ...summarize(weekRecords),
      }
    })

    return json({
      range: { start: fmt(currentMonday), end: fmt(currentSunday) },
      summary: summarize(currentRecords),
      week,
      subjects,
      history,
    })
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status)
    return handleRouteError(error, 'student/weekly')
  }
}
