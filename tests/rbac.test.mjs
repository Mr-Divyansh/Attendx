import test from 'node:test'
import assert from 'node:assert/strict'
import { canAssignRole, canDisableAccount } from '../src/lib/rbac.ts'

test('only a Super Admin can assign supported application roles', () => {
  assert.equal(canAssignRole('SUPER_ADMIN', 'ADMIN'), true)
  assert.equal(canAssignRole('SUPER_ADMIN', 'STUDENT'), true)
  assert.equal(canAssignRole('ADMIN', 'SUPER_ADMIN'), false)
  assert.equal(canAssignRole('STUDENT', 'ADMIN'), false)
})

test('a Super Admin cannot disable another Super Admin account', () => {
  assert.equal(canDisableAccount('SUPER_ADMIN', 'ADMIN'), true)
  assert.equal(canDisableAccount('SUPER_ADMIN', 'STUDENT'), true)
  assert.equal(canDisableAccount('SUPER_ADMIN', 'SUPER_ADMIN'), false)
  assert.equal(canDisableAccount('ADMIN', 'STUDENT'), false)
})
