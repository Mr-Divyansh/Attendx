import { db } from './db'
import type { SessionUser } from './auth'

// ───────────────────────────────────────────────────────────
// AttendX — audit logging
// ───────────────────────────────────────────────────────────

export type AuditEntry = {
  action: string
  actorId?: string | null
  actorRole?: SessionUser['role'] | null
  targetType?: string | null
  targetId?: string | null
  details?: Record<string, unknown> | null
  ip?: string | null
}

/**
 * Write an audit log row. Never throws — an audit failure must not break the
 * underlying operation (the operation still happened; the log is best-effort).
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        details: (entry.details as object | null) ?? undefined,
        ip: entry.ip ?? null,
      },
    })
  } catch (e) {
    console.error(`[audit] failed to write audit log for "${entry.action}":`, e)
  }
}

/** Convenience: audit an admin action from a session + request. */
export async function logAdminAction(
  session: SessionUser,
  req: Request,
  action: string,
  extra: Omit<AuditEntry, 'action' | 'actorId' | 'actorRole' | 'ip'> = {}
) {
  await logAudit({
    action,
    actorId: session.id,
    actorRole: 'ADMIN',
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    ...extra,
  })
}
