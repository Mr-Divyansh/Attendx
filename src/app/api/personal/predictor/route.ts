import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/personal/predictor — attendance predictor math
// Returns current%, target% (from settings.goalPct), classes-to-attend,
// miss-next-2 projection, attend-next-10 projection.
export async function GET() {
  try {
    const session = await requireRole('PERSONAL')

    const [attendance, settings] = await Promise.all([
      db.personalAttendance.findMany({
        where: { userId: session.id },
        select: { status: true },
      }),
      db.setting.findUnique({ where: { userId: session.id } }),
    ])

    const present = attendance.filter((a) => a.status === 'present').length
    const absent = attendance.filter((a) => a.status === 'absent').length
    const total = present + absent
    const currentPct = total > 0 ? Math.round((present / total) * 100) : 0
    const targetPct = settings?.goalPct ?? 75

    // Classes needed: solve (present + x)/(total + x) >= target/100
    // => x >= (target*total - 100*present)/(100 - target)
    let classesToAttend = 0
    if (total > 0 && targetPct < 100) {
      const num = targetPct * total - 100 * present
      const den = 100 - targetPct
      if (num > 0) {
        classesToAttend = Math.ceil(num / den)
      }
    } else if (total > 0 && targetPct === 100) {
      // impossible to reach 100% if any absence exists
      classesToAttend = absent > 0 ? -1 : 0
    }

    // Already meeting target → 0
    if (currentPct >= targetPct) classesToAttend = 0

    // Miss next 2 → present / (total + 2)
    const missProjection = {
      next: 2,
      resultingPct:
        total > 0
          ? Math.round((present / (total + 2)) * 100)
          : 0,
    }

    // Attend next 10 → (present + 10) / (total + 10)
    const attendProjection = {
      next: 10,
      resultingPct:
        total > 0
          ? Math.round(((present + 10) / (total + 10)) * 100)
          : 100,
    }

    return json({
      currentPct,
      targetPct,
      present,
      absent,
      total,
      classesToAttend,
      missProjection,
      attendProjection,
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
