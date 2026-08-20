import nodemailer, { Transporter, SendMailOptions } from 'nodemailer'
import { BRAND } from '@/config/brand'

interface SmtpConfig {
  host?: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

const IMAP_POP3_PORTS = new Set([110, 143, 993, 995])
const VALID_SMTP_PORTS = new Set([25, 465, 587, 2525, 2526, 25025])

type ErrorLike = { message?: unknown; code?: unknown }

function readErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const obj = err as ErrorLike
    if (typeof obj.message === 'string') return obj.message
  }
  return String(err)
}

function getSmtpConfig(): SmtpConfig {
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = process.env.SMTP_SECURE === 'true'
  return {
    host: process.env.SMTP_HOST || undefined,
    port,
    secure,
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.SMTP_FROM || `${BRAND.companyName} <${BRAND.supportEmail}>`
  }
}

export function validateSmtpConfig(cfg: SmtpConfig): { ok: true } | { ok: false; reason: string; hint?: string } {
  if (!cfg.host) return { ok: false, reason: 'SMTP_HOST is not set.' }
  if (!cfg.user) return { ok: false, reason: 'SMTP_USER is not set.' }
  if (!cfg.pass) return { ok: false, reason: 'SMTP_PASS is not set.' }
  if (!Number.isFinite(cfg.port) || cfg.port <= 0 || cfg.port > 65535) {
    return { ok: false, reason: `SMTP_PORT "${cfg.port}" is not a valid port number.` }
  }
  if (IMAP_POP3_PORTS.has(cfg.port)) {
    return {
      ok: false,
      reason: `SMTP_PORT is set to ${cfg.port}, which is an IMAP/POP3 mail-reading port, not an SMTP mail-sending port.`,
      hint: cfg.secure ? 'Use port 465 (SMTP/SSL) and keep SMTP_SECURE=true.' : 'Use port 587 (SMTP+STARTTLS) and set SMTP_SECURE=false.'
    }
  }
  if (!VALID_SMTP_PORTS.has(cfg.port)) {
    return {
      ok: false,
      reason: `SMTP_PORT ${cfg.port} is not a standard SMTP port.`,
      hint: 'Standard SMTP ports are 465 (SSL), 587 (STARTTLS), or 25 (plain). If your host uses a non-standard port, verify with your email provider.'
    }
  }
  if (cfg.secure && cfg.port === 587) {
    return {
      ok: false,
      reason: 'SMTP_SECURE=true is incompatible with port 587.',
      hint: 'Port 587 uses STARTTLS (not implicit SSL). Either set SMTP_SECURE=false for port 587, or switch to port 465 with SMTP_SECURE=true.'
    }
  }
  if (!cfg.secure && cfg.port === 465) {
    return {
      ok: false,
      reason: 'SMTP_SECURE=false is incompatible with port 465.',
      hint: 'Port 465 requires implicit SSL (SMTPS). Set SMTP_SECURE=true for port 465, or use port 587 with SMTP_SECURE=false.'
    }
  }
  return { ok: true }
}

export function isSmtpConfigured(): boolean {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  return v.ok
}

let cachedTransporter: { cfg: SmtpConfig; instance: Transporter } | null = null

function getOrCreateTransporter(cfg: SmtpConfig): Transporter {
  if (
    cachedTransporter &&
    cachedTransporter.cfg.host === cfg.host &&
    cachedTransporter.cfg.port === cfg.port &&
    cachedTransporter.cfg.secure === cfg.secure &&
    cachedTransporter.cfg.user === cfg.user &&
    cachedTransporter.cfg.pass === cfg.pass
  ) {
    return cachedTransporter.instance
  }
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
  cachedTransporter = { cfg, instance: transporter }
  return transporter
}

function extractFromAddress(from: string): string {
  const m = from.match(/<([^>]+)>/)
  return m ? m[1].trim() : from.trim()
}

function extractDomain(email: string): string {
  const at = email.indexOf('@')
  return at >= 0 ? email.slice(at + 1).toLowerCase() : ''
}

/**
 * Builds the standard set of deliverability headers that Gmail / Outlook /
 * Yahoo spam filters look for on transactional mail. Without List-Unsubscribe
 * and a proper Message-ID, deliverability degrades noticeably.
 */
