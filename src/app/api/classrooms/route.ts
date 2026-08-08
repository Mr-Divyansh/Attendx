import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, validateCsrfToken } from '@/lib/auth'

function makeJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function makeInviteToken() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

export async function GET() {
  try {
    const session = await requireRole('TEACHER')
    if (!session.teacherId) return errorResponse('Teacher profile missing', 403)

    const classrooms = await db.classroom.findMany({
      where: { teacherId: session.teacherId },
      include: {
        subject: true,
        members: { include: { student: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return json({ classrooms })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to load classrooms', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    if (!session.teacherId) return errorResponse('Teacher profile missing', 403)

    const body = await parseBody<{
      name?: string
      subjectId?: string
      course?: string
      section?: string
      academicYear?: string
    }>(req)

    if (!body.name?.trim()) return errorResponse('Classroom name is required', 400)

    const classroom = await db.classroom.create({
      data: {
        teacherId: session.teacherId,
        name: body.name.trim(),
        subjectId: body.subjectId || null,
        course: body.course?.trim() || null,
        section: body.section?.trim() || null,
        academicYear: body.academicYear?.trim() || null,
        joinCode: makeJoinCode(),
        inviteToken: makeInviteToken(),
      },
      include: { subject: true },
    })

    return json({ classroom })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to create classroom', 500)
  }
}
