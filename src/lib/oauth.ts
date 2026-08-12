import crypto from 'crypto'
import type { NextRequest } from 'next/server'

const OAUTH_STATE_COOKIE = 'attendx_oauth_state'

export class OAuthConfigurationError extends Error {
  constructor(readonly code: 'missing_credentials' | 'invalid_callback_url') {
    super(code)
  }
}

type OAuthConfig = {
  clientId: string
  clientSecret: string
  callbackUrl: string
  appUrl: string
}

function trim(value: string | undefined): string | undefined {
  const result = value?.trim()
  return result || undefined
}

function parsePublicUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new OAuthConfigurationError('invalid_callback_url')
  }

  const isLocalHttp = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new OAuthConfigurationError('invalid_callback_url')
  }
  return url
}

/** Uses the incoming deployment origin when no explicit public URL is configured. */
export function getRequestOrigin(req: NextRequest): string {
  return new URL(req.url).origin
}

/**
 * Resolves Google OAuth at request time. Vercel provides VERCEL_URL without a
 * scheme; an explicit callback URL always wins so Google can be configured with
 * one stable production redirect URI.
 */
export function getGoogleOAuthConfig(req: NextRequest): OAuthConfig {
  const clientId = trim(process.env.GOOGLE_CLIENT_ID)
  const clientSecret = trim(process.env.GOOGLE_CLIENT_SECRET)
  if (!clientId || !clientSecret) {
    throw new OAuthConfigurationError('missing_credentials')
  }

  const requestOrigin = getRequestOrigin(req)
  const configuredCallback = trim(process.env.GOOGLE_CALLBACK_URL)
  const configuredAppUrl = trim(process.env.NEXT_PUBLIC_APP_URL)
  const vercelUrl = trim(process.env.VERCEL_URL)

  const callbackUrl = configuredCallback
    ? parsePublicUrl(configuredCallback).toString().replace(/\/$/, '')
    : `${requestOrigin}/api/auth/google/callback`

  // After Google returns, keep the user on the same configured application
  // origin. For unconfigured preview/local deployments, use the request origin.
  const appUrl = configuredAppUrl
    ? parsePublicUrl(configuredAppUrl).origin
    : configuredCallback
      ? new URL(callbackUrl).origin
      : vercelUrl
        ? parsePublicUrl(`https://${vercelUrl}`).origin
        : requestOrigin

  return { clientId, clientSecret, callbackUrl, appUrl }
}

function getOAuthSecret(): string {
  const secret = trim(process.env.ATTENDX_SECRET)
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new OAuthConfigurationError('missing_credentials')
  }
  return secret || 'attendx-dev-secret-change-me'
}

export function signOAuthState(payload: { role: 'STUDENT' | 'TEACHER'; nonce: string }): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', getOAuthSecret()).update(b64).digest('hex')
  return `${b64}.${sig}`
}

export function verifyOAuthState(token: string): { role: 'STUDENT' | 'TEACHER'; nonce: string } | null {
  const [b64, sig] = token.split('.')
  if (!b64 || !sig) return null

  const expected = crypto.createHmac('sha256', getOAuthSecret()).update(b64).digest('hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const actualBuffer = Buffer.from(sig, 'hex')
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as { role?: unknown; nonce?: unknown }
    if ((parsed.role !== 'STUDENT' && parsed.role !== 'TEACHER') || typeof parsed.nonce !== 'string') return null
    return { role: parsed.role, nonce: parsed.nonce }
  } catch {
    return null
  }
}

export { OAUTH_STATE_COOKIE }

export type GoogleProfile = {
  sub: string
  email: string
  name: string
  picture?: string
}

export async function exchangeGoogleCode(code: string, config: OAuthConfig): Promise<GoogleProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  })
  const tokenData = await tokenRes.json().catch(() => null) as { access_token?: string } | null
  if (!tokenRes.ok || !tokenData?.access_token) {
    throw new Error('GOOGLE_TOKEN_EXCHANGE_FAILED')
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    cache: 'no-store',
  })
  const profile = await profileRes.json().catch(() => null) as {
    sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string
  } | null
  if (!profileRes.ok || !profile?.sub || !profile.email || profile.email_verified !== true) {
    throw new Error('GOOGLE_PROFILE_VERIFICATION_FAILED')
  }

  return {
    sub: profile.sub,
    email: profile.email.toLowerCase(),
    name: profile.name || profile.email.split('@')[0],
    picture: profile.picture,
  }
}

export function makeClassroomPublicId(name: string): string {
  const slug = name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 12)
    .toUpperCase()
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `CHITA-${slug || 'CLASS'}-${suffix}`
}
