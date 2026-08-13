import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/teacher/classes — today's classes for the teacher.
// Returns { date, dayName, classes: [{ slotId, semesterId, subjectId, subjectCode,
// subjectName, sectionId, sectionName, room, startTime, endTime, period, marked }] }
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
      include: {
        subject: { select: { id: true, code: true, name: true } },
        section: { select: { id: true, name: true, semesterId: true, students: { select: { id: true } } } },
      },
      orderBy: { period: 'asc' },
    })

    const classes = await Promise.all(
      slots.map(async (s) => {
        const marked = s.subjectId
          ? (await db.attendance.count({
              where: {
                subjectId: s.subjectId,
                date: dateStr,
                period: s.period,
                studentId: { in: s.section?.students.map((student) => student.id) ?? [] },
              },
            })) > 0
          : false
        return {
          slotId: s.id,
          semesterId: s.section?.semesterId ?? null,
          subjectId: s.subjectId,
          subjectCode: s.subject?.code ?? '',
          subjectName: s.subject?.name ?? '',
          sectionId: s.sectionId,
          sectionName: s.section?.name ?? '',
          room: s.room,
          startTime: s.startTime,
          endTime: s.endTime,
          period: s.period,
          marked,
        }
      })
    )

    return json({ date: dateStr, dayName, classes })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
