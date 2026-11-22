# Scholars24 portal import

AttendX currently supports a browser-local CSV import for a student's own attendance export.

## Current behaviour

- Open the [Scholars24 Student View](https://portal-hd.scholars24.in/Student/Student/StudentView), sign in on the official portal yourself, and export/download an attendance report if the portal offers that option.
- In AttendX Student Dashboard, open **Portal Sync** and choose the CSV file.
- The CSV must have columns that can be identified as **Subject**, **Date**, and **Status**.
- Dates in ISO format (YYYY-MM-DD) and Indian format (DD-MM-YYYY or DD/MM/YYYY) are accepted.
- Status values accepted: Present/P, Absent/A, and Late/L.
- Imported records remain separate from teacher-marked AttendX records.
- Data is stored in browser localStorage for the signed-in student on that device. It is not uploaded to the AttendX server and is not automatically shared across devices.
- Use **Export JSON** to keep a backup of imported records.

## Automatic integration

No Scholars24 student API endpoint or student API credential has been verified for this repository. Do not collect portal passwords, cookies, or session tokens in AttendX. Automatic sync must only be implemented after the college/vendor supplies documented, student-authorized read-only API access (API key or OAuth), rate limits, and a supported data format. Until then, CSV import is the supported fallback.