function buildDeliverabilityHeaders(cfg: SmtpConfig, recipient: string, kind: 'reset' | 'order' | 'generic') {
  const envelope = extractFromAddress(cfg.from)
  const domain = extractDomain(envelope) || 'localhost'
  const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  const msgId = `<${kind}-${rand}@${domain}>`
  const support = envelope

  const headers: Record<string, string> = {
    'Message-ID': msgId,
    'X-Auto-Response-Suppress': 'All',
    // Keep X-Mailer and abuse reporting; avoid headers that mark message as "bulk"
    'X-Mailer': `${BRAND.companyName} OrderSystem`,
    'X-Report-Abuse': `Please report abuse to: ${support}`,
    'References': msgId,
    'In-Reply-To': msgId,
    'Reply-To': cfg.from,
  }

  // Prefer a mailto unsubscribe link, and include an https unsubscribe endpoint if configured.
  const mailto = `<mailto:${support}?subject=Unsubscribe>`
  const httpsUnsub = process.env.LIST_UNSUBSCRIBE_URL ? `<${process.env.LIST_UNSUBSCRIBE_URL}>` : ''
  headers['List-Unsubscribe'] = httpsUnsub ? `${mailto}, ${httpsUnsub}` : mailto
  if (recipient) {
    headers['To'] = recipient
  }
  return headers
}

/**
 * Verifies the SMTP connection end-to-end (EHLO + login). Throws a descriptive
 * error on failure. Safe to call on server startup or from a health-check route.
 */
export async function verifySmtpConnection(): Promise<{ ok: true; host: string; port: number }> {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    const msg = v.hint ? `${v.reason} ${v.hint}` : v.reason
    throw new Error(`SMTP configuration error: ${msg}`)
  }
  const transporter = getOrCreateTransporter(cfg)
  try {
    await transporter.verify()
    return { ok: true, host: cfg.host!, port: cfg.port }
  } catch (err) {
    const raw = readErrorMessage(err)
    let hint = ''
    if (raw.includes('Invalid greeting') || raw.includes('IMAP') || raw.includes('Dovecot') || raw.includes('OK [CAPABILITY')) {
      hint = ' The server is speaking IMAP/POP3 instead of SMTP — double-check SMTP_PORT. Expected SMTP ports: 465 (SSL) or 587 (STARTTLS).'
    } else if (raw.includes('ETIMEDOUT') || raw.includes('ECONNREFUSED') || raw.includes('ENOTFOUND')) {
      hint = ` Network error reaching ${cfg.host}:${cfg.port}. Confirm host/port with your email provider; also check that outbound traffic on port ${cfg.port} is not firewalled.`
    } else if (raw.includes('Authentication') || /auth|login|credentials/i.test(raw)) {
      hint = ' SMTP login failed — verify SMTP_USER and SMTP_PASS, and confirm the account exists and is allowed to use SMTP.'
    } else if (raw.includes('SSL') || raw.includes('TLS') || raw.includes('STARTTLS')) {
      hint = ' TLS negotiation failed — check the SMTP_SECURE vs. port pairing: 465 needs SMTP_SECURE=true, 587 needs SMTP_SECURE=false.'
    }
    const prefix = `SMTP verification failed for ${cfg.user}@${cfg.host}:${cfg.port}.${hint}`
    throw new Error(`${prefix} Underlying error: ${raw}`, { cause: err instanceof Error ? err : undefined })
  }
}

function formatSendError(cfg: SmtpConfig, err: unknown): Error {
  const raw = readErrorMessage(err)
  let hint = ''
  if (raw.includes('Invalid greeting') || raw.includes('IMAP') || raw.includes('Dovecot') || raw.includes('OK [CAPABILITY')) {
    hint = ' (Server sent an IMAP/POP3 greeting on this port — SMTP_PORT is wrong. Use 465 with SMTP_SECURE=true, or 587 with SMTP_SECURE=false.)'
  }
  return new Error(`Failed to send email via ${cfg.host}:${cfg.port}${hint}: ${raw}`, { cause: err instanceof Error ? err : undefined })
}

