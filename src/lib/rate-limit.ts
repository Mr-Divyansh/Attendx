import { db } from './db'
import { AuthError } from './auth'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ───────────────────────────────────────────────────────────
// AttendX — persistent rate limiting
//
// Preferred backend: Upstash Redis (serverless-friendly, atomic).
// Fallback: the `RateLimit` table in Postgres when UPSTASH_REDIS_REST_URL
// is not configured. Both backends are shared across serverless
// instances, unlike the old in-memory Map.
// ───────────────────────────────────────────────────────────

export type RateLimitRule = {
  /** A stable identifier for the protected operation, e.g. 'auth:login' */
  name: string
  limit: number
  windowMs: number
}

let upstashClient: Redis | null = null
const limiterCache = new Map<string, Ratelimit>()

function getUpstashLimiter(rule: RateLimitRule): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return null

  if (!upstashClient) {
    upstashClient = new Redis({ url, token })
  }
  const cacheKey = `${rule.name}:${rule.limit}:${rule.windowMs}`
  let limiter = limiterCache.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: upstashClient,
      limiter: Ratelimit.slidingWindow(rule.limit, `${Math.max(1, Math.round(rule.windowMs / 1000))} s`),
      prefix: `attendx:ratelimit:${rule.name}`,
    })
    limiterCache.set(cacheKey, limiter)
  }
  return limiter
}

export type RateLimitOutcome = {
  allowed: boolean
  remaining: number
  /** Seconds until the window resets (for Retry-After). */
  resetInSeconds: number
}

/**
 * Check + record an attempt. Key = ip + identifier so one client IP can't
 * burn another user's quota, and a single user can't bypass via rotation of
 * many IPs without also rotating identifiers.
 *
 * Throws AuthError(429) with a Retry-After hint when the limit is exceeded.
 */
export async function rateLimit(opts: {
  ip: string
  identifier: string
  rule: RateLimitRule
}): Promise<RateLimitOutcome> {
  const { ip, identifier, rule } = opts
  const key = `${ip}|${identifier}`

  const upstashLimiter = getUpstashLimiter(rule)
  if (upstashLimiter) {
    const { success, remaining, reset } = await upstashLimiter.limit(key)
    const outcome: RateLimitOutcome = {
      allowed: success,
      remaining,
      resetInSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    }
    if (!success) throw new AuthError('Too many attempts. Please try again later.', 429)
    return outcome
  }

  // ── Postgres fallback (RateLimit table) ──
  const now = new Date()
  const resetAt = new Date(Date.now() + rule.windowMs)

  // Create the counter row atomically if it doesn't exist yet.
  const row = await db.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, resetAt },
    update: {},
  })

  let count = row.count
  let rowResetAt = row.resetAt

  if (now > rowResetAt) {
    // Window elapsed — start a fresh window.
    const fresh = await db.rateLimit.update({
      where: { key },
      data: { count: 1, resetAt },
    })
    count = fresh.count
    rowResetAt = fresh.resetAt
  } else {
    // Increment inside the window (atomic on Postgres).
    const updated = await db.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    })
    count = updated.count
    rowResetAt = updated.resetAt
  }

  const resetInSeconds = Math.max(1, Math.ceil((rowResetAt.getTime() - Date.now()) / 1000))
  const allowed = count <= rule.limit
  if (!allowed) {
    throw new AuthError('Too many attempts. Please try again later.', 429)
  }
  return { allowed, remaining: Math.max(0, rule.limit - count), resetInSeconds }
}

/** Common rate-limit rules used across the API. */
export const RULES = {
  login: { name: 'auth:login', limit: 10, windowMs: 10 * 60 * 1000 },
  register: { name: 'auth:register', limit: 5, windowMs: 60 * 60 * 1000 },
  changePassword: { name: 'auth:change-password', limit: 5, windowMs: 10 * 60 * 1000 },
  resetPassword: { name: 'auth:reset-password', limit: 5, windowMs: 15 * 60 * 1000 },
  joinClassroom: { name: 'classrooms:join', limit: 10, windowMs: 10 * 60 * 1000 },
  otpSend: { name: 'otp:send', limit: 5, windowMs: 15 * 60 * 1000 },
  otpVerify: { name: 'otp:verify', limit: 10, windowMs: 15 * 60 * 1000 },
  contact: { name: 'contact:submit', limit: 3, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>
