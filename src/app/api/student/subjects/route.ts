// AttendX — Student subject-wise attendance API
// GET /api/student/subjects → [{ subjectId, code, name, total, present, absent, late, pct }]
// Sorted by pct ascending (at-risk first). Attended = present + late.
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

function pct(attended: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((attended / total) * 100)
}

export async function GET() {
  try {
    const session = await requireRole('STUDENT')
    const studentId = session.studentId
    if (!studentId) return errorResponse('Student profile missing', 403)

    const records = await db.attendance.findMany({
      where: { studentId },
      select: {
        subjectId: true,
        status: true,
        subject: { select: { id: true, code: true, name: true } },
      },
    })

    // Group by subjectId
    const bySubject = new Map<
      string,
      {
        subjectId: string
        code: string
        name: string
        total: number
        present: number
        absent: number
        late: number
      }
    >()

    for (const r of records) {
      const sid = r.subjectId
      if (!sid || !r.subject) continue
      const entry =
        bySubject.get(sid) ??
        {
          subjectId: sid,
          code: r.subject.code,
          name: r.subject.name,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
        }
      entry.total += 1
      if (r.status === 'present') entry.present += 1
      else if (r.status === 'late') entry.late += 1
      else if (r.status === 'absent') entry.absent += 1
      bySubject.set(sid, entry)
    }

    const rows = Array.from(bySubject.values()).map((s) => {
      const attended = s.present + s.late
      return { ...s, attended, pct: pct(attended, s.total) }
    })

    // Sort by pct ascending (at-risk first), then by name as tiebreaker
    rows.sort((a, b) => a.pct - b.pct || a.name.localeCompare(b.name))

    return json({ subjects: rows })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    console.error('[student/subjects] error:', e)
    return errorResponse('Internal server error', 500)
  }
}
