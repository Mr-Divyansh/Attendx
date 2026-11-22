import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePasswordPolicy } from '../src/lib/security.ts'

test('password policy accepts a strong password and enforces length and complexity', () => {
  assert.deepEqual(validatePasswordPolicy('Horizon!Lake2026'), { ok: true })
  assert.equal(validatePasswordPolicy('Short!1a').ok, false)
  assert.equal(validatePasswordPolicy('alllowercase!123').ok, false)
  assert.equal(validatePasswordPolicy('NoSpecialCharacter123').ok, false)
  assert.equal(validatePasswordPolicy(`A${'a'.repeat(126)}1!`).ok, false)
})

test('password policy rejects common passwords and account-identifying substrings', () => {
  assert.equal(validatePasswordPolicy('Password123!').ok, false)
  assert.equal(validatePasswordPolicy('Student!2026Strong', {
    email: 'student@example.com',
  }).ok, false)
  assert.equal(validatePasswordPolicy('StudentName!2026Strong', {
    name: 'Student Name',
  }).ok, false)
})
