import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

// ───────────────────────────────────────────────────────────
// AttendX — transactional email (Gmail SMTP via Nodemailer)
//
// Configure via SMTP_* env vars (see .env.example + README for the
// Gmail App Password walkthrough). No transporter is created until the
// first send, and every send fails closed (throws) if mail is not
// configured — callers translate that into a friendly 503.
// ───────────────────────────────────────────────────────────

let transporter: Transporter | null = null

export type EmailConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

export function getEmailConfig(): EmailConfig | null {
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  if (!user || !pass) return null
  return {
    host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user,
    pass,
    from: process.env.SMTP_FROM?.trim() || user,
  }
}

export function getCanonicalAppUrl(): string {
  const configured = process.env.ATTENDX_APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!configured) {
    if (process.env.NODE_ENV === 'production') throw new Error('APP_URL_NOT_CONFIGURED')
    return 'http://localhost:3000'
  }

  const url = new URL(configured)
  const isLocalDevelopment =
    process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname)
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' && !(isLocalDevelopment && url.protocol === 'http:'))
  ) {
    throw new Error('APP_URL_INVALID')
  }
  return url.origin
}

function getTransporter(): Transporter {
  const config = getEmailConfig()
  if (!config) {
    throw new Error('EMAIL_NOT_CONFIGURED')
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    })
  }
  return transporter
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  const maskedLocal = `${visible}${'*'.repeat(Math.max(1, local.length - 2))}`
  return `${maskedLocal}@${domain}`
}

export function otpEmailHtml(opts: {
  code: string
  purposeLabel: string
  expiresInMinutes: number
  appUrl: string
}): string {
  const { code, purposeLabel, expiresInMinutes, appUrl } = opts
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify your email — AttendX</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e9ef;">
            <tr>
              <td style="background-color:#2563eb;padding:24px 32px;text-align:center;">
                <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">AttendX</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Verify your email</h1>
                <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
                  Use the code below to ${purposeLabel}. It expires in ${expiresInMinutes} minutes.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;border-radius:8px;padding:20px;">
                  <tr>
                    <td align="center">
                      <span style="font-size:32px;font-weight:700;letter-spacing:10px;color:#0f172a;font-family:Consolas,Menlo,monospace;">${code}</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                  If you didn't request this code, you can safely ignore this email.
                  Never share this code with anyone — AttendX staff will never ask for it.
                </p>
                <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
                  &copy; ${new Date().getFullYear()} AttendX &middot; <a href="${appUrl}" style="color:#2563eb;text-decoration:none;">${appUrl}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (character) => entities[character])
}

export function passwordResetEmailHtml(opts: {
  resetUrl: string
  appUrl: string
}): string {
  const resetUrl = escapeHtml(opts.resetUrl)
  const appUrl = escapeHtml(opts.appUrl)
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Your AttendX Password</title>
  </head>
  <body style="margin:0;padding:24px 12px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid #e3e8ef;border-radius:16px;background:#fff;overflow:hidden;">
          <tr><td style="padding:24px 32px;border-bottom:1px solid #edf0f4;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;padding-right:12px;"><img src="${appUrl}/Attendx-logo.png" width="42" height="42" alt="AttendX logo" style="display:block;border:0;object-fit:contain;" /></td>
              <td style="vertical-align:middle;font-size:21px;font-weight:700;letter-spacing:-0.4px;color:#172033;">AttendX</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:14px;color:#475569;">Hello,</p>
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#172033;">Reset your password</h1>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#475569;">We received a request to reset the password associated with your AttendX account.</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569;">If you requested this change, click the secure button below to create a new password.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr><td align="center" style="border-radius:9px;background:#3458c8;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 24px;border:1px solid #3458c8;border-radius:9px;color:#fff;text-decoration:none;font-size:15px;font-weight:700;">Reset My Password</a>
            </td></tr></table>
            <p style="margin:0 0 16px;font-size:13px;line-height:1.7;color:#64748b;">This secure link will expire in 30 minutes and can only be used once.</p>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#64748b;">If the button does not work, copy this URL into your browser:</p>
            <p style="margin:0 0 24px;word-break:break-all;font-size:12px;line-height:1.7;color:#3458c8;">${resetUrl}</p>
            <div style="padding:16px;border:1px solid #e7ebf0;border-radius:10px;background:#f8fafc;">
              <p style="margin:0;font-size:13px;line-height:1.7;color:#475569;">If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.</p>
            </div>
            <p style="margin:20px 0 0;font-size:12px;line-height:1.7;color:#64748b;">For your security, AttendX will never ask you to share your password or verification link.</p>
            <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#475569;">Regards,<br /><strong style="color:#172033;">The AttendX Security Team</strong></p>
          </td></tr>
          <tr><td style="padding:18px 32px;border-top:1px solid #edf0f4;background:#fafbfc;">
            <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">&copy; ${new Date().getFullYear()} AttendX
              &nbsp;·&nbsp; <a href="${appUrl}/privacy" style="color:#3458c8;text-decoration:none;">Privacy Policy</a>
              &nbsp;·&nbsp; <a href="${appUrl}/contact" style="color:#3458c8;text-decoration:none;">Contact</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export function passwordChangedEmailHtml(appUrl: string): string {
  const safeAppUrl = escapeHtml(appUrl)
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>AttendX password changed</title></head>
<body style="margin:0;padding:24px 12px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid #e3e8ef;border-radius:16px;background:#fff;">
      <tr><td style="padding:28px 32px;">
        <p style="margin:0 0 18px;font-size:21px;font-weight:700;color:#172033;">AttendX</p>
        <h1 style="font-size:22px;color:#172033;">Your password was changed</h1>
        <p style="font-size:15px;line-height:1.7;color:#475569;">The password for your AttendX account was updated. All existing sessions have been signed out.</p>
        <p style="font-size:13px;line-height:1.7;color:#64748b;">If you did not make this change, contact AttendX support immediately.</p>
        <p style="margin-top:24px;font-size:13px;"><a href="${safeAppUrl}/contact" style="color:#3458c8;">Contact AttendX</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

/**
 * Send a transactional email. Throws Error('EMAIL_NOT_CONFIGURED') when SMTP
 * is not set up, and other errors propagate to the caller.
 */
export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  const transport = getTransporter()
  await transport.sendMail({
    from: getEmailConfig()!.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  })
}

export async function sendPasswordChangedNotification(to: string): Promise<void> {
  const appUrl = getCanonicalAppUrl()
  await sendEmail({
    to,
    subject: 'Your AttendX password was changed',
    html: passwordChangedEmailHtml(appUrl),
    text: 'Your AttendX password was changed. All existing sessions have been signed out. If you did not make this change, contact AttendX support immediately.',
  })
}
