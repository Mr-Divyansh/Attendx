import { db } from '@/lib/db'
import { getMinimumAttendancePercentage } from '@/lib/config'
import { calcAttendancePct } from '@/lib/attendance'
import { requireRole, json, errorResponse, AuthError,
  handleRouteError,
} from '@/lib/auth'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function todayStr(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    const threshold = await getMinimumAttendancePercentage()

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { semester: true, section: true },
    })
    if (!student) return errorResponse('Student not found', 404)

    const records = await db.attendance.findMany({
      where: { studentId },
      select: { status: true, subjectId: true, date: true },
    })

    const total = records.length
    const present = records.filter((r) => r.status === 'present').length
    const late = records.filter((r) => r.status === 'late').length
    const absent = records.filter((r) => r.status === 'absent').length
    const attended = present + late
    const overallPct = calcAttendancePct(attended, total)
    const hasRecords = total > 0

    const subjectIds = Array.from(
      new Set(records.map((r) => r.subjectId).filter(Boolean) as string[])
    )
    const subjectsTracked = subjectIds.length

    let atRiskCount = 0
    for (const sid of subjectIds) {
      const subRecs = records.filter((r) => r.subjectId === sid)
      const subAttended = subRecs.filter(
        (r) => r.status === 'present' || r.status === 'late'
      ).length
      const subPct = calcAttendancePct(subAttended, subRecs.length)
      if (subPct >= 0 && subPct < threshold) atRiskCount++
    }

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
      overallPct: hasRecords ? overallPct : null,
      minimumAttendancePercentage: threshold,
      todayPresent,
      todayTotal,
      todayStatus,
      subjectsTracked,
      atRiskCount,
      counts: { present, late, absent, attended, total },
      student: {
        name: student.fullName,
        rollNo: student.hasRollNumber ? student.rollNo : '—',
        studentType: student.studentType,
        institutionName: student.institutionName,
        gradeLevel: student.gradeLevel,
        schoolSection: student.schoolSection,
        course: student.course,
        semesterLabel: student.semesterLabel,
        semesterName: student.semester?.name ?? student.semesterLabel ?? '—',
        sectionName: student.section?.name ?? student.schoolSection ?? '—',
      },
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    console.error('[student/stats] error:', e)
    return handleRouteError(e, 'student/stats')
  }
}
