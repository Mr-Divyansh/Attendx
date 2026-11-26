import { db } from '@/lib/db'
import { getMinimumAttendancePercentage } from '@/lib/config'
import { calcAttendancePct } from '@/lib/attendance'
import {
  requireRole,
  json,
  errorResponse,
  AuthError,
  handleRouteError,
} from '@/lib/auth'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function todayStr(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    // Fetch independent data concurrently. Aggregate in the database instead of
    // loading every attendance row into the serverless function.
    const [threshold, student, attendanceGroups] = await Promise.all([
      getMinimumAttendancePercentage(),
      db.student.findUnique({
        where: { id: studentId },
        include: { semester: true, section: true },
      }),
      db.attendance.groupBy({
        by: ['status', 'subjectId'],
        where: { studentId },
        _count: { _all: true },
      }),
    ])

    if (!student) return errorResponse('Student not found', 404)

    let total = 0
    let present = 0
    let late = 0
    let absent = 0
    const subjectCounts = new Map<string, { attended: number; total: number }>()

    for (const group of attendanceGroups) {
      const count = group._count._all
      total += count

      if (group.status === 'present') present += count
      else if (group.status === 'late') late += count
      else if (group.status === 'absent') absent += count

      if (!group.subjectId) continue
      const subject = subjectCounts.get(group.subjectId) ?? { attended: 0, total: 0 }
      subject.total += count
      if (group.status === 'present' || group.status === 'late') {
        subject.attended += count
      }
      subjectCounts.set(group.subjectId, subject)
    }

    const attended = present + late
    const overallPct = calcAttendancePct(attended, total)
    let atRiskCount = 0
    for (const subject of subjectCounts.values()) {
      const percentage = calcAttendancePct(subject.attended, subject.total)
      if (percentage >= 0 && percentage < threshold) atRiskCount += 1
    }

    const today = todayStr()
    const todayName = DAY_NAMES[new Date().getDay()]
    let todayTotal = 0
    let todayPresent = 0

    if (student.sectionId) {
      const [scheduledClasses, todayGroups] = await Promise.all([
        db.timetable.count({
          where: { sectionId: student.sectionId, day: todayName },
        }),
        db.attendance.groupBy({
          by: ['status'],
          where: { studentId, date: today },
          _count: { _all: true },
        }),
      ])

      todayTotal = scheduledClasses
      todayPresent = todayGroups.reduce((sum, group) => {
        return group.status === 'present' || group.status === 'late'
          ? sum + group._count._all
          : sum
      }, 0)
    }

    const todayStatus =
      todayTotal === 0
        ? 'No classes'
        : `${todayPresent} / ${todayTotal} Present`

    return json({
      overallPct: total > 0 ? overallPct : null,
      minimumAttendancePercentage: threshold,
      todayPresent,
      todayTotal,
      todayStatus,
      subjectsTracked: subjectCounts.size,
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
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status)
    console.error('[student/stats] error:', error)
    return handleRouteError(error, 'student/stats')
  }
}
