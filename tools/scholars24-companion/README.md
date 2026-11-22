# AttendX Scholars24 Local Companion

This optional Windows companion uses a local Chromium profile to open the official Scholars24 portal and extract only visibly displayed, dated attendance rows. It never asks for or sends your Scholars24 password, OTP, CAPTCHA answer, cookies, or browser storage to AttendX.

## Setup

```powershell
npm install
npm run companion:install-browser
npm run companion:pair
npm run companion:start
```

Set `ATTENDX_COMPANION_SERVER_URL` only if AttendX runs on a non-default host:

```powershell
$env:ATTENDX_COMPANION_SERVER_URL="https://your-attendx-host.example"
npm run companion:start
```

## Usage

1. Open the AttendX Portal Sync page.
2. Generate a pairing code.
3. Run `npm run companion:pair` and enter the code.
4. Run `npm run companion:start`.
5. Use "Connect Scholars24" to queue browser login.
6. Log in manually on the official Scholars24 portal.
7. Use "Get Attendance Data"; the companion navigates only to the configured student-view URL and reads visible dated tables.

The browser profile is stored outside the repository at:

```text
%USERPROFILE%\.attendx\scholars24-browser-profile
```

The paired device secret is stored outside the repository at:

```text
%USERPROFILE%\.attendx\scholars24-companion.json
```

## Limitations

- The public Scholars24 Swagger does not document a safe student OAuth flow or a verified per-record attendance response.
- The companion imports only visible tables that can be identified as Subject + Date + Status.
- Aggregate-only layouts are reported as unsupported and are never used to fabricate attendance.
- Session validity, MFA, CAPTCHA and logout behavior are controlled by Scholars24.
- The companion requires Chromium and a logged-in local user session.

## Security

- Polling and completion endpoints require a random device secret and device ID.
- Device secrets are stored only as SHA-256 hashes on AttendX.
- Companion responses reject credential-like fields.
- Browser cookies and storage are never returned to AttendX.
- Pairing codes expire after 10 minutes and are single-use.
