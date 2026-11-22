import crypto from 'node:crypto'

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000

export function createPasswordResetToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function isPasswordResetTokenFormat(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)
}

export function isPasswordResetUsable(input: {
  usedAt: Date | null
  expiresAt: Date
  hasCollegeOwner: boolean
  hasPersonalOwner: boolean
  ownerDisabled: boolean
  now: Date
}): boolean {
  return (
    !input.usedAt &&
    input.expiresAt.getTime() > input.now.getTime() &&
    input.hasCollegeOwner !== input.hasPersonalOwner &&
    !input.ownerDisabled
  )
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createPasswordResetUrl(
  appUrl: string,
  token: string,
  accountType: 'college' | 'personal'
): string {
  return `${appUrl.replace(/\/+$/, '')}/reset-password?accountType=${accountType}#${encodeURIComponent(token)}`
}
