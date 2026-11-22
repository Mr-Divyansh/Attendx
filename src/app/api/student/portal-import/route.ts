import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  assertCsrf,
  AuthError,
  errorResponse,
  handleRouteError,
  json,
  parseBody,
  requireRole,
} from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ImportedStatus = 'PRESENT' | 'ABSENT' | 'LATE'
type ImportedRow = {
  subject: string
  date: string
  status: ImportedStatus
  source: string
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00.000Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    if (!session.studentId) return errorResponse('Student profile missing', 403)

    const latest = await db.portalImport.findFirst({
      where: { studentId: session.studentId },
      orderBy: { updatedAt: 'desc' },
      include: { records: { orderBy: [{ date: 'desc' }, { subject: 'asc' }] } },
    })

    return json({
      import: latest
        ? {
            id: latest.id,
            source: latest.source,
            updatedAt: latest.updatedAt,
            records: latest.records.map((record) => ({
              id: record.id,
              subject: record.subject,
              date: record.date,
              status: record.status,
              source: record.source,
              importedAt: record.importedAt,
            })),
          }
        : null,
    })
  } catch (error) {
    return handleRouteError(error, 'student/portal-import:get')
  }
}

export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const session = await requireRole('STUDENT')
    if (!session.studentId) return errorResponse('Student profile missing', 403)
    await rateLimit({
      ip: getClientIp(req),
      identifier: `portal-import:${session.studentId}`,
      rule: RULES.portal,
    })

    const body = await parseBody<{ records?: ImportedRow[]; source?: string }>(req)
    if (!Array.isArray(body.records) || body.records.length < 1 || body.records.length > 3000) {
      return errorResponse('Import must contain between 1 and 3,000 attendance rows.', 400)
    }
    const inputCount = body.records.length

    const seen = new Set<string>()
    const statusesBySubjectDate = new Map<string, ImportedStatus>()
    const rows: ImportedRow[] = []
    for (const item of body.records) {
      const subject = typeof item?.subject === 'string'
        ? item.subject.trim()
        : ''
      const date = typeof item?.date === 'string' ? item.date : ''
      const status = item?.status
      const source = typeof item?.source === 'string' ? item.source.trim().slice(0, 120) : 'CSV'
      if (!subject || subject.length > 160 || !isValidDate(date) ||
        !['PRESENT', 'ABSENT', 'LATE'].includes(status)) {
        return errorResponse('Import contains an invalid subject, date, or attendance status.', 400)
      }
      const subjectDateKey = `${subject.toLocaleLowerCase().replace(/\s+/g, ' ')}|${date}`
      const existingStatus = statusesBySubjectDate.get(subjectDateKey)
      if (existingStatus && existingStatus !== status) {
        throw new AuthError(
          `Conflicting attendance statuses for ${subject} on ${date}. Keep one status per subject and date.`,
          409,
        )
      }
      if (existingStatus === status) continue
      statusesBySubjectDate.set(subjectDateKey, status)
      const key = subject.toLocaleLowerCase() + '|' + date + '|' + status
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({ subject, date, status, source: source || 'CSV' })
    }

    if (rows.length === 0) return errorResponse('No unique attendance rows were found.', 400)

    const result = await db.$transaction(async (tx) => {
      await tx.portalImport.deleteMany({ where: { studentId: session.studentId! } })
      await tx.portalImportedAttendance.deleteMany({
        where: { studentId: session.studentId!, source: 'CSV' },
      })

      const connection = await tx.portalConnection.upsert({
        where: { studentId: session.studentId! },
        create: {
          studentId: session.studentId!,
          provider: 'SCHOLARS24',
          status: 'CSV_ACTIVE',
          lastSuccessfulSyncAt: new Date(),
        },
        update: {
          status: 'CSV_ACTIVE',
          lastSuccessfulSyncAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      })
      const portalImport = await tx.portalImport.create({
        data: {
          studentId: session.studentId!,
          source: (typeof body.source === 'string' ? body.source.trim().slice(0, 40) : '') || 'CSV',
          records: { create: rows },
        },
        include: { _count: { select: { records: true } } },
      })

      await tx.portalImportedAttendance.createMany({
        data: rows.map((row) => ({
          studentId: session.studentId!,
          externalKey: `csv:${row.date}:${row.subject.toLocaleLowerCase()}`,
          provider: 'SCHOLARS24',
          subjectName: row.subject,
          attendanceDate: row.date,
          status: row.status,
          source: 'CSV',
        })),
        skipDuplicates: true,
      })
      await tx.portalSyncHistory.create({
        data: {
          studentId: session.studentId!,
          connectionId: connection.id,
          provider: 'SCHOLARS24',
          syncType: 'ATTENDANCE_CSV',
          status: 'SUCCESS',
          source: 'CSV',
          completedAt: new Date(),
          importedCount: rows.length,
          skippedCount: inputCount - rows.length,
          details: { source: 'CSV' },
        },
      })
      return portalImport
    })

    return json({
      ok: true,
      importId: result.id,
      imported: result._count.records,
      updatedAt: result.updatedAt,
    }, 201)
  } catch (error) {
    return handleRouteError(error, 'student/portal-import:post')
  }
}

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
    return json({ ok: true })
  } catch (error) {
    return handleRouteError(error, 'student/portal-import:delete')
  }
}
