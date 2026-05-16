interface RateLimitEntry {
  timestamps: number[];
  lastAccess: number;
}

const store = new Map<string, RateLimitEntry>();

// Очищаем ключи, к которым не обращались > 2 минут (GC)
const CLEANUP_INTERVAL = 60_000; // 1 мин
const KEY_TTL = 120_000; // 2 мин

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.lastAccess > KEY_TTL) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export interface RateLimitResult {
  /** true — запрос разрешён */
  allowed: boolean;
  /** Сколько запросов осталось в текущем окне */
  remaining: number;
  /** Когда сбросится окно (unix ms) */
  resetAt: number;
}

/**
 * Проверяет лимит для заданного ключа.
 *
 * @param key      Уникальный ключ (например, `${userId}:${sessionId}`)
 * @param limit    Максимум запросов в окне (default: 8)
 * @param windowMs Размер окна в мс (default: 3000 — 8 ходов за 3 сек)
 */
export function checkRateLimit(
  key: string,
  limit = 8,
  windowMs = 3_000,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], lastAccess: now };
    store.set(key, entry);
  }

  // Удаляем истёкшие метки
  entry.timestamps = entry.timestamps.filter(t => t > windowStart);
  entry.lastAccess = now;

  const resetAt = (entry.timestamps[0] ?? now) + windowMs;
  const remaining = Math.max(0, limit - entry.timestamps.length);

  if (entry.timestamps.length >= limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: remaining - 1, resetAt };
}
