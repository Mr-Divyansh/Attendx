import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  verifyPassword,
  hashPassword,
  AuthError,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/authz'
import { validatePasswordPolicy } from '@/lib/security'

// POST /api/personal/change-password — verify current, set new
export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)
    const session = await requireRole('PERSONAL')

    await rateLimit({
      ip: getClientIp(req),
      identifier: `change-password:${session.id}`,
      rule: RULES.changePassword,
    })

    const { currentPassword, newPassword } = await parseBody<{
      currentPassword?: string
      newPassword?: string
    }>(req)

    if (!currentPassword || !newPassword) {
      return errorResponse('Current and new passwords are required', 400)
    }

    const pu = await db.personalUser.findUnique({ where: { id: session.id } })
    if (!pu) return errorResponse('User not found', 404)

    if (!verifyPassword(currentPassword, pu.passwordHash)) {
      return errorResponse('Current password is incorrect', 401)
    }

    const policy = validatePasswordPolicy(newPassword, {
      email: pu.username,
      name: pu.fullName,
    })
    if (!policy.ok) {
      return errorResponse(policy.reason, 400)
    }

    await db.personalUser.update({
      where: { id: session.id },
      data: { passwordHash: hashPassword(newPassword) },
    })

    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'personal/change-password')
  }
}
