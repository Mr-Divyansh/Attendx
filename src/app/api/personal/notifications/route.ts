import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/personal/notifications — list (unread first, then newest)
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    const markRead = req.nextUrl.searchParams.get('markRead') === '1'

    const rows = await db.notification.findMany({
      where: { userId: session.id },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: 30,
    })

    if (markRead && rows.some((r) => !r.isRead)) {
      await db.notification.updateMany({
        where: { userId: session.id, isRead: false },
        data: { isRead: true },
      })
    }

    return json(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        message: r.message,
        isRead: r.isRead,
        createdAt: r.createdAt,
      }))
    )
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
