import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleRouteError, json, parseBody } from '@/lib/auth'
import { getBearerSecret, hashPortalCompanionSecret } from '@/lib/portal-companion'

export const runtime = 'nodejs'

type CompanionRecord = {
  subject: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  externalKey?: string
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function normalizeStatus(value: unknown): CompanionRecord['status'] | null {
  if (typeof value !== 'string') return null
  const status = value.trim().toLowerCase()
  if (/^(p|present|attended|yes|1)$/.test(status)) return 'PRESENT'
  if (/^(a|absent|missed|no|0)$/.test(status)) return 'ABSENT'
  if (/^(l|late|late present)$/.test(status)) return 'LATE'
  return null
}

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('x-attendx-companion') !== '1') {
      return json({ error: 'Companion header missing' }, 403)
    }
    const secret = getBearerSecret(req)
    const deviceId = req.headers.get('x-attendx-device-id')?.trim()
    if (!secret || !deviceId) return json({ error: 'Device authentication missing' }, 401)
    const device = await db.portalCompanionDevice.findFirst({
      where: {
        id: deviceId,
        secretHash: hashPortalCompanionSecret(secret),
        revokedAt: null,
        status: 'CONNECTED',
      },
    })
    if (!device) return json({ error: 'Device is not paired or was revoked' }, 401)

    const body = await parseBody<{
      jobId?: string
      status?: 'SUCCESS' | 'LOGIN_REQUIRED' | 'ERROR'
      records?: unknown[]
      errorCode?: string
      errorMessage?: string
    }>(req)
    if (!body.jobId || !body.status) return json({ error: 'Invalid companion completion payload' }, 400)

    const forbiddenKeys = JSON.stringify(body).toLowerCase()
    if (/("password"|"cookie"|"cookies"|"token"|"authorization"|"otp")\s*:/.test(forbiddenKeys)) {
      return json({ error: 'Sensitive credential fields are not allowed' }, 400)
    }

    const job = await db.portalCompanionJob.findFirst({
      where: { id: body.jobId, deviceId: device.id, studentId: device.studentId },
    })
    if (!job) return json({ error: 'Job not found' }, 404)

    if (body.status === 'ERROR' || body.status === 'LOGIN_REQUIRED') {
      await db.$transaction(async (tx) => {
        await tx.portalCompanionJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorCode: body.status === 'LOGIN_REQUIRED' ? 'LOGIN_REQUIRED' : (body.errorCode?.slice(0, 80) || 'COMPANION_ERROR'),
            errorMessage: body.status === 'LOGIN_REQUIRED'
              ? 'Scholars24 login is required in the local browser.'
              : (body.errorMessage?.slice(0, 500) || 'The local browser could not complete the sync.'),
            completedAt: new Date(),
          },
        })
        await tx.portalConnection.updateMany({
          where: { studentId: device.studentId },
          data: {
            status: body.status === 'LOGIN_REQUIRED' ? 'LOGIN_REQUIRED' : 'ERROR',
            lastAttemptAt: new Date(),
            errorCode: body.status === 'LOGIN_REQUIRED' ? 'LOGIN_REQUIRED' : (body.errorCode?.slice(0, 80) || 'COMPANION_ERROR'),
            errorMessage: body.status === 'LOGIN_REQUIRED'
              ? 'Scholars24 login is required in the local browser.'
              : (body.errorMessage?.slice(0, 500) || 'The local browser could not complete the sync.'),
          },
        })
        await tx.portalSyncHistory.create({
          data: {
            studentId: device.studentId,
            provider: 'SCHOLARS24',
            syncType: job.type,
            status: 'FAILED',
            source: 'LOCAL_BROWSER',
            completedAt: new Date(),
            errorCode: body.status === 'LOGIN_REQUIRED' ? 'LOGIN_REQUIRED' : (body.errorCode?.slice(0, 80) || 'COMPANION_ERROR'),
            errorMessage: body.status === 'LOGIN_REQUIRED'
              ? 'Scholars24 login is required in the local browser.'
              : (body.errorMessage?.slice(0, 500) || 'The local browser could not complete the sync.'),
          },
        })
      })
      return json({ ok: true })
    }

    if (job.type === 'OPEN_LOGIN') {
      await db.$transaction([
        db.portalCompanionJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', completedAt: new Date(), result: { opened: true } },
        }),
        db.portalConnection.updateMany({
          where: { studentId: device.studentId },
          data: {
            status: 'LOGIN_PENDING',
            lastAttemptAt: new Date(),
            errorCode: null,
            errorMessage: null,
          },
        }),
      ])
      return json({ ok: true })
    }

    if (job.type === 'CLEAR_SESSION') {
      await db.$transaction([
        db.portalCompanionJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', completedAt: new Date(), result: { cleared: true } },
        }),
        db.portalConnection.updateMany({
          where: { studentId: device.studentId },
          data: { status: 'DISCONNECTED', disconnectedAt: new Date(), errorCode: null, errorMessage: null },
        }),
      ])
      return json({ ok: true })
    }

    if (job.type !== 'SYNC') {
      await db.portalCompanionJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      return json({ ok: true })
    }

    if (!Array.isArray(body.records) || body.records.length > 5000) {
      return json({ error: 'Invalid attendance records payload' }, 400)
    }

    const seen = new Map<string, CompanionRecord['status']>()
    const normalized: CompanionRecord[] = []
    let skipped = 0
    let duplicates = 0
    for (const raw of body.records) {
      if (typeof raw !== 'object' || raw === null) {
        skipped += 1
        continue
      }
      const record = raw as Record<string, unknown>
      const subject = typeof record.subject === 'string' ? record.subject.trim().replace(/\s+/g, ' ') : ''
      const date = typeof record.date === 'string' ? record.date.trim() : ''
      const status = normalizeStatus(record.status)
      const externalKey = typeof record.externalKey === 'string' ? record.externalKey.trim().slice(0, 255) : ''
      if (!subject || subject.length > 160 || !validDate(date) || !status) {
        skipped += 1
        continue
      }
      const pairKey = `${subject.toLocaleLowerCase()}|${date}`
      const existingStatus = seen.get(pairKey)
      if (existingStatus && existingStatus !== status) {
        return json({ error: `Conflicting attendance statuses for ${subject} on ${date}` }, 409)
      }
      if (existingStatus === status) {
        duplicates += 1
        continue
      }
      seen.set(pairKey, status)
      normalized.push({
        subject,
        date,
        status,
        externalKey: externalKey || `browser:${date}:${subject.toLocaleLowerCase()}`,
      })
    }

    await db.$transaction(async (tx) => {
      for (const record of normalized) {
        await tx.portalImportedAttendance.upsert({
          where: {
            studentId_externalKey: {
              studentId: device.studentId,
              externalKey: record.externalKey!,
            },
          },
          create: {
            studentId: device.studentId,
            externalKey: record.externalKey!,
            provider: 'SCHOLARS24',
            subjectName: record.subject,
            attendanceDate: record.date,
            status: record.status,
            source: 'LOCAL_BROWSER',
          },
          update: {
            subjectName: record.subject,
            attendanceDate: record.date,
            status: record.status,
            source: 'LOCAL_BROWSER',
          },
        })
      }
      await tx.portalCompanionJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: { imported: normalized.length, duplicates, skipped },
        },
      })
      await tx.portalConnection.updateMany({
        where: { studentId: device.studentId },
        data: {
          status: 'CONNECTED',
          lastAttemptAt: new Date(),
          lastSuccessfulSyncAt: new Date(),
          errorCode: null,
          errorMessage: null,
          connectedAt: new Date(),
        },
      })
      await tx.portalSyncHistory.create({
        data: {
          studentId: device.studentId,
          provider: 'SCHOLARS24',
          syncType: 'LOCAL_BROWSER_SYNC',
          status: 'SUCCESS',
          source: 'LOCAL_BROWSER',
          completedAt: new Date(),
          importedCount: normalized.length,
          updatedCount: 0,
          skippedCount: skipped,
          details: { duplicates },
        },
      })
    })

    return json({ ok: true, imported: normalized.length, duplicates, skipped })
  } catch (e) {
    return handleRouteError(e, 'portal/companion/complete')
  }
}
