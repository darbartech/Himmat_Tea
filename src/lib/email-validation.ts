import { resolveMx, resolve4, resolve6 } from 'node:dns/promises'
import { prisma } from '@/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const DNS_TIMEOUT_MS = 4_000

/**
 * Known disposable / temporary email providers.
 *
 * You can extend this list through:
 *
 * DISPOSABLE_EMAIL_DOMAINS=example.com,temporary.com
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

/**
 * Read additional disposable domains from environment variables.
 */
function envDisposableDomains(): Set<string> {
  const raw = process.env.DISPOSABLE_EMAIL_DOMAINS

  if (!raw) {
    return new Set()
  }

  return new Set(
    raw
      .split(',')
      .map((domain) =>
        domain
          .trim()
          .toLowerCase()
          .replace(/^\./, '')
          .replace(/\.$/, '')
      )
      .filter(Boolean)
  )
}

/**
 * Returns the complete disposable-domain list.
 */
export function getDisposableDomains(): Set<string> {
  return new Set([
    ...BUILT_IN_DISPOSABLE_DOMAINS,
    ...envDisposableDomains(),
  ])
}

/**
 * Normalize email address.
 *
 * Example:
 * "  User@GMAIL.COM  "
 * becomes:
 * "user@gmail.com"
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Extract email domain.
 *
 * Example:
 * "user@gmail.com"
 * becomes:
 * "gmail.com"
 */
export function getEmailDomain(email: string): string | null {
  const normalized = normalizeEmail(email)

  const at = normalized.lastIndexOf('@')

  if (at <= 0 || at === normalized.length - 1) {
    return null
  }

  const domain = normalized.slice(at + 1).trim().toLowerCase()

  if (
    !domain ||
    domain.includes('@') ||
    domain.includes(' ') ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..')
  ) {
    return null
  }

  return domain
}

/**
 * Check whether an email domain is disposable/temporary.
 */
export function isDisposableDomain(domain: string): boolean {
  const normalized = domain
    .trim()
    .toLowerCase()
    .replace(/^\./, '')
    .replace(/\.$/, '')

  return getDisposableDomains().has(normalized)
}

/**
 * Promise timeout helper.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('DNS lookup timed out'))
      }, ms)

      timer.unref?.()
    }),
  ])
}

/**
 * Check whether a domain has mail/DNS records.
 *
 * IMPORTANT:
 * This function is NOT used as a hard signup requirement.
 *
 * On cPanel/CloudLinux shared hosting, DNS lookups can fail even
 * for legitimate domains. Therefore OTP/email verification remains
 * the actual proof that the user owns the mailbox.
 */
export async function hasMailHost(
  domain: string
): Promise<boolean> {
  const normalized = domain
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')

  if (!normalized) {
    return false
  }

  /**
   * First check MX records.
   */
  try {
    const mx = await withTimeout(
      resolveMx(normalized),
      DNS_TIMEOUT_MS
    )

    if (mx.length > 0) {
      return true
    }
  } catch (error: any) {
    /**
     * ENOTFOUND means the domain could not be resolved.
     *
     * Other errors such as timeout or temporary DNS failures
     * should not automatically reject a legitimate signup.
     */
    if (error?.code === 'ENOTFOUND') {
      return false
    }

    console.warn(
      `[Email Validation] MX lookup failed for ${normalized}:`,
      error
    )
  }

  /**
   * RFC-compatible fallback:
   *
   * If a domain does not publish MX records, mail delivery can
   * potentially fall back to the domain's A/AAAA records.
   */
  const [ipv4, ipv6] = await Promise.allSettled([
    withTimeout(resolve4(normalized), DNS_TIMEOUT_MS),
    withTimeout(resolve6(normalized), DNS_TIMEOUT_MS),
  ])

  return (
    (ipv4.status === 'fulfilled' &&
      ipv4.value.length > 0) ||
    (ipv6.status === 'fulfilled' &&
      ipv6.value.length > 0)
  )
}

/**
 * Result returned by email validation.
 */
export interface EmailCheckResult {
  ok: boolean
  error?: string
}

/**
 * Validate email syntax and disposable domain.
 *
 * DNS/MX checking is OPTIONAL.
 *
 * Set:
 *
 * SKIP_EMAIL_MX_CHECK=true
 *
 * on cPanel/CloudLinux to avoid DNS-related signup failures.
 */