export async function sendPasswordResetEmail(
  to: string,
  otp: string,
  expiresInMinutes: number,
  customerName?: string
): Promise<void> {
  const cfg = getSmtpConfig()

  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    console.log(
      `[email:dev] Skipping real email to ${to} because SMTP is misconfigured. ${v.reason}${v.hint ? ` ${v.hint}` : ''} ` +
        `Password reset code for ${to}: ${otp} (expires in ${expiresInMinutes} minutes).`
    )
    return
  }

  const transporter = getOrCreateTransporter(cfg)
  const headers = buildDeliverabilityHeaders(cfg, to, 'reset')

  const name = customerName ? ` ${customerName}` : ''
  const subject = `Password reset code for your ${BRAND.companyName} account`

  const fromAddr = extractFromAddress(cfg.from)
  const support = fromAddr
  const safeSenderLine =
    `To keep our emails out of your spam or promotions folder, please add ${fromAddr} to your contacts or safe senders list.`

  const text = `Hi${name},

We received a request to reset the password for your ${BRAND.companyName} account (${to}).

Your verification code is: ${otp}

This code expires in ${expiresInMinutes} minutes. If you did not request a password reset, you can safely ignore this email — your account remains secure and no changes will be made.

If you are having trouble entering the code, you can reply to this email or contact support at ${support} and we will help you.

${safeSenderLine}

Why you received this email: This message was automatically sent because a password reset was requested using your email address on the ${BRAND.companyName} website. If this was not you, no further action is required.

— The ${BRAND.companyName} Team
${BRAND.companyName}
Reply to: ${fromAddr}`

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.55;font-size:15px;">
      <div style="border-bottom:1px solid #e7e5e0;padding-bottom:16px;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:700;color:#2d5a3d;letter-spacing:0.02em;">${BRAND.companyName}</span>
      </div>

      <p style="margin:0 0 12px 0;">Hi${name},</p>
      <p style="margin:0 0 20px 0;">
        We received a request to reset the password for your ${BRAND.companyName} account
        (<span style="color:#57534e;">${to}</span>).
      </p>

      <div style="margin:24px 0 28px 0;padding:22px;background:#f6f7f3;border-radius:12px;text-align:center;border:1px solid #e7e5e0;">
        <div style="font-size:12px;color:#6d6a63;text-transform:uppercase;letter-spacing:0.14em;">Your verification code</div>
        <div style="font-size:34px;font-weight:700;letter-spacing:0.3em;color:#2d5a3d;margin-top:10px;font-family:Courier,'Courier New',monospace;">${otp}</div>
        <div style="font-size:12px;color:#78716c;margin-top:10px;">Valid for ${expiresInMinutes} minutes</div>
      </div>

      <p style="margin:0 0 12px 0;color:#44403c;">
        If you did not request this password reset, you can safely ignore this email.
        No changes will be made to your account.
      </p>

      <p style="margin:0 0 22px 0;font-size:14px;color:#57534e;">
        Need help? Contact us any time at
        <a href="mailto:${support}" style="color:#2d5a3d;text-decoration:underline;">${support}</a>.
      </p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:0 0 24px 0;">
        <div style="font-weight:600;color:#92400e;margin:0 0 4px 0;">Keep our emails out of spam</div>
        <div style="color:#854d0e;font-size:14px;margin:0;">
          Add <span style="font-family:Courier,'Courier New',monospace;">${fromAddr}</span> to your contacts or safe senders list
          so future password-reset and order emails land in your inbox.
        </div>
      </div>

      <div style="border-top:1px solid #e7e5e0;padding-top:16px;color:#78716c;font-size:12px;line-height:1.55;">
        <p style="margin:0 0 6px 0;">
          Why you received this email: This message was automatically sent because a password reset was
          requested using your email address on the ${BRAND.companyName} website. If this was not you, no
          further action is required — your account remains secure.
        </p>
        <p style="margin:0;">
          &copy; ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.
        </p>
      </div>
    </div>`

  try {
    const mail: SendMailOptions = {
      from: cfg.from,
      to,
      replyTo: cfg.from,
      subject,
      text,
      html,
      headers,
    }
    await transporter.sendMail(mail)
  } catch (err) {
    throw formatSendError(cfg, err)
  }
}

export async function sendSignupVerificationEmail(
  to: string,
  otp: string,
  expiresInMinutes: number,
  customerName?: string
): Promise<void> {
  const cfg = getSmtpConfig()

  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    console.log(
      `[email:dev] Skipping real email to ${to} because SMTP is misconfigured. ${v.reason}${v.hint ? ` ${v.hint}` : ''} ` +
        `Signup verification code for ${to}: ${otp} (expires in ${expiresInMinutes} minutes).`
    )
    return
  }

  const transporter = getOrCreateTransporter(cfg)
  const headers = buildDeliverabilityHeaders(cfg, to, 'generic')

  const name = customerName ? ` ${customerName}` : ''
  const subject = `Verify your email — ${BRAND.companyName}`

  const fromAddr = extractFromAddress(cfg.from)
  const support = fromAddr

  const text = `Hi${name},

Welcome to ${BRAND.companyName}. Please confirm your email address (${to}) to complete your account registration.

Your verification code is: ${otp}

This code expires in ${expiresInMinutes} minutes. If you did not try to create an account, you can safely ignore this email.

If you are having trouble entering the code, reply to this email or contact support at ${support}.

