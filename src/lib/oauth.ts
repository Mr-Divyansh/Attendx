import crypto from 'crypto'
import type { NextRequest } from 'next/server'

const OAUTH_STATE_COOKIE = 'attendx_oauth_state'

export class OAuthConfigurationError extends Error {
  readonly code: 'missing_credentials' | 'invalid_callback_url'

  constructor(code: 'missing_credentials' | 'invalid_callback_url') {
    super(code)
    this.code = code
  }
}

type OAuthConfig = {
  clientId: string
  clientSecret: string
  callbackUrl: string
  appUrl: string
}

export type OAuthCallbackError =
  | 'access_denied'
  | 'redirect_uri_mismatch'
  | 'missing_code'
  | 'invalid_state'
  | 'oauth_failed'

export type OAuthDiagnosticStage =
  | 'initiation'
  | 'callback_received'
  | 'callback_validation'
  | 'token_exchange'
  | 'profile_verified'
  | 'callback_processing'

export type OAuthDiagnosticCategory =
  | OAuthCallbackError
  | 'GOOGLE_CLIENT_CONFIGURATION_REJECTED'
  | 'GOOGLE_AUTHORIZATION_CODE_REJECTED'
  | 'GOOGLE_TOKEN_EXCHANGE_FAILED'
  | 'GOOGLE_PROFILE_VERIFICATION_FAILED'
  | 'OAUTH_CALLBACK_FAILED'

function trim(value: string | undefined): string | undefined {
  const result = value?.trim()
  return result || undefined
}

export function getOAuthEnvironment(): 'preview' | 'production' | 'development' | 'other' {
  const vercelEnv = trim(process.env.VERCEL_ENV)
  if (vercelEnv === 'preview' || vercelEnv === 'production') return vercelEnv
  if (process.env.NODE_ENV === 'development') return 'development'
  if (process.env.NODE_ENV === 'production') return 'production'
  return 'other'
}

export function logGoogleOAuthDiagnostic(
  stage: OAuthDiagnosticStage,
  callbackUrl: string,
  category?: OAuthDiagnosticCategory
): void {
  const callback = parsePublicUrl(callbackUrl)
  const context = {
    stage,
    environment: getOAuthEnvironment(),
    callbackHost: callback.host,
    callbackPath: callback.pathname,
    ...(category ? { category } : {}),
  }

  if (category) console.warn('[auth/google]', context)
  else console.info('[auth/google]', context)
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
  const vercelBranchUrl = trim(process.env.VERCEL_BRANCH_URL)
  const isPreview = trim(process.env.VERCEL_ENV) === 'preview'

  if (isPreview) {
    const allowedPreviewOrigins = [vercelUrl, vercelBranchUrl]
      .filter((host): host is string => Boolean(host))
      .map((host) => parsePublicUrl(`https://${host}`).origin)

    if (!allowedPreviewOrigins.includes(requestOrigin)) {
      throw new OAuthConfigurationError('invalid_callback_url')
    }

    return {
      clientId,
      clientSecret,
      callbackUrl: `${requestOrigin}/api/auth/google/callback`,
      appUrl: requestOrigin,
    }
  }

  const callbackUrl = configuredCallback
    ? parsePublicUrl(configuredCallback).toString().replace(/\/$/, '')
    : `${requestOrigin}/api/auth/google/callback`

  // Keep the post-login redirect on the configured application origin.
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
  if (!secret || secret.length < 32) {
    throw new OAuthConfigurationError('missing_credentials')
  }
  return secret
}

export function signOAuthState(payload: { role: 'STUDENT' | 'TEACHER'; nonce: string }): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', getOAuthSecret()).update(b64).digest('hex')
  return `${b64}.${sig}`
}

export function verifyOAuthState(token: string): { role: 'STUDENT' | 'TEACHER'; nonce: string } | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [b64, sig] = parts
  if (!/^[A-Za-z0-9_-]+$/.test(b64) || !/^[a-f0-9]{64}$/i.test(sig)) return null

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

export function validateGoogleOAuthCallback(input: {
  code: string | null
  state: string | null
  cookieState: string | undefined
  providerError: string | null
}):
  | { ok: true; code: string; role: 'STUDENT' | 'TEACHER' }
  | { ok: false; error: OAuthCallbackError } {
  if (input.providerError) {
    if (input.providerError === 'access_denied') {
      return { ok: false, error: 'access_denied' }
    }
    if (input.providerError === 'redirect_uri_mismatch') {
      return { ok: false, error: 'redirect_uri_mismatch' }
    }
    return { ok: false, error: 'oauth_failed' }
  }

  if (!input.code || !input.state) return { ok: false, error: 'missing_code' }
  if (!input.cookieState || input.cookieState !== input.state) {
    return { ok: false, error: 'invalid_state' }
  }

  const state = verifyOAuthState(input.state)
  if (!state) return { ok: false, error: 'invalid_state' }

  return { ok: true, code: input.code, role: state.role }
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
  const tokenData = await tokenRes.json().catch(() => null) as {
    access_token?: string
    error?: string
  } | null
  if (!tokenRes.ok || !tokenData?.access_token) {
    if (tokenData?.error === 'invalid_client') {
      throw new Error('GOOGLE_CLIENT_CONFIGURATION_REJECTED')
    }
    if (tokenData?.error === 'invalid_grant') {
      throw new Error('GOOGLE_AUTHORIZATION_CODE_REJECTED')
    }
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

/** Cryptographically-secure random uppercase code (no ambiguous chars). */
export function secureCode(length: number): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length]
  return out
}

export function makeClassroomPublicId(name: string): string {
  const slug = name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 12)
    .toUpperCase()
  // 20 chars ~ 105 bits of entropy — not guessable.
  const suffix = secureCode(20)
  return `CHITA-${slug || 'CLASS'}-${suffix}`
}
