/**
 * Shared lightweight key-value store for cross-instance shared state.
 *
 * Backend priority:
 *  1. Upstash Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *  2. In-process Map (fallback — same caveats as original in-memory rate limiter)
 *
 * Only TTL-based get/set/delete are exposed. Keep payloads small.
 */

export interface KvStore {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttlMs?: number): Promise<void>
  del(key: string): Promise<void>
}

class InMemoryKvStore implements KvStore {
  private store = new Map<string, { value: unknown; expiresAt: number | null }>()

  private sweep() {
    const now = Date.now()
    for (const [k, v] of Array.from(this.store.entries())) {
      if (v.expiresAt != null && v.expiresAt <= now) {
        this.store.delete(k)
      }
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    this.sweep()
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt != null && entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    this.sweep()
    this.store.set(key, {
      value,
      expiresAt: typeof ttlMs === 'number' ? Date.now() + ttlMs : null,
    })
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }
}

async function tryCreateUpstashRedisStore(): Promise<KvStore | null> {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) return null

    const mod: any = await import('@upstash/redis')
    const redis = new mod.Redis({ url, token })
    return {
      async get<T = unknown>(key: string): Promise<T | null> {
        try {
          const res = await (redis.get as any)(key)
          return (res ?? null) as T | null
        } catch {
          return null
        }
      },
      async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
        try {
          if (typeof ttlMs === 'number') {
            const seconds = Math.max(1, Math.ceil(ttlMs / 1000))
            await (redis.set as any)(key, value, { ex: seconds })
          } else {
            await (redis.set as any)(key, value)
          }
        } catch {
          // Swallow — fallback layer will cover
        }
      },
      async del(key: string): Promise<void> {
        try {
          await (redis.del as any)(key)
        } catch {
          // noop
        }
      },
    }
  } catch {
    return null
  }
}

let cachedStore: KvStore | null = null
let initPromise: Promise<KvStore> | null = null

export async function getSharedKvStore(): Promise<KvStore> {
  if (cachedStore) return cachedStore
  if (initPromise) return initPromise
  initPromise = (async () => {
    const redis = await tryCreateUpstashRedisStore()
    cachedStore = redis ?? new InMemoryKvStore()
    return cachedStore
  })()
  return initPromise
}

export function isSharedStoreDistributed(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}
