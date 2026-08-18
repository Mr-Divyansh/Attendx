import { db } from './db'
import { AuthError, requireRole, type SessionUser } from './auth'

// ───────────────────────────────────────────────────────────
// AttendX — authorization helpers
//
// Every route that touches a resource owned by a teacher or a classroom
// must re-derive ownership from the database. Never trust client-supplied
// ids/role claims.
// ───────────────────────────────────────────────────────────

/** Require an ADMIN session (role + admin profile row). */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireRole('ADMIN')
  const admin = await db.admin.findUnique({ where: { userId: session.id } })
  if (!admin) {
    throw new AuthError('Forbidden', 403)
  }
  return session
}

/** Require a TEACHER session (role + teacher profile row). */
export async function requireTeacher(): Promise<SessionUser> {
  const session = await requireRole('TEACHER')
  if (!session.teacherId) {
    throw new AuthError('Teacher profile not found', 403)
  }
  return session
}

/** Require a STUDENT session (role + student profile row). */
export async function requireStudent(): Promise<SessionUser> {
  const session = await requireRole('STUDENT')
  if (!session.studentId) {
    throw new AuthError('Student profile not found', 403)
  }
  return session
}

/**
 * Load a classroom and assert the acting teacher owns it (or the acting
 * admin may manage it). Returns the classroom row for reuse.
 */
export async function assertTeacherOwnsClassroom(
  session: SessionUser,
  classroomId: string
) {
  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    include: { teacher: true },
  })
  if (!classroom) {
    throw new AuthError('Classroom not found', 404)
  }
  if (session.role === 'ADMIN') return classroom
  if (
    session.role !== 'TEACHER' ||
    !session.teacherId ||
    classroom.teacherId !== session.teacherId
  ) {
    throw new AuthError('You do not have access to this classroom', 403)
  }
  return classroom
}

/** Assert the acting student is an active member of the classroom. */
export async function assertStudentIsMember(
  session: SessionUser,
  classroomId: string
) {
  if (session.role !== 'STUDENT' || !session.studentId) {
    throw new AuthError('Forbidden', 403)
  }
  const membership = await db.classroomMember.findUnique({
    where: {
      classroomId_studentId: {
        classroomId,
        studentId: session.studentId,
      },
    },
  })
  if (!membership || membership.status !== 'ACTIVE') {
    throw new AuthError('You are not a member of this classroom', 403)
  }
  return membership
}

/** Best-effort client IP extraction (for rate limiting + audit logs). */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}
