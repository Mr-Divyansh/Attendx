import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  createCollegeSession,
  hashPassword,
  issueCsrfToken,
  errorResponse,
} from '@/lib/auth'
import {
  exchangeGoogleCode,
  getAppUrl,
  verifyOAuthState,
  OAUTH_STATE_COOKIE,
} from '@/lib/oauth'

async function upsertGoogleStudent(profile: {
  sub: string
  email: string
  name: string
}) {
  let user = await db.user.findUnique({
    where: { email: profile.email },
    include: { student: true, authAccounts: true },
  })

  if (!user) {
    user = await db.user.create({
      data: {
        email: profile.email,
        passwordHash: null,
        role: 'STUDENT',
        student: {
          create: {
            fullName: profile.name,
            rollNo: 'PENDING',
            hasRollNumber: true,
            profileComplete: false,
          },
        },
        authAccounts: {
          create: {
            provider: 'google',
            providerAccountId: profile.sub,
          },
        },
      },
      include: { student: true, authAccounts: true },
    })
  } else {
    if (user.role !== 'STUDENT') {
      throw new Error('ROLE_CONFLICT')
    }
    if (user.disabled) {
      throw new Error('DISABLED')
    }

    await db.authAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: profile.sub,
        },
      },
      update: { userId: user.id },
      create: {
        userId: user.id,
        provider: 'google',
        providerAccountId: profile.sub,
      },
    })

    if (!user.student) {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          student: {
            create: {
              fullName: profile.name,
              rollNo: 'PENDING',
              hasRollNumber: true,
              profileComplete: false,
            },
          },
        },
        include: { student: true, authAccounts: true },
      })
    }
  }

  return user
}

export async function GET(req: NextRequest) {
  const appUrl = getAppUrl()
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const oauthError = req.nextUrl.searchParams.get('error')

  if (oauthError) {
    return Response.redirect(`${appUrl}/?auth_error=${encodeURIComponent(oauthError)}`)
  }

  if (!code || !state) {
    return Response.redirect(`${appUrl}/?auth_error=missing_code`)
  }

  const store = await cookies()
  const cookieState = store.get(OAUTH_STATE_COOKIE)?.value
  store.delete(OAUTH_STATE_COOKIE)

  if (!cookieState || cookieState !== state) {
    return Response.redirect(`${appUrl}/?auth_error=invalid_state`)
  }

  const parsed = verifyOAuthState(state)
  if (!parsed || parsed.role !== 'STUDENT') {
    return Response.redirect(`${appUrl}/?auth_error=invalid_state`)
  }

  try {
    const profile = await exchangeGoogleCode(code)
    const user = await upsertGoogleStudent(profile)
    const student = user.student!

    const needsProfile =
      !student.profileComplete ||
      student.rollNo === 'PENDING' ||
      !student.studentType

    await createCollegeSession({
      id: user.id,
      email: user.email,
      role: 'STUDENT',
    })
    await issueCsrfToken()

    const redirect = needsProfile
      ? `${appUrl}/?student_setup=1`
      : `${appUrl}/?student_login=1`
    return Response.redirect(redirect)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'oauth_failed'
    if (msg === 'ROLE_CONFLICT') {
      return Response.redirect(`${appUrl}/?auth_error=role_conflict`)
    }
    if (msg === 'DISABLED') {
      return Response.redirect(`${appUrl}/?auth_error=account_disabled`)
    }
    console.error('[google/callback]', e)
    return Response.redirect(`${appUrl}/?auth_error=oauth_failed`)
  }
}
