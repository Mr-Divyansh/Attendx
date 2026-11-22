import test from 'node:test'
import assert from 'node:assert/strict'
import { getScholars24AdapterStatus } from '../src/lib/scholars24-adapter.ts'

test('Scholars24 live adapter is blocked until explicitly student-authorized', () => {
  delete process.env.SCHOLARS24_STUDENT_SCOPED_API
  delete process.env.SCHOLARS24_API_BASE_URL
  delete process.env.SCHOLARS24_API_BEARER_TOKEN

  const status = getScholars24AdapterStatus()
  assert.equal(status.available, false)
  assert.equal(status.status, 'NOT_CONFIGURED')
  assert.equal(status.code, 'STUDENT_AUTHORIZATION_MISSING')
  assert.match(status.message, /student-authorized/i)
})
