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

/**
 * Send a transactional email. Throws Error('EMAIL_NOT_CONFIGURED') when SMTP
 * is not set up, and other errors propagate to the caller.
 */
export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const transport = getTransporter()
  await transport.sendMail({
    from: getEmailConfig()!.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })
}
