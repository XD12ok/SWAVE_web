interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export async function getOrCompute<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = await compute();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateCache(prefix?: string) {
  if (prefix === undefined) {
    store.clear();
    return;
  }
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
