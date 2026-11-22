import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { assertCsrf, errorResponse, handleRouteError, json, requireRole } from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { getScholars24AdapterStatus } from '@/lib/scholars24-adapter'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const session = await requireRole('STUDENT')
    if (!session.studentId) return errorResponse('Student profile missing', 403)
    await rateLimit({
      ip: getClientIp(req),
      identifier: `portal-sync:${session.studentId}`,
      rule: RULES.portal,
    })

    const adapter = getScholars24AdapterStatus()
    const connection = await db.portalConnection.upsert({
      where: { studentId: session.studentId },
      create: {
        studentId: session.studentId,
        provider: 'SCHOLARS24',
        status: 'NOT_CONFIGURED',
        lastAttemptAt: new Date(),
        errorCode: adapter.code,
        errorMessage: adapter.message,
      },
      update: {
        status: 'NOT_CONFIGURED',
        lastAttemptAt: new Date(),
        errorCode: adapter.code,
        errorMessage: adapter.message,
      },
    })
    await db.portalSyncHistory.create({
      data: {
        studentId: session.studentId,
        connectionId: connection.id,
        provider: 'SCHOLARS24',
        syncType: 'FULL',
        status: 'FAILED',
        source: 'SCHOLARS24',
        completedAt: new Date(),
        errorCode: 'STUDENT_AUTHORIZATION_MISSING',
        errorMessage:
          'Live sync is unavailable because Scholars24 has not provided a student-authorized API/OAuth contract.',
      },
    })
    return json({
      ok: false,
      code: 'STUDENT_AUTHORIZATION_MISSING',
      error:
        'Live sync is unavailable because a documented, student-authorized Scholars24 API/OAuth grant is missing.',
    }, 501)
  } catch (e) {
    return handleRouteError(e, 'student/portal/sync')
  }
}
