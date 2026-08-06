import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/admin/stats — high-level counts for the admin overview cards.
export async function GET() {
  try {
    await requireRole('ADMIN')
    const [students, teachers, subjects, attendanceRecords] = await Promise.all([
      db.student.count(),
      db.teacher.count(),
      db.subject.count(),
      db.attendance.count(),
    ])
    return json({ students, teachers, subjects, attendanceRecords })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Server error', 500)
  }
}
