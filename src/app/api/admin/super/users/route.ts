import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleRouteError, json } from '@/lib/auth'
import { requireSuperAdmin } from '@/lib/authz'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim().toLowerCase()
    const role = searchParams.get('role')?.trim().toUpperCase()
    const where = {
      ...(role && ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT'].includes(role)
        ? { role: role as 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' }
        : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { student: { is: { fullName: { contains: search, mode: 'insensitive' as const } } } },
              { teacher: { is: { fullName: { contains: search, mode: 'insensitive' as const } } } },
              { admin: { is: { fullName: { contains: search, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        email: true,
        role: true,
        disabled: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        admin: { select: { id: true, fullName: true } },
        teacher: { select: { id: true, fullName: true } },
        student: { select: { id: true, fullName: true, rollNo: true } },
      },
    })

    return json({ users })
  } catch (e) {
    return handleRouteError(e, 'admin/super/users')
  }
}
