import { db } from '@/lib/db'
import { handleRouteError, json } from '@/lib/auth'
import { requireSuperAdmin } from '@/lib/authz'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await requireSuperAdmin()
    let databaseConnected = true
    try {
      await db.$queryRaw`SELECT 1`
    } catch {
      databaseConnected = false
    }

    const [users, admins, students, subjects, attendanceRecords, disabledAccounts, recentActivity] =
      await Promise.all([
        db.user.count(),
        db.user.count({ where: { role: 'ADMIN' } }),
        db.student.count(),
        db.subject.count(),
        db.attendance.count(),
        db.user.count({ where: { disabled: true } }),
        db.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            action: true,
            actorRole: true,
            targetType: true,
            targetId: true,
            createdAt: true,
          },
        }),
      ])

    return json({
      users,
      administrators: admins,
      students,
      subjects,
      attendanceRecords,
      disabledAccounts,
      activeAccounts: users - disabledAccounts,
      databaseConnected,
      recentActivity,
    })
  } catch (e) {
    return handleRouteError(e, 'admin/super/stats')
  }
}
