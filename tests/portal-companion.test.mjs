import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPortalPairingCode,
  createPortalDeviceSecret,
  hashPortalCompanionSecret,
  getBearerSecret,
} from '../src/lib/portal-companion.ts'

test('pairing codes are eight digits', () => {
  for (let index = 0; index < 20; index += 1) {
    assert.match(createPortalPairingCode(), /^\d{8}$/)
  }
})

test('device secrets are generated and only hashed for storage', () => {
  const secret = createPortalDeviceSecret()
  assert.ok(secret.length >= 40)
  const hash = hashPortalCompanionSecret(secret)
  assert.equal(hash.length, 64)
  assert.notEqual(hash, secret)
})

test('Bearer authentication extracts only the secret value', () => {
  const request = new Request('https://example.test', {
    headers: { Authorization: 'Bearer test-device-secret' },
  })
  assert.equal(getBearerSecret(request), 'test-device-secret')
})
