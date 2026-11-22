import { getSession, handleRouteError, json, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) throw new AuthError('Not signed in', 401)

    if (session.role === 'PERSONAL') {
      const account = await db.personalUser.findUnique({
        where: { id: session.id },
        select: { passwordHash: true, passwordChangedAt: true },
      })
      if (!account) throw new AuthError('Account not found', 404)
      return json({
        role: session.role,
        hasPassword: Boolean(account.passwordHash),
        passwordChangedAt: account.passwordChangedAt,
        lastLoginAt: null,
        sessionMaxAgeDays: 7,
        individualSessionsAvailable: false,
        providers: ['PASSWORD'],
      })
    }

    const account = await db.user.findUnique({
      where: { id: session.id },
      select: {
        passwordHash: true,
        passwordChangedAt: true,
        lastLoginAt: true,
        authAccounts: { select: { provider: true } },
      },
    })
    if (!account) throw new AuthError('Account not found', 404)
    return json({
      role: session.role,
      hasPassword: Boolean(account.passwordHash),
      passwordChangedAt: account.passwordChangedAt,
      lastLoginAt: account.lastLoginAt,
      sessionMaxAgeDays: 7,
      individualSessionsAvailable: false,
      providers: [
        ...(account.passwordHash ? ['PASSWORD'] : []),
        ...account.authAccounts.map((item) => item.provider.toUpperCase()),
      ],
    })
  } catch (error) {
    return handleRouteError(error, 'auth/security')
  }
}
