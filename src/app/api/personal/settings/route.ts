import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireRole,
  parseBody,
  json,
  errorResponse,
  AuthError,
  validateCsrfToken,
} from '@/lib/auth'

// GET /api/personal/settings
export async function GET() {
  try {
    const session = await requireRole('PERSONAL')
    const s = await db.setting.findUnique({ where: { userId: session.id } })
    if (!s) {
      // Auto-create default settings if missing
      const created = await db.setting.create({
        data: { userId: session.id, darkMode: false, language: 'en', goalPct: 75 },
      })
      return json({
        darkMode: created.darkMode,
        language: created.language,
        goalPct: created.goalPct,
        avatarUrl: created.avatarUrl,
      })
    }
    return json({
      darkMode: s.darkMode,
      language: s.language,
      goalPct: s.goalPct,
      avatarUrl: s.avatarUrl,
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}

// PUT /api/personal/settings — partial update
export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole('PERSONAL')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }
    const body = await parseBody<{
      darkMode?: boolean
      language?: string
      goalPct?: number
      avatarUrl?: string | null
    }>(req)

    if (body.goalPct !== undefined) {
      if (![75, 80, 85, 90].includes(body.goalPct)) {
        return errorResponse('goalPct must be 75, 80, 85 or 90', 400)
      }
    }

    const data: {
      darkMode?: boolean
      language?: string
      goalPct?: number
      avatarUrl?: string | null
    } = {}
    if (typeof body.darkMode === 'boolean') data.darkMode = body.darkMode
    if (typeof body.language === 'string') data.language = body.language
    if (typeof body.goalPct === 'number') data.goalPct = body.goalPct
    if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl

    const updated = await db.setting.upsert({
      where: { userId: session.id },
      update: data,
      create: {
        userId: session.id,
        darkMode: body.darkMode ?? false,
        language: body.language ?? 'en',
        goalPct: body.goalPct ?? 75,
        avatarUrl: body.avatarUrl ?? null,
      },
    })

    // Keep PersonalUser.avatarUrl in sync so the session sees it
    if (body.avatarUrl !== undefined) {
      await db.personalUser.update({
        where: { id: session.id },
        data: { avatarUrl: body.avatarUrl },
      })
    }

    return json({
      darkMode: updated.darkMode,
      language: updated.language,
      goalPct: updated.goalPct,
      avatarUrl: updated.avatarUrl,
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
