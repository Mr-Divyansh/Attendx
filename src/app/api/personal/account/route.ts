import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError, destroySession } from '@/lib/auth'

// DELETE /api/personal/account — delete the PersonalUser (cascades to all related data)
export async function DELETE() {
  try {
    const session = await requireRole('PERSONAL')
    await db.personalUser.delete({ where: { id: session.id } })
    await destroySession()
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
