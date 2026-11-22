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
  assert.match(status.message, /student OAuth|delegated grant|student/i)
})

test('Scholars24 environment flags cannot fake a live-ready adapter', () => {
  process.env.SCHOLARS24_STUDENT_SCOPED_API = 'true'
  process.env.SCHOLARS24_API_BASE_URL = 'https://example.invalid'
  process.env.SCHOLARS24_API_BEARER_TOKEN = 'not-a-real-student-token'

  const status = getScholars24AdapterStatus()
  assert.equal(status.available, false)
  assert.equal(status.status, 'NOT_CONFIGURED')
})
