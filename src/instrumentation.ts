export async function register() {
  // Validate session configuration at server startup.
  // This prevents the app from running with a missing or weak ATTENDX_SECRET.
  //
  // IMPORTANT: Next.js runs `register` in both the Node.js and Edge runtimes.
  // The auth library uses Node's `crypto`, so it must only be imported inside
  // the Node.js branch via a dynamic import — a static import at the top of
  // this file would pull `crypto` into the Edge bundle and emit build warnings.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { assertSessionConfiguration } = await import('./lib/auth')

  try {
    assertSessionConfiguration()
  } catch (error) {
    if (error instanceof Error && error.message === 'missing_session_secret') {
      console.error(
        '❌ CRITICAL: ATTENDX_SECRET environment variable is missing or empty.'
      )
      console.error('Generate one with: openssl rand -hex 32')
      console.error('Add it to your .env file or Vercel environment variables.')
      // Throwing aborts server startup (the Node.js API `process.exit` is not
      // available in the Edge Runtime, so we throw instead of exiting directly).
      throw new Error('Server startup aborted: ATTENDX_SECRET is not configured.')
    }
    if (error instanceof Error && error.message === 'weak_session_secret') {
      console.error(
        '❌ CRITICAL: ATTENDX_SECRET must be at least 32 characters long.'
      )
      console.error('Generate a stronger secret with: openssl rand -hex 32')
      throw new Error('Server startup aborted: ATTENDX_SECRET is too weak.')
    }
    throw error
  }
}