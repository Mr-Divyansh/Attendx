import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { assertCsrf, handleRouteError, json, parseBody } from '@/lib/auth'
import { getClientIp } from '@/lib/authz'
import { requireSuperAdmin } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { canDisableAccount } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertCsrf(req)
    const session = await requireSuperAdmin()
    const { id } = await params
    if (id === session.id) {
      return json({ error: 'You cannot change your own account status' }, 403)
    }
    const body = await parseBody<{ disabled?: boolean }>(req)
    if (typeof body.disabled !== 'boolean') {
      return json({ error: 'disabled must be a boolean' }, 400)
    }
    const target = await db.user.findUnique({ where: { id } })
    if (!target) return json({ error: 'User not found' }, 404)
    if (body.disabled && !canDisableAccount('SUPER_ADMIN', target.role as 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT')) {
      return json({ error: 'Another Super Admin cannot be disabled through this endpoint' }, 403)
    }

    await db.user.update({
      where: { id },
      data: { disabled: body.disabled },
    })
    await logAudit({
      action: body.disabled ? 'super_admin.account_disabled' : 'super_admin.account_activated',
      actorId: session.id,
      actorRole: 'SUPER_ADMIN',
      targetType: 'User',
      targetId: id,
      ip: getClientIp(req),
    })
    return json({ ok: true, disabled: body.disabled })
  } catch (e) {
    return handleRouteError(e, 'admin/super/user-status')
  }
}
