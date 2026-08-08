import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import {
  getAppUrl,
  isGoogleOAuthConfigured,
  signOAuthState,
  OAUTH_STATE_COOKIE,
} from '@/lib/oauth'
import { errorResponse } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return errorResponse(
      'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.',
      503
    )
  }

  const role = req.nextUrl.searchParams.get('role') || 'STUDENT'
  if (role !== 'STUDENT') {
    return errorResponse('Google sign-in is only available for students', 400)
  }

  const nonce = crypto.randomUUID()
  const state = signOAuthState({ role, nonce })

  const store = await cookies()
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  })

  const redirectUri = `${getAppUrl()}/api/auth/google/callback`
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })

  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
