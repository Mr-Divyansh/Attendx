import crypto from 'crypto'
import { db } from './db'
import { AuthError } from './auth'
import { rateLimit, RULES } from './rate-limit'
import { maskEmail, sendEmail, otpEmailHtml } from './email'
import { safeEqual } from './security'

// ───────────────────────────────────────────────────────────
// AttendX — email OTP verification
//
// - 6-digit code from crypto.randomBytes (uniform modulo 1_000_000)
// - stored as scrypt hash (never plaintext), 10-minute expiry
// - 5 attempts max; record deleted on success/expiry/attempt-exhaustion
// - max 3 sends per email per 15 minutes + per-IP rate limiting
// - plaintext OTP is never logged or returned
// ───────────────────────────────────────────────────────────

export const OTP_PURPOSES = [
  'register-student',
  'register-teacher',
  'register-personal',
  'reset-password',
  'change-email',
  'admin-reset-password',
] as const
export type OtpPurpose = (typeof OTP_PURPOSES)[number]

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const OTP_MAX_ATTEMPTS = 5
const OTP_MAX_SENDS_PER_EMAIL = 3
const OTP_EMAIL_WINDOW_MS = 15 * 60 * 1000

const PURPOSES: Record<OtpPurpose, { emailSubject: string; purposeLabel: string }> = {
  'register-student': { emailSubject: 'Verify your student email', purposeLabel: 'verify your student account email' },
  'register-teacher': { emailSubject: 'Verify your teacher email', purposeLabel: 'verify your teacher account email' },
  'register-personal': { emailSubject: 'Verify your email', purposeLabel: 'verify your email address' },
  'reset-password': { emailSubject: 'Reset your AttendX password', purposeLabel: 'reset your password' },
  'change-email': { emailSubject: 'Verify your new email', purposeLabel: 'verify your new email address' },
  'admin-reset-password': { emailSubject: 'Reset your AttendX password', purposeLabel: 'reset your password' },
}

