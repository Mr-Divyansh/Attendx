import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getGoogleOAuthConfig,
  OAuthConfigurationError,
} from '../src/lib/oauth.ts'

const variableNames = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'NEXT_PUBLIC_APP_URL',
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
