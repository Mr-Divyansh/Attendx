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
  return {
    available: false,
    status: 'NOT_CONFIGURED',
    code: 'STUDENT_AUTHORIZATION_MISSING',
    message:
      'Blocked: the public Swagger has no verified student OAuth/delegated grant, token expiry/refresh contract, session_guid identity mapping, or actual student attendance-record response contract. CSV import remains available.',
  }
}
