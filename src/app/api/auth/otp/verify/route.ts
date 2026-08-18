import { NextRequest } from 'next/server'
import { verifyOtp, OTP_PURPOSES, type OtpPurpose } from '@/lib/otp'
import { getClientIp } from '@/lib/authz'
import { parseBody, json, errorResponse, handleRouteError } from '@/lib/auth'

// Force Node.js runtime for crypto operations
export const runtime = 'nodejs'

// POST /api/auth/otp/verify — verify an OTP for a specific purpose
export async function POST(req: NextRequest) {
  try {
    const { email, purpose, code } = await parseBody<{
      email?: string
      purpose?: string
      code?: string
    }>(req)

    if (!email || !purpose || !code) {
      return errorResponse('Email, purpose, and code are required', 400)
    }

    if (!OTP_PURPOSES.includes(purpose as OtpPurpose)) {
      return errorResponse('Invalid purpose', 400)
    }

    const ip = getClientIp(req)
    const result = await verifyOtp({
      email,
      purpose: purpose as OtpPurpose,
      code,
      ip,
    })

    return json({
      ok: true,
      ticket: result.ticket,
      maskedEmail: result.maskedEmail,
    })
  } catch (e) {
    return handleRouteError(e, 'auth/otp/verify')
  }
}