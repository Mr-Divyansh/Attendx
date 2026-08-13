import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    if (!session.studentId) return errorResponse('Student profile missing', 403)

    const memberships = await db.classroomMember.findMany({
      where: { studentId: session.studentId },
      include: {
        classroom: {
          include: {
            teacher: true,
            subject: true,
            semester: { select: { id: true, name: true } },
            schedules: { orderBy: [{ day: 'asc' }, { startTime: 'asc' }] },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    return json({
      classrooms: memberships.map((m) => {
        const now = Date.now()
        const expired = !!m.classroom.expiresAt && m.classroom.expiresAt.getTime() < now
        return {
          ...m.classroom,
          status: m.status,
          expired,
          classroomStatus: expired ? 'EXPIRED' : 'ACTIVE',
        }
      }),
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'student/classrooms')
  }
}
