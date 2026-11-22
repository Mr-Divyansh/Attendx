/**
 * Scholars24 integration boundary.
 *
 * The public Swagger document defines a Bearer-authenticated API, but it does
 * not publish a student-authorized OAuth flow or a token issuance endpoint.
 * This adapter therefore remains intentionally disabled until the college or
 * Scholars24 supplies that authorization contract. No portal credentials are
 * accepted or persisted by AttendX.
 */
export type PortalAdapterStatus = {
  available: boolean
  status: 'NOT_CONFIGURED' | 'READY'
  code: 'STUDENT_AUTHORIZATION_MISSING'
  message: string
}

export function getScholars24AdapterStatus(): PortalAdapterStatus {
  const hasAuthorizedStudentAdapter =
    process.env.SCHOLARS24_STUDENT_SCOPED_API === 'true' &&
    Boolean(process.env.SCHOLARS24_API_BASE_URL?.trim()) &&
    Boolean(process.env.SCHOLARS24_API_BEARER_TOKEN?.trim())

  if (!hasAuthorizedStudentAdapter) {
    return {
      available: false,
      status: 'NOT_CONFIGURED',
      code: 'STUDENT_AUTHORIZATION_MISSING',
      message:
        'No documented, student-authorized Scholars24 API grant is configured. CSV import remains available.',
    }
  }

  return {
    available: true,
    status: 'READY',
    code: 'STUDENT_AUTHORIZATION_MISSING',
    message:
      'The server adapter is configured, but the normalized Scholars24 response contract must be supplied before live synchronization.',
  }
}
