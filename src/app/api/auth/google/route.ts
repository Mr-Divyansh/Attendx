import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  createCollegeSession,
  parseBody,
  json,
  errorResponse,
  issueCsrfToken,
  checkRateLimit,
  handleRouteError,
} from '@/lib/auth'
import { isGoogleOAuthConfigured } from '@/lib/oauth'

export async function POST(req: NextRequest) {
  try {
    if (isGoogleOAuthConfigured()) {
      return errorResponse(
        'Use /api/auth/google/start for Google sign-in when OAuth credentials are configured',
        400
      )
    }

    const { name, email, googleId } = await parseBody<{
      name?: string
      email?: string
      googleId?: string
    }>(req)

    if (!name || !email) {
      return errorResponse('Name and email are required', 400)
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`google:${ip}:${email.toLowerCase()}`)) {
      return errorResponse('Too many sign-in attempts. Please try again shortly.', 429)
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedName = name.trim()

    let user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: { student: true, authAccounts: true },
    })

    if (!user) {
      user = await db.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: null,
          role: 'STUDENT',
          student: {
            create: {
              fullName: normalizedName,
              rollNo: 'PENDING',
              hasRollNumber: true,
              profileComplete: false,
            },
          },
          authAccounts: {
            create: {
              provider: 'google',
              providerAccountId: googleId || normalizedEmail,
            },
          },
        },
        include: { student: true, authAccounts: true },
      })
    } else {
      if (user.role !== 'STUDENT') {
        return errorResponse('This account already exists for a different role', 409)
      }

      await db.authAccount.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: normalizedEmail,
          },
        },
        update: {},
        create: {
          userId: user.id,
          provider: 'google',
          providerAccountId: normalizedEmail,
        },
      })

      if (!user.student) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            student: {
              create: {
                fullName: normalizedName,
                rollNo: 'PENDING',
              },
            },
          },
          include: { student: true, authAccounts: true },
        })
      }
    }

    const student = user.student
    const needsProfile =
      !student ||
      !student.profileComplete ||
      student.rollNo === 'PENDING' ||
      !student.studentType

    await createCollegeSession({ id: user.id, email: user.email, role: 'STUDENT' })
    const csrf = await issueCsrfToken()

    return json({
      ok: true,
      needsProfile,
      user: {
        id: user.id,
        email: user.email,
        role: 'STUDENT',
        name: student?.fullName || normalizedName,
        studentId: student?.id,
        rollNo: student?.rollNo,
        semesterId: student?.semesterId,
        sectionId: student?.sectionId,
      },
      csrfToken: csrf,
    })

  } catch (e) {
    return handleRouteError(e, 'auth/google')
  }
}
