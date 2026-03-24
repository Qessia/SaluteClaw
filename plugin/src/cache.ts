const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const EVICTION_INTERVAL_MS = 60 * 1000; // sweep every 60s

export interface CachedResult {
  text: string;
  timestamp: number;
}

interface CacheEntry {
  result: CachedResult | null;
  pending: Promise<string | undefined> | null;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();
let evictionTimer: ReturnType<typeof setInterval> | null = null;

function ensureEvictionTimer(): void {
  if (evictionTimer) return;
  evictionTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now && !entry.pending) {
        store.delete(key);
      }
    }
    if (store.size === 0 && evictionTimer) {
      clearInterval(evictionTimer);
      evictionTimer = null;
    }
  }, EVICTION_INTERVAL_MS);
  if (typeof evictionTimer === "object" && "unref" in evictionTimer) {
    evictionTimer.unref();
  }
}

export function cacheKey(accountId: string, sessionId: string): string {
  return `salute:${accountId}:${sessionId}`;
}

export function hasCachedResult(key: string): boolean {
  const entry = store.get(key);
  if (!entry?.result) return false;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return false;
  }
  return true;
}

export function consumeCachedResult(key: string): CachedResult | null {
  const entry = store.get(key);
  if (!entry?.result) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  const result = entry.result;
  entry.result = null;
  if (!entry.pending) {
    store.delete(key);
  }
  return result;
}

export function storePendingRun(
  key: string,
  promise: Promise<string | undefined>,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  ensureEvictionTimer();

  const existing = store.get(key);
  const entry: CacheEntry = {
    result: existing?.result ?? null,
    pending: promise,
    expiresAt: Date.now() + ttlMs,
  };
  store.set(key, entry);

  promise.then(
    (text) => {
      const current = store.get(key);
      if (current?.pending !== promise) return;
      current.pending = null;
      if (text) {
        current.result = { text, timestamp: Date.now() };
        current.expiresAt = Date.now() + ttlMs;
      } else if (!current.result) {
        store.delete(key);
      }
    },
    () => {
      const current = store.get(key);
      if (current?.pending !== promise) return;
      current.pending = null;
      if (!current.result) {
        store.delete(key);
      }
    },
  );
}

export function evictSession(key: string): void {
  store.delete(key);
}

export function isPending(key: string): boolean {
  return store.get(key)?.pending != null;
}
