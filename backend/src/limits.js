import { ApiError } from './errors.js'

// Fixed-window counters kept in memory. The API runs as one Railway instance, so memory is enough;
// a restart resets every counter, which is acceptable for brute-force and quota protection.
export function createLimiter({ max, windowMs, now = () => Date.now() }) {
  const windows = new Map()

  function current(key) {
    const time = now()
    const entry = windows.get(key)
    if (entry && entry.resetAt > time) return entry
    // Drop expired windows now and then so the map cannot grow without bound.
    if (windows.size > 10000) {
      for (const [other, value] of windows) if (value.resetAt <= time) windows.delete(other)
    }
    const fresh = { count: 0, resetAt: time + windowMs }
    windows.set(key, fresh)
    return fresh
  }

  return {
    // Seconds to wait when the key is already at the limit, otherwise 0.
    retryAfter(key) {
      const entry = current(key)
      return entry.count >= max ? Math.max(1, Math.ceil((entry.resetAt - now()) / 1000)) : 0
    },
    hit(key) {
      current(key).count += 1
    },
    reset(key) {
      windows.delete(key)
    },
  }
}

export function tooManyRequests(res, seconds, message) {
  res.set('Retry-After', String(seconds))
  throw new ApiError(429, 'TOO_MANY_REQUESTS', message)
}
