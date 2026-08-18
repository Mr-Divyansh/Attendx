import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  createPersonalSession,
  verifyPassword,
  parseBody,
  json,
  errorResponse,
  issueCsrfToken,
  assertCsrf,
  handleRouteError,
} from '@/lib/auth'
import { rateLimit, RULES } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/authz'

export const runtime = 'nodejs'

// POST /api/auth/login-personal — personal-mode login (username + password)
export async function POST(req: NextRequest) {
  try {
    await assertCsrf(req)

    const { username, password } = await parseBody<{
      username?: string
      password?: string
    }>(req)

    if (!username || !password) {
      return errorResponse('Username and password are required', 400)
    }

    const ip = getClientIp(req)
    await rateLimit({
      ip,
      identifier: `login-personal:${username.toLowerCase()}`,
      rule: RULES.login,
    })

    const pu = await db.personalUser.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: { settings: true },
    })

    if (!pu) {
      return errorResponse(
        'No account found for this username. Verify your email to create your account.',
        401,
        { code: 'EMAIL_NOT_REGISTERED' }
      )
    }

    if (!verifyPassword(password, pu.passwordHash)) {
      return errorResponse('Invalid username or password', 401)
    }

    await createPersonalSession({ id: pu.id })
    const csrf = await issueCsrfToken()

    return json({
      ok: true,
      user: {
        id: pu.id,
        role: 'PERSONAL',
        name: pu.fullName,
        username: pu.username,
        email: pu.username,
        avatarUrl: pu.avatarUrl,
        goalPct: pu.settings?.goalPct ?? 75,
        darkMode: pu.settings?.darkMode ?? false,
      },
      csrfToken: csrf,
    })

  } catch (e) {
    return handleRouteError(e, 'auth/login-personal')
  }
}