— The ${BRAND.companyName} Team`

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.55;font-size:15px;">
      <div style="border-bottom:1px solid #e7e5e0;padding-bottom:16px;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:700;color:#2d5a3d;letter-spacing:0.02em;">${BRAND.companyName}</span>
      </div>

      <p style="margin:0 0 12px 0;">Hi${name},</p>
      <p style="margin:0 0 20px 0;">
        Welcome to ${BRAND.companyName}. Please confirm your email address
        (<span style="color:#57534e;">${to}</span>) to complete your registration.
      </p>

      <div style="margin:24px 0 28px 0;padding:22px;background:#f6f7f3;border-radius:12px;text-align:center;border:1px solid #e7e5e0;">
        <div style="font-size:12px;color:#6d6a63;text-transform:uppercase;letter-spacing:0.14em;">Your verification code</div>
        <div style="font-size:34px;font-weight:700;letter-spacing:0.3em;color:#2d5a3d;margin-top:10px;font-family:Courier,'Courier New',monospace;">${otp}</div>
        <div style="font-size:12px;color:#78716c;margin-top:10px;">Valid for ${expiresInMinutes} minutes</div>
      </div>

      <p style="margin:0 0 22px 0;font-size:14px;color:#57534e;">
        If you did not try to create an account, you can safely ignore this email — no account will be created.
        Need help? Contact us at <a href="mailto:${support}" style="color:#2d5a3d;text-decoration:underline;">${support}</a>.
      </p>

      <div style="border-top:1px solid #e7e5e0;padding-top:16px;color:#78716c;font-size:12px;line-height:1.55;">
        <p style="margin:0;">&copy; ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.</p>
      </div>
    </div>`

  try {
    const mail: SendMailOptions = {
      from: cfg.from,
      to,
      replyTo: cfg.from,
      subject,
      text,
      html,
      headers,
    }
    await transporter.sendMail(mail)
  } catch (err) {
    throw formatSendError(cfg, err)
  }
}

