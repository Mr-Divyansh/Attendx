import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Restrict browser features the app does not use.
// Each entry is `feature=()` meaning "denied for this document and all
// same-origin child frames".
// See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'ambient-light-sensor=()',
  'autoplay=()',
  'battery=()',
  'bluetooth=()',
  'browsing-topics=()',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=()',
  'gamepad=()',
  'geolocation=()',
  'gyroscope=()',
  'hid=()',
  'idle-detection=()',
  'interest-cohort=()',
  'local-fonts=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'otp-credentials=()',
  'payment=()',
  'picture-in-picture=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'serial=()',
  'speaker-selection=()',
  'storage-access=()',
  'sync-xhr=()',
  'usb=()',
  'web-share=()',
  'window-management=()',
  'xr-spatial-tracking=()',
].join(', ')

export function proxy(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'

  // Per-request CSP nonce. Next.js applies it to its own inline scripts
  // (RSC bootstrap / hydration) and we pass it to next-themes' inline script.
  const nonce = crypto.randomUUID()

  // Make the nonce available to the server render (the root layout reads it
  // via headers() and forwards it to next-themes).
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Strict-Transport-Security (HSTS) - only in production with HTTPS
  if (isProduction) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy: deny unused browser features
  response.headers.set('Permissions-Policy', PERMISSIONS_POLICY)

  // Content Security Policy
  // - script-src uses a per-request nonce (no unsafe-inline / unsafe-eval).
  // - style-src keeps 'unsafe-inline' because recharts/next-themes inject
  //   inline <style> and style attributes at runtime (nonces/hashes cannot
  //   cover style attributes).
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspDirectives)

  // Remove X-Powered-By header
  response.headers.delete('x-powered-by')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
