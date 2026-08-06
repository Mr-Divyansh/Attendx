import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  createPersonalSession,
  hashPassword,
  parseBody,
  json,
  errorResponse,
  issueCsrfToken,
} from '@/lib/auth'

// POST /api/auth/register — personal-mode self-registration
// Fields: fullName, username, password, confirm
export async function POST(req: NextRequest) {
  const { fullName, username, password, confirm } = await parseBody<{
    fullName?: string
    username?: string
    password?: string
    confirm?: string
  }>(req)

  if (!fullName || !username || !password || !confirm) {
    return errorResponse('All fields are required', 400)
  }
  if (password !== confirm) {
    return errorResponse('Passwords do not match', 400)
  }
  if (password.length < 6) {
    return errorResponse('Password must be at least 6 characters', 400)
  }
  if (username.length < 3) {
    return errorResponse('Username must be at least 3 characters', 400)
  }

  const uname = username.toLowerCase().trim()
  const existing = await db.personalUser.findUnique({ where: { username: uname } })
  if (existing) {
    return errorResponse('Username already taken', 409)
  }

  const pu = await db.personalUser.create({
    data: {
      fullName: fullName.trim(),
      username: uname,
      passwordHash: hashPassword(password),
      settings: { create: { darkMode: false, language: 'en', goalPct: 75 } },
    },
    include: { settings: true },
  })

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
}
