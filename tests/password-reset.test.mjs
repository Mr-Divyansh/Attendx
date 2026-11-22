import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PASSWORD_RESET_TTL_MS,
  createPasswordResetToken,
  createPasswordResetUrl,
  hashPasswordResetToken,
  isPasswordResetTokenFormat,
  isPasswordResetUsable,
} from '../src/lib/password-reset.ts'
import { passwordResetEmailHtml } from '../src/lib/email.ts'

test('reset token is cryptographically shaped, hashed at rest, and expires after 30 minutes', () => {
  const token = createPasswordResetToken()
  assert.equal(isPasswordResetTokenFormat(token), true)
  assert.equal(token.length, 43)
  assert.equal(PASSWORD_RESET_TTL_MS, 30 * 60 * 1000)
  assert.equal(hashPasswordResetToken(token).length, 64)
  assert.notEqual(hashPasswordResetToken(token), token)
  assert.equal(hashPasswordResetToken(token), hashPasswordResetToken(token))
  assert.equal(isPasswordResetTokenFormat('too-short'), false)
  assert.equal(isPasswordResetTokenFormat(`${token}x`), false)
})

test('reset URL uses a fragment and the email includes branding and fallback instructions', () => {
  const token = createPasswordResetToken()
  const resetUrl = createPasswordResetUrl('https://attendx.example/', token, 'personal')
  assert.equal(resetUrl, `https://attendx.example/reset-password?accountType=personal#${token}`)

  const html = passwordResetEmailHtml({
    appUrl: 'https://attendx.example',
    resetUrl,
  })
  assert.match(html, /Attendx-logo\.png/)
  assert.match(html, /Reset My Password/)
  assert.match(html, /30 minutes/)
  assert.match(html, /copy this URL into your browser/)
  assert.match(html, /Privacy Policy/)
  assert.match(html, /Contact/)
  assert.match(html, /never ask you to share your password or verification link/)
})

test('reset token validation rejects expired, reused, disabled, and ambiguously owned links', () => {
  const now = new Date('2026-01-01T12:00:00Z')
  const valid = {
    usedAt: null,
    expiresAt: new Date('2026-01-01T12:30:00Z'),
    hasCollegeOwner: true,
    hasPersonalOwner: false,
    ownerDisabled: false,
    now,
  }
  assert.equal(isPasswordResetUsable(valid), true)
  assert.equal(isPasswordResetUsable({ ...valid, expiresAt: now }), false)
  assert.equal(isPasswordResetUsable({ ...valid, usedAt: now }), false)
  assert.equal(isPasswordResetUsable({ ...valid, ownerDisabled: true }), false)
  assert.equal(isPasswordResetUsable({ ...valid, hasCollegeOwner: false }), false)
  assert.equal(isPasswordResetUsable({ ...valid, hasPersonalOwner: true }), false)
})
