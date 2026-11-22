import { requireRole, json, errorResponse, AuthError, handleRouteError } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    if (!session.studentId) return errorResponse('Student profile missing', 403)

    const memberships = await db.classroomMember.findMany({
      where: { studentId: session.studentId },
      select: {
        status: true,
        joinedAt: true,
        classroom: {
          select: {
            id: true,
            publicId: true,
            name: true,
            course: true,
            section: true,
            year: true,
            durationYears: true,
            expiresAt: true,
            academicYear: true,
            teachingMode: true,
            joinCode: true,
            createdAt: true,
            teacher: { select: { fullName: true } },
            subject: { select: { id: true, code: true, name: true } },
            semester: { select: { id: true, name: true } },
            schedules: {
              select: { id: true, day: true, startTime: true, endTime: true, room: true },
              orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    const now = Date.now()
    return json({
      classrooms: memberships.map((membership) => {
        const expired = !!membership.classroom.expiresAt && membership.classroom.expiresAt.getTime() < now
        return {
          ...membership.classroom,
          status: membership.status,
          joinedAt: membership.joinedAt,
          expired,
          classroomStatus: expired ? 'EXPIRED' : 'ACTIVE',
        }
      }),
    })
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status)
    return handleRouteError(error, 'student/classrooms')
  }
}
