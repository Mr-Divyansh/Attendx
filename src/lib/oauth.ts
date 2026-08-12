import crypto from 'crypto'

const OAUTH_STATE_COOKIE = 'attendx_oauth_state'

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

/**
 * The URL Google redirects to. Keep this separate from the application URL so
 * Netlify preview and production deployments can use their own callback URLs.
 */
export function getGoogleCallbackUrl(): string {
  return (process.env.GOOGLE_CALLBACK_URL || `${getAppUrl()}/api/auth/google/callback`).replace(/\/$/, '')
}

function getOAuthSecret(): string {
  const secret = process.env.ATTENDX_SECRET
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('ATTENDX_SECRET environment variable is not set')
  }
  return secret || 'attendx-dev-secret-change-me'
}

export function signOAuthState(payload: { role: string; nonce: string }): string {
  const secret = getOAuthSecret()
  const json = JSON.stringify(payload)
  const b64 = Buffer.from(json).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(b64).digest('hex')
  return `${b64}.${sig}`
}

export function verifyOAuthState(token: string): { role: string; nonce: string } | null {
  const secret = getOAuthSecret()
  const [b64, sig] = token.split('.')
  if (!b64 || !sig) return null
  const expected = crypto.createHmac('sha256', secret).update(b64).digest('hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const actualBuffer = Buffer.from(sig, 'hex')
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) return null
  try {
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'))
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

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const redirectUri = getGoogleCallbackUrl()
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenRes.ok) {
    throw new Error(tokenData.error_description || 'Google token exchange failed')
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profile = await profileRes.json()
  if (!profileRes.ok || !profile.email) {
    throw new Error('Unable to fetch Google profile')
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
