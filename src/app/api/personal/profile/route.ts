import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  AuthError,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'

export const runtime = 'nodejs'

// PUT /api/personal/profile — update fullName (and optionally avatarUrl)
export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    await assertCsrf(req)
    const body = await parseBody<{
      fullName?: string
      avatarUrl?: string | null
    }>(req)

    if (body.fullName !== undefined && !body.fullName.trim()) {
      return errorResponse('Full name cannot be empty', 400)
    }

    const data: { fullName?: string; avatarUrl?: string | null } = {}
    if (typeof body.fullName === 'string') data.fullName = body.fullName.trim()
    if (body.avatarUrl !== undefined) {
      data.avatarUrl = body.avatarUrl && body.avatarUrl.trim() ? body.avatarUrl.trim() : null
    }

    const updated = await db.personalUser.update({
      where: { id: session.id },
      data,
    })

    // Keep Setting.avatarUrl in sync as well
    if (body.avatarUrl !== undefined) {
      await db.setting.upsert({
        where: { userId: session.id },
        update: { avatarUrl: data.avatarUrl },
        create: {
          userId: session.id,
          avatarUrl: data.avatarUrl ?? null,
        },
      })
    }

    return json({
      id: updated.id,
      fullName: updated.fullName,
      username: updated.username,
      avatarUrl: updated.avatarUrl,
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return handleRouteError(e, 'personal/profile')
  }
}
