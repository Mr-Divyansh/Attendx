import { assertSessionConfiguration } from './lib/auth'

export async function register() {
  // Validate session configuration at server startup
  // This prevents the app from running with a missing or weak ATTENDX_SECRET
  try {
    assertSessionConfiguration()
  } catch (error) {
    if (error instanceof Error && error.message === 'missing_session_secret') {
      console.error(
        '❌ CRITICAL: ATTENDX_SECRET environment variable is missing or empty.'
      )
      console.error(
        'Generate one with: openssl rand -hex 32'
      )
      console.error(
        'Add it to your .env file or Vercel environment variables.'
      )
      process.exit(1)
    }
    if (error instanceof Error && error.message === 'weak_session_secret') {
      console.error(
        '❌ CRITICAL: ATTENDX_SECRET must be at least 32 characters long.'
      )
      console.error(
        'Generate a stronger secret with: openssl rand -hex 32'
      )
      process.exit(1)
    }
    throw error
  }
}