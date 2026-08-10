import nodemailer from 'nodemailer'
import { BRAND } from '@/config/brand'

interface SmtpConfig {
  host?: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

function getSmtpConfig(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST || undefined,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.SMTP_FROM || `${BRAND.companyName} <${BRAND.supportEmail}>`
  }
}

export function isSmtpConfigured(): boolean {
  const cfg = getSmtpConfig()
  return Boolean(cfg.host && cfg.user)
}

/**
 * Sends a password reset code. When SMTP is not configured (e.g. local dev),
 * the code is logged to the server console so the flow can be tested end-to-end.
 */
export async function sendPasswordResetEmail(
  to: string,
  otp: string,
  expiresInMinutes: number,
  customerName?: string
): Promise<void> {
  const cfg = getSmtpConfig()

  if (!cfg.host || !cfg.user) {
    console.log(
      `[email:dev] Password reset code for ${to}: ${otp} (expires in ${expiresInMinutes} minutes). ` +
        'Set SMTP_HOST/SMTP_USER/SMTP_PASS to send real email.'
    )
    return
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  })

  const name = customerName ? ` ${customerName}` : ''
  const subject = `${BRAND.companyName} — Reset your password`
  const text = `Hi${name},

We received a request to reset the password for your ${BRAND.companyName} account.

Your verification code is: ${otp}

This code expires in ${expiresInMinutes} minutes. If you didn't request this, you can safely ignore this email.

If you need help, contact us at ${BRAND.supportEmail}.

— The ${BRAND.companyName} Team`

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1917;">
      <h2 style="color:#2d5a3d;">${BRAND.companyName}</h2>
      <p>Hi${name},</p>
      <p>We received a request to reset the password for your ${BRAND.companyName} account.</p>
      <div style="margin:24px 0;padding:20px;background:#f2f5ee;border-radius:12px;text-align:center;">
        <div style="font-size:12px;color:#6d6a63;text-transform:uppercase;letter-spacing:0.1em;">Your verification code</div>
        <div style="font-size:36px;font-weight:700;letter-spacing:0.35em;color:#2d5a3d;margin-top:8px;">${otp}</div>
      </div>
      <p style="font-size:14px;color:#6d6a63;">This code expires in ${expiresInMinutes} minutes. If you didn't request this, you can safely ignore this email.</p>
      <p style="font-size:14px;color:#6d6a63;">If you need help, contact us at <a href="mailto:${BRAND.supportEmail}" style="color:#2d5a3d;">${BRAND.supportEmail}</a>.</p>
      <p style="font-size:12px;color:#a8a39b;margin-top:32px;">— The ${BRAND.companyName} Team</p>
    </div>`

  await transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html
  })
}
