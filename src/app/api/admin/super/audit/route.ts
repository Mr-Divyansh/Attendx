import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleRouteError, json } from '@/lib/auth'
import { requireSuperAdmin } from '@/lib/authz'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')?.trim()
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const take = 50
    const skip = (page - 1) * take
    const where = action ? { action: { contains: action } } : {}
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      db.auditLog.count({ where }),
    ])
    return json({ logs, page, pages: Math.max(1, Math.ceil(total / take)), total })
  } catch (e) {
    return handleRouteError(e, 'admin/super/audit')
  }
}
