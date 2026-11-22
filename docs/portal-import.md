# Scholars24 portal import

AttendX currently supports an account-backed CSV import for a student's own attendance export.

## Current behaviour

- Open the [Scholars24 Student View](https://portal-hd.scholars24.in/Student/Student/StudentView), sign in on the official portal yourself, and export/download an attendance report if the portal offers that option.
- In AttendX Student Dashboard, open **Portal Sync** and choose the CSV file.
- The CSV must have columns that can be identified as **Subject**, **Date**, and **Status**.
- Dates in ISO format (YYYY-MM-DD) and Indian format (DD-MM-YYYY or DD/MM/YYYY) are accepted; invalid calendar dates are rejected.
- Quoted CSV values, commas and line breaks inside quoted fields, escaped double quotes, CRLF files, and UTF-8 BOM are supported.
- Common header aliases are accepted (for example Subject Name, Course, Class Date, Attendance Date, Attendance Status).
- Exact duplicate subject/date/status rows are ignored and reported separately from invalid rows.
- The import preview shows sample rows and asks for confirmation before replacing the current account-backed import.
- Status values accepted: Present/P, Absent/A, and Late/L.
- Imported records remain separate from teacher-marked AttendX records.
- Data is stored in the AttendX database for the signed-in student on that device. It is stored on the AttendX server and is available across devices.
- Use **Export JSON** to keep a backup of imported records.

## Automatic integration

No Scholars24 student API endpoint or student API credential has been verified for this repository. Do not collect portal passwords, cookies, or session tokens in AttendX. Automatic sync must only be implemented after the college/vendor supplies documented, student-authorized read-only API access (API key or OAuth), rate limits, and a supported data format. Until then, CSV import is the supported fallback.


## Data storage and API

The student-only endpoint `/api/student/portal-import` stores one current external import per signed-in student. It validates dates, subjects and attendance statuses, caps imports at 3,000 rows, removes duplicate rows, and replaces only the student's previous external import in a database transaction. It never writes to the official AttendX `Attendance` table.

- `GET` returns the signed-in student's latest import.
- `POST` replaces that student's external import after CSRF and role checks.
- `DELETE` clears only that student's external import.

Direct Scholars24 authentication/session synchronization is not implemented yet. The portal login and authenticated data endpoints have not been verified, so AttendX must not collect or retain a Scholars24 password or session cookie. The CSV importer remains the supported fallback while a vendor-approved integration method is confirmed.

## Live integration boundary

The public Scholars24 Swagger document defines bearer-authenticated profile, course, timetable and attendance endpoints, but it does not publish a student OAuth/token issuance flow or a verified normalized response contract. AttendX therefore uses a deliberately blocked adapter:

- Connect and Sync actions report `STUDENT_AUTHORIZATION_MISSING`.
- No passwords, cookies, OTPs or portal access tokens are accepted in the browser.
- Sync failures are recorded in the `PortalSyncHistory` model.
- CSV data remains database-backed and student-owned.
- A live provider can only be enabled after the college/vendor supplies an approved student-scoped API/OAuth grant and documented response schemas.

## Server environment contract

```env
SCHOLARS24_STUDENT_SCOPED_API="true"
SCHOLARS24_API_BASE_URL="https://authorized-provider.example"
SCHOLARS24_API_BEARER_TOKEN="<server-managed-student-scoped-credential>"
```

All three values are server-only. Never expose the bearer token or commit it to Git. If live provider configuration is added, credentials must be resolved per student through an approved secret store and never reused across students.
