import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/admin/backup — return a JSON dump of every table (simulates mysqldump).
export async function GET() {
  try {
    await requireRole('ADMIN')
    const [
      users,
      admins,
      teachers,
      students,
      departments,
      semesters,
      sections,
      subjects,
      timetables,
      attendance,
    ] = await Promise.all([
      db.user.findMany(),
      db.admin.findMany(),
      db.teacher.findMany(),
      db.student.findMany(),
      db.department.findMany(),
      db.semester.findMany(),
      db.section.findMany(),
      db.subject.findMany(),
      db.timetable.findMany(),
      db.attendance.findMany(),
    ])

    // Strip passwordHash from the dump for safety (still JSON-equivalent shape).
    const safeUsers = users.map(({ passwordHash: _p, ...rest }) => rest)

    return json({
      generatedAt: new Date().toISOString(),
      tables: {
        users: safeUsers,
        admins,
        teachers,
        students,
        departments,
        semesters,
        sections,
        subjects,
        timetables,
        attendance,
      },
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Server error', 500)
  }
}
