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
  validateCsrfToken,
} from '@/lib/auth'

// POST /api/personal/change-password — verify current, set new
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const { currentPassword, newPassword } = await parseBody<{
      currentPassword?: string
      newPassword?: string
    }>(req)

    if (!currentPassword || !newPassword) {
      return errorResponse('Current and new passwords are required', 400)
    }
    if (newPassword.length < 6) {
      return errorResponse('New password must be at least 6 characters', 400)
    }

    const pu = await db.personalUser.findUnique({ where: { id: session.id } })
    if (!pu) return errorResponse('User not found', 404)

    if (!verifyPassword(currentPassword, pu.passwordHash)) {
      return errorResponse('Current password is incorrect', 401)
    }

    await db.personalUser.update({
      where: { id: session.id },
      data: { passwordHash: hashPassword(newPassword) },
    })

    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
