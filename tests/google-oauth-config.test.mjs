import test from 'node:test'
import assert from 'node:assert/strict'
import {
  exchangeGoogleCode,
  getGoogleProviderErrorCategory,
  getGoogleOAuthConfig,
  GoogleTokenExchangeError,
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

test('Preview OAuth uses its stable branch alias from unique deployment URLs', () => {
  withOAuthEnvironment({
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    VERCEL_ENV: 'preview',
    VERCEL_URL: 'attendxd-m95yryaw4-mr-divyanshs-projects.vercel.app',
    VERCEL_BRANCH_URL: 'attendxd-git-feat-scholars24-produ-14aeb0-mr-divyanshs-projects.vercel.app',
  }, () => {
    const config = getGoogleOAuthConfig(
      request('https://attendxd-m95yryaw4-mr-divyanshs-projects.vercel.app/api/auth/google/start')
    )

    assert.equal(
      config.callbackUrl,
      'https://attendxd-git-feat-scholars24-produ-14aeb0-mr-divyanshs-projects.vercel.app/api/auth/google/callback'
    )
    assert.equal(
      config.appUrl,
      'https://attendxd-git-feat-scholars24-produ-14aeb0-mr-divyanshs-projects.vercel.app'
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
    }), { ok: false, error: 'access_denied', stateValidation: 'not_checked' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: null,
      state: null,
      cookieState: undefined,
      providerError: 'redirect_uri_mismatch',
    }), { ok: false, error: 'redirect_uri_mismatch', stateValidation: 'not_checked' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: null,
      state: null,
      cookieState: undefined,
      providerError: null,
    }), { ok: false, error: 'missing_state', stateValidation: 'missing_state' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: 'code',
      state: null,
      cookieState: undefined,
      providerError: null,
    }), { ok: false, error: 'missing_state', stateValidation: 'missing_state' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: null,
      state,
      cookieState: state,
      providerError: null,
    }), { ok: false, error: 'missing_code', stateValidation: 'valid' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: 'code',
      state,
      cookieState: undefined,
      providerError: null,
    }), { ok: false, error: 'invalid_state', stateValidation: 'missing_cookie' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: 'code',
      state,
      cookieState: 'different-state',
      providerError: null,
    }), { ok: false, error: 'invalid_state', stateValidation: 'mismatch' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: 'code',
      state: `${state}tampered`,
      cookieState: `${state}tampered`,
      providerError: null,
    }), { ok: false, error: 'invalid_state', stateValidation: 'invalid_signature' })
    assert.deepEqual(validateGoogleOAuthCallback({
      code: 'code',
      state,
      cookieState: state,
      providerError: null,
    }), { ok: true, code: 'code', role: 'TEACHER', stateValidation: 'valid' })
  })
})

test('provider error logging categories never preserve unknown provider text', () => {
  assert.equal(getGoogleProviderErrorCategory('interaction_required'), 'interaction_required')
  assert.equal(getGoogleProviderErrorCategory('provider-detail-with-sensitive-data'), 'other')
  assert.equal(getGoogleProviderErrorCategory(null), null)
})

test('token exchange diagnostics record status without logging secrets or codes', async () => {
  const originalFetch = globalThis.fetch
  const originalWarn = console.warn
  const logContexts = []
  const config = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    callbackUrl: 'https://attendx.example/api/auth/google/callback',
    appUrl: 'https://attendx.example',
  }

  try {
    console.warn = (_label, context) => logContexts.push(context)
    globalThis.fetch = async () => new Response(
      JSON.stringify({ error: 'invalid_grant' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
    await assert.rejects(exchangeGoogleCode('test-authorization-code', config))

    assert.ok(logContexts.some((context) =>
      context.stage === 'token_exchange_response' &&
      context.category === 'GOOGLE_AUTHORIZATION_CODE_REJECTED' &&
      context.tokenExchangeStatus === 400
    ))
    const serialized = JSON.stringify(logContexts)
    assert.equal(serialized.includes('test-client-secret'), false)
    assert.equal(serialized.includes('test-authorization-code'), false)
  } finally {
    globalThis.fetch = originalFetch
    console.warn = originalWarn
  }
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
      (error) => error instanceof GoogleTokenExchangeError &&
        error.category === 'GOOGLE_CLIENT_CONFIGURATION_REJECTED' &&
        error.status === 401
    )

    globalThis.fetch = async () => new Response(
      JSON.stringify({ error: 'invalid_grant' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
    await assert.rejects(
      exchangeGoogleCode('fake-code', config),
      (error) => error instanceof GoogleTokenExchangeError &&
        error.category === 'GOOGLE_AUTHORIZATION_CODE_REJECTED' &&
        error.status === 400
    )

    globalThis.fetch = async () => {
      throw new Error('network details are not exposed')
    }
    await assert.rejects(
      exchangeGoogleCode('fake-code', config),
      (error) => error instanceof GoogleTokenExchangeError &&
        error.category === 'GOOGLE_TOKEN_EXCHANGE_FAILED' &&
        error.status === null
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('a valid OAuth callback exchanges its code and returns verified profile data', async () => {
  const originalFetch = globalThis.fetch
  const config = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    callbackUrl: 'https://attendx.example/api/auth/google/callback',
    appUrl: 'https://attendx.example',
  }
  const calls = []

  try {
    globalThis.fetch = async (url) => {
      calls.push(String(url))
      if (String(url) === 'https://oauth2.googleapis.com/token') {
        return new Response(JSON.stringify({ access_token: 'test-access-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({
        sub: 'google-subject',
        email: 'STUDENT@example.com',
        email_verified: true,
        name: 'Student',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let validation
    withOAuthEnvironment({
      ATTENDX_SECRET: 'test-secret-with-at-least-32-characters',
    }, () => {
      const state = signOAuthState({ role: 'STUDENT', nonce: 'random-nonce' })
      validation = validateGoogleOAuthCallback({
        code: 'test-authorization-code',
        state,
        cookieState: state,
        providerError: null,
      })
    })
    assert.deepEqual(validation, {
      ok: true,
      code: 'test-authorization-code',
      role: 'STUDENT',
      stateValidation: 'valid',
    })

    const profile = await exchangeGoogleCode(validation.code, config)
    assert.deepEqual(profile, {
      sub: 'google-subject',
      email: 'student@example.com',
      name: 'Student',
      picture: undefined,
    })
    assert.deepEqual(calls, [
      'https://oauth2.googleapis.com/token',
      'https://www.googleapis.com/oauth2/v3/userinfo',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})
