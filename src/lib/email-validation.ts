import { resolveMx, resolve4, resolve6 } from 'node:dns/promises'
import { prisma } from '@/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const DNS_TIMEOUT_MS = 4_000

/**
 * Curated list of well-known disposable / temporary email providers.
 * Signups using these domains are rejected to keep accounts tied to real,
 * permanent inboxes. Extend with the DISPOSABLE_EMAIL_DOMAINS env var
 * (comma-separated) without touching code.
 */
const BUILT_IN_DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.info',
  'grr.la',
  'sharklasers.com',
  'temp-mail.org',
  'temp-mail.io',
  'tempmail.com',
  'tempmailo.com',
  'temp-mail.info',
  'throwawaymail.com',
  'yopmail.com',
  'yopmail.fr',
  'maildrop.cc',
  'mailnesia.com',
  'getnada.com',
  'nada.email',
  'dispostable.com',
  'mailcatch.com',
  'mintemail.com',
  'spam4.me',
  'trashmail.com',
  'trashmail.de',
  'emailondeck.com',
  'mailtemp.net',
  'fakeinbox.com',
  'fakemail.net',
  'mailforspam.com',
  'burnermail.io',
  'tempmail.email',
  'mohmal.com',
  'tmpmail.org',
  'mytemp.email',
  'maileater.com',
  'inboxbear.com',
  'dropmail.me',
  'emailfake.com',
  'emailsensei.com',
  'fammail.com',
  'filzmail.com',
  'freeml.net',
  'haltospam.com',
  'inboxkitten.com',
  'mailmaverick.com',
  'mailmetrash.com',
  'moakt.com',
  'mytempdomain.com',
  'nwytg.net',
  'opayq.com',
  'spambox.us',
  'spamgourmet.com',
  'tmail.ws',
  'tmpeml.info',
  'veryrealemail.com',
  'zippymail.info',
  'mailto.plus',
  'maildu.de',
  'mailhero.io',
  'mailnull.com',
  'getairmail.com',
  'fastmail.cn',
  'jetable.org',
  'kasmail.com',
  'mailwizz.com',
  'spam.la',
  'soodonim.com',
  'tmailor.com',
  'tmail.rmail.cloud',
  'venom-sites.com',
  'vipmail.pw',
  'mozej.com',
  'emltmp.com',
  'emailnator.com',
  'mytempemail.com',
  'email-temp.com',
  'binka.me',
  'emailbox.com',
  'foxja.com',
  'jumral.com',
  'maillazy.com',
  'onetimeusemail.com',
  'tmail9.com',
  'uremail.pro',
])

function envDisposableDomains(): Set<string> {
  const raw = process.env.DISPOSABLE_EMAIL_DOMAINS
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((d) => d.trim().toLowerCase().replace(/^\./, ''))
      .filter(Boolean)
  )
}

export function getDisposableDomains(): Set<string> {
  return new Set([...BUILT_IN_DISPOSABLE_DOMAINS, ...envDisposableDomains()])
}

/** Trims whitespace and lower-cases an email address. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Returns the domain part of an email, or null if it cannot be parsed. */
export function getEmailDomain(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return null
  const domain = email.slice(at + 1).trim().toLowerCase()
  if (!domain || domain.includes('@') || domain.includes(' ')) return null
  return domain
}

/** True when the domain belongs to a known disposable email provider. */
export function isDisposableDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase().replace(/^\./, '')
  return getDisposableDomains().has(normalized)
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('DNS lookup timed out')), ms).unref?.()
    }),
  ])
}

/**
 * Checks whether a domain has mail-receiving DNS records (MX, or A/AAAA when
 * the domain only publishes host records). Returns false for domains that
 * resolve to nothing — i.e. fake / non-deliverable inboxes.
 */
export async function hasMailHost(domain: string): Promise<boolean> {
  const normalized = domain.trim().toLowerCase()

  try {
    const mx = await withTimeout(resolveMx(normalized), DNS_TIMEOUT_MS)
    if (mx.length > 0) return true

    const [a, aaaa] = await Promise.allSettled([
      withTimeout(resolve4(normalized), DNS_TIMEOUT_MS),
      withTimeout(resolve6(normalized), DNS_TIMEOUT_MS),
    ])
    return a.status === 'fulfilled' || aaaa.status === 'fulfilled'
  } catch {
    return false
  }
}

export interface EmailCheckResult {
  ok: boolean
  error?: string
}

/** Syntax + disposable-domain + DNS deliverability checks (no DB lookups). */
export async function checkEmailDeliverability(email: string): Promise<EmailCheckResult> {
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: 'Please enter a valid email address' }
  }

  const domain = getEmailDomain(email)
  if (!domain || domain.length > 253 || !domain.includes('.')) {
    return { ok: false, error: 'Please enter a valid email address' }
  }

  if (isDisposableDomain(domain)) {
    return { ok: false, error: 'Temporary or disposable email addresses are not allowed. Please use a real email address.' }
  }

  if (process.env.SKIP_EMAIL_MX_CHECK === 'true') {
    return { ok: true }
  }

  const hasHost = await hasMailHost(domain)
  if (!hasHost) {
    return { ok: false, error: 'This email domain does not accept mail. Please use a valid email address.' }
  }

  return { ok: true }
}

/** True if the email already exists in the customer or admin user tables. */
export async function isEmailRegistered(
  email: string,
  scope: 'customer' | 'admin' | 'any' = 'any'
): Promise<boolean> {
  const normalized = normalizeEmail(email)
  const [customer, admin] = await Promise.all([
    scope === 'admin' ? null : prisma.customer.findUnique({ where: { email: normalized }, select: { id: true } }),
    scope === 'customer' ? null : prisma.adminUser.findUnique({ where: { email: normalized }, select: { id: true } }),
  ])
  return Boolean(customer || admin)
}

export interface SignupEmailCheckResult extends EmailCheckResult {
  normalized?: string
}

/**
 * Full production-grade email validation for signup flows:
 * syntax → disposable domain → DNS deliverability → already-registered.
 */
export async function validateSignupEmail(
  email: string,
  scope: 'customer' | 'admin' = 'customer'
): Promise<SignupEmailCheckResult> {
  const normalized = normalizeEmail(email)

  const deliverable = await checkEmailDeliverability(normalized)
  if (!deliverable.ok) {
    return { ok: false, error: deliverable.error }
  }

  const registered = await isEmailRegistered(normalized, scope)
  if (registered) {
    return { ok: false, error: 'This email is already registered. Please sign in instead.' }
  }

  return { ok: true, normalized }
}
