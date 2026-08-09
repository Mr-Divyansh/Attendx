import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError,
  handleRouteError,
} from '@/lib/auth'

// GET /api/admin/attendance — list attendance with student/subject names.
// Optional filters: subjectId, sectionId, date (YYYY-MM-DD).
export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get('subjectId')
    const sectionId = searchParams.get('sectionId')
    const date = searchParams.get('date')

    const where: {
      subjectId?: string
      date?: string
      student?: { sectionId?: string }
    } = {}
    if (subjectId) where.subjectId = subjectId
    if (date) where.date = date
    if (sectionId) {
      where.student = { sectionId }
    }

    const records = await db.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { period: 'asc' }],
      take: 1000,
      include: {
        student: {
          select: { id: true, fullName: true, rollNo: true, sectionId: true },
        },
        subject: { select: { id: true, code: true, name: true } },
        markedBy: { select: { fullName: true } },
      },
    })

    return json(
      records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: r.student?.fullName ?? null,
        rollNo: r.student?.rollNo ?? null,
        subjectId: r.subjectId,
        subjectCode: r.subject?.code ?? null,
        subjectName: r.subject?.name ?? null,
        date: r.date,
        period: r.period,
        status: r.status,
        markedByName: r.markedBy?.fullName ?? null,
        markedAt: r.markedAt,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/attendance')
  }
}