export async function checkEmailDeliverability(
  email: string
): Promise<EmailCheckResult> {
  const normalized = normalizeEmail(email)

  /**
   * Basic email syntax validation.
   */
  if (!EMAIL_REGEX.test(normalized)) {
    return {
      ok: false,
      error: 'Please enter a valid email address',
    }
  }

  /**
   * Extract domain.
   */
  const domain = getEmailDomain(normalized)

  if (
    !domain ||
    domain.length > 253 ||
    !domain.includes('.')
  ) {
    return {
      ok: false,
      error: 'Please enter a valid email address',
    }
  }

  /**
   * Reject known disposable/temporary email services.
   */
  if (isDisposableDomain(domain)) {
    return {
      ok: false,
      error:
        'Temporary or disposable email addresses are not allowed. Please use a real email address.',
    }
  }

  /**
   * Optional DNS/MX check.
   *
   * For cPanel/CloudLinux:
   *
   * SKIP_EMAIL_MX_CHECK=true
   *
   * is recommended.
   *
   * Even when DNS checking is enabled, DNS failure is only logged
   * and does NOT block signup.
   *
   * OTP verification should be used to prove email ownership.
   */
  if (process.env.SKIP_EMAIL_MX_CHECK !== 'true') {
    try {
      const hasHost = await hasMailHost(domain)

      if (!hasHost) {
        console.warn(
          `[Email Validation] No MX/A/AAAA records found for: ${domain}`
        )
      }
    } catch (error) {
      console.warn(
        `[Email Validation] DNS check failed for: ${domain}`,
        error
      )
    }
  }

  /**
   * Email passed syntax and disposable-domain validation.
   */
  return {
    ok: true,
  }
}

/**
 * Check whether an email is already registered.
 *
 * scope:
 * - customer
 * - admin
 * - any
 *
 * exclude:
 * Used when editing an existing customer/admin account.
 */
export async function isEmailRegistered(
  email: string,
  scope: 'customer' | 'admin' | 'any' = 'any',
  exclude?: {
    customerId?: number
    adminId?: number
  }
): Promise<boolean> {
  const normalized = normalizeEmail(email)

  const [customer, admin] = await Promise.all([
    scope === 'admin'
      ? null
      : prisma.customer.findFirst({
          where: {
            email: normalized,
            NOT: exclude?.customerId
              ? {
                  id: exclude.customerId,
                }
              : undefined,
          },
          select: {
            id: true,
          },
        }),

    scope === 'customer'
      ? null
      : prisma.adminUser.findFirst({
          where: {
            email: normalized,
            NOT: exclude?.adminId
              ? {
                  id: exclude.adminId,
                }
              : undefined,
          },
          select: {
            id: true,
          },
        }),
  ])

  return Boolean(customer || admin)
}

/**
 * Result returned by signup email validation.
 */
export interface SignupEmailCheckResult
  extends EmailCheckResult {
  normalized?: string
}

/**
 * Complete signup email validation.
 *
 * Flow:
 *
 * 1. Normalize email
 * 2. Validate syntax
 * 3. Reject disposable email
 * 4. Optional DNS check
 * 5. Check database for duplicate email
 *
 * OTP verification should happen AFTER this function.
 */
export async function validateSignupEmail(
  email: string,
  scope: 'customer' | 'admin' = 'customer',
  exclude?: {
    customerId?: number
    adminId?: number
  }
): Promise<SignupEmailCheckResult> {
  /**
   * Normalize first.
   */
  const normalized = normalizeEmail(email)

  /**
   * Validate syntax, disposable domain and optional DNS.
   */
  const deliverable =
    await checkEmailDeliverability(normalized)

  if (!deliverable.ok) {
    return {
      ok: false,
      error: deliverable.error,
    }
  }

  /**
   * Check whether email already exists.
   */
  const registered = await isEmailRegistered(
    normalized,
    scope,
    exclude
  )

  if (registered) {
    return {
      ok: false,
      error:
        'This email is already registered. Please sign in instead.',
    }
  }

  /**
   * Everything passed.
   */
  return {
    ok: true,
    normalized,
  }
}