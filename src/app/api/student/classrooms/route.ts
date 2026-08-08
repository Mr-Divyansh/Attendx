import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'
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
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    return json({ classrooms: memberships.map((m) => ({ ...m.classroom, status: m.status })) })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to load classrooms', 500)
  }
}