export async function sendContactFormAlertEmail(form: {
  name: string
  email: string
  subject: string
  message: string
}): Promise<void> {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    console.log(
      `[email:dev] Skipping contact form email — ${v.reason}${v.hint ? ` ${v.hint}` : ''}. ` +
        `Contact form from ${form.name} (${form.email}) re: ${form.subject}.`
    )
    return
  }

  const transporter = getOrCreateTransporter(cfg)
  const to = process.env.ADMIN_ALERT_EMAIL || BRAND.supportEmail
  const headers = buildDeliverabilityHeaders(cfg, to, 'order')
  const subjectLabels: Record<string, string> = {
    general: 'General Inquiry',
    order: 'Order Support',
    'himmat-tea': 'Himmat Tea Inquiry',
    'godgifted-dal': 'Godgifted Dal Inquiry',
    wholesale: 'Wholesale Inquiry',
  }
  const subjectLabel = subjectLabels[form.subject] || form.subject || 'Contact Form'

  const subject = `New ${subjectLabel} — ${form.name}`
  const text =
    `A new contact form submission has been received.\n\n` +
    `Name: ${form.name}\n` +
    `Email: ${form.email}\n` +
    `Topic: ${subjectLabel}\n\n` +
    `Message:\n${form.message}\n\n` +
    `Please review and respond to the customer in a timely manner.`

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.55;font-size:15px;">
      <div style="border-bottom:1px solid #e7e5e0;padding-bottom:16px;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:700;color:#2d5a3d;letter-spacing:0.02em;">${BRAND.companyName}</span>
      </div>
      <div style="margin:24px 0 28px 0;padding:22px;background:#f8f5ef;border-radius:12px;border:1px solid #e7e5e0;">
        <div style="font-size:12px;color:#8a6a2d;text-transform:uppercase;letter-spacing:0.14em;">Contact Form</div>
        <div style="font-size:28px;font-weight:700;color:#2d5a3d;margin-top:10px;">${subjectLabel}</div>
      </div>
      <p style="margin:0 0 12px 0;">A new contact form submission has been received.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;width:42%;">Name</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${form.name}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Email</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${form.email}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Topic</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${subjectLabel}</td></tr>
      </table>
      <p style="margin:0 0 8px 0;color:#57534e;font-weight:600;">Message</p>
      <p style="margin:0 0 20px 0;color:#44403c;white-space:pre-wrap;padding:16px;background:#f9f7f4;border-radius:10px;border:1px solid #e7e5e0;">${form.message}</p>
      <p style="margin:0 0 22px 0;font-size:14px;color:#57534e;">Please review the message in the admin dashboard and respond to the customer in a timely manner.</p>
      <div style="border-top:1px solid #e7e5e0;padding-top:16px;color:#78716c;font-size:12px;line-height:1.55;">
        <p style="margin:0;">&copy; ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.</p>
      </div>
    </div>`

  try {
    await transporter.sendMail({ from: cfg.from, to, replyTo: form.email, subject, text, html, headers })
  } catch (err) {
    throw formatSendError(cfg, err)
  }
}

export async function sendPartnershipEnquiryAlertEmail(form: {
  business: string
  contact: string
  type: string
  country: string
  email: string
  phone?: string
  volume?: string
  productLines: string[]
  message?: string
}): Promise<void> {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    console.log(
      `[email:dev] Skipping partnership enquiry email — ${v.reason}${v.hint ? ` ${v.hint}` : ''}. ` +
        `Partnership enquiry from ${form.contact} (${form.email}) for ${form.business}.`
    )
    return
  }

  const transporter = getOrCreateTransporter(cfg)
  const to = process.env.ADMIN_ALERT_EMAIL || BRAND.supportEmail
  const headers = buildDeliverabilityHeaders(cfg, to, 'order')
  const productLines = form.productLines.length ? form.productLines.join(', ') : 'Not specified'
  const contactLine = form.phone ? `Phone: ${form.phone}\n` : ''
  const volumeLine = form.volume ? `Estimated monthly volume: ${form.volume}\n` : ''
  const messageLine = form.message ? `\nBusiness notes:\n${form.message}` : ''

  const subject = `New wholesale partnership enquiry — ${form.business}`
  const text =
    `A new wholesale partnership enquiry has been submitted.\n\n` +
    `Business: ${form.business}\n` +
    `Contact name: ${form.contact}\n` +
    `Business type: ${form.type}\n` +
    `Country: ${form.country}\n` +
    `Email: ${form.email}\n` +
    `${contactLine}` +
    `${volumeLine}` +
    `Interested product lines: ${productLines}\n` +
    `${messageLine}\n\n` +
    `Please review the enquiry in the admin dashboard and respond within the expected turnaround window.`

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.55;font-size:15px;">
      <div style="border-bottom:1px solid #e7e5e0;padding-bottom:16px;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:700;color:#2d5a3d;letter-spacing:0.02em;">${BRAND.companyName}</span>
      </div>
      <div style="margin:24px 0 28px 0;padding:22px;background:#f8f5ef;border-radius:12px;border:1px solid #e7e5e0;">
        <div style="font-size:12px;color:#8a6a2d;text-transform:uppercase;letter-spacing:0.14em;">Wholesale enquiry</div>
        <div style="font-size:28px;font-weight:700;color:#2d5a3d;margin-top:10px;">${form.business}</div>
      </div>
      <p style="margin:0 0 12px 0;">A new partnership enquiry has been submitted for review.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;width:42%;">Contact</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${form.contact}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Business type</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${form.type}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Country</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${form.country}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Email</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${form.email}</td></tr>
        ${form.phone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Phone</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${form.phone}</td></tr>` : ''}
        ${form.volume ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Monthly volume</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${form.volume}</td></tr>` : ''}
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Interested lines</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${productLines}</td></tr>
      </table>
      ${form.message ? `<p style="margin:0 0 8px 0;color:#57534e;font-weight:600;">Business notes</p><p style="margin:0 0 20px 0;color:#44403c;white-space:pre-wrap;">${form.message}</p>` : ''}
      <p style="margin:0 0 22px 0;font-size:14px;color:#57534e;">Please review the enquiry in the admin dashboard and follow up with the business as needed.</p>
      <div style="border-top:1px solid #e7e5e0;padding-top:16px;color:#78716c;font-size:12px;line-height:1.55;">
        <p style="margin:0;">&copy; ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.</p>
      </div>
    </div>`

  try {
    await transporter.sendMail({ from: cfg.from, to, replyTo: cfg.from, subject, text, html, headers })
  } catch (err) {
    throw formatSendError(cfg, err)
  }
}

