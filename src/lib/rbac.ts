export type RbacRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT'

export function canAssignRole(actorRole: RbacRole, targetRole: RbacRole): boolean {
  if (actorRole !== 'SUPER_ADMIN') return false
  return ['SUPER_ADMIN', 'ADMIN', 'STUDENT'].includes(targetRole)
}

export function canDisableAccount(actorRole: RbacRole, targetRole: RbacRole): boolean {
  if (actorRole !== 'SUPER_ADMIN') return false
  return targetRole !== 'SUPER_ADMIN'
}
