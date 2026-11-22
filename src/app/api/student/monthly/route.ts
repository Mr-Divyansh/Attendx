// AttendX — Student monthly attendance API
// Six calendar-month history plus a selectable month breakdown, all scoped to one student.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

function fmt(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseMonth(value: string | null): Date | null {
  if (!value) return null
  const match = /^(\\d{4})-(\\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null
  return new Date(year, month - 1, 1)
}

function summarize(records: { status: string }[]) {
  const present = records.filter((record) => record.status === 'present').length
  const late = records.filter((record) => record.status === 'late').length
  const absent = records.filter((record) => record.status === 'absent').length
  const total = present + late + absent
  const attended = present + late
  return { present, late, absent, attended, total, pct: total ? Math.round((attended / total) * 100) : null }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    const selectedMonth = parseMonth(request.nextUrl.searchParams.get('month')) ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const firstMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 5, 1)
    const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
    const records = await db.attendance.findMany({
      where: { studentId, date: { gte: fmt(firstMonth), lte: fmt(lastDay) } },
      select: {
        date: true,
        status: true,
        subjectId: true,
        subject: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { subjectId: 'asc' }],
    })

    const months = Array.from({ length: 6 }, (_, index) => {
      const start = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      const monthRecords = records.filter((record) => record.date >= fmt(start) && record.date <= fmt(end))
      return {
        month: start.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        start: fmt(start),
        end: fmt(end),
        ...summarize(monthRecords),
      }
    })

    const selectedStart = fmt(selectedMonth)
    const selectedEnd = fmt(lastDay)
    const selectedRecords = records.filter((record) => record.date >= selectedStart && record.date <= selectedEnd)
    const subjectMap = new Map<string, { subjectId: string; code: string; name: string; records: { status: string }[] }>()
    for (const record of selectedRecords) {
      if (!record.subjectId || !record.subject) continue
      const existing = subjectMap.get(record.subjectId) ?? {
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

    const selectedIndex = months.length - 1
    const currentSummary = months[selectedIndex]
    const previousSummary = months[selectedIndex - 1]
    const change = currentSummary.pct !== null && previousSummary?.pct !== null
      ? currentSummary.pct - previousSummary.pct
      : null

    return json({
      selectedMonth: `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`,
      summary: summarize(selectedRecords),
      comparison: { previousMonth: previousSummary ?? null, percentagePointChange: change },
      subjects,
      months,
    })
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status)
    return handleRouteError(error, 'student/monthly')
  }
}
