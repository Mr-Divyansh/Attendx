import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// DELETE /api/admin/timetable/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN')
    const { id } = await params
    await db.timetable.delete({ where: { id } })
    return json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Server error', 500)
  }
}
