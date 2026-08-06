// AttendX — Student stats API
// GET /api/student/stats → overall attendance %, today's status, subjects tracked, at-risk count, student profile
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function todayStr(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function pct(attended: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((attended / total) * 100)
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    // Fetch student profile (with semester + section names)
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { semester: true, section: true },
    })
    if (!student) return errorResponse('Student not found', 404)

    // All attendance records for this student
    const records = await db.attendance.findMany({
      where: { studentId },
      select: { status: true, subjectId: true, date: true },
    })

    const total = records.length
    const present = records.filter((r) => r.status === 'present').length
    const late = records.filter((r) => r.status === 'late').length
    const absent = records.filter((r) => r.status === 'absent').length
    const attended = present + late
    const overallPct = pct(attended, total)

    // Subjects tracked = distinct subjectIds with attendance
    const subjectIds = Array.from(
      new Set(records.map((r) => r.subjectId).filter(Boolean) as string[])
    )
    const subjectsTracked = subjectIds.length

    // At-risk: subjects with pct < 75
    let atRiskCount = 0
    for (const sid of subjectIds) {
      const subRecs = records.filter((r) => r.subjectId === sid)
      const subAttended = subRecs.filter(
        (r) => r.status === 'present' || r.status === 'late'
      ).length
      if (pct(subAttended, subRecs.length) < 75) atRiskCount++
    }

    // Today's status — use section timetable to know total periods today,
    // then count present/late attendance records for today.
    const today = todayStr()
    const todayDow = new Date(today).getDay()
    const todayName = DAY_NAMES[todayDow]

    let todayTotal = 0
    let todayPresent = 0
    if (student.sectionId) {
      const todaySlots = await db.timetable.findMany({
        where: { sectionId: student.sectionId, day: todayName },
        select: { period: true },
      })
      todayTotal = todaySlots.length
      const todayRecs = records.filter((r) => r.date === today)
      todayPresent = todayRecs.filter(
        (r) => r.status === 'present' || r.status === 'late'
      ).length
    }
    const todayStatus =
      todayTotal === 0
        ? 'No classes'
        : `${todayPresent} / ${todayTotal} Present`

    return json({
      overallPct,
      todayPresent,
      todayTotal,
      todayStatus,
      subjectsTracked,
      atRiskCount,
      counts: { present, late, absent, attended, total },
      student: {
        name: student.fullName,
        rollNo: student.rollNo,
        semesterName: student.semester?.name ?? '—',
        sectionName: student.section?.name ?? '—',
      },
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    console.error('[student/stats] error:', e)
    return errorResponse('Internal server error', 500)
  }
}
