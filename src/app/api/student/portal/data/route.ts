import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { assertCsrf, errorResponse, handleRouteError, json, requireRole } from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function DELETE(req: NextRequest) {
  try {
    await assertCsrf(req)
    const session = await requireRole('STUDENT')
    if (!session.studentId) return errorResponse('Student profile missing', 403)
    await rateLimit({
      ip: getClientIp(req),
      identifier: `portal-delete:${session.studentId}`,
      rule: RULES.portal,
    })
    await db.$transaction([
      db.portalImport.deleteMany({ where: { studentId: session.studentId } }),
      db.portalImportedAttendance.deleteMany({ where: { studentId: session.studentId } }),
      db.portalImportedSubject.deleteMany({ where: { studentId: session.studentId } }),
      db.portalImportedLecture.deleteMany({ where: { studentId: session.studentId } }),
      db.portalImportedTimetable.deleteMany({ where: { studentId: session.studentId } }),
      db.portalConnection.updateMany({
        where: { studentId: session.studentId },
        data: {
          status: 'DATA_CLEARED',
          lastSuccessfulSyncAt: null,
          externalStudentId: null,
          externalProfileName: null,
          externalCourse: null,
          externalSemester: null,
          externalAcademicYear: null,
          errorCode: null,
          errorMessage: null,
        },
      }),
    ])
    return json({ ok: true, deleted: true })
  } catch (e) {
    return handleRouteError(e, 'student/portal/delete')
  }
}
