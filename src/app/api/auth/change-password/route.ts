import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  getSession,
  hashPassword,
  verifyPassword,
  parseBody,
  json,
  errorResponse,
  AuthError,
  validateCsrfToken,
} from '@/lib/auth'

// POST /api/auth/change-password — college users (STUDENT / TEACHER / ADMIN).
//
// Two flows:
//   1. CHANGE — the account already has a password. `currentPassword` is
//      verified first; the new password is hashed and stored.
//   2. CREATE — the account was created via Google and has no application
//      password yet. No `currentPassword` is needed; a password is created.
//
// Passwords are always hashed (scrypt+salt) server-side, never stored in
// plaintext, and never accepted from the client in any other way.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role === 'PERSONAL') {
      throw new AuthError('Not signed in', 401)
    }
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }

    const { currentPassword, newPassword } = await parseBody<{
      currentPassword?: string
      newPassword?: string
    }>(req)

    if (!newPassword || newPassword.length < 8) {
      return errorResponse('New password must be at least 8 characters', 400)
    }

    const user = await db.user.findUnique({ where: { id: session.id } })
    if (!user) {
      throw new AuthError('Account not found', 404)
    }

    if (user.passwordHash) {
      if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
        return errorResponse('Current password is incorrect', 401)
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword) },
    })

    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to change password. Please try again later.', 500)
  }
}
