import type { NextRequest } from 'next/server'

/**
 * IMPORTANT DEPLOYMENT NOTE:
 *
 * This rate limiter uses an IN-MEMORY Map per Node.js process.
 *
 * LIMITATIONS:
 *  - On horizontally-scaled / serverless deployments (multiple Lambda/Edge
 *    instances, Vercel, etc.), each instance maintains its OWN counter.
 *    The configured caps are therefore trivially bypassed by distributing
 *    requests across different instances.
 *  - Every cold start / redeploy / process restart resets all counters.
 *  - Keys are derived from `x-forwarded-for`, which is trustworthy only if
 *    your hosting platform strips/overwrites the header (Vercel does;
 *    confirm this for your deployment target if you rely on these limits
 *    as a primary defense).
 *
 * RECOMMENDATION for production multi-instance deployments:
 *  - Replace the in-memory backing store with Redis / Upstash / Vercel Edge
 *    Config / KV / the platform's built-in edge rate-limiting primitive
 *    so counters are shared across replicas.
 */
interface Bucket {
  tokens: number
  lastRefill: number
}

interface RequestLike {
  headers?: {
    get?: (name: string) => string | string[] | null | undefined
  }
  socket?: {
    remoteAddress?: string
  }
}

class InMemoryRateLimiter {
  private buckets: Map<string, Bucket> = new Map()
  private maxTokens: number
  private refillMs: number
  private tokensPerRefill: number

  constructor(maxTokens: number, refillMs: number, tokensPerRefill: number = 1) {
    this.maxTokens = maxTokens
    this.refillMs = refillMs
    this.tokensPerRefill = tokensPerRefill
  }

  check(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now()
    let bucket = this.buckets.get(key)

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now }
      this.buckets.set(key, bucket)
    }

    const elapsed = now - bucket.lastRefill
    if (elapsed >= this.refillMs) {
      const refillCount = Math.floor(elapsed / this.refillMs)
      bucket.tokens = Math.min(
        this.maxTokens,
        bucket.tokens + refillCount * this.tokensPerRefill
      )
      bucket.lastRefill = now - (elapsed % this.refillMs)
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1
      return { allowed: true }
    }

    const retryAfterMs = this.refillMs - (now - bucket.lastRefill)
    return { allowed: false, retryAfterMs }
  }
}

const orderCreatLimiter = new InMemoryRateLimiter(10, 60_000)
const authLimiter = new InMemoryRateLimiter(15, 60_000)

function ipKeyFrom(request: RequestLike | NextRequest): string {
  try {
    const xff = request.headers?.get?.('x-forwarded-for')
    if (xff) {
      const first = String(xff).split(',')[0]?.trim()
      if (first) return `ip:${first}`
    }
    const realIp = request.headers?.get?.('x-real-ip')
    if (realIp) return `ip:${realIp}`
    const socket = (request as RequestLike).socket
    if (socket?.remoteAddress) return `ip:${socket.remoteAddress}`
  } catch {
    // noop
  }
  return `ip:unknown-${Math.random().toString(36).slice(2, 10)}`
}

export function rateLimitOrderCreate(request: RequestLike | NextRequest): { allowed: boolean; retryAfterMs?: number; error?: string } {
  const key = `order-create:${ipKeyFrom(request)}`
  const res = orderCreatLimiter.check(key)
  if (!res.allowed) {
    return { allowed: false, retryAfterMs: res.retryAfterMs, error: 'Too many order attempts. Please try again in a minute.' }
  }
  return { allowed: true }
}

export function rateLimitAuth(request: RequestLike | NextRequest): { allowed: boolean; retryAfterMs?: number; error?: string } {
  const key = `auth:${ipKeyFrom(request)}`
  const res = authLimiter.check(key)
  if (!res.allowed) {
    return { allowed: false, retryAfterMs: res.retryAfterMs, error: 'Too many authentication attempts. Please try again in a minute.' }
  }
  return { allowed: true }
}
