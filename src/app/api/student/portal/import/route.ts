import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { assertCsrf, AuthError, errorResponse, handleRouteError, json, requireRole } from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { rateLimit, RULES } from '@/lib/rate-limit'

export const runtime = 'nodejs'

type CsvRecord = {
  subject: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  source: string
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const session = await requireRole('STUDENT')
    if (!session.studentId) throw new AuthError('Student profile missing', 403)
    await rateLimit({
      ip: getClientIp(req),
      identifier: `portal-import:${session.studentId}`,
      rule: RULES.portal,
    })
    const body = await req.json().catch(() => null) as
      | { fileName?: string; records?: CsvRecord[]; skipped?: number; duplicates?: number }
      | null
    if (!body || !Array.isArray(body.records)) {
      throw new AuthError('Invalid CSV import payload', 400)
    }
    if (body.records.length === 0 || body.records.length > 5000) {
      throw new AuthError('CSV imports must contain between 1 and 5000 valid rows', 400)
    }

    const fileName = (body.fileName || 'attendance.csv').trim().slice(0, 255)
    const seen = new Set<string>()
    let invalid = 0
    let duplicates = 0
    const normalized = body.records.flatMap((record) => {
      const subject = typeof record.subject === 'string' ? record.subject.trim().slice(0, 255) : ''
      const date = typeof record.date === 'string' ? record.date.trim() : ''
      const status = record.status
      if (!subject || !validDate(date) || !['PRESENT', 'ABSENT', 'LATE'].includes(status)) {
        invalid += 1
        return []
      }
      const externalKey = `csv:${date}:${subject.toLocaleLowerCase()}:${status}`
      if (seen.has(externalKey)) {
        duplicates += 1
        return []
      }
      seen.add(externalKey)
      return [{ externalKey, subjectName: subject, attendanceDate: date, status }]
    })
    if (normalized.length === 0) throw new AuthError('No valid attendance rows were provided', 400)

    const connection = await db.portalConnection.upsert({
      where: { studentId: session.studentId },
      create: { studentId: session.studentId, provider: 'SCHOLARS24', status: 'CSV_ACTIVE' },
      update: { status: 'CSV_ACTIVE', errorCode: null, errorMessage: null },
    })
    const result = await db.$transaction(async (tx) => {
      await tx.portalImportedAttendance.deleteMany({
        where: { studentId: session.studentId, provider: 'SCHOLARS24', source: 'CSV' },
      })
      await tx.portalImportedAttendance.createMany({
        data: normalized.map((record) => ({
          studentId: session.studentId!,
          externalKey: record.externalKey,
          provider: 'SCHOLARS24',
          subjectName: record.subjectName,
          attendanceDate: record.attendanceDate,
          status: record.status,
          source: 'CSV',
        })),
        skipDuplicates: true,
      })
      return tx.portalSyncHistory.create({
        data: {
          studentId: session.studentId!,
          connectionId: connection.id,
          provider: 'SCHOLARS24',
          syncType: 'ATTENDANCE_CSV',
          status: 'SUCCESS',
          source: 'CSV',
          completedAt: new Date(),
          importedCount: normalized.length,
          skippedCount: invalid + (typeof body.duplicates === 'number' ? body.duplicates : duplicates),
          details: { fileName, duplicateRows: duplicates },
        },
      })
    })
    return json({
      ok: true,
      imported: normalized.length,
      skipped: invalid + (typeof body.skipped === 'number' ? body.skipped : 0),
      duplicates: typeof body.duplicates === 'number' ? body.duplicates : duplicates,
      historyId: result.id,
    })
  } catch (e) {
    return handleRouteError(e, 'student/portal/import')
  }
}
