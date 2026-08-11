import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/auth'

// POST /api/auth/google — REMOVED fallback.
// This used to accept an arbitrary { name, email } and silently create a
// logged-in STUDENT session with no identity verification at all — a fake
// "Google login" that let anyone sign in as anyone. Real Google authentication
// goes through /api/auth/google/start → accounts.google.com → /api/auth/google/callback,
// which exchanges an OAuth authorization code for a verified Google profile.
export async function POST(req: NextRequest) {
  return errorResponse(
    'Use /api/auth/google/start for Google sign-in',
    400
  )
}
