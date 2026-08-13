import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'

type SubjectDetails = {
  id: string
  code: string
  name: string
  teacher: { fullName: string } | null
  section: { name: string } | null
  semester: { name: string } | null
}

function pct(attended: number, total: number): number {
  return total > 0 ? Math.round((attended / total) * 100) : 0
}

// Includes assigned subjects even before the first attendance record exists.
// That prevents a real assignment from being rendered as “Subject pending”.
export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { sectionId: true, semesterId: true, classroomMemberships: { select: { classroom: { select: { subjectId: true } } } } },
    })
    if (!student) return errorResponse('Student not found', 404)

    const [assigned, records] = await Promise.all([
      db.subject.findMany({
        where: {
          OR: [
            ...(student.sectionId ? [{ sectionId: student.sectionId }] : []),
            ...(student.semesterId ? [{ semesterId: student.semesterId, sectionId: null }] : []),
            ...student.classroomMemberships.flatMap((membership) => membership.classroom.subjectId ? [{ id: membership.classroom.subjectId }] : []),
          ],
        },
        select: { id: true, code: true, name: true, teacher: { select: { fullName: true } }, section: { select: { name: true } }, semester: { select: { name: true } } },
      }),
      db.attendance.findMany({ where: { studentId }, select: { subjectId: true, status: true, subject: { select: { id: true, code: true, name: true, teacher: { select: { fullName: true } }, section: { select: { name: true } }, semester: { select: { name: true } } } } } }),
    ])

    const byId = new Map<string, SubjectDetails>(assigned.map((subject) => [subject.id, subject]))
    for (const record of records) if (record.subjectId && record.subject) byId.set(record.subjectId, record.subject)

    const totals = new Map<string, { total: number; present: number; absent: number; late: number }>()
    for (const record of records) {
      if (!record.subjectId) continue
      const value = totals.get(record.subjectId) ?? { total: 0, present: 0, absent: 0, late: 0 }
      value.total += 1
      if (record.status === 'present') value.present += 1
      else if (record.status === 'late') value.late += 1
      else if (record.status === 'absent') value.absent += 1
      totals.set(record.subjectId, value)
    }

    const subjects = Array.from(byId.values()).map((subject) => {
      const count = totals.get(subject.id) ?? { total: 0, present: 0, absent: 0, late: 0 }
      const attended = count.present + count.late
      return {
        subjectId: subject.id,
        code: subject.code,
        name: subject.name,
        ...count,
        attended,
        pct: pct(attended, count.total),
        hasAttendance: count.total > 0,
        teacherName: subject.teacher?.fullName ?? null,
        sectionName: subject.section?.name ?? null,
        semesterName: subject.semester?.name ?? null,
      }
    }).sort((a, b) => (a.hasAttendance ? a.pct : 101) - (b.hasAttendance ? b.pct : 101) || a.name.localeCompare(b.name))

    return json({ subjects })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'student/subjects')
  }
}
