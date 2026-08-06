import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

// DELETE /api/personal/attendance/[id] — delete a single attendance entry (must own it)
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireRole('PERSONAL')
    const { id } = await ctx.params

    const existing = await db.personalAttendance.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.id) {
      return errorResponse('Not found', 404)
    }

    await db.personalAttendance.delete({ where: { id } })
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