export async function sendAdminOrderAlertEmail(order: {
  orderNumber: string
  customerName: string
  customerEmail: string
  grandTotal: number
  currency?: string
}): Promise<void> {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    console.log(
      `[email:dev] Skipping admin alert email — ${v.reason}${v.hint ? ` ${v.hint}` : ''}. ` +
        `Order ${order.orderNumber} from ${order.customerName} for ${order.currency || '₹'}${order.grandTotal} awaiting payment.`
    )
    return
  }
  const transporter = getOrCreateTransporter(cfg)
  const to = process.env.ADMIN_ALERT_EMAIL || BRAND.supportEmail
  const headers = buildDeliverabilityHeaders(cfg, to, 'order')
  const currency = order.currency || '₹'
  const subject = `New order ${order.orderNumber} — awaiting payment verification`
  const text =
    `Order ${order.orderNumber} from ${order.customerName} (${order.customerEmail}) ` +
    `for ${currency}${order.grandTotal} is awaiting QR payment verification. ` +
    `Review it in the admin dashboard.`
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.55;font-size:15px;">
      <div style="border-bottom:1px solid #e7e5e0;padding-bottom:16px;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:700;color:#2d5a3d;letter-spacing:0.02em;">${BRAND.companyName}</span>
      </div>
      <div style="margin:24px 0 28px 0;padding:22px;background:#fffbeb;border-radius:12px;border:1px solid #fde68a;">
        <div style="font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:0.14em;">New order awaiting payment</div>
        <div style="font-size:28px;font-weight:700;color:#92400e;margin-top:10px;">${order.orderNumber}</div>
      </div>
      <p style="margin:0 0 12px 0;">A customer has placed a new order and is waiting for QR payment verification.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;width:40%;">Customer</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${order.customerName}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Email</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${order.customerEmail}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Order total</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:700;font-size:18px;color:#2d5a3d;">${currency}${order.grandTotal.toFixed(2)}</td></tr>
      </table>
      <p style="margin:0 0 22px 0;font-size:14px;color:#57534e;">Please log in to the admin dashboard to verify the payment and confirm the order.</p>
      <div style="border-top:1px solid #e7e5e0;padding-top:16px;color:#78716c;font-size:12px;line-height:1.55;">
        <p style="margin:0;">&copy; ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.</p>
      </div>
    </div>`
  try {
    await transporter.sendMail({ from: cfg.from, to, replyTo: cfg.from, subject, text, html, headers })
  } catch (err) {
    throw formatSendError(cfg, err)
  }
}

export async function sendCustomerPaymentApprovedEmail(params: {
  to: string
  customerName: string
  orderNumber: string
  grandTotal: number
  currency?: string
}): Promise<void> {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    console.log(
      `[email:dev] Skipping payment-approved email to ${params.to} — ${v.reason}${v.hint ? ` ${v.hint}` : ''}. ` +
        `Order ${params.orderNumber} payment confirmed for ${params.customerName}.`
    )
    return
  }
  const transporter = getOrCreateTransporter(cfg)
  const headers = buildDeliverabilityHeaders(cfg, params.to, 'order')
  const currency = params.currency || '₹'
  const subject = `Payment confirmed — order ${params.orderNumber}`
  const text =
    `Hi ${params.customerName},\n\n` +
    `We've confirmed your payment of ${currency}${params.grandTotal.toFixed(2)} for order ${params.orderNumber}. ` +
    `Your order is now being processed.\n\n` +
    `— The ${BRAND.companyName} Team`
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.55;font-size:15px;">
      <div style="border-bottom:1px solid #e7e5e0;padding-bottom:16px;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:700;color:#2d5a3d;letter-spacing:0.02em;">${BRAND.companyName}</span>
      </div>
      <p style="margin:0 0 12px 0;">Hi ${params.customerName},</p>
      <div style="margin:24px 0 28px 0;padding:22px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;text-align:center;">
        <div style="font-size:12px;color:#166534;text-transform:uppercase;letter-spacing:0.14em;">Payment confirmed</div>
        <div style="font-size:28px;font-weight:700;color:#166534;margin-top:10px;">${params.orderNumber}</div>
        <div style="font-size:18px;font-weight:700;color:#2d5a3d;margin-top:8px;">${currency}${params.grandTotal.toFixed(2)}</div>
      </div>
      <p style="margin:0 0 20px 0;">Thank you for your purchase! Your payment has been verified and your order is now being processed for shipping.</p>
      <p style="margin:0 0 22px 0;font-size:14px;color:#57534e;">You can track your order status any time from your account page. We'll send another update when your order ships.</p>
      <div style="border-top:1px solid #e7e5e0;padding-top:16px;color:#78716c;font-size:12px;line-height:1.55;">
        <p style="margin:0 0 6px 0;">Thank you for shopping with ${BRAND.companyName}.</p>
        <p style="margin:0;">&copy; ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.</p>
      </div>
    </div>`
  try {
    await transporter.sendMail({ from: cfg.from, to: params.to, replyTo: cfg.from, subject, text, html, headers })
  } catch (err) {
    throw formatSendError(cfg, err)
  }
}

export async function sendCustomerPaymentRejectedEmail(params: {
  to: string
  customerName: string
  orderNumber: string
  grandTotal: number
  currency?: string
  reason?: string
}): Promise<void> {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    console.log(
      `[email:dev] Skipping payment-rejected email to ${params.to} — ${v.reason}${v.hint ? ` ${v.hint}` : ''}. ` +
        `Order ${params.orderNumber} payment rejected for ${params.customerName}.`
    )
    return
  }
  const transporter = getOrCreateTransporter(cfg)
  const headers = buildDeliverabilityHeaders(cfg, params.to, 'order')
  const currency = params.currency || '₹'
  const reasonLine = params.reason ? ` Reason: ${params.reason}.` : ''
  const subject = `Payment not verified — order ${params.orderNumber}`
  const text =
    `Hi ${params.customerName},\n\n` +
    `We were unable to verify your payment of ${currency}${params.grandTotal.toFixed(2)} for order ${params.orderNumber}. ` +
    `The order has been cancelled and any reserved stock has been released.${reasonLine}\n\n` +
    `If you believe this is a mistake or still want to complete your purchase, please reply to this email or place a new order.\n\n` +
    `— The ${BRAND.companyName} Team`
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.55;font-size:15px;">
      <div style="border-bottom:1px solid #e7e5e0;padding-bottom:16px;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:700;color:#2d5a3d;letter-spacing:0.02em;">${BRAND.companyName}</span>
      </div>
      <p style="margin:0 0 12px 0;">Hi ${params.customerName},</p>
      <div style="margin:24px 0 28px 0;padding:22px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca;text-align:center;">
        <div style="font-size:12px;color:#991b1b;text-transform:uppercase;letter-spacing:0.14em;">Payment not verified</div>
        <div style="font-size:28px;font-weight:700;color:#991b1b;margin-top:10px;">${params.orderNumber}</div>
        <div style="font-size:18px;font-weight:700;color:#7f1d1d;margin-top:8px;">${currency}${params.grandTotal.toFixed(2)}</div>
      </div>
      <p style="margin:0 0 16px 0;">We reviewed the payment proof for this order and were unable to verify your payment of ${currency}${params.grandTotal.toFixed(2)}. The order has been cancelled and any reserved stock has been released.</p>
      ${params.reason ? `<p style="margin:0 0 16px 0;padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;color:#9a3412;"><strong style="color:#7c2d12;">Reason:</strong> ${params.reason}</p>` : ''}
      <p style="margin:0 0 22px 0;font-size:14px;color:#57534e;">If you believe this is a mistake or still want to complete your purchase, please reply to this email or place a new order. We're happy to help.</p>
      <div style="border-top:1px solid #e7e5e0;padding-top:16px;color:#78716c;font-size:12px;line-height:1.55;">
        <p style="margin:0 0 6px 0;">Thank you for your understanding.</p>
        <p style="margin:0;">&copy; ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.</p>
      </div>
    </div>`
  try {
    await transporter.sendMail({ from: cfg.from, to: params.to, replyTo: cfg.from, subject, text, html, headers })
  } catch (err) {
    throw formatSendError(cfg, err)
  }
}

