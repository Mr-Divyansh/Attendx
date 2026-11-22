import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  assertCsrf,
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

    const seen = new Set<string>()
    const rows: ImportedRow[] = []
    for (const item of body.records) {
      const subject = typeof item?.subject === 'string' ? item.subject.trim() : ''
      const date = typeof item?.date === 'string' ? item.date : ''
      const status = item?.status
      const source = typeof item?.source === 'string' ? item.source.trim().slice(0, 120) : 'CSV'
      if (!subject || subject.length > 160 || !isValidDate(date) ||
        !['PRESENT', 'ABSENT', 'LATE'].includes(status)) {
        return errorResponse('Import contains an invalid subject, date, or attendance status.', 400)
      }
      const key = subject.toLocaleLowerCase() + '|' + date + '|' + status
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({ subject, date, status, source: source || 'CSV' })
    }

    if (rows.length === 0) return errorResponse('No unique attendance rows were found.', 400)

    const result = await db.$transaction(async (tx) => {
      const previous = await tx.portalImport.findMany({ where: { studentId: session.studentId! }, select: { id: true } })
      if (previous.length) {
        await tx.portalImport.deleteMany({ where: { studentId: session.studentId! } })
      }
      return tx.portalImport.create({
        data: {
          studentId: session.studentId!,
          source: (typeof body.source === 'string' ? body.source.trim().slice(0, 40) : '') || 'CSV',
          records: { create: rows },
        },
        include: { _count: { select: { records: true } } },
      })
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
    await db.portalImport.deleteMany({ where: { studentId: session.studentId } })
    return json({ ok: true })
  } catch (error) {
    return handleRouteError(error, 'student/portal-import:delete')
  }
}
