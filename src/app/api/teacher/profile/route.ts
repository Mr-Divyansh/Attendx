import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const session = await requireRole('TEACHER')
    if (!session.teacherId) return errorResponse('Teacher profile missing', 403)

    const teacher = await db.teacher.findUnique({
      where: { id: session.teacherId },
      include: { department: true },
    })
    if (!teacher) return errorResponse('Teacher not found', 404)

    return json({
      teacher: {
        id: teacher.id,
        fullName: teacher.fullName,
        subjectTaught: teacher.subjectTaught,
        institutionName: teacher.institutionName,
        departmentLabel: teacher.departmentLabel,
        departmentName: teacher.department?.name ?? null,
        profileComplete: teacher.profileComplete,
      },
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to load profile', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!session.teacherId) return errorResponse('Teacher profile missing', 403)

    const body = await parseBody<{
      fullName?: string
      subjectTaught?: string
      institutionName?: string
      departmentLabel?: string
    }>(req)

    const updated = await db.teacher.update({
      where: { id: session.teacherId },
      data: {
        fullName: body.fullName?.trim() || undefined,
        subjectTaught: body.subjectTaught?.trim() || null,
        institutionName: body.institutionName?.trim() || null,
        departmentLabel: body.departmentLabel?.trim() || null,
        profileComplete: Boolean(
          (body.fullName?.trim() || session.name) &&
            body.subjectTaught?.trim() &&
            body.institutionName?.trim()
        ),
      },
    })

    return json({ ok: true, teacher: updated })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to save profile', 500)
  }
}
