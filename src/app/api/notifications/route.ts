import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const session = await requireRole('STUDENT', 'TEACHER', 'ADMIN')
    const notifications = await db.collegeNotification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return json({ notifications })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to load notifications', 500)
  }
}
