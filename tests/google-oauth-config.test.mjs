import test from 'node:test'
import assert from 'node:assert/strict'
import {
  exchangeGoogleCode,
  getGoogleOAuthConfig,
  OAuthConfigurationError,
  signOAuthState,
  validateGoogleOAuthCallback,
  verifyOAuthState,
} from '../src/lib/oauth.ts'

const variableNames = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'NEXT_PUBLIC_APP_URL',
  'ATTENDX_SECRET',
  'VERCEL_ENV',
  'VERCEL_URL',
  'VERCEL_BRANCH_URL',
]

function withOAuthEnvironment(values, run) {
  const previous = Object.fromEntries(
    variableNames.map((name) => [name, process.env[name]])
  )

  for (const name of variableNames) delete process.env[name]
  Object.assign(process.env, values)

  try {
    run()
  } finally {
    for (const name of variableNames) {
      if (previous[name] === undefined) delete process.env[name]
      else process.env[name] = previous[name]
    }
  }
}

function request(url) {
  return { url }
}

test('Preview OAuth stays on the validated Preview hostname', () => {
  withOAuthEnvironment({
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'https://attendx.example/api/auth/google/callback',
    NEXT_PUBLIC_APP_URL: 'https://attendx.example',
    VERCEL_ENV: 'preview',
    VERCEL_URL: 'attendxd-rk41nk897-mr-divyanshs-projects.vercel.app',
    VERCEL_BRANCH_URL: 'attendxd-git-feature-mr-divyanshs-projects.vercel.app',
  }, () => {
    const config = getGoogleOAuthConfig(
      request('https://attendxd-git-feature-mr-divyanshs-projects.vercel.app/api/auth/google/start')
    )

    assert.equal(
      config.callbackUrl,
      'https://attendxd-git-feature-mr-divyanshs-projects.vercel.app/api/auth/google/callback'
    )
    assert.equal(
      config.appUrl,
      'https://attendxd-git-feature-mr-divyanshs-projects.vercel.app'
    )
  })
})

test('Preview OAuth rejects an unrecognized request hostname', () => {
  withOAuthEnvironment({
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    VERCEL_ENV: 'preview',
    VERCEL_URL: 'attendxd-rk41nk897-mr-divyanshs-projects.vercel.app',
  }, () => {
    assert.throws(
      () => getGoogleOAuthConfig(request('https://untrusted.example/api/auth/google/start')),
      (error) => error instanceof OAuthConfigurationError && error.code === 'invalid_callback_url'
    )
  })
})

test('Production OAuth continues to use its explicitly configured URLs', () => {
  withOAuthEnvironment({
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'https://attendx.example/api/auth/google/callback',
    NEXT_PUBLIC_APP_URL: 'https://attendx.example',
    VERCEL_ENV: 'production',
    VERCEL_URL: 'attendx-production.vercel.app',
  }, () => {
    const config = getGoogleOAuthConfig(request('https://attendx-production.vercel.app/api/auth/google/start'))

    assert.equal(config.callbackUrl, 'https://attendx.example/api/auth/google/callback')
    assert.equal(config.appUrl, 'https://attendx.example')
  })
})

test('a Preview request cannot override the configured Production callback', () => {
  withOAuthEnvironment({
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'https://attendx.example/api/auth/google/callback',
    NEXT_PUBLIC_APP_URL: 'https://attendx.example',
    VERCEL_ENV: 'production',
    VERCEL_URL: 'attendx-production.vercel.app',
  }, () => {
    const config = getGoogleOAuthConfig(
      request('https://attendxd-preview.vercel.app/api/auth/google/start')
    )

    assert.equal(config.callbackUrl, 'https://attendx.example/api/auth/google/callback')
    assert.equal(config.appUrl, 'https://attendx.example')
  })
})

test('OAuth state is signed, verified, and rejects tampering', () => {
  withOAuthEnvironment({
    ATTENDX_SECRET: 'test-secret-with-at-least-32-characters',
  }, () => {
    const state = signOAuthState({ role: 'STUDENT', nonce: 'random-nonce' })
    assert.deepEqual(verifyOAuthState(state), { role: 'STUDENT', nonce: 'random-nonce' })
    assert.equal(verifyOAuthState(`${state}tampered`), null)
  })
})

test('callback validation returns safe errors and requires matching signed state', () => {
  withOAuthEnvironment({
    ATTENDX_SECRET: 'test-secret-with-at-least-32-characters',
  }, () => {
    const state = signOAuthState({ role: 'TEACHER', nonce: 'random-nonce' })

    assert.deepEqual(validateGoogleOAuthCallback({
      code: null,
      state: null,
      cookieState: undefined,
      providerError: 'access_denied',
    }), { ok: false, error: 'access_denied' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: null,
      state: null,
      cookieState: undefined,
      providerError: 'redirect_uri_mismatch',
    }), { ok: false, error: 'redirect_uri_mismatch' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: null,
      state: null,
      cookieState: undefined,
      providerError: null,
    }), { ok: false, error: 'missing_code' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: 'code',
      state,
      cookieState: 'different-state',
      providerError: null,
    }), { ok: false, error: 'invalid_state' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: 'code',
      state,
      cookieState: state,
      providerError: null,
    }), { ok: true, code: 'code', role: 'TEACHER' })
  })
})

test('token exchange categorizes Google client and authorization errors safely', async () => {
  const originalFetch = globalThis.fetch
  const config = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    callbackUrl: 'https://attendx.example/api/auth/google/callback',
    appUrl: 'https://attendx.example',
  }

  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify({ error: 'invalid_client' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
    await assert.rejects(
      exchangeGoogleCode('fake-code', config),
      { message: 'GOOGLE_CLIENT_CONFIGURATION_REJECTED' }
    )

    globalThis.fetch = async () => new Response(
      JSON.stringify({ error: 'invalid_grant' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
    await assert.rejects(
      exchangeGoogleCode('fake-code', config),
      { message: 'GOOGLE_AUTHORIZATION_CODE_REJECTED' }
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
