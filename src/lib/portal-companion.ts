import crypto from 'crypto'

export function hashPortalCompanionSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function createPortalPairingCode(): string {
  return crypto.randomInt(10000000, 100000000).toString()
}

export function createPortalDeviceSecret(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function getBearerSecret(req: Request): string | null {
  const value = req.headers.get('authorization')?.trim()
  if (!value?.toLowerCase().startsWith('bearer ')) return null
  return value.slice(7).trim() || null
}
