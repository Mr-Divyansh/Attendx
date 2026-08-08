import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('STUDENT')
    const body = await parseBody<{
      fullName?: string
      rollNo?: string
      studentType?: string
      institutionName?: string
      gradeLevel?: string
      schoolSection?: string
      academicYear?: string
      course?: string
      semesterLabel?: string
    }>(req)

    if (!session.studentId) return errorResponse('Student profile missing', 403)

    const student = await db.student.findUnique({ where: { id: session.studentId } })
    if (!student) return errorResponse('Student not found', 404)

    const data = {
      fullName: body.fullName?.trim() || student.fullName,
      rollNo: body.rollNo?.trim() || student.rollNo,
      studentType: body.studentType || student.studentType || null,
      institutionName: body.institutionName?.trim() || student.institutionName || null,
      gradeLevel: body.gradeLevel?.trim() || student.gradeLevel || null,
      schoolSection: body.schoolSection?.trim() || student.schoolSection || null,
      academicYear: body.academicYear?.trim() || student.academicYear || null,
      course: body.course?.trim() || student.course || null,
      semesterLabel: body.semesterLabel?.trim() || student.semesterLabel || null,
    }

    const updated = await db.student.update({
      where: { id: session.studentId },
      data,
    })

    return json({ ok: true, student: updated })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    console.error('[student/profile] error:', e)
    return errorResponse('Unable to save profile', 500)
  }
}
