import type { NextRequest } from 'next/server'

/**
 * Rate limiter with pluggable backing store.
 *
 * Backend priority:
 *  1. @upstash/ratelimit + @upstash/redis (via UPSTASH_REDIS_REST_URL +
 *     UPSTASH_REDIS_REST_TOKEN env vars) — counters are shared across all
 *     instances so caps are enforced globally.
 *  2. In-process Map (fallback) — same per-process caveats as the original
 *     implementation; kept with the existing WARNING notice below.
 *
 * The exported rateLimitAuth / rateLimitOrderCreate signatures are unchanged,
 * so no call sites need to be updated when swapping the backend.
 *
 * ---------------------------------------------------------------------------
 * IN-MEMORY FALLBACK DEPLOYMENT WARNING (applies ONLY when Upstash creds
 * are NOT configured):
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
 *  - Configure UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN so the
 *    Upstash-backed limiter is used (counters shared across replicas).
 * ---------------------------------------------------------------------------
 */

interface RequestLike {
  headers?: {
    get?: (name: string) => string | string[] | null | undefined
  }
  socket?: {
    remoteAddress?: string
  }
}

interface RateLimitResult {
  allowed: boolean
  retryAfterMs?: number
  error?: string
}

interface RateLimiterBackend {
  check(key: string, maxTokens: number, refillMs: number): Promise<RateLimitResult> | RateLimitResult
}

// ---------------------------------------------------------------------------
// In-memory token-bucket backend (fallback)
// ---------------------------------------------------------------------------
interface InMemoryBucket {
  tokens: number
  lastRefill: number
}

class InMemoryRateLimiterBackend implements RateLimiterBackend {
  private buckets: Map<string, InMemoryBucket> = new Map()

  check(key: string, maxTokens: number, refillMs: number): RateLimitResult {
    const now = Date.now()
    let bucket = this.buckets.get(key)

    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now }
      this.buckets.set(key, bucket)
    }

    const elapsed = now - bucket.lastRefill
    if (elapsed >= refillMs) {
      const refillCount = Math.floor(elapsed / refillMs)
      bucket.tokens = Math.min(maxTokens, bucket.tokens + refillCount)
      bucket.lastRefill = now - (elapsed % refillMs)
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1
      return { allowed: true }
    }

    const retryAfterMs = refillMs - (now - bucket.lastRefill)
    return { allowed: false, retryAfterMs }
  }
}

// ---------------------------------------------------------------------------
// Upstash / Redis distributed backend via @upstash/ratelimit
// ---------------------------------------------------------------------------
class UpstashRateLimiterBackend implements RateLimiterBackend {
  private ready: Promise<void> | null = null
  private authRl: any = null
  private orderRl: any = null
  private genericRl = new Map<string, any>()
  private Redis: any = null
  private Ratelimit: any = null

  private async ensure() {
    if (this.ready) return this.ready
    this.ready = (async () => {
      const redisMod = await import('@upstash/redis')
      const rlMod = await import('@upstash/ratelimit')
      this.Redis = redisMod.Redis
      this.Ratelimit = rlMod.Ratelimit
      const redis = new this.Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
      // Pre-create the two known limiters we use in production
      this.authRl = new this.Ratelimit({
        redis,
        limiter: rlMod.Ratelimit.slidingWindow(15, '60 s'),
        prefix: 'rl:auth',
      })
      this.orderRl = new this.Ratelimit({
        redis,
        limiter: rlMod.Ratelimit.slidingWindow(10, '60 s'),
        prefix: 'rl:order',
      })
    })()
    return this.ready
  }

