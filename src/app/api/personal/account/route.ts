import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  AuthError,
  destroySession,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'
import { consumeVerificationTicket } from '@/lib/otp'

export const runtime = 'nodejs'

// DELETE /api/personal/account — delete the PersonalUser (cascades to all related data)
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    await assertCsrf(req)
    const body = await parseBody<{ ticket?: string }>(req)
    const verified = consumeVerificationTicket(body.ticket, 'delete-account')

    const user = await db.personalUser.findUnique({ where: { id: session.id } })
    if (!user) {
      return errorResponse('Account not found', 404)
    }
    if (verified.email !== user.username) {
      return errorResponse('Verification email does not match this account', 400)
    }

    await db.personalUser.delete({ where: { id: session.id } })
    await destroySession()
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'personal/account')
  }
}