export async function sendCustomerOrderStatusEmail(params: {
  to: string
  customerName: string
  orderNumber: string
  status: string
  grandTotal: number
  currency?: string
  trackingNumber?: string
  courierPartner?: string
}): Promise<void> {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    console.log(
      `[email:dev] Skipping order-status email to ${params.to} — ${v.reason}${v.hint ? ` ${v.hint}` : ''}. ` +
        `Order ${params.orderNumber} → ${params.status}.`
    )
    return
  }
  const transporter = getOrCreateTransporter(cfg)
  const headers = buildDeliverabilityHeaders(cfg, params.to, 'order')
  const currency = params.currency || '₹'

  const statusLabels: Record<string, string> = {
    CONFIRMED: 'Order confirmed',
    PROCESSING: 'Your order is being processed',
    SHIPPED: 'Your order has shipped',
    DELIVERED: 'Your order has been delivered',
    CANCELLED: 'Your order has been cancelled',
    REFUNDED: 'Your order refund has been processed',
  }
  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    CONFIRMED: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    PROCESSING: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    SHIPPED: { bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8' },
    DELIVERED: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    CANCELLED: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
    REFUNDED: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  }
  const label = statusLabels[params.status] || 'Order update'
  const color = statusColors[params.status] || { bg: '#f6f7f3', border: '#e7e5e0', text: '#2d5a3d' }

  let extraBlock = ''
  if (params.status === 'SHIPPED' && params.trackingNumber) {
    extraBlock = `
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;width:40%;">Tracking number</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;font-family:Courier,'Courier New',monospace;">${params.trackingNumber}</td></tr>
        ${params.courierPartner ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Courier</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${params.courierPartner}</td></tr>` : ''}
      </table>`
  }

  const subject = `${label} — order ${params.orderNumber}`
  const text =
    `Hi ${params.customerName},\n\n` +
    `Order ${params.orderNumber} (${currency}${params.grandTotal.toFixed(2)}) status: ${label.toLowerCase()}.\n` +
    (params.status === 'SHIPPED' && params.trackingNumber ? `Tracking: ${params.trackingNumber}${params.courierPartner ? ` via ${params.courierPartner}` : ''}\n` : '') +
    `\n— The ${BRAND.companyName} Team`
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.55;font-size:15px;">
      <div style="border-bottom:1px solid #e7e5e0;padding-bottom:16px;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:700;color:#2d5a3d;letter-spacing:0.02em;">${BRAND.companyName}</span>
      </div>
      <p style="margin:0 0 12px 0;">Hi ${params.customerName},</p>
      <div style="margin:24px 0 28px 0;padding:22px;background:${color.bg};border-radius:12px;border:1px solid ${color.border};text-align:center;">
        <div style="font-size:12px;color:${color.text};text-transform:uppercase;letter-spacing:0.14em;">${label}</div>
        <div style="font-size:28px;font-weight:700;color:${color.text};margin-top:10px;">${params.orderNumber}</div>
      </div>
      <p style="margin:0 0 20px 0;color:#44403c;">Your order status has been updated.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;width:40%;">Status</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:600;">${label}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;color:#78716c;">Order total</td><td style="padding:10px 0;border-bottom:1px solid #e7e5e0;font-weight:700;color:#2d5a3d;">${currency}${params.grandTotal.toFixed(2)}</td></tr>
      </table>
      ${extraBlock}
      <p style="margin:0 0 22px 0;font-size:14px;color:#57534e;">You can view the full details of your order from your account page.</p>
      <div style="border-top:1px solid #e7e5e0;padding-top:16px;color:#78716c;font-size:12px;line-height:1.55;">
        <p style="margin:0;">&copy; ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.</p>
      </div>
    </div>`
  try {
    await transporter.sendMail({ from: cfg.from, to: params.to, replyTo: cfg.from, subject, text, html, headers })
  } catch (err) {
    throw formatSendError(cfg, err)
  }
}

