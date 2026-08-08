import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, parseBody, json, errorResponse, AuthError, validateCsrfToken } from '@/lib/auth'
import { getMinimumAttendancePercentage, setMinimumAttendancePercentage } from '@/lib/config'

export async function GET() {
  try {
    await requireRole('ADMIN')
    const minimumAttendancePercentage = await getMinimumAttendancePercentage()
    return json({ minimumAttendancePercentage })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to load settings', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    if (!(await validateCsrfToken(req.headers.get('x-csrf-token') || undefined))) {
      throw new AuthError('Invalid or missing CSRF token', 403)
    }

    const body = await parseBody<{ minimumAttendancePercentage?: number }>(req)
    if (body.minimumAttendancePercentage == null) {
      return errorResponse('minimumAttendancePercentage is required', 400)
    }

    await setMinimumAttendancePercentage(body.minimumAttendancePercentage)
    return json({
      ok: true,
      minimumAttendancePercentage: await getMinimumAttendancePercentage(),
    })
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    return errorResponse('Unable to save settings', 500)
  }
}
