import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, assertCsrf, handleRouteError } from '@/lib/auth'
import { makeClassroomPublicId, secureCode } from '@/lib/oauth'

function makeJoinCode() {
  // 6 chars from 32-char alphabet = 30 bits; secureCode uses CSPRNG.
  return secureCode(6)
}

function makeInviteToken() {
  // 12 chars from 32-char alphabet = 60 bits of entropy.
  return secureCode(12)
}

export async function GET() {
  try {
    const session = await requireRole('TEACHER')
    if (!session.teacherId) return errorResponse('Teacher profile missing', 403)

    const classrooms = await db.classroom.findMany({
      where: { teacherId: session.teacherId },
      include: {
        subject: true,
        semester: { select: { id: true, name: true } },
        schedules: { orderBy: [{ day: 'asc' }, { startTime: 'asc' }] },
        members: { include: { student: { include: { user: { select: { email: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Per-classroom attendance summary for each member, so the teacher can see
    // attendance percentages and advise students who are falling behind.
    const attendanceByClassroom = await db.attendance.findMany({
      where: {
        classroomId: { in: classrooms.map((c) => c.id) },
      },
      select: { classroomId: true, studentId: true, status: true },
    })

    const summaryByClassroom = new Map<
      string,
      Map<string, { present: number; late: number; absent: number; total: number }>
    >()
    for (const r of attendanceByClassroom) {
      if (!r.classroomId || !r.studentId) continue
      let byStudent = summaryByClassroom.get(r.classroomId)
      if (!byStudent) {
        byStudent = new Map()
        summaryByClassroom.set(r.classroomId, byStudent)
      }
      let agg = byStudent.get(r.studentId)
      if (!agg) {
        agg = { present: 0, late: 0, absent: 0, total: 0 }
        byStudent.set(r.studentId, agg)
      }
      agg.total += 1
      if (r.status === 'present') agg.present += 1
      else if (r.status === 'late') agg.late += 1
      else if (r.status === 'absent') agg.absent += 1
    }

    const payload = classrooms.map((c) => {
      const byStudent = summaryByClassroom.get(c.id) ?? new Map()
      const members = c.members.map((m) => {
        const agg = byStudent.get(m.studentId) ?? { present: 0, late: 0, absent: 0, total: 0 }
        const attended = agg.present + agg.late
        const pct = agg.total > 0 ? Math.round((attended / agg.total) * 100) : null
        return {
          id: m.id,
          status: m.status,
          joinedAt: m.joinedAt,
          student: {
            id: m.student.id,
            fullName: m.student.fullName,
            rollNo: m.student.hasRollNumber ? m.student.rollNo : '—',
            userId: m.student.userId,
            email: m.student.user?.email ?? null,
          },
          attendance: { ...agg, pct },
        }
      })
      const now = Date.now()
      const expired = !!c.expiresAt && c.expiresAt.getTime() < now
      return {
        id: c.id,
        publicId: c.publicId,
        name: c.name,
        subject: c.subject,
        semester: c.semester,
        course: c.course,
        section: c.section,
        academicYear: c.academicYear,
        year: c.year,
        durationYears: c.durationYears,
        expiresAt: c.expiresAt,
        expired,
        status: expired ? 'EXPIRED' : 'ACTIVE',
        semesterId: c.semesterId,
        sectionId: c.sectionId,
        teachingMode: c.teachingMode,
        room: c.room,
        schedules: c.schedules,
        joinCode: c.joinCode,
        inviteToken: c.inviteToken,
        createdAt: c.createdAt,
        members,
      }
    })

    return json({ classrooms: payload })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to load classrooms', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    await assertCsrf(req)
    if (!session.teacherId) return errorResponse('Teacher profile missing', 403)

    const body = await parseBody<{
      name?: string
      subjectId?: string
      course?: string
      section?: string
      academicYear?: string
      semesterId?: string
      sectionId?: string
      teachingMode?: 'SCHOOL' | 'COLLEGE'
      room?: string
      year?: number | string
      durationYears?: number | string
    }>(req)

    if (!body.name?.trim()) return errorResponse('Classroom name is required', 400)

    const year = body.year == null || body.year === '' ? null : Number(body.year)
    const durationYears = body.durationYears == null || body.durationYears === '' ? null : Number(body.durationYears)
    if (year != null && (!Number.isInteger(year) || year < 1 || year > 4)) {
      return errorResponse('Year must be between Year 1 and Year 4', 400)
    }
    if (durationYears != null && (!Number.isInteger(durationYears) || durationYears < 1 || durationYears > 4)) {
      return errorResponse('Class duration must be between 1 and 4 years', 400)
    }

    if (body.subjectId) {
      const subject = await db.subject.findFirst({ where: { id: body.subjectId, teacherId: session.teacherId } })
      if (!subject) return errorResponse('Subject not found for this teacher', 404)
    }
    const classroom = await db.classroom.create({
      data: {
        teacherId: session.teacherId,
        publicId: makeClassroomPublicId(body.name.trim()),
        name: body.name.trim(),
        subjectId: body.subjectId || null,
        course: body.course?.trim() || null,
        section: body.section?.trim() || null,
        academicYear: body.academicYear?.trim() || null,
        semesterId: body.semesterId || null,
        sectionId: body.sectionId || null,
        teachingMode: body.teachingMode === 'SCHOOL' ? 'SCHOOL' : 'COLLEGE',
        room: body.room?.trim() || null,
        year,
        durationYears,
        expiresAt: durationYears ? new Date(Date.now() + durationYears * 365.25 * 24 * 60 * 60 * 1000) : null,
        joinCode: makeJoinCode(),
        inviteToken: makeInviteToken(),
      },
      include: { subject: true },
    })

    return json({ classroom })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'classrooms')
  }
}
