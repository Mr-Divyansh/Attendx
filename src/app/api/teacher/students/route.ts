import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, json, errorResponse, AuthError } from '@/lib/auth'

// GET /api/teacher/students?sectionId= — students in that section ordered by rollNo.
// Returns [{ id, rollNo, fullName }].
export async function GET(req: NextRequest) {
  try {
    await requireRole('TEACHER')
    const sectionId = req.nextUrl.searchParams.get('sectionId')
    if (!sectionId) return errorResponse('sectionId is required', 400)

    const students = await db.student.findMany({
      where: { sectionId },
      orderBy: { rollNo: 'asc' },
      select: { id: true, rollNo: true, fullName: true },
    })
    return json(students)
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status)
    throw e
  }
}
