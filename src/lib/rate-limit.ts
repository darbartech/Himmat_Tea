interface Bucket {
  tokens: number
  lastRefill: number
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

function ipKeyFrom(request: any): string {
  try {
    const xff = request.headers?.get?.('x-forwarded-for')
    if (xff) {
      const first = String(xff).split(',')[0]?.trim()
      if (first) return `ip:${first}`
    }
    const realIp = request.headers?.get?.('x-real-ip')
    if (realIp) return `ip:${realIp}`
    const socket = (request as any).socket
    if (socket?.remoteAddress) return `ip:${socket.remoteAddress}`
  } catch {
    // noop
  }
  return `ip:unknown-${Math.random().toString(36).slice(2, 10)}`
}

export function rateLimitOrderCreate(request: any): { allowed: boolean; retryAfterMs?: number; error?: string } {
  const key = `order-create:${ipKeyFrom(request)}`
  const res = orderCreatLimiter.check(key)
  if (!res.allowed) {
    return { allowed: false, retryAfterMs: res.retryAfterMs, error: 'Too many order attempts. Please try again in a minute.' }
  }
  return { allowed: true }
}

export function rateLimitAuth(request: any): { allowed: boolean; retryAfterMs?: number; error?: string } {
  const key = `auth:${ipKeyFrom(request)}`
  const res = authLimiter.check(key)
  if (!res.allowed) {
    return { allowed: false, retryAfterMs: res.retryAfterMs, error: 'Too many authentication attempts. Please try again in a minute.' }
  }
  return { allowed: true }
}