function normalizeEmail(email: string): string {
  return String(email).trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

/** 6-digit code from CSPRNG — uniform via rejection-free modulo of 32-bit int. */
function generateOtp(): string {
  const buf = crypto.randomBytes(4)
  const num = buf.readUInt32BE(0) % 1_000_000
  return String(num).padStart(6, '0')
}

function hashOtp(code: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(code, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function verifyOtpHash(code: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const expected = Buffer.from(parts[2], 'hex')
  const actual = crypto.scryptSync(code, parts[1], 64)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

/**
 * How many OTP sends this email address has used inside the rolling window.
 * Enforces "max 3 per email per 15 min".
 */
async function countSendsInWindow(email: string): Promise<number> {
  const since = new Date(Date.now() - OTP_EMAIL_WINDOW_MS)
  return db.otpVerification.count({
    where: { email, createdAt: { gte: since } },
  })
}

export type SendOtpResult = {
  sent: boolean
  maskedEmail: string
  expiresInSeconds: number
  /** Seconds to wait before a resend is allowed (exponential backoff). */
  retryAfterSeconds: number
}

/**
 * Issue + email a new OTP for a purpose.
 *
 * Preconditions (caller-agnostic): the caller validates purpose-specific
 * business rules (account exists / email free) BEFORE calling this, so we
 * keep this helper focused on issuance.
 */
export async function sendOtp(opts: {
  email: string
  purpose: OtpPurpose
  ip: string
}): Promise<SendOtpResult> {
  const email = normalizeEmail(opts.email)
  if (!isValidEmail(email)) {
    throw new AuthError('Please provide a valid email address.', 400)
  }

  // Per-IP cap on sends.
  await rateLimit({
    ip: opts.ip,
    identifier: `otp:${opts.purpose}:send`,
    rule: RULES.otpSend,
  })
  // Per-email cap (3 / 15 min).
  const sendsInWindow = await countSendsInWindow(email)
  if (sendsInWindow >= OTP_MAX_SENDS_PER_EMAIL) {
    throw new AuthError('Too many verification codes requested for this email. Please try again in 15 minutes.', 429)
  }

  // Invalidate any previous codes for this email+purpose (one active code).
  await db.otpVerification.deleteMany({ where: { email, purpose: opts.purpose } })

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)
  await db.otpVerification.create({
    data: {
      email,
      purpose: opts.purpose,
      hashedCode: hashOtp(code),
      expiresAt,
      attempts: 0,
    },
  })

  // Send the email. Fail closed: if mail is not configured, do not leave a
  // dangling record that would let the user "guess" — delete it and error.
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://attendx.app'
    await sendEmail({
      to: email,
      subject: PURPOSES[opts.purpose].emailSubject,
      html: otpEmailHtml({
        code,
        purposeLabel: PURPOSES[opts.purpose].purposeLabel,
        expiresInMinutes: OTP_TTL_MS / 60000,
        appUrl,
      }),
    })
  } catch (e) {
    await db.otpVerification.deleteMany({ where: { email, purpose: opts.purpose } })
    if (e instanceof Error && e.message === 'EMAIL_NOT_CONFIGURED') {
      throw new AuthError(
        'Email verification is not configured yet. Please contact the administrator.',
        503
      )
    }
    console.error('[otp] failed to deliver email:', e instanceof Error ? e.message : e)
    throw new AuthError('Failed to send the verification email. Please try again.', 502)
  }

  // Simple exponential backoff hint: each subsequent send waits longer.
  const backoffSeconds = Math.min(300, Math.pow(2, sendsInWindow) * 30)
  return {
    sent: true,
    maskedEmail: maskEmail(email),
    expiresInSeconds: OTP_TTL_MS / 1000,
    retryAfterSeconds: backoffSeconds,
  }
}

export type VerifyOtpResult = {
  /** Short-lived HMAC ticket proving this email was verified for the purpose. */
  ticket: string
  maskedEmail: string
}

/**
 * Verify a submitted code. On success the OTP record is deleted and a
 * short-lived signed ticket is returned — the protected endpoint
 * (register / reset / change-email) requires that ticket, so OTP cannot
 * be bypassed by calling the endpoint directly.
 */
export async function verifyOtp(opts: {
  email: string
  purpose: OtpPurpose
  code: string
  ip: string
}): Promise<VerifyOtpResult> {
  const email = normalizeEmail(opts.email)
  const code = String(opts.code ?? '').trim()

  await rateLimit({
    ip: opts.ip,
    identifier: `otp:${opts.purpose}:verify:${email}`,
    rule: RULES.otpVerify,
  })

  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    throw new AuthError('Invalid or expired verification code.', 400)
  }

  const record = await db.otpVerification.findFirst({
    where: { email, purpose: opts.purpose },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) {
    throw new AuthError('Invalid or expired verification code.', 400)
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await db.otpVerification.delete({ where: { id: record.id } })
    throw new AuthError('Too many incorrect attempts. Request a new code.', 429)
  }

  if (Date.now() > record.expiresAt.getTime()) {
    await db.otpVerification.delete({ where: { id: record.id } })
    throw new AuthError('This code has expired. Request a new one.', 400)
  }

  if (!verifyOtpHash(code, record.hashedCode)) {
    await db.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    throw new AuthError('Invalid or expired verification code.', 400)
  }

  // Success — clear the record so the code can't be replayed.
  await db.otpVerification.delete({ where: { id: record.id } })

  return {
    ticket: createVerificationTicket(email, opts.purpose),
    maskedEmail: maskEmail(email),
  }
}

// ── Verification ticket (HMAC-signed, short-lived) ──

const TICKET_TTL_MS = 10 * 60 * 1000

export function getTicketSecret(): string {
  const secret = process.env.ATTENDX_SECRET?.trim()
  if (!secret) {
    throw new AuthError('Authentication is temporarily unavailable. Please try again later.', 503)
  }
  return secret
}

function createVerificationTicket(email: string, purpose: OtpPurpose): string {
  const payload = {
    email,
    purpose,
    nonce: crypto.randomBytes(12).toString('hex'),
    exp: Date.now() + TICKET_TTL_MS,
  }
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', getTicketSecret()).update(b64).digest('hex')
  return `${b64}.${sig}`
}

export type VerificationTicket = { email: string; purpose: OtpPurpose }

/**
 * Validate a ticket and return its payload, or throw. Timing-safe signature
 * check + expiry enforcement. Purpose must match exactly.
 */
export function consumeVerificationTicket(
  ticket: string | undefined,
  purpose: OtpPurpose
): VerificationTicket {
  if (typeof ticket !== 'string' || !ticket.includes('.')) {
    throw new AuthError('Verification is required before continuing.', 400)
  }
  const [b64, sig] = ticket.split('.')
  if (!b64 || !sig) {
    throw new AuthError('Verification is required before continuing.', 400)
  }
  const expected = crypto.createHmac('sha256', getTicketSecret()).update(b64).digest('hex')
  if (!safeEqual(expected, sig)) {
    throw new AuthError('Verification is required before continuing.', 400)
  }
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as {
      email?: unknown
      purpose?: unknown
      exp?: unknown
    }
    if (typeof payload.email !== 'string' || payload.purpose !== purpose || typeof payload.exp !== 'number') {
      throw new AuthError('Verification is required before continuing.', 400)
    }
    if (Date.now() > payload.exp) {
      throw new AuthError('Verification has expired. Please request a new code.', 400)
    }
    return { email: normalizeEmail(payload.email), purpose }
  } catch (e) {
    if (e instanceof AuthError) throw e
    throw new AuthError('Verification is required before continuing.', 400)
  }
}
