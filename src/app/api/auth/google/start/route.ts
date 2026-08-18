import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import {
  getGoogleOAuthConfig,
  OAuthConfigurationError,
  signOAuthState,
  OAUTH_STATE_COOKIE,
} from '@/lib/oauth'
import { errorResponse,
  handleRouteError,
} from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const role = req.nextUrl.searchParams.get('role') || 'STUDENT'
    if (role !== 'STUDENT' && role !== 'TEACHER') {
      return errorResponse('Google sign-in is only available for students and teachers', 400)
    }

    const nonce = crypto.randomUUID()
    const config = getGoogleOAuthConfig(req)
    const state = signOAuthState({ role, nonce })

    const store = await cookies()
    store.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 600,
    })

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    })

    return Response.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    )

  } catch (e) {
    if (e instanceof OAuthConfigurationError) {
      console.error('[auth/google/start] configuration error', { code: e.code })
      return errorResponse('Google sign-in is temporarily unavailable. Please contact the administrator.', 503)
    }
    return handleRouteError(e, 'auth/google/start')
  }
}
