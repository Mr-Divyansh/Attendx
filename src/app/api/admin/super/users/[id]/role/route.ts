import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { assertCsrf, handleRouteError, json, parseBody } from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { requireSuperAdmin } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { canAssignRole } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertCsrf(req)
    const session = await requireSuperAdmin()
    const { id } = await params
    if (id === session.id) {
      throw new Error('SELF_ROLE_CHANGE_FORBIDDEN')
    }
    const body = await parseBody<{ role?: 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT' }>(req)
    if (!body.role || !canAssignRole('SUPER_ADMIN', body.role)) {
      return json({ error: 'Unsupported role' }, 400)
    }

    const target = await db.user.findUnique({
      where: { id },
      include: { admin: true, student: true },
    })
    if (!target) return json({ error: 'User not found' }, 404)
    if (target.disabled) return json({ error: 'Restore or activate the account before changing role' }, 409)

    await db.$transaction(async (tx) => {
      if (body.role === 'ADMIN' && !target.admin) {
        await tx.admin.create({
          data: {
            userId: target.id,
            fullName: target.student?.fullName || target.email.split('@')[0],
          },
        })
      }
      if (body.role === 'STUDENT' && !target.student) {
        await tx.student.create({
          data: {
            userId: target.id,
            fullName: target.admin?.fullName || target.email.split('@')[0],
            rollNo: 'PENDING',
          },
        })
      }
      await tx.user.update({
        where: { id: target.id },
        data: { role: body.role! },
      })
    })

    await logAudit({
      action: 'super_admin.role_change',
      actorId: session.id,
      actorRole: 'SUPER_ADMIN',
      targetType: 'User',
      targetId: target.id,
      details: { from: target.role, to: body.role },
      ip: getClientIp(req),
    })

    return json({ ok: true, role: body.role })
  } catch (e) {
    if (e instanceof Error && e.message === 'SELF_ROLE_CHANGE_FORBIDDEN') {
      return json({ error: 'You cannot change your own role' }, 403)
    }
    return handleRouteError(e, 'admin/super/user-role')
  }
}
