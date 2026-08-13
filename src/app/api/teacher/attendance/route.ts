import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  AuthError,
  validateCsrfToken,
  handleRouteError,
} from '@/lib/auth'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function parseLocalDate(s: string): Date | null {
  const d = new Date(s + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? null : d
}

// GET /api/teacher/attendance?subjectId=&sectionId=&date=
// Returns { records: [{studentId, status, period}], periods: [{period, startTime, endTime}], editable, sectionId }
// - periods: timetable slots for this subject + the section it belongs to + the weekday of `date`.
// - records: existing attendance rows for this subject + date (all periods).
// - editable: whether the date falls within the 7-day allowed edit window.
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    const teacherId = session.teacherId!
    const sp = req.nextUrl.searchParams
    const subjectId = sp.get('subjectId')
    const requestedSectionId = sp.get('sectionId')
    const date = sp.get('date')
    if (!subjectId || !date) {
      return errorResponse('subjectId and date are required', 400)
    }
    const submitted = parseLocalDate(date)
    if (!submitted) return errorResponse('Invalid date', 400)

    const subject = await db.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, sectionId: true, teacherId: true },
    })
    if (!subject) {
      return errorResponse('Subject not found for this teacher', 404)
    }

    const subjectAssignment = subject.teacherId === teacherId
    const timetableAssignment = await db.timetable.findFirst({
      where: {
        teacherId,
        subjectId,
        ...(requestedSectionId ? { sectionId: requestedSectionId } : {}),
      },
      select: { sectionId: true },
    })
    const sectionAssignment = subject.sectionId === requestedSectionId
    if ((!subjectAssignment && !timetableAssignment) || (requestedSectionId && !sectionAssignment && !timetableAssignment)) {
      return errorResponse('Subject not found for this teacher', 404)
    }

    const sectionId = requestedSectionId ?? subject.sectionId ?? timetableAssignment?.sectionId
    if (!sectionId) {
      return errorResponse('This subject is not assigned to a section', 400)
    }

    const dayName = DAY_NAMES[submitted.getDay()]
    const periods = await db.timetable.findMany({
      where: {
        teacherId,
        subjectId,
        sectionId,
        day: dayName,
      },
      select: { period: true, startTime: true, endTime: true },
      orderBy: { period: 'asc' },
    })

    const sectionStudents = await db.student.findMany({
      where: { sectionId },
      select: { id: true },
    })
    const records = await db.attendance.findMany({
      where: { subjectId, date, studentId: { in: sectionStudents.map((student) => student.id) } },
      select: { studentId: true, status: true, period: true },
    })

    const today = parseLocalDate(getTodayStr())!
    const minDate = new Date(today)
    minDate.setDate(minDate.getDate() - 6) // last 7 days inclusive
    const editable = submitted <= today && submitted >= minDate

    return json({ records, periods, editable, sectionId })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'teacher/attendance')
  }
}

// POST /api/teacher/attendance
// body: { subjectId, sectionId, date, period, entries: [{ studentId, status }] }
// Upserts attendance for each entry (findExisting + update/create, because the
// compound unique key includes nullable fields and cannot be used in whereUnique).
// Sets markedById = session.teacherId. Enforces the 7-day edit window.
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('TEACHER')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const teacherId = session.teacherId!
    const body = await parseBody<{
      subjectId?: string
      sectionId?: string
      date?: string
      period?: number
      entries?: { studentId: string; status: string }[]
    }>(req)

    const { subjectId, sectionId: requestedSectionId, date, period, entries } = body
    if (!subjectId || !requestedSectionId || !date || typeof period !== 'number' || !Array.isArray(entries)) {
      return errorResponse('subjectId, sectionId, date, period and entries[] are required', 400)
    }
    const submitted = parseLocalDate(date)
    if (!submitted) return errorResponse('Invalid date', 400)

    // 7-day edit window (also reject future dates)
    const today = parseLocalDate(getTodayStr())!
    const minDate = new Date(today)
    minDate.setDate(minDate.getDate() - 6)
    if (submitted > today) {
      return errorResponse('Cannot mark attendance for future dates', 400)
    }
    if (submitted < minDate) {
      return errorResponse('Cannot edit attendance older than 7 days', 403)
    }

    const validStatuses = new Set(['present', 'absent', 'late'])
    for (const e of entries) {
      if (!e.studentId || !validStatuses.has(e.status)) {
        return errorResponse('Invalid entry payload', 400)
      }
    }

    const subject = await db.subject.findUnique({
      where: { id: subjectId },
      select: { teacherId: true, sectionId: true },
    })
    if (!subject) {
      return errorResponse('Subject not found for this teacher', 404)
    }

    const hasAccess = (subject.teacherId === teacherId && subject.sectionId === requestedSectionId) || (await db.timetable.count({
      where: { teacherId, subjectId, sectionId: requestedSectionId },
    })) > 0
    if (!hasAccess) return errorResponse('Subject not found for this teacher', 404)

    // Verify the period exists in this teacher's timetable for that weekday
    const dayName = DAY_NAMES[submitted.getDay()]
    const slot = await db.timetable.findFirst({
      where: {
        teacherId,
        subjectId,
        sectionId: requestedSectionId,
        day: dayName,
        period,
      },
      select: { id: true },
    })
    if (!slot) {
      return errorResponse('No timetable slot for this subject/period/day', 400)
    }

    // Only allow students from the selected, teacher-authorized section.
    const studentIds = entries.map((e) => e.studentId)
    const validStudents = await db.student.findMany({
      where: { id: { in: studentIds }, sectionId: requestedSectionId },
      select: { id: true },
    })
    const validStudentIds = new Set(validStudents.map((s) => s.id))
    const cleanEntries = entries.filter((e) => validStudentIds.has(e.studentId))

    // Fetch existing marks for this subject+date+period so we can update in place
    const existing = await db.attendance.findMany({
      where: { subjectId, date, period },
      select: { id: true, studentId: true },
    })
    const existingMap = new Map(existing.map((r) => [r.studentId, r.id]))

    const ops: Prisma.PrismaPromise<unknown>[] = cleanEntries.map((e) => {
      const existingId = existingMap.get(e.studentId)
      if (existingId) {
        return db.attendance.update({
          where: { id: existingId },
          data: { status: e.status, markedById: teacherId, markedAt: new Date() },
        })
      }
      return db.attendance.create({
        data: {
          studentId: e.studentId,
          subjectId,
          date,
          period,
          status: e.status,
          markedById: teacherId,
        },
      })
    })

    if (ops.length > 0) await db.$transaction(ops)

    return json({ saved: cleanEntries.length })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'teacher/attendance')
  }
}
