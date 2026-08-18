import crypto from 'crypto'

// ───────────────────────────────────────────────────────────
// AttendX — password policy & token generation
// ───────────────────────────────────────────────────────────

/** Common/breached-style passwords that are rejected outright. */
const PASSWORD_DENYLIST = new Set([
  'password', 'password1', 'password123', '12345678', '123456789',
  '1234567890', 'qwerty', 'qwerty123', 'abc123', 'letmein', 'welcome',
  'welcome1', 'monkey', 'dragon', 'football', 'baseball', 'iloveyou',
  'admin', 'admin123', 'administrator', 'changeme', 'trustno1',
  'sunshine', 'princess', 'master', 'login', 'passw0rd', 'hunter2',
  'attendance', 'attendx', 'attendx123', 'college', 'student123',
  'teacher123', 'school123', 'india123', 'indian', 'asdfgh',
  'aaaaaa', 'aaaaaaa', 'abcdef', 'abcdefg', '11111111', '00000000',
  '123123123', '11223344', '987654321', 'zaq12wsx', 'p@ssw0rd',
])

const MIN_PASSWORD_LENGTH = 12
const COMPLEXITY_RULES = [
  { test: (p: string) => /[a-z]/.test(p), label: 'lowercase letter' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'special character' },
] as const

export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * Validate a password against the AttendX policy:
 * 12+ characters, at least one of each of lowercase/uppercase/digit/special,
 * not in the common-password denylist, and not trivially derived from the
 * user's own email/name.
 */
export function validatePasswordPolicy(
  password: string,
  context?: { email?: string; name?: string }
): PasswordPolicyResult {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    }
  }
  if (password.length > 128) {
    return { ok: false, reason: 'Password must be at most 128 characters long.' }
  }

  const lower = password.toLowerCase()
  if (PASSWORD_DENYLIST.has(lower)) {
    return { ok: false, reason: 'That password is too common. Choose a stronger one.' }
  }

  const missing = COMPLEXITY_RULES.filter((r) => !r.test(password))
  if (missing.length > 0) {
    const need = missing.map((m) => m.label).join(', ')
    return {
      ok: false,
      reason: `Password must include at least one ${need}.`,
    }
  }

  // Reject passwords containing the user's email local-part or full name
  // (case-insensitive, min 4-char substring) to stop trivial credential reuse.
  if (context) {
    const emailLocal = context.email?.split('@')[0]?.toLowerCase()
    const name = context.name?.toLowerCase()
    for (const part of [emailLocal, name]) {
      if (part && part.length >= 4 && lower.includes(part)) {
        return {
          ok: false,
          reason: 'Password must not contain your email or name.',
        }
      }
    }
  }

  return { ok: true }
}

/** Timing-safe string comparison helper. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/** Cryptographically-secure random token (hex). */
export function secureToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/** Human-friendly high-entropy code (join codes / invite tokens). */
export function secureCode(length = 10, charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'): string {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += charset[bytes[i] % charset.length]
  }
  return out
}
