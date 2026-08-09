import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, errorResponse, AuthError,
  handleRouteError,
} from '@/lib/auth'

// GET /api/admin/export — export attendance as CSV (text/csv).
export async function GET(_req: NextRequest) {
  try {
    await requireRole('ADMIN')
    const records = await db.attendance.findMany({
      orderBy: [{ date: 'desc' }, { period: 'asc' }],
      take: 5000,
      include: {
        student: { select: { fullName: true, rollNo: true } },
        subject: { select: { code: true, name: true } },
      },
    })

    const header = ['Student', 'RollNo', 'Subject', 'Date', 'Period', 'Status', 'MarkedAt']
    const rows = records.map((r) => [
      r.student?.fullName ?? '',
      r.student?.rollNo ?? '',
      r.subject ? `${r.subject.code} - ${r.subject.name}` : '',
      r.date,
      String(r.period),
      r.status,
      r.markedAt ? new Date(r.markedAt).toISOString() : '',
    ])

    const csv = [header, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n')

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="attendx-attendance.csv"',
      },
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'admin/export')
  }
}

function csvEscape(value: string): string {
  if (value == null) return ''
  const needs = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needs ? `"${escaped}"` : escaped
}
