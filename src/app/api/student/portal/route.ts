import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  assertCsrf,
  AuthError,
  errorResponse,
  handleRouteError,
  json,
  requireRole,
} from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { getScholars24AdapterStatus } from '@/lib/scholars24-adapter'

export const runtime = 'nodejs'

async function getStudentAndConnection(req: NextRequest) {
  const session = await requireRole('STUDENT')
  if (!session.studentId) throw new AuthError('Student profile missing', 403)
  await rateLimit({
    ip: getClientIp(req),
    identifier: `portal:${session.studentId}`,
    rule: RULES.portal,
  })
  const connection = await db.portalConnection.upsert({
    where: { studentId: session.studentId },
    create: { studentId: session.studentId, provider: 'SCHOLARS24' },
    update: {},
  })
  return { session, connection }
}

export async function GET(req: NextRequest) {
  try {
    const { session, connection } = await getStudentAndConnection(req)
    const adapter = getScholars24AdapterStatus()
    const [attendance, subjects, lectures, timetable, history] = await Promise.all([
      db.portalImportedAttendance.findMany({
        where: { studentId: session.studentId },
        orderBy: [{ attendanceDate: 'desc' }, { subjectName: 'asc' }],
      }),
      db.portalImportedSubject.findMany({
        where: { studentId: session.studentId },
        orderBy: [{ subjectName: 'asc' }],
      }),
      db.portalImportedLecture.findMany({
        where: { studentId: session.studentId },
        orderBy: [{ lectureDate: 'desc' }],
      }),
      db.portalImportedTimetable.findMany({
        where: { studentId: session.studentId },
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
      }),
      db.portalSyncHistory.findMany({
        where: { studentId: session.studentId },
        orderBy: { startedAt: 'desc' },
        take: 20,
      }),
    ])
    return json({
      connection,
      adapter,
      data: { attendance, subjects, lectures, timetable },
      history,
    })
  } catch (e) {
    return handleRouteError(e, 'student/portal')
  }
}

export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const { session, connection } = await getStudentAndConnection(req)
    const adapter = getScholars24AdapterStatus()
    const updated = await db.portalConnection.update({
      where: { id: connection.id },
      data: {
        status: adapter.available ? 'READY' : 'NOT_CONFIGURED',
        lastAttemptAt: new Date(),
        errorCode: adapter.code,
        errorMessage: adapter.available
          ? 'Live synchronization requires the normalized Scholars24 response contract.'
          : adapter.message,
      },
    })
    return json({ ok: false, connection: updated, adapter })
  } catch (e) {
    return handleRouteError(e, 'student/portal/connect')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await assertCsrf(req)
    const { session, connection } = await getStudentAndConnection(req)
    await db.portalConnection.update({
      where: { id: connection.id },
      data: {
        status: 'DISCONNECTED',
        disconnectedAt: new Date(),
        externalStudentId: null,
        externalProfileName: null,
        externalCourse: null,
        externalSemester: null,
        externalAcademicYear: null,
        errorCode: null,
        errorMessage: null,
      },
    })
    return json({ ok: true, status: 'DISCONNECTED' })
  } catch (e) {
    return handleRouteError(e, 'student/portal/disconnect')
  }
}
