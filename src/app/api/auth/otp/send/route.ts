import { NextRequest } from 'next/server'
import { sendOtp, OTP_PURPOSES, type OtpPurpose } from '@/lib/otp'
import { getClientIp } from '@/lib/authz'
import { parseBody, json, errorResponse, handleRouteError } from '@/lib/auth'

// Force Node.js runtime for crypto operations
export const runtime = 'nodejs'

// POST /api/auth/otp/send — send an OTP for a specific purpose
export async function POST(req: NextRequest) {
  try {
    const { email, purpose } = await parseBody<{
      email?: string
      purpose?: string
    }>(req)

    if (!email || !purpose) {
      return errorResponse('Email and purpose are required', 400)
    }

    if (!OTP_PURPOSES.includes(purpose as OtpPurpose)) {
      return errorResponse('Invalid purpose', 400)
    }

    const ip = getClientIp(req)
    const result = await sendOtp({
      email,
      purpose: purpose as OtpPurpose,
      ip,
    })

    return json({
      ok: true,
      maskedEmail: result.maskedEmail,
      expiresInSeconds: result.expiresInSeconds,
      retryAfterSeconds: result.retryAfterSeconds,
    })
  } catch (e) {
    return handleRouteError(e, 'auth/otp/send')
  }
}