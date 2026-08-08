import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  hashPassword,
  AuthError,
  validateCsrfToken,
} from '@/lib/auth'

// POST /api/admin/reset-password — admin resets any user's password.
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const body = await parseBody<{ userId?: string; newPassword?: string }>(req)
    const userId = body.userId
    const newPassword = body.newPassword

    if (!userId || !newPassword) {
      return errorResponse('userId and newPassword are required', 400)
    }
    if (newPassword.length < 6) {
      return errorResponse('Password must be at least 6 characters', 400)
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return errorResponse('User not found', 404)

    await db.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword) },
    })

    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Server error', 500)
  }
}