export async function sendCustomerWelcomeEmail(params: {
  name: string
  email: string
}): Promise<void> {
  const cfg = getSmtpConfig()
  const v = validateSmtpConfig(cfg)
  if (!v.ok) {
    console.log(
      `[email:dev] Skipping welcome email to ${params.email} — ${v.reason}${v.hint ? ` ${v.hint}` : ''}. ` +
        `Welcome ${params.name} to ${BRAND.companyName}.`
    )
    return
  }
  const transporter = getOrCreateTransporter(cfg)
  const headers = buildDeliverabilityHeaders(cfg, params.email, 'generic')
  const subject = `Welcome to ${BRAND.companyName}, ${params.name}!`
  const fromAddr = extractFromAddress(cfg.from)
  const support = fromAddr

  const text =
    `Hi ${params.name},\n\n` +
    `Welcome to ${BRAND.companyName}. Your account has been created and you're all set to explore our collection of premium teas.\n\n` +
    `If you have any questions, need help placing an order, or want recommendations, our team is here for you. Reply to this email or contact us at ${support}.\n\n` +
    `Thank you for joining us. We look forward to serving you a perfect cup.\n\n` +
    `— The ${BRAND.companyName} Team`

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;line-height:1.55;font-size:15px;">
      <div style="border-bottom:1px solid #e7e5e0;padding-bottom:16px;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:700;color:#2d5a3d;letter-spacing:0.02em;">${BRAND.companyName}</span>
      </div>
      <p style="margin:0 0 12px 0;">Hi ${params.name},</p>
      <p style="margin:0 0 20px 0;">
        Welcome to ${BRAND.companyName}. Your account has been created and you're all set to explore
        our collection of premium teas.
      </p>
      <div style="margin:24px 0 28px 0;padding:22px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;text-align:center;">
        <div style="font-size:12px;color:#166534;text-transform:uppercase;letter-spacing:0.14em;">Your account is ready</div>
        <div style="font-size:28px;font-weight:700;color:#166534;margin-top:10px;">Let's sip together</div>
      </div>
      <p style="margin:0 0 22px 0;font-size:14px;color:#57534e;">
        If you have any questions, need help placing an order, or want recommendations, our team is here for you.
        Contact us any time at <a href="mailto:${support}" style="color:#2d5a3d;text-decoration:underline;">${support}</a>.
      </p>
      <p style="margin:0 0 22px 0;">
        Thank you for joining us. We look forward to serving you a perfect cup.
      </p>
      <div style="border-top:1px solid #e7e5e0;padding-top:16px;color:#78716c;font-size:12px;line-height:1.55;">
        <p style="margin:0;">&copy; ${new Date().getFullYear()} ${BRAND.companyName}. All rights reserved.</p>
      </div>
    </div>`

  try {
    await transporter.sendMail({ from: cfg.from, to: params.email, replyTo: cfg.from, subject, text, html, headers })
  } catch (err) {
    throw formatSendError(cfg, err)
  }
}