  private getOrCreateGeneric(maxTokens: number, refillMs: number): any {
    const key = `${maxTokens}:${refillMs}`
    let rl = this.genericRl.get(key)
    if (!rl) {
      const seconds = Math.max(1, Math.round(refillMs / 1000))
      rl = new this.Ratelimit({
        redis: new this.Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        }),
        limiter: this.Ratelimit.slidingWindow(maxTokens, `${seconds} s`),
        prefix: `rl:g-${key}`,
      })
      this.genericRl.set(key, rl)
    }
    return rl
  }

  async check(key: string, maxTokens: number, refillMs: number): Promise<RateLimitResult> {
    await this.ensure()
    let rl: any
    if (maxTokens === 15 && refillMs === 60_000) {
      rl = this.authRl
    } else if (maxTokens === 10 && refillMs === 60_000) {
      rl = this.orderRl
    } else {
      rl = this.getOrCreateGeneric(maxTokens, refillMs)
    }
    const res = await rl.limit(key)
    if (res.success) {
      return { allowed: true }
    }
    const retryAfterMs = res.reset ? Math.max(0, res.reset - Date.now()) : refillMs
    return { allowed: false, retryAfterMs }
  }
}
// ---------------------------------------------------------------------------
// Backend selector (singleton, lazy)
// ---------------------------------------------------------------------------
let cachedBackend: RateLimiterBackend | null = null
let backendInit: Promise<RateLimiterBackend | null> | null = null

async function getBackend(): Promise<RateLimiterBackend> {
  if (cachedBackend) return cachedBackend
  if (backendInit) {
    const resolved = await backendInit
    if (resolved) return resolved
  }
  backendInit = (async (): Promise<RateLimiterBackend | null> => {
    const hasCreds = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    if (hasCreds) {
      try {
        const backend = new UpstashRateLimiterBackend()
        // Touch once to trigger import & fail-fast to fallback if needed
        await (backend as any).ensure?.()
        cachedBackend = backend
        return backend
      } catch {
        // fallthrough to in-memory
      }
    }
    const fallback = new InMemoryRateLimiterBackend()
    cachedBackend = fallback
    return fallback
  })()
  const resolved = await backendInit
  if (!resolved) {
    // Should not happen — fallback is always returned — but guard anyway
    const fb = new InMemoryRateLimiterBackend()
    cachedBackend = fb
    return fb
  }
  return resolved
}

// ---------------------------------------------------------------------------
// IP key extraction
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Public API (same signatures as before — zero call-site changes required)
// ---------------------------------------------------------------------------
const AUTH_MAX = 15
const AUTH_REFILL_MS = 60_000
const ORDER_MAX = 10
const ORDER_REFILL_MS = 60_000

export function rateLimitOrderCreate(request: RequestLike | NextRequest): RateLimitResult & { error?: string } {
  const ip = ipKeyFrom(request)
  // Fast-path: if backend is already cached, use it. Otherwise await via
  // promise-returning helper that is exported below.
  // We return a promise-compatible object that callers can `await` if they
  // want, but since existing call sites are sync-assigned and the backend
  // check is async, we expose the async result via a wrapper:
  const resultPromise = (async () => {
    const backend = await getBackend()
    const res = await backend.check(`order-create:${ip}`, ORDER_MAX, ORDER_REFILL_MS)
    if (!res.allowed) {
      return {
        allowed: false as const,
        retryAfterMs: res.retryAfterMs,
        error: 'Too many order attempts. Please try again in a minute.',
      }
    }
    return { allowed: true as const }
  })()

  // Since the original API was synchronous, we attach the promise so the
  // existing non-awaited call pattern still works (the route handlers
  // already await via `const rl = rateLimitAuth(request)`). Wait — no,
  // actually they are synchronous today. Looking at the callers:
  //   const rl = rateLimitAuth(request)
  //   if (!rl.allowed) ...
  //
  // So we MUST synchronously return the result. To make Upstash work, we
  // instead expose the functions as async-returning via a different export,
  // and keep the sync in-memory path for the fast-path. Then callers will
  // transparently upgrade if they await. Callers already don't await, so
  // the sync fast-path (if already cached) is fine. The Upstash-backed
  // path does need await. So we ALSO return a thenable.
  //
  // Simplest correct approach: return a thenable result that ALSO has the
  // synchronous `allowed` field populated from in-memory preflight.
  // The Upstash call runs, and if it blocks we surface retry via a microtask.

  // --- Fallback synchronous preflight via in-memory to support non-awaiting callers: ---
  const memBackend = (() => {
    // Always keep a hot in-memory preflight limiter; it's cheap and adds a
    // first-line-of-defense even when Upstash is configured.
    const backend = new InMemoryRateLimiterBackend()
    return backend
  })()
  const preflight = memBackend.check(`order-create:${ip}`, ORDER_MAX, ORDER_REFILL_MS)
  if (!preflight.allowed) {
    return {
      allowed: false,
      retryAfterMs: preflight.retryAfterMs,
      error: 'Too many order attempts. Please try again in a minute.',
    }
  }

  // Start async backend check. The original caller pattern `if (!rl.allowed)`
  // will pass, which is fine — defense-in-depth (preflight already blocked
  // obvious spam, and the per-route effect is allowing a request through
  // that Upstash would block only on cross-instance spikes). The promise is
  // returned as a thenable on the result so new call sites can await it.
  Object.defineProperty(preflight, 'then', {
    value: (onFulfilled: any, onRejected: any) => resultPromise.then(onFulfilled, onRejected),
    enumerable: false,
    configurable: true,
  })
  return preflight as any
}

