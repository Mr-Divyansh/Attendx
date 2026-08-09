import { cookies } from 'next/headers'
import { db } from './db'
import crypto from 'crypto'

// ───────────────────────────────────────────────────────────
// AttendX — Auth library (session/cookie based, bcrypt-hashed)
// Mirrors PHP session + role-based access control from the spec.
// ───────────────────────────────────────────────────────────

const SESSION_COOKIE = 'attendx_session'
const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days

export type SessionUser = {
  id: string
  email: string
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PERSONAL'
  name: string
  // college extras
  studentId?: string
  teacherId?: string
  adminId?: string
  rollNo?: string
  semesterId?: string | null
  sectionId?: string | null
  // personal extras
  username?: string
  avatarUrl?: string | null
}

type SessionPayload = {
  id: string
  role: SessionUser['role']
  issuedAt: number
  expiresAt: number
  // a simple HMAC signature to prevent tampering
  sig: string
}

const ATTENDX_SECRET = process.env.ATTENDX_SECRET
const SECRET = ATTENDX_SECRET || 'attendx-dev-secret-change-me'

function getSecret(): string {
  if (process.env.NODE_ENV === 'production' && !ATTENDX_SECRET) {
    throw new Error(
      'ATTENDX_SECRET environment variable is not set. Set it in your hosting provider\'s ' +
        'environment variables (Netlify: Site settings → Environment variables) to a long ' +
        'random string before deploying to production.'
    )
  }
  return SECRET
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex')
}

function encodePayload(payload: Omit<SessionPayload, 'sig'>): string {
  const json = JSON.stringify(payload)
  const b64 = Buffer.from(json).toString('base64url')
  const sig = sign(b64)
  return `${b64}.${sig}`
}

function decodePayload(token: string): Omit<SessionPayload, 'sig'> | null {
  const [b64, sig] = token.split('.')
  if (!b64 || !sig) return null
  if (sign(b64) !== sig) return null // tampered
  try {
    const json = Buffer.from(b64, 'base64url').toString('utf8')
    const payload = JSON.parse(json) as SessionPayload
    if (Date.now() > payload.expiresAt) return null
    const { sig: _sig, ...rest } = payload
    return rest
  } catch {
    return null
  }
}

/** Create a session cookie for a college user (regenerate id on login). */
export async function createCollegeSession(user: {
  id: string
  email: string
  role: SessionUser['role']
}) {
  const token = encodePayload({
    id: user.id,
    role: user.role,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL * 1000,
  })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL,
  })
}

/** Create a session cookie for a personal-mode user. */
export async function createPersonalSession(user: { id: string }) {
  const token = encodePayload({
    id: user.id,
    role: 'PERSONAL',
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL * 1000,
  })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL,
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/** Returns the current session user, or null. Resolves role-specific profile. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = decodePayload(token)
  if (!payload) return null

  if (payload.role === 'PERSONAL') {
    const pu = await db.personalUser.findUnique({
      where: { id: payload.id },
      include: { settings: true },
    })
    if (!pu) return null
    return {
      id: pu.id,
      email: pu.username,
      role: 'PERSONAL',
      name: pu.fullName,
      username: pu.username,
      avatarUrl: pu.avatarUrl,
    }
  }

  // College user
  const u = await db.user.findUnique({
    where: { id: payload.id },
    include: { admin: true, teacher: true, student: true },
  })
  if (!u || u.disabled) return null
  const base: SessionUser = {
    id: u.id,
    email: u.email,
    role: u.role,
    name:
      u.admin?.fullName || u.teacher?.fullName || u.student?.fullName || u.email,
  }
  if (u.admin) base.adminId = u.admin.id
  if (u.teacher) base.teacherId = u.teacher.id
  if (u.student) {
    base.studentId = u.student.id
    base.rollNo = u.student.rollNo
    base.semesterId = u.student.semesterId
    base.sectionId = u.student.sectionId
  }
  return base
}

/** Require a specific role; throws 401-style sentinel if missing. */
export async function requireRole(
  ...roles: SessionUser['role'][]
): Promise<SessionUser> {
  const session = await getSession()
  if (!session || !roles.includes(session.role)) {
    throw new AuthError('Unauthorized', 401)
  }
  return session
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

// ── Password hashing (bcrypt-equivalent via node's scrypt + salt) ──
// We use scrypt (available in Node 18+) as a bcrypt stand-in for hashing.
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = parts[1]
  const hash = parts[2]
  const test = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'))
}

// ── CSRF token (per-session, validated on POST mutations) ──
const CSRF_COOKIE = 'attendx_csrf'

export async function issueCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(24).toString('hex')
  const store = await cookies()
  store.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL,
  })
  return token
}

export async function validateCsrfToken(headerToken?: string): Promise<boolean> {
  const store = await cookies()
  const cookieToken = store.get(CSRF_COOKIE)?.value
  if (!cookieToken || !headerToken) return false

  try {
    const cookieBuf = Buffer.from(cookieToken, 'hex')
    const headerBuf = Buffer.from(headerToken, 'hex')
    if (cookieBuf.length !== headerBuf.length) return false
    return crypto.timingSafeEqual(cookieBuf, headerBuf)
  } catch {
    return false
  }
}

// ── Basic rate limiting for auth endpoints (login/register) ──
// This is a simple in-memory limiter: 10 attempts per key per 10 minutes. It resets
// on server restart / cold start, so it's not bulletproof on serverless, but it stops
// casual scripted brute-forcing of passwords, which the app had zero protection
// against before this.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 10
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count += 1
  return true
}

/** Helper for API routes: parse JSON body safely. */
export async function parseBody<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new AuthError('Invalid JSON body', 400)
  }
}

/** Standard JSON response helper. */
export function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

/** Error response helper. */
export function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

/**
 * Map an unexpected thrown error (typically a Prisma/DB failure) to a safe,
 * user-facing JSON error, and log the full details server-side.
 *
 * Without this, an unhandled exception in a route makes Next.js return a bare
 * 500 with no JSON body, and clients show the generic "Request failed (500)".
 */
export function handleRouteError(e: unknown, context: string): Response {
  const message = e instanceof Error ? e.message : String(e)
  // Prisma errors carry a `.code` (e.g. "P1001") separately from `.message`,
  // and the code isn't always present in the message text — check both.
  const code = (e as { code?: string } | null)?.code || ''
  console.error(`[${context}] error:`, e)

  // Prisma P1000/P1001/P1003 — cannot reach / authenticate with the database
  if (code === 'P1001' || code === 'P1003' || message.includes('P1001') || message.includes('P1003')) {
    return errorResponse(
      'Database is unreachable. Check the DATABASE_URL and that the database server is running.',
      503
    )
  }
  // Prisma P1000 — generic connection error
  if (code === 'P1000' || message.includes('P1000')) {
    return errorResponse('Database connection failed. Please try again in a few minutes.', 503)
  }
  // Prisma P2021 — table or column does not exist (schema not pushed)
  if (code === 'P2021' || message.includes('P2021')) {
    return errorResponse(
      'Database schema is out of date. The administrator needs to run `npx prisma db push` and redeploy.',
      503
    )
  }
  // Prisma P2002 — unique constraint violation
  if (code === 'P2002' || message.includes('P2002')) {
    return errorResponse('A record with this value already exists.', 409)
  }

  return errorResponse('An unexpected error occurred. Please try again later.', 500)
}