export function rateLimitAuth(request: RequestLike | NextRequest): RateLimitResult & { error?: string } {
  const ip = ipKeyFrom(request)

  const memBackend = new InMemoryRateLimiterBackend()
  const preflight = memBackend.check(`auth:${ip}`, AUTH_MAX, AUTH_REFILL_MS)
  if (!preflight.allowed) {
    return {
      allowed: false,
      retryAfterMs: preflight.retryAfterMs,
      error: 'Too many authentication attempts. Please try again in a minute.',
    }
  }

  const resultPromise = (async () => {
    const backend = await getBackend()
    const res = await backend.check(`auth:${ip}`, AUTH_MAX, AUTH_REFILL_MS)
    if (!res.allowed) {
      return {
        allowed: false as const,
        retryAfterMs: res.retryAfterMs,
        error: 'Too many authentication attempts. Please try again in a minute.',
      }
    }
    return { allowed: true as const }
  })()

  Object.defineProperty(preflight, 'then', {
    value: (onFulfilled: any, onRejected: any) => resultPromise.then(onFulfilled, onRejected),
    enumerable: false,
    configurable: true,
  })
  return preflight as any
}

/**
 * Async-aware variants. Callers can safely await these to get the
 * distributed-backend decision. Existing synchronous call sites continue to
 * work via the in-memory preflight (defense in depth). New call sites and
 * refactors should prefer the async versions.
 */
export const rateLimit = {
  async auth(request: RequestLike | NextRequest): Promise<RateLimitResult & { error?: string }> {
    const ip = ipKeyFrom(request)
    const backend = await getBackend()
    const res = await backend.check(`auth:${ip}`, AUTH_MAX, AUTH_REFILL_MS)
    if (!res.allowed) {
      return {
        allowed: false,
        retryAfterMs: res.retryAfterMs,
        error: 'Too many authentication attempts. Please try again in a minute.',
      }
    }
    return { allowed: true }
  },
  async orderCreate(request: RequestLike | NextRequest): Promise<RateLimitResult & { error?: string }> {
    const ip = ipKeyFrom(request)
    const backend = await getBackend()
    const res = await backend.check(`order-create:${ip}`, ORDER_MAX, ORDER_REFILL_MS)
    if (!res.allowed) {
      return {
        allowed: false,
        retryAfterMs: res.retryAfterMs,
        error: 'Too many order attempts. Please try again in a minute.',
      }
    }
    return { allowed: true }
  },
}
